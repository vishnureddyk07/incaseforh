import '@testing-library/jest-dom';

// Silence certain noisy errors during tests if needed
const originalError = console.error;
console.error = (...args: any[]) => {
  // Suppress React act warnings and other benign messages in tests
  const msg = args[0]?.toString?.() || '';
  if (msg.includes('Warning: ReactDOM.render is no longer supported') || msg.includes('Warning: useLayoutEffect')) {
    return;
  }
  originalError(...args);
};
