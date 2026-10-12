// Plain console logging that shows up in Netlify's function log.
// Never pass API keys or other secrets here.
export function createLogger(requestId) {
  const prefix = `[identify ${requestId}]`;
  return {
    info: (...args) => console.log(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
  };
}
