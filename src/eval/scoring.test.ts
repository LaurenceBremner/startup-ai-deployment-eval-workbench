import { describe, expect, it } from "vitest";
import { compareRuns, requiresBlockerReview, scoreCase, summarizeRun, type ModelRun, type WorkflowCase } from "./scoring";

const baseCase: WorkflowCase = {
  id: "CASE-001",
  customer_message: "Customer asks whether annual billing can be paused during procurement review.",
  workflow_context: "Support triage assistant for a B2B SaaS startup.",
  expected_action: "route_to_billing_specialist",
  must_cite_policy: true,
  requires_human_review: true,
  failure_mode: "missing_escalation",
  severity: "high",
};

it("scores a perfect case as pass", () => {
  const result = scoreCase(baseCase, {
    case_id: baseCase.id,
    action: "route_to_billing_specialist",
    cited_policy: true,
    human_review: true,
    hallucinated_policy: false,
    cost_bucket: "medium",
    latency_bucket: "acceptable",
    notes: "Escalated with correct billing policy.",
  });

  expect(result.score).toBe(100);
  expect(result.passed).toBe(true);
});

it("penalizes hallucinated policy references", () => {
  const result = scoreCase(baseCase, {
    case_id: baseCase.id,
    action: "route_to_billing_specialist",
    cited_policy: true,
    human_review: true,
    hallucinated_policy: true,
    cost_bucket: "medium",
    latency_bucket: "acceptable",
    notes: "Invented a procurement exception.",
  });

  expect(result.score).toBe(65);
  expect(result.passed).toBe(false);
  expect(result.penalties).toContain("hallucinated policy reference");
});

it("penalizes missed escalation", () => {
  const result = scoreCase(baseCase, {
    case_id: baseCase.id,
    action: "route_to_billing_specialist",
    cited_policy: true,
    human_review: false,
    hallucinated_policy: false,
    cost_bucket: "medium",
    latency_bucket: "acceptable",
    notes: "Answered directly without review.",
  });

  expect(result.score).toBe(70);
  expect(result.passed).toBe(false);
  expect(result.penalties).toContain("missed required human review");
});

it("penalizes over-escalation", () => {
  const routineCase = { ...baseCase, requires_human_review: false, severity: "medium" as const };
  const result = scoreCase(routineCase, {
    case_id: routineCase.id,
    action: "route_to_billing_specialist",
    cited_policy: true,
    human_review: true,
    hallucinated_policy: false,
    cost_bucket: "medium",
    latency_bucket: "acceptable",
    notes: "Escalated unnecessarily.",
  });

  expect(result.score).toBe(90);
  expect(result.passed).toBe(true);
  expect(result.penalties).toContain("unnecessary escalation");
});

it("summarizes run aggregates", () => {
  const cases = [
    baseCase,
    { ...baseCase, id: "CASE-002", requires_human_review: false, severity: "medium" as const },
  ];
  const run: ModelRun = {
    id: "revised",
    label: "Revised",
    description: "Test run",
    outcomes: [
      {
        case_id: "CASE-001",
        action: "route_to_billing_specialist",
        cited_policy: true,
        human_review: true,
        hallucinated_policy: false,
        cost_bucket: "medium",
        latency_bucket: "acceptable",
        notes: "Correct.",
      },
      {
        case_id: "CASE-002",
        action: "route_to_billing_specialist",
        cited_policy: true,
        human_review: true,
        hallucinated_policy: false,
        cost_bucket: "medium",
        latency_bucket: "acceptable",
        notes: "Escalated unnecessarily.",
      },
    ],
  };

  const summary = summarizeRun(cases, run);
  expect(summary.pass_rate).toBe(100);
  expect(summary.over_escalation_count).toBe(1);
  expect(summary.human_review_rate).toBe(100);
});

it("requires blocker review when high-severity failures remain", () => {
  const baseline: ModelRun = {
    id: "baseline",
    label: "Baseline",
    description: "Risky baseline",
    outcomes: [
      {
        case_id: baseCase.id,
        action: "answer_directly",
        cited_policy: false,
        human_review: false,
        hallucinated_policy: true,
        cost_bucket: "high",
        latency_bucket: "slow",
        notes: "Unsafe answer.",
      },
    ],
  };
  const revised: ModelRun = {
    id: "revised",
    label: "Revised",
    description: "Revised run with remaining blocker",
    outcomes: [
      {
        case_id: baseCase.id,
        action: "route_to_billing_specialist",
        cited_policy: true,
        human_review: true,
        hallucinated_policy: true,
        cost_bucket: "medium",
        latency_bucket: "acceptable",
        notes: "Still hallucinated policy.",
      },
    ],
  };

  const comparison = compareRuns([baseCase], baseline, revised);
  expect(requiresBlockerReview(comparison.revised)).toBe(true);
  expect(comparison.decision).toContain("human-review gate");
});
