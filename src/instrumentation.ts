/**
 * Next.js instrumentation hook: runs once per server instance before it
 * handles requests. Wires the composition root (identity ports → modules).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerServerDependencies } = await import("./composition-root");
    registerServerDependencies();
  }
}
