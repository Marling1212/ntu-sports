export { getDefaultTiebreakerConfig, normalizeTiebreakerConfig, DEFAULT_TIEBREAKER_ORDER } from "./config";
export {
  computeStandings,
  type StandingRow,
  type MatchForStandings,
  type PlayerForStandings,
  type ComputeStandingsOptions,
} from "./compute";
export { getTiebreakerRulesText } from "./rulesText";
export { computeLockedSeeds, type LockDetectionOptions } from "./lockDetection";
