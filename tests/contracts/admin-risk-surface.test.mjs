import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
const dash=fs.readFileSync('src/mvp/AutonomousCorporationDashboard.tsx','utf8');
const runtime=fs.readFileSync('scripts/admin-risk-runtime.mjs','utf8');
const judge=fs.readFileSync('scripts/admin-risk-judge.mjs','utf8');
const sentinel=fs.readFileSync('scripts/admin-risk-sentinel.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/admin-risk-runtime.yml','utf8');

test('Risk & Audit exposes authoritative blockers and ledgers',()=>{for(const x of['Bloqueadores de lanzamiento','Evidence Ledger','Decision Ledger','Control Coverage Map','Findings'])assert.match(dash,new RegExp(x));assert.match(dash,/releaseGate\?\.blockers/);assert.match(dash,/p\.evidence\.slice\(0,20\)/);assert.match(dash,/p\.decisions\.slice\(0,20\)/)});
test('dedicated runtime compares risk evidence with UGO TEST backend',()=>{for(const x of['RISK_BLOCKER_UI_BACKEND_MISMATCH','RISK_EVIDENCE_UI_BACKEND_MISMATCH','RISK_EVIDENCE_CORRELATION_MISMATCH','RISK_FINDING_UI_BACKEND_MISMATCH','autonomous_evidence_ledger','autonomous_decision_ledger','autonomous_audit_findings'])assert.match(runtime,new RegExp(x))});
test('admin risk proof is same-SHA TEST-only with Judge and Sentinel',()=>{assert.match(judge,/JUDGE_SAME_SHA_REQUIRED/);assert.match(sentinel,/SENTINEL_RUNTIME_SAME_SHA_REQUIRED/);assert.match(workflow,/UGO Readiness Admin Risk TEST/);assert.match(workflow,/UGO_RUNTIME_SHA=/);assert.match(workflow,/GITHUB_SHA/);assert.match(workflow,/tmossnqfwfwjrtzwcbmm\.supabase\.co/)});
test('evidence references render as safe links only for http targets',()=>{assert.match(dash,/target="_blank"/);assert.match(dash,/rel="noreferrer"/);assert.match(dash,/https\?:\\\/\\\//)});
