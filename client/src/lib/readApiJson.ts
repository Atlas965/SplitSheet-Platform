/** Safely parse fetch responses — avoid "Unexpected token '<'" when HTML is returned. */
export async function readApiJson<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!text) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    return {} as T;
  }

  const looksHtml =
    contentType.includes("text/html") ||
    /^\s*<(!DOCTYPE|html|head|body)\b/i.test(text);

  if (looksHtml) {
    throw new Error(
      res.status === 404
        ? "Voice API is not available on this server yet. Restart the local server (or redeploy) so /api/copilot/voice routes are loaded."
        : `Server returned a web page instead of JSON (${res.status}). If you're on production, redeploy so voice routes are included.`,
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Invalid server response (${res.status}). ${text.slice(0, 120)}`,
    );
  }

  if (!res.ok) {
    throw new Error(
      data?.error || data?.message || `Request failed (${res.status})`,
    );
  }

  return data as T;
}
