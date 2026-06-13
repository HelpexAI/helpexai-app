const CREEM_API_BASE =
  process.env.CREEM_TEST_MODE === "true"
    ? "https://test-api.creem.io/v1"
    : "https://api.creem.io/v1";

function getCreemApiKey() {
  const apiKey = process.env.CREEM_API_KEY;

  if (!apiKey) {
    throw new Error("CREEM_API_KEY is not configured.");
  }

  return apiKey;
}

export async function creemRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${CREEM_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getCreemApiKey(),
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Creem request failed with status ${response.status}`,
    );
  }

  return data as T;
}

export function validCreemProductId(id?: string | null) {
  return typeof id === "string" && id.startsWith("prod_");
}

export type CreemCheckoutResponse = {
  id: string;
  checkout_url: string;
  status?: string;
  request_id?: string;
  metadata?: Record<string, unknown>;
};

export async function createCreemCheckoutSession({
  productId,
  accountId,
  successUrl,
  customerEmail,
  metadata,
}: {
  productId: string;
  accountId: string;
  successUrl: string;
  customerEmail: string;
  metadata: {
    user_id: string;
    account_id: string;
    category_slug: string;
    plan_slug: string;
  };
}) {
  return creemRequest<CreemCheckoutResponse>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      product_id: productId,
      request_id: accountId,
      success_url: successUrl,
      customer: {
        email: customerEmail,
      },
      metadata,
    }),
  });
}

export type CreemTransaction = {
  id: string;
  amount?: number;
  amount_paid?: number;
  refunded_amount?: number;
  currency?: string;
  created_at?: number | string;
};

export type CreemTransactionsResponse = {
  items?: CreemTransaction[];
  data?: CreemTransaction[];
};

export async function listCreemCustomerTransactions(customerId: string) {
  const params = new URLSearchParams({
    customer_id: customerId,
    page_number: "1",
    page_size: "12",
  });

  return creemRequest<CreemTransactionsResponse>(
    `/transactions/search?${params.toString()}`,
    {
      method: "GET",
    },
  );
}

export type CreemCustomerPortalResponse = {
  customer_portal_link?: string;
  url?: string;
  link?: string;
};

export async function createCreemCustomerPortalLink(customerId: string) {
  return creemRequest<CreemCustomerPortalResponse>("/customers/billing", {
    method: "POST",
    body: JSON.stringify({
      customer_id: customerId,
    }),
  });
}
