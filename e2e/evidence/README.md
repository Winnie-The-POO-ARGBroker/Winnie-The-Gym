# E2E Evidence

This directory stores screenshots and traces captured when tests fail or when documenting known failure states.

## Known captured failures

- `delete-guard-toast.png` — the single-plan delete guard toast that blocks
  deletion when only one plan exists. This is the reason `planes-crud.spec.ts`
  has a `test.fixme()` for the delete scenario.

These files are committed to make the CI artifact trail auditable.
Test-run artifacts (screenshots from failed runs) are written to
`e2e/test-results/` which is gitignored.
