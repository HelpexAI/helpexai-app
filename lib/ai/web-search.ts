export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}

function privacySafeQuery(question: string) {
  return question
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, " ")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

export async function searchWeb(question: string): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  const query = privacySafeQuery(question);
  if (!query) return [];

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 4,
      include_answer: false,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Web search failed with status ${response.status}`);

  const data = await response.json() as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };
  return (data.results ?? [])
    .filter((result) => result.title && result.url && result.content)
    .map((result) => ({
      title: result.title!,
      url: result.url!,
      content: result.content!.slice(0, 1_200),
    }));
}

export function formatWebContext(results: WebSearchResult[]) {
  if (!results.length) return "";
  return results
    .map((result, index) => `[Web ${index + 1}] ${result.title}\nURL: ${result.url}\n${result.content}`)
    .join("\n\n---\n\n");
}
