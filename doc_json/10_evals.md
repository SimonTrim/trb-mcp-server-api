# Evals

The Eval Service provides a robust, scalable evaluation platform for testing and measuring the performance of AI agents and retrieval systems. It uses a decoupled, API-first architecture that separates lightweight synchronous tasks (like creating datasets) from heavyweight asynchronous tasks (like running hundreds of test cases), keeping the platform responsive and scalable.

## Architecture Overview[​](#architecture-overview "Direct link to Architecture Overview")

The service has two layers:

* **Orchestration Layer** — Manages definitions (datasets, evaluators) and job lifecycle
* **Execution Layer** — Asynchronous worker engine that runs evaluations against datasets

This design ensures that creating a dataset returns immediately, while large evaluation runs execute in the background without blocking.

## Dataset Management[​](#dataset-management "Direct link to Dataset Management")

**Datasets** are top-level collections that group test cases for a specific evaluation purpose (e.g., "Support Bot Regression Tests").

* **Organization** — Group dataset records by use case, product, or release
* **KB Library Links** — Datasets link to Knowledge Base libraries for access control and permission inheritance
* **Record Types** — Support both agent testing (conversation records) and retrieval testing (query records)
* **Metadata** — Flexible metadata for categorization, filtering, and tracing

## Dataset Records (Test Cases)[​](#dataset-records-test-cases "Direct link to Dataset Records (Test Cases)")

A **dataset record** is a unified test case within a dataset. It supports two evaluation types:

### Agent Records (Conversation)[​](#agent-records-conversation "Direct link to Agent Records (Conversation)")

For end-to-end agent testing:

* **Messages** — Multi-turn conversation history (user/assistant turns)
* **Expected Output** — The ideal agent response (ground truth)
* **Expected Context** — (Optional) Expected KB chunks the agent should use
* **Expected Tools** — (Optional) Expected tool calls
* **Reference Output** — A "blessed" output from a past run for regression testing
* **Actual Output / Actual Tools** — Captured results from reference runs for comparison

### Retrieval Records (Query)[​](#retrieval-records-query "Direct link to Retrieval Records (Query)")

For component-level KB search testing:

* **Query** — Simple search query string
* **Expected Context** — Expected chunks that should be retrieved, with relevance levels (critical, important, supplementary)

### Expected vs Actual vs Reference[​](#expected-vs-actual-vs-reference "Direct link to Expected vs Actual vs Reference")

* **Expected** — The ideal/correct behavior (ground truth for scoring)
* **Actual** — What a specific run actually produced (captured for comparison)
* **Reference Output** — A previously approved "good" output for regression tests

### Multimodal Support[​](#multimodal-support "Direct link to Multimodal Support")

Records support multi-modal content:

* **Text, images, audio, video** in messages and outputs
* **Generated content** — Images, audio, video from agents (e.g., DALL-E, TTS)
* **Retrieval results** — Chunks with ranking and scores

## Evaluators (Agent-Like Entities)[​](#evaluators-agent-like-entities "Direct link to Evaluators (Agent-Like Entities)")

**Evaluators** are specialized agents that measure and judge other agents' performance. Each evaluator combines:

1. **Rubric Definition** — Metrics and scoring criteria (what to measure)
2. **Access Control** — Admins and users with actor claims (who can use the evaluator)
3. **Execution Configuration** — Model, timeout, retry settings (how to execute)

### System vs User Evaluators[​](#system-vs-user-evaluators "Direct link to System vs User Evaluators")

* **System Evaluators** — Trimble-managed templates (read-only)

  * Pre-optimized for common metrics (faithfulness, recall, safety, relevance)
  * Cannot be modified or used directly for jobs
  * Must be **cloned** to create a user-owned instance
  * Managed by Trimble

* **User Evaluators** — Custom or cloned instances

  * Full CRUD (create, update, delete)
  * Customizable prompts, metrics, and configurations
  * Can be used for job execution

### Evaluator Capabilities[​](#evaluator-capabilities "Direct link to Evaluator Capabilities")

* **LLM-as-a-Judge** — Custom prompts and metrics for automated scoring
* **Multi-metric Output** — Boolean, numerical, and categorical metrics from a single execution
* **Multi-modal Evaluation** — Assess image quality, audio clarity, video analysis, TTS
* **Agent Permissions** — Define which agents the evaluator can invoke for testing
* **Execution Config** — Model selection, timeout, retry logic

### Access Control[​](#access-control "Direct link to Access Control")

Evaluators use the same permission model as agents:

* **Admins** — Manage evaluator config, permissions, and create jobs
* **Users** — Create and view jobs with the evaluator
* **Actor Claims** — Same syntax as agents (users, accounts, applications)

**External Permissions** — Evaluators need access to target agents (Agent Service) and KB libraries (KB Service). These are managed in those services, not in the Eval Service.

## Evaluation Jobs[​](#evaluation-jobs "Direct link to Evaluation Jobs")

An **evaluation job** coordinates evaluation work against a dataset. Jobs execute asynchronously.

### Job Types[​](#job-types "Direct link to Job Types")

* **Agent Eval** — End-to-end testing of complete agent behavior with full context
* **Retriever Eval** — Component-level testing of KB search quality in isolation
* **Record Generation** — Synthetic test case generation using LLM-as-a-Curator

### Executor Types[​](#executor-types "Direct link to Executor Types")

* **AUTOMATED** — LLM evaluator runs automatically against all records

  * Creates individual record evaluations automatically
  * Status: PENDING → RUNNING → COMPLETED/FAILED
  * Use for: Bulk evaluation, regression testing, CI/CD pipelines

* **MANUAL** — Human evaluators submit evaluations manually

  * Job acts as a container for human evaluation work
  * Humans submit evaluations with the job ID
  * Job tracks completion as evaluations are submitted
  * Use for: Quality assurance, spot-checking, LLM validation

### Job Lifecycle[​](#job-lifecycle "Direct link to Job Lifecycle")

1. **Create Job** — Returns immediately with status PENDING
2. **Poll Status** — Check progress (RUNNING → COMPLETED/FAILED)
3. **Retrieve Results** — Summary with aggregated results and per-record details

### Success Criteria[​](#success-criteria "Direct link to Success Criteria")

Jobs use programmatic rules for pass/fail outcomes:

* **Metric** — The metric to evaluate (e.g., faithfulness)
* **Aggregation** — Function (avg, count, min, max, p99)
* **Operator** — Comparison (gte, lte, gt, lt, eq)
* **Threshold** — Target value

Example: Average faithfulness score must be at least 98% to pass.

### Progress Tracking[​](#progress-tracking "Direct link to Progress Tracking")

Jobs track total records, completed records, and failed records. Each job creates individual record evaluation entries linked via job ID.

## Individual Record Evaluations[​](#individual-record-evaluations "Direct link to Individual Record Evaluations")

Evaluations are stored per record and support both LLM and human sources:

* **Unified Storage** — Same schema for LLM and human evaluations
* **Filtering** — By source type (LLM vs HUMAN), evaluator, or human actor
* **Job Link** — Evaluations link back to jobs via job\_id

### Inter-Rater Reliability[​](#inter-rater-reliability "Direct link to Inter-Rater Reliability")

Compare human vs LLM scores across the same records:

* **Agreement Metrics** — MAE, correlation, Cohen's Kappa
* **High-Disagreement Records** — Identify records for review
* **LLM Validation** — Validate LLM evaluator quality against human judgment

Human evaluations can be updated or deleted; LLM evaluations are immutable.

## Limits[​](#limits "Direct link to Limits")

* Maximum evaluation job duration
* Maximum dataset size (records per dataset)
* Maximum concurrent jobs per user
* Request rate limit per user

## Getting Started[​](#getting-started "Direct link to Getting Started")

To use the Eval Service:

1. **Authentication** — Obtain a valid TID access token with the required scope
2. **Terms of Service** — Agree to the platform terms before use
3. **System Evaluators** — Browse templates, clone one to create a user-owned instance
4. **External Permissions** — Grant the evaluator access to agents and KB libraries in their respective services
5. **Create Datasets** — Add records (conversations or queries) with expected outputs
6. **Run Jobs** — Create evaluation jobs and poll for results

The [Studio App](/docs/capabilities/studio.md) provides a visual interface for datasets, metrics, evaluation jobs, and results. For detailed API documentation, refer to the Eval Service API specification.
