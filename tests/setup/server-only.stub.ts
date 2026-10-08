// Vitest runs plain Node, where `import "server-only"` would throw. The real
// guard still protects every Next.js client bundle; tests alias it to this no-op.
export {};
