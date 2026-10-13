const USER_AGENT = "master-duel-ai-advisor (+https://github.com/BettTer/master-duel-ai-advisor)";

export async function fetchBytes(url: string, timeoutSeconds = 120): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(timeoutSeconds * 1000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function fetchText(url: string, timeoutSeconds = 30): Promise<string> {
  return new TextDecoder().decode(await fetchBytes(url, timeoutSeconds));
}

export async function fetchJson(url: string, timeoutSeconds = 60): Promise<any> {
  return JSON.parse(await fetchText(url, timeoutSeconds));
}
