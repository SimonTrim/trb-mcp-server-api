# Migration Render -> Google Cloud Run

Ce document décrit la migration de `trb-mcp-server-api` vers Google Cloud Run pour éviter les limites d'heures gratuites Render.

## Résultat attendu

- Service Cloud Run public et stable.
- Endpoint MCP compatible Trimble Agent Studio :
  - `https://<cloud-run-url>/sse`
- Endpoint de santé :
  - `https://<cloud-run-url>/health`
- Déploiement automatique depuis GitHub Actions.

## Fichiers ajoutés

- `Dockerfile` : build multi-stage Node.js 20 pour Cloud Run.
- `.dockerignore` : exclut `node_modules`, `dist`, `.git`, `.env`.
- `.github/workflows/deploy-cloud-run.yml` : build Docker, push Artifact Registry, deploy Cloud Run.

## Paramètres Cloud Run recommandés

| Paramètre | Valeur |
| --- | --- |
| Service | `trb-mcp-server-api` |
| Région | `europe-west1` |
| Min instances | `1` |
| Max instances | `5` |
| Timeout | `3600` secondes |
| Concurrency | `10` |
| Memory | `512Mi` |
| CPU | `1` |
| Port | `8080` |
| Auth | `allow unauthenticated` |

> Pourquoi public ? Trimble Agent Studio doit pouvoir appeler l'URL `/sse`. L'authentification Trimble Connect reste portée par le header `Authorization: Bearer {actorToken?scopes=openid tc}` configuré dans Agent Studio.

## 1. Préparer Google Cloud

Remplace les variables :

```bash
export PROJECT_ID="TON_PROJECT_ID"
export REGION="europe-west1"
export REPOSITORY="trb-mcp"
export SERVICE_ACCOUNT_NAME="github-trb-mcp-deployer"
export SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
```

Sélectionne le projet :

```bash
gcloud config set project "$PROJECT_ID"
```

Active les APIs :

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com
```

## 2. Créer Artifact Registry

```bash
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Docker images for trb-mcp-server-api"
```

Si le repository existe déjà, cette commande peut retourner une erreur. Ce n'est pas bloquant.

## 3. Créer le Service Account de déploiement

```bash
gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
  --display-name="GitHub deployer for trb-mcp-server-api"
```

Donne les droits nécessaires :

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/iam.serviceAccountUser"
```

## 4. Configurer GitHub Actions avec Workload Identity Federation

Remplace :

```bash
export GITHUB_ORG="SimonTrim"
export GITHUB_REPO="trb-mcp-server-api"
export POOL_ID="github-pool"
export PROVIDER_ID="github-provider"
```

Crée le pool :

```bash
gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

Crée le provider GitHub :

```bash
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --display-name="GitHub Actions Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository=='SimonTrim/trb-mcp-server-api'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

> La condition `assertion.repository=='SimonTrim/trb-mcp-server-api'` est volontaire : elle empêche un autre repo GitHub d'utiliser ce provider.

Autorise uniquement ce repo GitHub à utiliser le service account :

```bash
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$GITHUB_ORG/$GITHUB_REPO"
```

Récupère l'identifiant du provider à copier dans GitHub Secrets :

```bash
gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --format="value(name)"
```

## 5. Ajouter les secrets GitHub

Dans GitHub Enterprise, repo `trb-mcp-server-api` :

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Ajoute :

| Secret | Valeur |
| --- | --- |
| `GCP_PROJECT_ID` | ton project id GCP |
| `GCP_SERVICE_ACCOUNT` | `github-trb-mcp-deployer@TON_PROJECT_ID.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | valeur retournée par la commande `providers describe` |

## 6. Premier déploiement

Deux options :

### Option A — depuis GitHub

1. Commit/push les fichiers.
2. Va dans `Actions`.
3. Lance `Deploy to Google Cloud Run` avec `Run workflow`.

### Option B — manuel local

Depuis le repo :

```bash
gcloud auth configure-docker "$REGION-docker.pkg.dev"

docker build -t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/trb-mcp-server-api:manual" .
docker push "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/trb-mcp-server-api:manual"

gcloud run deploy trb-mcp-server-api \
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/trb-mcp-server-api:manual" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 5 \
  --timeout 3600 \
  --concurrency 10 \
  --memory 512Mi \
  --cpu 1 \
  --port 8080
```

## 7. Tester Cloud Run

Récupère l'URL :

```bash
gcloud run services describe trb-mcp-server-api \
  --region "$REGION" \
  --format="value(status.url)"
```

Teste :

```bash
curl "https://<cloud-run-url>/health"
```

Dans un navigateur, ouvre :

```text
https://<cloud-run-url>/sse
```

Le navigateur peut rester en attente : c'est normal pour SSE.

## 8. Mettre à jour Trimble Agent Studio

Dans le Tool MCP de l'agent :

| Champ | Valeur |
| --- | --- |
| Name | `Trimble Connect API` |
| URL | `https://<cloud-run-url>/sse` |
| Authentication | Header personnalisé |
| Header | `Authorization` |
| Value | `Bearer {actorToken?scopes=openid tc}` |

Sauvegarde, puis teste une question simple :

```text
Liste les outils Trimble Connect disponibles.
```

## 9. Bascule finale

1. Garde Render actif pendant les tests.
2. Teste Cloud Run depuis Agent Studio.
3. Vérifie que les appels API Trimble Connect fonctionnent.
4. Quand tout est OK, désactive Render ou laisse-le en backup temporaire.

## Notes importantes

- `min-instances=1` évite que le MCP server soit froid ou indisponible.
- `timeout=3600` est adapté aux connexions SSE longues.
- `concurrency=10` limite le nombre de sessions SSE par instance pour rester stable.
- Si l'agent a beaucoup d'utilisateurs, augmenter `max-instances`.
