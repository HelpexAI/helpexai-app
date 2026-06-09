type Context = Record<string, unknown>;

function normalizeError(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { message: String(error) };
}

async function sendToBetterStack(payload: Context) {
  const token = process.env.BETTERSTACK_SOURCE_TOKEN;
  const host = process.env.BETTERSTACK_INGESTING_HOST;
  if (!token || !host) return;

  try {
    await fetch(host.startsWith("http") ? host : `https://${host}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1_500),
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      message: "betterstack_delivery_failed",
      error: normalizeError(error),
    }));
  }
}

export async function logEvent(message: string, context: Context = {}) {
  const payload = {
    level: "info",
    message,
    dt: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    ...context,
  };
  console.info(JSON.stringify(payload));
  await sendToBetterStack(payload);
}

export async function reportError(error: unknown, context: Context = {}) {
  const normalized = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { message: String(error) };

  const payload = {
    level: "error",
    message: "application_error",
    dt: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    ...context,
    error: normalized,
  };
  console.error(JSON.stringify(payload));
  await sendToBetterStack(payload);
}
