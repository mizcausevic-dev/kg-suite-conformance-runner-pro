// index.mjs — Pro conformance runner.
//
// Inputs: an "artifact bundle" — { decision_card?, vault_contract?, audit_stream_events?, evidence_bundle?, incident_cards? }
// Each is optional, but when present must reference back to a common root Decision Card URL.
//
// Output: { multi_vertical_posture, cross_binding_check, provenance_chain_check, overall_verdict }

const KNOWN_VERTICAL_PREFIXES = ["healthtech", "edtech", "proptech", "insurtech", "hrtech", "fintech", "govtech", "legaltech", "energytech", "defensetech"];

function isUrl(s) { return typeof s === "string" && /^https?:\/\//.test(s); }

/**
 * Multi-vertical applicability scan: looks at every artifact in the bundle
 * and determines which verticals each fingerprints to, then surfaces if
 * the bundle's artifacts agree on a single vertical (clean) or fingerprint
 * to multiple verticals (intentional or a cross-binding error).
 */
function multiVerticalPosture(bundle) {
  const verticalsPerArtifact = {};
  const detect = (obj) => {
    if (!obj) return null;
    if (obj.kind && typeof obj.kind === "string") {
      const prefix = obj.kind.split(".")[0];
      if (KNOWN_VERTICAL_PREFIXES.includes(prefix)) return prefix;
    }
    if (obj.event_type && typeof obj.event_type === "string") {
      for (const v of KNOWN_VERTICAL_PREFIXES) if (obj.event_type.includes(v)) return v;
    }
    return null;
  };

  if (bundle.decision_card)        verticalsPerArtifact.decision_card = detect(bundle.decision_card);
  if (bundle.vault_contract)       verticalsPerArtifact.vault_contract = bundle.vault_contract.cui_axis ? "defensetech" : detect(bundle.vault_contract);
  if (bundle.audit_stream_events)  verticalsPerArtifact.audit_stream_events = bundle.audit_stream_events.map(detect);
  if (bundle.evidence_bundle)      verticalsPerArtifact.evidence_bundle = detect(bundle.evidence_bundle);
  if (bundle.incident_cards)       verticalsPerArtifact.incident_cards = bundle.incident_cards.map(detect);

  const allVerticalsSet = new Set();
  Object.values(verticalsPerArtifact).forEach((v) => {
    if (Array.isArray(v)) v.forEach((x) => x && allVerticalsSet.add(x));
    else if (v) allVerticalsSet.add(v);
  });

  return {
    per_artifact: verticalsPerArtifact,
    detected_verticals: [...allVerticalsSet].sort(),
    cross_vertical: allVerticalsSet.size > 1
  };
}

/**
 * Cross-binding check: vault contracts with cross_binding_refs must point
 * to URLs that look plausible (HTTPS, well-formed). v0.1 does not actually
 * fetch — fetching is a per-deployment concern. v0.1 reports "syntactically
 * resolvable" vs "syntactically broken" + lists referenced repos.
 */
function crossBindingCheck(bundle) {
  const refs = bundle.vault_contract?.cross_binding_refs;
  if (!refs) return { applicable: false, reason: "no vault_contract.cross_binding_refs present in bundle" };
  const errors = [];
  const ok = [];
  for (const [key, url] of Object.entries(refs)) {
    if (!isUrl(url)) errors.push(`${key}: not an HTTPS URL ("${url}")`);
    else ok.push({ key, url });
  }
  return { applicable: true, ok, errors, count_ok: ok.length, count_errors: errors.length };
}

/**
 * Provenance chain: if both audit-stream and incident-cards or audit-stream
 * and evidence-bundle are present, verify they reference the SAME root
 * Decision Card URL (or contractor identifier).
 */
function provenanceChainCheck(bundle) {
  const decisionCardUrls = new Set();
  const dcUrlFromEvent = (e) => e.decision_card_ref || e.agent?.ai_decision_card_url;
  if (bundle.decision_card?.decision_card_url) decisionCardUrls.add(bundle.decision_card.decision_card_url);
  if (bundle.vault_contract?.decision_card_url) decisionCardUrls.add(bundle.vault_contract.decision_card_url);
  for (const e of bundle.audit_stream_events ?? []) {
    const u = dcUrlFromEvent(e);
    if (u) decisionCardUrls.add(u);
  }
  for (const c of bundle.incident_cards ?? []) {
    if (c.decision_card_url) decisionCardUrls.add(c.decision_card_url);
  }
  if (bundle.evidence_bundle?.decision_card_url) decisionCardUrls.add(bundle.evidence_bundle.decision_card_url);

  const urls = [...decisionCardUrls];
  return {
    applicable: urls.length > 0,
    distinct_decision_card_urls: urls,
    chain_consistent: urls.length <= 1,
    fanout_risk: urls.length > 1 ? `bundle artifacts reference ${urls.length} distinct Decision Card URLs — chain integrity broken` : null
  };
}

export function runProConformance(bundle) {
  const mv = multiVerticalPosture(bundle);
  const cb = crossBindingCheck(bundle);
  const pc = provenanceChainCheck(bundle);

  const issues = [];
  if (cb.applicable && cb.count_errors > 0) issues.push(`cross_binding: ${cb.count_errors} malformed ref(s)`);
  if (pc.applicable && !pc.chain_consistent) issues.push(`provenance: ${pc.fanout_risk}`);

  return {
    multi_vertical_posture: mv,
    cross_binding_check: cb,
    provenance_chain_check: pc,
    overall_verdict: issues.length === 0 ? "pass" : "fail",
    issues
  };
}
