# API Definition Workflow - aiga

## Inputs

- `feature-definition.md`
- `feature-coverage.json`
- `feature-definition-scope.json`
- `schema-definition.md`
- `schema-coverage.json`
- `source-material.md`

## Selected Scope

- selected areas: admin, site, server
- feature groups: 23
- schema count: 26
- product-builder-base controller endpoints indexed in input: 310

## Steps

1. Read `api-analysis-input.json` completely.
2. Extract REST operations from feature groups. Do not create one API per screen event.
3. Merge duplicate operations across features and assign stable `API-###` codes.
4. Connect every operation to `FEA-###` feature codes and persisted operations to `SCH-###` schema codes.
5. Compare operations against product-builder-base controllers/services/dtos.
6. Use only reuse decisions: REUSE, EXTEND, NEW, N/A, UNDECIDED.
7. Write the first draft `api-definition.openapi.yaml` as OpenAPI 3.1 with traceability extensions.
8. Write the first draft `api-definition.md` as a readable index; do not replace OpenAPI with Markdown tables.
9. Write the first draft `api-coverage.json` with APIs, featureApiMappings, schemaApiMappings, and unmappedFeatures.
10. Run validation and review scripts.
11. Perform agent semantic self-review against feature/schema definitions and API coverage.
12. Patch `api-definition.openapi.yaml`, `api-definition.openapi.json`, `api-definition.md`, and `api-coverage.json` for every validation, scripted review, and semantic self-review finding that is not intentionally accepted.
13. Append the iteration summary to `api-definition-loop.md`.
14. Rerun validation and review after the patch.
15. Stop only when the current on-disk OpenAPI/coverage/Markdown files are the post-review revised artifacts and validation/review have no unresolved findings.
