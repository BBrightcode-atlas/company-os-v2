# Schema Definition Workflow - aiga

## Inputs

- `feature-definition.md`
- `feature-coverage.json`
- `source-material.md`
- `feature-definition-work/feature-analysis-input.json`

## Selected Scope

- selected areas: admin, site, server
- feature groups: 23
- product-builder-base Drizzle files indexed in input: 50

## Steps

1. Read `schema-analysis-input.json` completely.
2. Extract data entities from feature groups. Do not create schemas for pure screens unless persisted data or workflow state is required.
3. Merge duplicate entities across features and assign stable `SCH-###` codes.
4. Write fields with `name`, `type`, `required`, and `description`; put PK/FK/UK and validation details in `validation`.
5. Write ERD-convertible relations such as `users 1:N community_posts` and `doctorProfileId -> doctor_profiles.id`.
6. Compare with product-builder-base Drizzle schema at `packages/drizzle/src/schema/index.ts`, core/*, and features/*.
7. Use only reuse decisions: REUSE, EXTEND, NEW, N/A, UNDECIDED.
8. Write the first draft `schema-definition.md` with ERD first, then feature ERD, then reuse/migration tables.
9. Write the first draft `schema-coverage.json` with schemas, featureSchemaMappings, and unmappedFeatures.
10. Run validation and review scripts.
11. Perform agent semantic self-review against feature-definition and schema coverage.
12. Patch `schema-definition.md` and `schema-coverage.json` for every validation, scripted review, and semantic self-review finding that is not intentionally accepted.
13. Append the iteration summary to `schema-definition-loop.md`.
14. Rerun validation and review after the patch.
15. Stop only when the current on-disk schema-definition/coverage files are the post-review revised artifacts and validation/review have no unresolved findings.
