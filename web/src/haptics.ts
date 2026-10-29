/** A short, best-effort tap. Unsupported devices continue without haptics. */
export function vibrate(enabled: boolean, duration = 20): boolean {
  if (!enabled || typeof navigator.vibrate !== 'function') return false;
  try { return navigator.vibrate(duration); } catch { return false; }
}
