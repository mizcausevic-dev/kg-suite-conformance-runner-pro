# Changelog

## [0.1] — 2026-05-31

### Added

- Initial release. `runProConformance(bundle)` runs three integrity checks on a multi-artifact bundle and produces a single pass/fail verdict + per-check details.
- **Multi-vertical posture** — detects vertical(s) per artifact, flags cross-vertical bundles.
- **Cross-binding check** — verifies `vault_contract.cross_binding_refs` URLs are syntactically HTTPS-resolvable; lists ok + errors.
- **Provenance-chain check** — collects all Decision Card URLs referenced by artifacts in the bundle; fails if they fan out to >1 distinct URL (chain integrity broken).
- `kg-suite-conform-pro` CLI: JSON file in, human-readable or `--json` output, non-zero exit on fail.
- 7 unit tests covering: valid bundle pass, broken bundle fail with both error types, single-vertical detection, multi-vertical detection, N/A handling when cross_binding absent, N/A handling when no Decision Card URLs, empty bundle.

### Not yet

- Live HTTPS fetch of cross-binding refs (today syntactic only).
- URL canonicalization for provenance comparison (today byte-comparison).
- Per-vertical schema verifier invocation (delegate to per-vertical tools).
- Bundle ingestion from a single .ndjson stream + sidecar files.
