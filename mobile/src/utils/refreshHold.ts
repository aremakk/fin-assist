/**
 * Coordinates data load + brand refresh animation.
 * Menu settles only after both are done (and after empty animation).
 */
export function createBrandRefreshGate(settle: () => void) {
  let dataReady = false;
  let animReady = false;
  let settled = false;

  const trySettle = () => {
    if (settled || !dataReady || !animReady) return;
    settled = true;
    settle();
  };

  return {
    reset() {
      dataReady = false;
      animReady = false;
      settled = false;
    },
    markDataReady() {
      dataReady = true;
      trySettle();
    },
    markAnimReady() {
      animReady = true;
      trySettle();
    },
  };
}
