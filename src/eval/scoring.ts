export type FailureMode =
  | "instruction_following"
  | "tool_routing"
  | "hallucinated_policy"
  | "missing_escalation"
  | "over_escalation"
  | "cost_latency_tradeoff";

export type Severity = "low" | "medium" | "high";
export type CostBucket = "low" | "medium" | "high";
export type LatencyBucket = "fast" | "acceptable" | "slow";

export interface WorkflowCase {
  id: string;
  customer_message: string;
  workflow_context: string;
  expected_action: string;
  must_cite_policy: boolean;
  requires_human_review: boolean;
  failure_mode: FailureMode;
  severity: Severity;
}

export interface CaseOutcome {
  case_id: string;
  action: string;
  cited_policy: boolean;
  human_review: boolean;
  hallucinated_policy: boolean;
  cost_bucket: CostBucket;
  latency_bucket: LatencyBucket;
  notes: string;
}

export interface ModelRun {
  id: string;
  label: string;
  description: string;
  outcomes: CaseOutcome[];
}

export interface CaseScore {
  case_id: string;
  score: number;
  passed: boolean;
  penalties: string[];
  severity: Severity;
  failure_mode: FailureMode;
}

export interface RunSummary {
  run_id: string;
  label: string;
  pass_rate: number;
  average_score: number;
  human_review_rate: number;
  hallucinated_policy_count: number;
  missed_escalation_count: number;
  over_escalation_count: number;
  high_severity_failures: number;
  high_cost_count: number;
  slow_latency_count: number;
  scores: CaseScore[];
}

export interface RunComparison {
  baseline: RunSummary;
  revised: RunSummary;
  pass_rate_delta: number;
  average_score_delta: number;
  hallucinated_policy_delta: number;
  missed_escalation_delta: number;
  decision: string;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function scoreCase(expected: WorkflowCase, actual: CaseOutcome): CaseScore {
  const penalties: string[] = [];
  let score = 100;

  if (actual.action !== expected.expected_action) {
    score -= 25;
    penalties.push("expected action mismatch");
  }

  if (expected.requires_human_review && !actual.human_review) {
    score -= 30;
    penalties.push("missed required human review");
  }

  if (!expected.requires_human_review && actual.human_review) {
    score -= 10;
    penalties.push("unnecessary escalation");
  }

  if (expected.must_cite_policy && !actual.cited_policy) {
    score -= 15;
    penalties.push("missing required policy citation");
  }

  if (!expected.must_cite_policy && actual.cited_policy && expected.failure_mode !== "hallucinated_policy") {
    score -= 5;
    penalties.push("unneeded policy citation");
  }

  if (actual.hallucinated_policy) {
    score -= 35;
    penalties.push("hallucinated policy reference");
  }

  if (expected.failure_mode === "cost_latency_tradeoff" && actual.cost_bucket === "high") {
    score -= 15;
    penalties.push("high cost for routine workflow");
  }

  if (expected.failure_mode === "cost_latency_tradeoff" && actual.latency_bucket === "slow") {
    score -= 10;
    penalties.push("slow path for routine workflow");
  }

  const finalScore = clampScore(score);
  return {
    case_id: expected.id,
    score: finalScore,
    passed: finalScore >= 80 && !actual.hallucinated_policy,
    penalties,
    severity: expected.severity,
    failure_mode: expected.failure_mode,
  };
}

export function summarizeRun(cases: WorkflowCase[], modelRun: ModelRun): RunSummary {
  const outcomeById = new Map(modelRun.outcomes.map((outcome) => [outcome.case_id, outcome]));
  const scores = cases.map((workflowCase) => {
    const outcome = outcomeById.get(workflowCase.id);
    if (!outcome) {
      return {
        case_id: workflowCase.id,
        score: 0,
        passed: false,
        penalties: ["missing model output"],
        severity: workflowCase.severity,
        failure_mode: workflowCase.failure_mode,
      };
    }
    return scoreCase(workflowCase, outcome);
  });

  const passed = scores.filter((score) => score.passed).length;
  const averageScore = scores.reduce((sum, score) => sum + score.score, 0) / scores.length;
  const humanReviews = modelRun.outcomes.filter((outcome) => outcome.human_review).length;
  const hallucinatedPolicyCount = modelRun.outcomes.filter((outcome) => outcome.hallucinated_policy).length;
  const missedEscalationCount = cases.filter((workflowCase) => {
    const outcome = outcomeById.get(workflowCase.id);
    return workflowCase.requires_human_review && outcome && !outcome.human_review;
  }).length;
  const overEscalationCount = cases.filter((workflowCase) => {
    const outcome = outcomeById.get(workflowCase.id);
    return !workflowCase.requires_human_review && outcome?.human_review;
  }).length;
  const highSeverityFailures = scores.filter((score) => score.severity === "high" && !score.passed).length;
  const highCostCount = modelRun.outcomes.filter((outcome) => outcome.cost_bucket === "high").length;
  const slowLatencyCount = modelRun.outcomes.filter((outcome) => outcome.latency_bucket === "slow").length;

  return {
    run_id: modelRun.id,
    label: modelRun.label,
    pass_rate: Math.round((passed / scores.length) * 100),
    average_score: Math.round(averageScore),
    human_review_rate: Math.round((humanReviews / scores.length) * 100),
    hallucinated_policy_count: hallucinatedPolicyCount,
    missed_escalation_count: missedEscalationCount,
    over_escalation_count: overEscalationCount,
    high_severity_failures: highSeverityFailures,
    high_cost_count: highCostCount,
    slow_latency_count: slowLatencyCount,
    scores,
  };
}

export function requiresBlockerReview(summary: RunSummary): boolean {
  return (
    summary.high_severity_failures > 0 ||
    summary.hallucinated_policy_count > 0 ||
    summary.missed_escalation_count > 0
  );
}

export function compareRuns(cases: WorkflowCase[], baselineRun: ModelRun, revisedRun: ModelRun): RunComparison {
  const baseline = summarizeRun(cases, baselineRun);
  const revised = summarizeRun(cases, revisedRun);
  const revisedNeedsReview = requiresBlockerReview(revised);
  const decision = revisedNeedsReview
    ? "Ship behind human-review gate after fixing high-severity hallucinated-policy and missed-escalation cases."
    : "Revised variant is ready for a controlled rollout with post-launch monitoring.";

  return {
    baseline,
    revised,
    pass_rate_delta: revised.pass_rate - baseline.pass_rate,
    average_score_delta: revised.average_score - baseline.average_score,
    hallucinated_policy_delta: revised.hallucinated_policy_count - baseline.hallucinated_policy_count,
    missed_escalation_delta: revised.missed_escalation_count - baseline.missed_escalation_count,
    decision,
  };
}
