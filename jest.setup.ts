// Enable React act() environment for testing
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

// Polyfill requestAnimationFrame/cancelAnimationFrame for Node.js test environment
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id)
}
