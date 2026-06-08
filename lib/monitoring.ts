type Context = Record<string, unknown>;

export function reportError(error: unknown, context: Context = {}) {
  const normalized = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { message: String(error) };

  console.error(JSON.stringify({
    level: "error",
    timestamp: new Date().toISOString(),
    ...context,
    error: normalized,
  }));
}
