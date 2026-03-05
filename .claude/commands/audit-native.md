Analyze all files in src/ and identify:

1. Web APIs used that won't work on React Native (window, document, DOM APIs)
2. Missing error handling or unhandled edge cases
3. Memory leaks — event listeners not cleaned up, GL resources not disposed
4. GL context lifecycle issues — what happens on unmount, background, context lost
5. Platform-specific issues — iOS vs Android differences not handled
6. Polyfill gaps — Web APIs that Three.js needs but polyfills.ts doesn't cover
7. Touch/pointer event edge cases vs web behavior

For each finding, provide: file:line, severity (critical/medium/low), and a proposed fix.
Prioritize by impact on stability.
