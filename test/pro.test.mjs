import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runProConformance } from "../src/index.mjs";

const valid = JSON.parse(readFileSync(new URL("../examples/valid-defense-bundle.json", import.meta.url), "utf8"));
const broken = JSON.parse(readFileSync(new URL("../examples/broken-fanout-bundle.json", import.meta.url), "utf8"));

test("valid defense bundle passes", () => {
  const r = runProConformance(valid);
  assert.equal(r.overall_verdict, "pass");
  assert.deepEqual(r.multi_vertical_posture.detected_verticals, ["defensetech"]);
  assert.equal(r.cross_binding_check.count_errors, 0);
  assert.equal(r.provenance_chain_check.chain_consistent, true);
});

test("broken bundle fails with malformed cross-binding ref + provenance fanout", () => {
  const r = runProConformance(broken);
  assert.equal(r.overall_verdict, "fail");
  assert.ok(r.cross_binding_check.count_errors >= 1);
  assert.equal(r.provenance_chain_check.chain_consistent, false);
  assert.ok(r.issues.some((i) => i.includes("malformed ref")));
  assert.ok(r.issues.some((i) => i.includes("chain integrity broken")));
});

test("multi-vertical posture detects single vertical for single-vertical bundle", () => {
  const r = runProConformance(valid);
  assert.equal(r.multi_vertical_posture.cross_vertical, false);
});

test("multi-vertical posture detects cross-vertical for mixed bundle", () => {
  const mixed = {
    audit_stream_events: [{ kind: "defensetech.rfp.requirement-analyzed" }, { kind: "fintech.credit-application.scored" }]
  };
  const r = runProConformance(mixed);
  assert.equal(r.multi_vertical_posture.cross_vertical, true);
  assert.deepEqual(r.multi_vertical_posture.detected_verticals, ["defensetech", "fintech"]);
});

test("cross_binding_check N/A when vault_contract.cross_binding_refs absent", () => {
  const r = runProConformance({ audit_stream_events: [{ kind: "defensetech.rfp.requirement-analyzed" }] });
  assert.equal(r.cross_binding_check.applicable, false);
});

test("provenance N/A when no Decision Card URLs", () => {
  const r = runProConformance({ audit_stream_events: [{ kind: "defensetech.rfp.requirement-analyzed" }] });
  assert.equal(r.provenance_chain_check.applicable, false);
});

test("empty bundle passes with no detections", () => {
  const r = runProConformance({});
  assert.equal(r.overall_verdict, "pass");
});
