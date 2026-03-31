// Ensure Performance API methods exist before other modules evaluate.
if (typeof performance !== 'undefined') {
  const perf = performance as Performance & {
    clearMarks?: (markName?: string) => void;
    clearMeasures?: (measureName?: string) => void;
  };

  if (typeof perf.clearMarks !== 'function') {
    perf.clearMarks = () => {};
  }

  if (typeof perf.clearMeasures !== 'function') {
    perf.clearMeasures = () => {};
  }
}
