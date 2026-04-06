// ──────────────────────────────────────────────
// voting.constants.ts — Voting domain constants
// SRP: quorum thresholds, timeouts, and voting rules only
// ──────────────────────────────────────────────

export const VOTING_DEFAULTS = {
  /** Fraction of online members required for a quorum (0–1) */
  QUORUM_THRESHOLD: 0.5,

  /** Fraction of votes required for consensus (0–1) */
  CONSENSUS_THRESHOLD: 0.67,

  /** Proposal auto-expiry in milliseconds (5 minutes) */
  PROPOSAL_TTL_MS: 5 * 60 * 1000,

  /** Minimum time between proposals in the same room (30 seconds) */
  PROPOSAL_COOLDOWN_MS: 30 * 1000,

  /** Maximum concurrent active proposals per room */
  MAX_ACTIVE_PROPOSALS: 1,
} as const;
