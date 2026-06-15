type Context = Record<string, unknown>;

const DELIVERY_TIMEOUT_MS = 1_500;
const DELIVERY_FAILURE_COOLDOWN_MS = 60_000;
let deliveryUnavailableUntil = 0;
let deliveryFailureReported = false;

function normalizeError(error: unknown) {
  if (!(error instanceof Error)) return { message: String(error) };

  const cause = error.cause instanceof Error
    ? { name: error.cause.name, message: error.cause.message }
    : error.cause
      ? { message: String(error.cause) }
      : undefined;

  return { name: error.name, message: error.message, stack: error.stack, cause };
}

async function sendToBetterStack(payload: Context) {
  const token = process.env.BETTERSTACK_SOURCE_TOKEN;
  const host = process.env.BETTERSTACK_INGESTING_HOST;
  if (!token || !host) return;
  if (Date.now() < deliveryUnavailableUntil) return;

  try {
    const response = await fetch(host.startsWith("http") ? host : `https://${host}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Better Stack returned HTTP ${response.status}.`);
    }

    deliveryUnavailableUntil = 0;
    deliveryFailureReported = false;
  } catch (error) {
    deliveryUnavailableUntil = Date.now() + DELIVERY_FAILURE_COOLDOWN_MS;
    if (!deliveryFailureReported) {
      deliveryFailureReported = true;
      console.error(JSON.stringify({
        level: "error",
        message: "betterstack_delivery_failed",
        retryAfterSeconds: DELIVERY_FAILURE_COOLDOWN_MS / 1_000,
        error: normalizeError(error),
      }));
    }
  }
}

function deliver(payload: Context) {
  // Observability must never delay user-facing API requests. Failures are
  // reported locally and retried after a short cooldown.
  void sendToBetterStack(payload);
}

export function logEvent(message: string, context: Context = {}) {
  const payload = {
    level: "info",
    message,
    dt: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    ...context,
  };
  console.info(JSON.stringify(payload));
  deliver(payload);
}

export function reportError(error: unknown, context: Context = {}) {
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
  deliver(payload);
}
