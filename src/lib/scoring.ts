const BASE_POINTS = 500;
const SPEED_BONUS_MAX = 500;

/**
 * Correct answers score a flat base plus a speed bonus that decays
 * linearly to 0 as the player uses up the full time window.
 */
export function calculatePoints(
  isCorrect: boolean,
  timeMs: number,
  windowSeconds: number
): number {
  if (!isCorrect) return 0;
  const windowMs = windowSeconds * 1000;
  const remainingFrac = Math.max(0, Math.min(1, 1 - timeMs / windowMs));
  return Math.round(BASE_POINTS + SPEED_BONUS_MAX * remainingFrac);
}
