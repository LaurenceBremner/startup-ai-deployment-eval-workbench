# Architecture

## Purpose

The workbench shows how an AI workflow can move from ambiguous user reality to reproducible evals, prompt/agent iteration, and product-quality feedback.

## Flow

1. Synthetic workflow cases describe support-triage and account-risk messages.
2. The baseline run captures a general-purpose prompt with weak routing and weak policy grounding.
3. The revised run captures a prompt/agent workflow with explicit tool choice, policy checks, review thresholds, and cost-aware paths.
4. The scoring core evaluates action match, review behavior, policy citation, hallucination risk, cost, and latency.
5. The UI turns the comparison into a deployment decision and product/model feedback notes.

## Public safety

The data is simulated for the case study and does not use confidential source material. Account names, support messages, metrics, tickets, and workflow records are fictional.

## Design choices

- Static React app so the demo can run on GitHub Pages.
- JSON fixtures so the eval set can be inspected directly.
- Deterministic scoring so results are reproducible without external APIs.
- Visible remaining blockers so the rollout decision stays auditable.
