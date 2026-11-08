import type { ScamAnalysis, ScamFinding, ScamRiskLevel } from "@/lib/ai/scam";
import type { LocationCheck } from "./types";

/**
 * Adds the two database-level protections to the transcript analysis:
 * a location mismatch adds 50 points, and a blocked area code forces 100.
 * Both are additive findings and never replace the base language signals.
 */
export function applyProtectionFlags(
  base: ScamAnalysis,
  location: LocationCheck,
  options: { blocked: boolean; blockReason?: string | null; blockedAreaCode?: string | null },
): ScamAnalysis {
  const extra: ScamFinding[] = [];

  if (options.blocked) {
    extra.push({
      id: "blocked_area_code",
      category: "contradiction",
      label: "Blocked area code",
      severity: "high",
      weight: 50,
      quotes: [options.blockedAreaCode ? `Area code ${options.blockedAreaCode}` : "Blocked caller"],
      explanation:
        options.blockReason ||
        "This area code is on your block list. The call is logged at the maximum scam score.",
    });
  }

  if (location.mismatch) {
    extra.push({
      id: "location_mismatch",
      category: "contradiction",
      label: "Location mismatch",
      severity: "high",
      weight: 50,
      quotes: [location.reason ?? "The caller's area code does not match the network origin."],
      explanation:
        "The area code assigned to the caller ID does not match the state or country the call actually came from. This added 50 points to the scam score.",
    });
  }

  const findings = [...extra, ...base.findings];
  let score = base.score;
  if (location.mismatch) score += 50;
  if (options.blocked) score = 100;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const risk: ScamRiskLevel = score >= 60 ? "high" : score >= 25 ? "medium" : "low";

  let headline = base.headline;
  let summary = base.summary;
  if (options.blocked) {
    headline = "This area code is blocked.";
    summary = `${options.blockedAreaCode ? `Calls from area code ${options.blockedAreaCode} are blocked. ` : "This caller is blocked. "}The attempt was logged at a 100/100 scam score. ${base.summary}`;
  } else if (location.mismatch) {
    headline = "Caller location doesn't match the number.";
    summary = `${location.reason ?? "The network origin does not match the caller ID."} That mismatch added 50 points to the score. ${base.summary}`;
  }

  return {
    ...base,
    score,
    risk,
    headline,
    summary,
    findings: findings.sort((a, b) => {
      const rank = { high: 3, medium: 2, low: 1 };
      return rank[b.severity] - rank[a.severity] || b.weight - a.weight;
    }),
    stats: {
      ...base.stats,
      critical: base.stats.critical + extra.filter((finding) => finding.severity === "high").length,
    },
  };
}
