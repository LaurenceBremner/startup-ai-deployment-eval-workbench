# Startup AI Deployment Eval Incident Brief

A one-screen React/TypeScript synthetic case study showing how a risky AI support workflow becomes a scored deployment recommendation.

Live: https://laurencebremner.github.io/startup-ai-deployment-eval-workbench/

## Overview

This project isolates a narrow AI deployment question: can a small eval catch answers that sound helpful but should not ship? The concrete scenario is a B2B SaaS customer threatening non-payment because usage reporting looks wrong.

The live page is designed as an eval incident brief: customer-risk signal on the left, baseline-versus-revised scoring in the centre, and the rollout recommendation on the right. It is intentionally a case study, not an open-ended demo.

## Scenario

A B2B SaaS startup is deploying an AI support-triage and account-risk assistant. The specific workflow is a finance/account escalation: the assistant must decide whether to answer, query tools, cite policy, or escalate to finance and the account owner.

## What it shows

- One concrete synthetic deployment scenario.
- Four synthetic eval checks covering tool routing, escalation, policy grounding, and rollout decision.
- Deterministic scoring logic for action match, human review, and unsupported policy risk.
- Baseline vs revised comparison with visible pass-rate movement and a review-gate recommendation.
- Source links for the implementation, scoring logic, screenshots, and architecture notes.

## Limits

This is an independent public project using simulated support-ticket scenarios. It uses evaluation logic and rollout gates without confidential source material.

## How the eval works

Each case specifies the expected action, policy-citation requirement, human-review requirement, failure mode, and severity. Each model run supplies an observed action, citation behavior, review behavior, hallucination flag, cost bucket, latency bucket, and notes. The scoring core subtracts penalties for mismatches and summarizes pass rate, blocker count, hallucinated-policy count, missed escalations, and cost/latency issues.

## Why these failure modes matter

- `tool_routing`: customer workflows depend on using the right source before answering.
- `hallucinated_policy`: invented commercial or support policy can create real deployment risk.
- `missing_escalation`: high-risk customer issues need human review thresholds.
- `over_escalation`: unnecessary review destroys the value of routine automation.

## Run locally

```bash
npm install
npm test
npm run build
npm run preview
```

## Key files

- `src/data/startup_workflow_cases.json`: synthetic workflow cases; the public UI uses four curated cases.
- `src/data/model_runs.json`: baseline and revised variant outputs.
- `src/eval/scoring.ts`: deterministic evaluation logic.
- `src/eval/scoring.test.ts`: scoring and blocker-review tests.
- `src/App.tsx`: public demo surface.
- `docs/architecture.md`: architecture and operating-loop notes.
- `artifact_index.md`: project inventory and verification status.

## Public safety

The data is simulated for the case study and does not use confidential source material. All account names, support messages, metrics, tickets, and workflow records are fictional.
