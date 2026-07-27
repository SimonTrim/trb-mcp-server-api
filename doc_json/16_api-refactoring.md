# API Refactoring: Tiered Architecture

This document details the refactoring of the API into a 3-tiered architecture designed to balance automation, control, and maintainability.

## Architecture Overview[​](#architecture-overview "Direct link to Architecture Overview")

The SDK is now structured into three distinct layers:

### 1. Tier 1: Generated Clients (Hey API)[​](#1-tier-1-generated-clients-hey-api "Direct link to 1. Tier 1: Generated Clients (Hey API)")

* **Location**: `src/api-clients/{service-name}/`

* **Purpose**: This layer is purely automated. It uses `@hey-api/openapi-ts` to generate TypeScript clients directly from OpenAPI specifications.

* **Characteristics**:

  <!-- -->

  * Contains raw types and request functions.
  * Not intended for direct consumer usage in most cases.
  * Automatically updated when API specs change.
  * Ensures 100% coverage of the API surface area.

### 2. Tier 2: Wrapper Layer (Manual SDK)[​](#2-tier-2-wrapper-layer-manual-sdk "Direct link to 2. Tier 2: Wrapper Layer (Manual SDK)")

* **Location**: `src/services/{service-name}/`

* **Purpose**: This is the exposed surface of the SDK. It wraps the generated clients to provide a more developer-friendly experience.

* **Characteristics**:

  <!-- -->

  * **Type Control**: We explicitly define what types are exposed to the user, preventing internal API implementation details from leaking.
  * **Interface Stability**: Allows us to maintain stable interfaces even if the underlying generated code changes slightly.
  * **Documentation**: Enhanced JSDoc comments and usage examples.
  * **Abstraction**: Hides complexity (e.g., specific HTTP headers, auth handling) from the user.

### 3. Tier 3: Tooling[​](#3-tier-3-tooling "Direct link to 3. Tier 3: Tooling")

* **Location**: `src/core/` and `src/integrations/`

* **Purpose**: Shared utilities and infrastructure that power the SDK.

* **Components**:

  <!-- -->

  * **Pagination Mapping**: Unified pagination helpers (`src/core/pagination.ts`) that standardize how lists are handled across different services.
  * **FIQL Query Builder/Parser**: (Planned) To handle complex filtering logic.
  * **Configurable HTTP Client**: Centralized Axios configuration (`src/core/http/`) handling retries, error normalization, and authentication.
  * **AG UI Client**: Integration with `ag-ui-client` for unified platform behaviors.

## Highlights[​](#highlights "Direct link to Highlights")

* **Configurable HTTP Client**: The underlying HTTP client is fully configurable, supporting custom middleware, interceptors, and retry strategies.

* **AG-UI Client Integration**: Seamlessly integrates with the platform's UI client for consistent authentication and session management.

* **LLM-Ready**: The structure is designed to be easily parsed and maintained by LLMs. The separation of concerns allows an AI to understand:

  <!-- -->

  * "Here is the raw API" (Tier 1)
  * "Here is how we want to present it" (Tier 2)

## Benefits[​](#benefits "Direct link to Benefits")

1. **Automation**: We get free updates for models and endpoints via Hey API generation.
2. **Control**: We don't expose generated code directly. We have a buffer layer to fix naming, simplify signatures, or add helper logic.
3. **Maintainability**: Clear separation makes it easier to debug. If the spec is wrong, it's a Tier 1 issue. If the logic is wrong, it's a Tier 2 issue.

## Open Considerations[​](#open-considerations "Direct link to Open Considerations")

### Type Drift[​](#type-drift "Direct link to Type Drift")

One challenge to evaluate is "type drift" — the divergence between the generated types in Tier 1 and the manual types in Tier 2.

* **Current State**: We manually import and re-export or map types in Tier 2.
* **Risk**: If a field changes in Tier 1, Tier 2 might break or (worse) silently ignore the change until runtime.
* **Potential Solution**: We need to investigate smarter usages of Hey API or TypeScript utility types (like `Pick`, `Omit`, or mapping types).

To ensure that Tier 2 types automatically reflect non-breaking changes in Tier 1, while still alerting us to breaking changes at compile time.

***

## API Update Workflow[​](#api-update-workflow "Direct link to API Update Workflow")

To update the SDK when APIs change:

1. **Generate New Specs**: Run the generation script (`npm run generate:clients`) to update Tier 1.

2. **Check the Diff**: Review the changes in `src/api-clients/` to understand what changed in the contract.

3. **Update Services**:

   <!-- -->

   * Update the Tier 2 wrapper classes in `src/services/` to accommodate new endpoints or parameters.
   * Update type mappings/exports in `src/services/{service}/types.ts`.

4. **Update Comments**: Refresh JSDoc comments in the service wrappers to reflect new behaviors.

5. **Update Contract Tests**: Run `npm run test:contract` and update/add tests to verify the new contract compliance.
