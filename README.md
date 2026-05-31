# kg-suite-conformance-runner-pro

> Extended Kinetic Gain Protocol Suite conformance runner. Built for **PR-gate-time integrity verification** of multi-artifact bundles. Three checks run together: multi-vertical applicability scan · cross-binding-ref resolution + reachability · provenance-chain verification.

Part of the [Kinetic Gain Protocol Suite](https://suite.kineticgain.com).

## What this checks

Takes an **artifact bundle** — any combination of `decision_card`, `vault_contract`, `audit_stream_events[]`, `evidence_bundle`, `incident_cards[]` — and reports:

| Check | What it verifies |
| --- | --- |
| **Multi-vertical posture** | Which verticals each artifact in the bundle fingerprints to. Surfaces whether the bundle is single-vertical (clean) or cross-vertical (intentional vs. cross-binding error) |
| **Cross-binding refs** | `vault_contract.cross_binding_refs` URLs are syntactically resolvable (HTTPS, well-formed). Lists each ref + repos referenced |
| **Provenance chain** | Every artifact references the SAME root Decision Card URL. If bundle artifacts fan out to multiple Decision Cards, **chain integrity is broken** — surfaces as a fail |

Verdict: `pass` if all applicable checks pass, `fail` if any check finds issues.

## Why this exists

The base `kg-suite-conformance-runner` verifies a single artifact against its vertical's schema. That's necessary but not sufficient. A multi-artifact bundle (the common case for vendor due-diligence) needs structural integrity checks the per-vertical verifiers can't perform on their own:

- Does the vault contract's `cross_binding_refs.defense_decision_record_audit_stream_repo` point somewhere valid? (Pro)
- Do the 12 audit-stream events + 3 incident cards in this bundle all trace back to the same Decision Card? (Pro)
- Does this bundle look like a single-vertical artifact, or are we accidentally mixing two vendors' Decision Cards into one bundle? (Pro)

`-pro` runs all three at PR-gate time as a single `node src/cli.mjs bundle.json` command.

## Usage

```bash
npm install -g kg-suite-conformance-runner-pro
kg-suite-conform-pro bundle.json
# Overall verdict: PASS
# Multi-vertical posture: detected_verticals=defensetech · cross_vertical=false
# Cross-binding check: 3 ok, 0 errors
# Provenance chain: consistent (1 distinct Decision Card URL)
```

Library API:
```js
import { runProConformance } from "kg-suite-conformance-runner-pro";

const result = runProConformance(bundle);
// { multi_vertical_posture, cross_binding_check, provenance_chain_check, overall_verdict, issues }
```

## Worked example: broken bundle

```json
{
  "vault_contract": {
    "decision_card_url": "https://stratos.example/.well-known/decisions/A.json",
    "cross_binding_refs": { "defense_decision_record_audit_stream_repo": "not-a-url", "cmmc_l2_l3_readiness_evidence_bundle_repo": "https://github.com/.../cmmc-..." }
  },
  "audit_stream_events": [
    { "kind": "defensetech.rfp.requirement-analyzed", "decision_card_ref": "https://stratos.example/.well-known/decisions/B.json" }
  ]
}
```

Output:
```
Overall verdict: FAIL

Issues:
  ✗ cross_binding: 1 malformed ref(s)
  ✗ provenance: bundle artifacts reference 2 distinct Decision Card URLs — chain integrity broken
```

## Composes with

- [`kg-suite-conformance-runner`](https://github.com/mizcausevic-dev/kg-suite-conformance-runner) — single-vertical verifier; this is the multi-artifact-bundle complement
- [`kg-suite-vertical-router`](https://github.com/mizcausevic-dev/kg-suite-vertical-router) — routes individual artifacts to per-vertical verifiers
- [`kg-suite-multi-vertical-conformance`](https://github.com/mizcausevic-dev/kg-suite-multi-vertical-conformance) — applicability scan for a single artifact; this tool extends to bundles
- [`cui-data-vault-contract-profile`](https://github.com/mizcausevic-dev/cui-data-vault-contract-profile) — DefenseTech vault contract that originated `cross_binding_refs` as REQUIRED schema fields
- [Kinetic Gain Protocol Suite](https://suite.kineticgain.com) — umbrella

## Limits (v0.1)

- **No network fetch.** Cross-binding refs are checked syntactically (HTTPS, well-formed) but not fetched. Adding live fetch is a deployment-specific concern — wrap in your CI with a curl preflight if needed.
- **Provenance chain** compares Decision Card URLs as strings. If artifacts use canonical-equivalent but not byte-identical URLs (trailing slashes, query params), they're reported as distinct.
- **Multi-vertical detection** uses kind-prefix matching, not the deeper fingerprint heuristic in `kg-suite-multi-vertical-conformance`. For deep analysis, run that tool first.

## License

MIT.
