#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { runProConformance } from "./index.mjs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) { console.error("Usage: kg-suite-conform-pro <bundle.json> [--json]"); process.exit(2); }
const bundle = JSON.parse(readFileSync(file, "utf8"));
const result = runProConformance(bundle);

if (args.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Overall verdict: ${result.overall_verdict.toUpperCase()}`);
  if (result.issues.length) {
    console.log(`\nIssues:`);
    for (const i of result.issues) console.log(`  ✗ ${i}`);
  }
  console.log(`\nMulti-vertical posture:`);
  console.log(`  Detected verticals: ${result.multi_vertical_posture.detected_verticals.join(", ") || "(none)"}`);
  console.log(`  Cross-vertical bundle: ${result.multi_vertical_posture.cross_vertical}`);
  console.log(`\nCross-binding check:`);
  if (!result.cross_binding_check.applicable) {
    console.log(`  N/A — ${result.cross_binding_check.reason}`);
  } else {
    console.log(`  ${result.cross_binding_check.count_ok} ok, ${result.cross_binding_check.count_errors} errors`);
    for (const e of result.cross_binding_check.errors ?? []) console.log(`    ✗ ${e}`);
  }
  console.log(`\nProvenance chain:`);
  if (!result.provenance_chain_check.applicable) {
    console.log(`  N/A — no Decision Card URLs found`);
  } else {
    console.log(`  Consistent: ${result.provenance_chain_check.chain_consistent}`);
    for (const u of result.provenance_chain_check.distinct_decision_card_urls) console.log(`    - ${u}`);
  }
}

if (result.overall_verdict === "fail") process.exit(1);
