export async function fetchWithRetry(
  input: RequestInfo,
  init: RequestInit & { retries?: number },
  shouldRetry: (status: number) => boolean = (s) => s >= 500,
): Promise<Response> {
  const { retries = 3, ...rest } = init;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, rest);
      if (res.ok || !shouldRetry(res.status)) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastError = e;
      if ((e as { name?: string })?.name === "AbortError") throw e;
    }
    if (attempt < retries) {
      const delay = Math.min(2000 * Math.pow(2, attempt), 8000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError ?? new Error("Retry exhausted");
}
