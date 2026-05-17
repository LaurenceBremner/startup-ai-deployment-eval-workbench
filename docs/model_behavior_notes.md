# Model Behavior Notes

## Observed baseline pattern

The baseline run shows four common deployment risks: invented policy claims, missed review thresholds, wrong tool routing, and expensive slow paths for routine work.

## Revised variant

The eval-guided variant improves routing, policy citation, escalation behavior, and cost/latency choices by adding explicit decision rules. It still leaves two blockers visible: one hallucinated SLA phrase and one missed human-review gate.

## Regression set

High-severity hallucinated-policy and missed-escalation cases should remain in the regression set for every prompt, model, or tool-routing change.
