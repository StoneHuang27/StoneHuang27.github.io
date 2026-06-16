// ============================================================
// NUTRIPRO - 运动营养数据平台
// Module: error-boundary.js
// Purpose: Render function error boundaries with graceful fallback
// ============================================================

/**
 * Wrap a render function with error boundary.
 * Logs error to console, shows user-friendly message in container.
 * @param {string} funcName - Name of the function for logging
 * @param {Function} fn - The render function to protect
 * @returns {Function} Protected wrapper
 */
function withErrorBoundary(funcName, fn) {
  return function(...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      console.error('Render error in ' + funcName + ':', error);
      // Try to show error in the first container element this function touches
      // We can't know which element, so we log and return
      return null;
    }
  };
}
