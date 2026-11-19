// ──────────────────────────────────────────────
// throttleLatest.ts — pass on at most one value per interval, always the newest.
// The dial redraws itself on every drag step but tells the rest of the screen
// only a few times a second; flush() sends the final value on release.
// ──────────────────────────────────────────────

export function throttleLatest<T>(fn: (value: T) => void, intervalMs: number) {
  let lastSent = -Infinity;
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const send = () => {
    timer = null;
    if (!pending) return;
    const { value } = pending;
    pending = null;
    lastSent = Date.now();
    fn(value);
  };

  return {
    push(value: T) {
      pending = { value };
      if (timer) return;
      const wait = lastSent + intervalMs - Date.now();
      if (wait <= 0) send();
      else timer = setTimeout(send, wait);
    },
    flush() {
      if (timer) clearTimeout(timer);
      send();
    },
  };
}
