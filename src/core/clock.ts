/** Longest frame the rules are stepped with, e.g. after the tab was in the background. */
export const MAX_FRAME_SECONDS = 0.1;

/**
 * How much play time one frame is worth, in seconds. Every gameplay timer is
 * stepped with this value and nothing else, so while play is paused (an
 * upgrade offer is open) no time passes, and nothing builds up to be caught up
 * afterwards.
 */
export function playSeconds(frameMs: number, paused: boolean): number {
  if (paused) {
    return 0;
  }
  return Math.min(Math.max(0, frameMs) / 1000, MAX_FRAME_SECONDS);
}
