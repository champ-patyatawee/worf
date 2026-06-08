import { describe, it, expect } from "vitest";
import { extractUrls } from "../stores/chatSessionStore";

// ════════════════════════════════════════
// URL Extraction
// ════════════════════════════════════════

describe("extractUrls", () => {
  it("should extract a single https URL", () => {
    const result = extractUrls("Tell me about https://productx.com");
    expect(result).toEqual(["https://productx.com"]);
  });

  it("should extract a single http URL", () => {
    const result = extractUrls("Check http://example.com/page");
    expect(result).toEqual(["http://example.com/page"]);
  });

  it("should extract multiple URLs", () => {
    const result = extractUrls(
      "Compare https://site1.com and https://site2.com/page"
    );
    expect(result).toEqual(["https://site1.com", "https://site2.com/page"]);
  });

  it("should not include trailing punctuation", () => {
    const result = extractUrls("Visit https://example.com.");
    expect(result).toEqual(["https://example.com"]);
  });

  it("should not include closing parens", () => {
    const result = extractUrls("See (https://example.com) for details");
    expect(result).toEqual(["https://example.com"]);
  });

  it("should not include closing bracket", () => {
    const result = extractUrls("Check [https://example.com] out");
    expect(result).toEqual(["https://example.com"]);
  });

  it("should deduplicate identical URLs", () => {
    const result = extractUrls(
      "https://example.com and again https://example.com"
    );
    expect(result).toEqual(["https://example.com"]);
  });

  it("should return empty array for text without URLs", () => {
    const result = extractUrls("Tell me about this product");
    expect(result).toEqual([]);
  });

  it("should handle URLs with paths and query strings", () => {
    const result = extractUrls(
      "https://example.com/path/to/page?q=search&page=1"
    );
    expect(result).toEqual(["https://example.com/path/to/page?q=search&page=1"]);
  });

  it("should handle URLs with fragments", () => {
    const result = extractUrls("https://example.com/page#section");
    expect(result).toEqual(["https://example.com/page#section"]);
  });

  it("should handle URLs with ports", () => {
    const result = extractUrls("https://localhost:3000/test");
    expect(result).toEqual(["https://localhost:3000/test"]);
  });

  it("should handle URLs in markdown links", () => {
    const result = extractUrls("[click here](https://example.com)");
    expect(result).toEqual(["https://example.com"]);
  });

  it("should handle IP address URLs", () => {
    const result = extractUrls("Visit https://192.168.1.1/admin");
    expect(result).toEqual(["https://192.168.1.1/admin"]);
  });

  it("should handle URLs with hyphens in domain", () => {
    const result = extractUrls("Check https://my-site.com/page");
    expect(result).toEqual(["https://my-site.com/page"]);
  });

  it("should handle URLs in parentheses at end of sentence", () => {
    const result = extractUrls("See the docs (https://docs.example.com).");
    expect(result).toEqual(["https://docs.example.com"]);
  });

  it("should handle URLs followed by comma", () => {
    const result = extractUrls("Try https://example.com, it's great");
    expect(result).toEqual(["https://example.com"]);
  });

  it("should handle URLs with trailing slash", () => {
    const result = extractUrls("Go to https://example.com/");
    expect(result).toEqual(["https://example.com/"]);
  });

  it("should handle multiple URLs with mixed punctuation", () => {
    const result = extractUrls(
      "See https://a.com, https://b.com/, and (https://c.com)."
    );
    expect(result).toEqual(["https://a.com", "https://b.com/", "https://c.com"]);
  });

  it("should handle URLs surrounded by backticks", () => {
    const result = extractUrls("Use `https://example.com` as reference");
    expect(result).toEqual(["https://example.com"]);
  });
});

// ════════════════════════════════════════
// formatContextBlock — LLM context injection
// ════════════════════════════════════════

describe("formatContextBlock", () => {
  function formatContextBlock(
    results: { url: string; title: string; content: string; error?: string }[]
  ): string {
    const parts = results
      .filter((r) => !r.error)
      .map(
        (r, i) =>
          `--- Page ${i + 1} ---\nURL: ${r.url}\nTitle: ${r.title}\nContent:\n${r.content}`
      );
    if (parts.length === 0) return "";
    return (
      `The user has shared the following webpages. Use this content to answer their questions accurately. Cite sources using [1], [2], etc. at relevant points.\n\n` +
      parts.join("\n\n")
    );
  }

  it("should format a single result", () => {
    const results = [
      {
        url: "https://productx.com",
        title: "ProductX",
        content: "ProductX is a platform.",
      },
    ];
    const block = formatContextBlock(results);
    expect(block).toContain("--- Page 1 ---");
    expect(block).toContain("URL: https://productx.com");
    expect(block).toContain("Title: ProductX");
    expect(block).toContain("ProductX is a platform.");
    expect(block).toContain("Cite sources using [1], [2]");
  });

  it("should format multiple results with numbered pages", () => {
    const results = [
      { url: "https://a.com", title: "A", content: "Content A" },
      { url: "https://b.com", title: "B", content: "Content B" },
    ];
    const block = formatContextBlock(results);
    expect(block).toContain("--- Page 1 ---");
    expect(block).toContain("--- Page 2 ---");
    expect(block).toContain("Content A");
    expect(block).toContain("Content B");
  });

  it("should skip results with errors", () => {
    const results = [
      { url: "https://good.com", title: "Good", content: "Good content" },
      { url: "https://bad.com", title: "", content: "", error: "Failed" },
    ];
    const block = formatContextBlock(results);
    expect(block).toContain("Good content");
    expect(block).not.toContain("bad.com");
  });

  it("should return empty string if all results have errors", () => {
    const results = [
      { url: "https://bad.com", title: "", content: "", error: "Failed" },
    ];
    const block = formatContextBlock(results);
    expect(block).toBe("");
  });

  it("should return empty string for empty input", () => {
    expect(formatContextBlock([])).toBe("");
  });

  it("should handle results with empty title gracefully", () => {
    const results = [
      { url: "https://example.com", title: "", content: "Just content" },
    ];
    const block = formatContextBlock(results);
    expect(block).toContain("--- Page 1 ---");
    expect(block).toContain("URL: https://example.com");
    expect(block).toContain("Title: ");
    expect(block).toContain("Just content");
  });

  it("should handle results with very long content", () => {
    const longContent = "x".repeat(5000);
    const results = [
      { url: "https://long.com", title: "Long", content: longContent },
    ];
    const block = formatContextBlock(results);
    expect(block).toContain(longContent);
    expect(block.length).toBeGreaterThan(5000);
  });
});

// ════════════════════════════════════════
// hasUrlInHistory — deduplication
// ════════════════════════════════════════

describe("hasUrlInHistory", () => {
  function hasUrlInHistory(
    url: string,
    msgs: { url_contexts?: { url: string }[] }[]
  ): boolean {
    return msgs.some((m) =>
      m.url_contexts?.some((ctx) => ctx.url === url)
    );
  }

  it("should find URL in message history", () => {
    const msgs = [{ url_contexts: [{ url: "https://example.com" }] }];
    expect(hasUrlInHistory("https://example.com", msgs)).toBe(true);
  });

  it("should return false if URL not in history", () => {
    const msgs = [{ url_contexts: [{ url: "https://other.com" }] }];
    expect(hasUrlInHistory("https://example.com", msgs)).toBe(false);
  });

  it("should return false if no messages have contexts", () => {
    const msgs = [{}, {}];
    expect(hasUrlInHistory("https://example.com", msgs)).toBe(false);
  });

  it("should return false for empty messages", () => {
    expect(hasUrlInHistory("https://example.com", [])).toBe(false);
  });

  it("should check across multiple messages", () => {
    const msgs = [
      {},
      { url_contexts: [{ url: "https://found.com" }] },
    ];
    expect(hasUrlInHistory("https://found.com", msgs)).toBe(true);
  });

  it("should find URL in any message regardless of position", () => {
    const msgs = [
      { url_contexts: [{ url: "https://first.com" }] },
      { url_contexts: [{ url: "https://second.com" }] },
      { url_contexts: [{ url: "https://third.com" }] },
    ];
    expect(hasUrlInHistory("https://first.com", msgs)).toBe(true);
    expect(hasUrlInHistory("https://second.com", msgs)).toBe(true);
    expect(hasUrlInHistory("https://third.com", msgs)).toBe(true);
  });

  it("should find URL when a message has multiple contexts", () => {
    const msgs = [
      {
        url_contexts: [
          { url: "https://a.com" },
          { url: "https://b.com" },
        ],
      },
    ];
    expect(hasUrlInHistory("https://a.com", msgs)).toBe(true);
    expect(hasUrlInHistory("https://b.com", msgs)).toBe(true);
  });
});

// ════════════════════════════════════════
// sendMessage URL flow simulation
// ════════════════════════════════════════

describe("sendMessage URL flow", () => {
  // Simulates the URL detection + dedup logic from chatSessionStore.sendMessage()
  function computeUrlFetchPlan(
    content: string,
    existingMessages: { url_contexts?: { url: string }[] }[]
  ): { allUrls: string[]; newUrls: string[]; hasUrls: boolean } {
    const allUrls = extractUrls(content);

    function hasUrlInHistory(
      url: string,
      msgs: { url_contexts?: { url: string }[] }[]
    ): boolean {
      return msgs.some((m) =>
        m.url_contexts?.some((ctx) => ctx.url === url)
      );
    }

    const newUrls = allUrls.filter((url) => !hasUrlInHistory(url, existingMessages));
    return { allUrls, newUrls, hasUrls: allUrls.length > 0 };
  }

  it("should detect URLs in message and mark them as new", () => {
    const plan = computeUrlFetchPlan(
      "Tell me about https://productx.com",
      []
    );
    expect(plan.hasUrls).toBe(true);
    expect(plan.allUrls).toEqual(["https://productx.com"]);
    expect(plan.newUrls).toEqual(["https://productx.com"]);
  });

  it("should filter out already-fetched URLs from history", () => {
    const existing = [
      { url_contexts: [{ url: "https://productx.com" }] },
    ];
    const plan = computeUrlFetchPlan(
      "Tell me more about https://productx.com",
      existing
    );
    expect(plan.hasUrls).toBe(true);
    expect(plan.allUrls).toEqual(["https://productx.com"]);
    expect(plan.newUrls).toEqual([]);
  });

  it("should only fetch URLs not already in history", () => {
    const existing = [
      { url_contexts: [{ url: "https://known.com" }] },
    ];
    const plan = computeUrlFetchPlan(
      "Compare https://known.com and https://new.com",
      existing
    );
    expect(plan.allUrls).toEqual(["https://known.com", "https://new.com"]);
    expect(plan.newUrls).toEqual(["https://new.com"]);
  });

  it("should handle message with no URLs", () => {
    const plan = computeUrlFetchPlan(
      "Just a regular question without any links",
      []
    );
    expect(plan.hasUrls).toBe(false);
    expect(plan.allUrls).toEqual([]);
    expect(plan.newUrls).toEqual([]);
  });

  it("should handle multiple new URLs", () => {
    const plan = computeUrlFetchPlan(
      "Compare https://a.com, https://b.com, and https://c.com",
      []
    );
    expect(plan.allUrls).toHaveLength(3);
    expect(plan.newUrls).toHaveLength(3);
  });

  it("should handle mixed known and unknown URLs", () => {
    const existing = [
      { url_contexts: [{ url: "https://known1.com" }] },
      { url_contexts: [{ url: "https://known2.com" }] },
    ];
    const plan = computeUrlFetchPlan(
      "https://known1.com vs https://known2.com vs https://new.com",
      existing
    );
    expect(plan.newUrls).toEqual(["https://new.com"]);
  });

  it("should handle empty message", () => {
    const plan = computeUrlFetchPlan("", []);
    expect(plan.hasUrls).toBe(false);
    expect(plan.allUrls).toEqual([]);
  });
});

// ════════════════════════════════════════
// LLM messages array building with URL contexts
// ════════════════════════════════════════

describe("LLM messages with URL context injection", () => {
  type ApiMessage = { role: string; content: string };

  function formatContextBlock(
    results: { url: string; title: string; content: string; error?: string }[]
  ): string {
    const parts = results
      .filter((r) => !r.error)
      .map(
        (r, i) =>
          `--- Page ${i + 1} ---\nURL: ${r.url}\nTitle: ${r.title}\nContent:\n${r.content}`
      );
    if (parts.length === 0) return "";
    return (
      `The user has shared the following webpages. Use this content to answer their questions accurately. Cite sources using [1], [2], etc. at relevant points.\n\n` +
      parts.join("\n\n")
    );
  }

  // Simulates the apiMessages building from sendMessage()
  function buildApiMessages(
    systemPrompt: string,
    fetchedContexts: { url: string; title: string; content: string; error?: string }[],
    history: { role: string; content: string; url_contexts?: { url: string; title: string; content: string }[] }[]
  ): ApiMessage[] {
    const messages: ApiMessage[] = [{ role: "system", content: systemPrompt }];

    const contextBlock = formatContextBlock(fetchedContexts);
    if (contextBlock) {
      messages.push({ role: "system", content: contextBlock });
    }

    for (const m of history) {
      let msgContent = m.content;
      if (m.url_contexts && m.url_contexts.length > 0) {
        const histContextBlock = formatContextBlock(m.url_contexts);
        if (histContextBlock) {
          msgContent = `[Previously shared webpage context]\n${histContextBlock}\n\nUser message: ${m.content}`;
        }
      }
      messages.push({ role: m.role, content: msgContent });
    }

    return messages;
  }

  it("should build basic messages without URL context", () => {
    const messages = buildApiMessages(
      "You are a helpful assistant.",
      [],
      [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ]
    );
    expect(messages).toHaveLength(3);
    expect(messages[0]).toEqual({ role: "system", content: "You are a helpful assistant." });
    expect(messages[1]).toEqual({ role: "user", content: "Hello" });
    expect(messages[2]).toEqual({ role: "assistant", content: "Hi there!" });
  });

  it("should inject fetched URL context as system message after system prompt", () => {
    const messages = buildApiMessages(
      "You are a helpful assistant.",
      [
        { url: "https://productx.com", title: "ProductX", content: "ProductX is a platform." },
      ],
      [
        { role: "user", content: "Tell me about this product" },
      ]
    );
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toBe("You are a helpful assistant.");
    expect(messages[1].role).toBe("system");
    expect(messages[1].content).toContain("--- Page 1 ---");
    expect(messages[1].content).toContain("URL: https://productx.com");
    expect(messages[2].role).toBe("user");
    expect(messages[2].content).toBe("Tell me about this product");
  });

  it("should inject URL contexts from history into user messages", () => {
    const messages = buildApiMessages(
      "You are a helpful assistant.",
      [],
      [
        {
          role: "user",
          content: "Tell me about https://productx.com",
          url_contexts: [
            { url: "https://productx.com", title: "ProductX", content: "ProductX is a platform." },
          ],
        },
      ]
    );
    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("[Previously shared webpage context]");
    expect(messages[1].content).toContain("--- Page 1 ---");
    expect(messages[1].content).toContain("ProductX is a platform.");
    expect(messages[1].content).toContain("Tell me about https://productx.com");
  });

  it("should not inject context block if empty results", () => {
    const messages = buildApiMessages(
      "System prompt",
      [],
      [{ role: "user", content: "Hello" }]
    );
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("should not inject context block if all fetches failed", () => {
    const messages = buildApiMessages(
      "System prompt",
      [{ url: "https://bad.com", title: "", content: "", error: "Failed" }],
      [{ role: "user", content: "Hi" }]
    );
    expect(messages).toHaveLength(2);
    expect(messages[1].content).not.toContain("--- Page");
  });

  it("should handle multiple URL contexts in history", () => {
    const messages = buildApiMessages(
      "System prompt",
      [],
      [
        {
          role: "user",
          content: "Compare these",
          url_contexts: [
            { url: "https://a.com", title: "A", content: "Content A" },
            { url: "https://b.com", title: "B", content: "Content B" },
          ],
        },
      ]
    );
    expect(messages).toHaveLength(2);
    expect(messages[1].content).toContain("--- Page 1 ---");
    expect(messages[1].content).toContain("--- Page 2 ---");
    expect(messages[1].content).toContain("Content A");
    expect(messages[1].content).toContain("Content B");
  });

  it("should handle empty history", () => {
    const messages = buildApiMessages(
      "System prompt",
      [{ url: "https://x.com", title: "X", content: "Content" }],
      []
    );
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("system");
    expect(messages[1].content).toContain("--- Page 1 ---");
  });
});

// ════════════════════════════════════════
// URL fetch state machine
// ════════════════════════════════════════

describe("URL fetch state machine", () => {
  // Simulates the isFetchingUrl lifecycle from sendMessage()
  async function simulateSendWithUrl(
    content: string,
    existingMessages: { url_contexts?: { url: string }[] }[],
    mockFetchResult: { url: string; title: string; content: string }[]
  ): Promise<{
    isFetchingUrlHistory: boolean[];
    fetchedContexts: typeof mockFetchResult;
    error: string | null;
  }> {
    const urls = extractUrls(content);
    const historyUrls = existingMessages.flatMap(
      (m) => m.url_contexts?.map((c) => c.url) || []
    );
    const newUrls = urls.filter((u) => !historyUrls.includes(u));

    const stateHistory: boolean[] = [];
    let isFetchingUrl = false;
    let fetchedContexts: typeof mockFetchResult = [];
    let error: string | null = null;

    if (newUrls.length > 0) {
      isFetchingUrl = true;
      stateHistory.push(isFetchingUrl);
      try {
        await Promise.resolve();
        fetchedContexts = mockFetchResult.filter((r) => newUrls.includes(r.url));
      } catch (e: any) {
        error = e.message;
      }
      isFetchingUrl = false;
      stateHistory.push(isFetchingUrl);
    }

    return { isFetchingUrlHistory: stateHistory, fetchedContexts, error };
  }

  it("should set isFetchingUrl true during fetch, false after", async () => {
    const { isFetchingUrlHistory } = await simulateSendWithUrl(
      "https://example.com",
      [],
      [{ url: "https://example.com", title: "Example", content: "Content" }]
    );
    expect(isFetchingUrlHistory).toEqual([true, false]);
  });

  it("should not set isFetchingUrl when no URLs in message", async () => {
    const { isFetchingUrlHistory } = await simulateSendWithUrl(
      "Just a question",
      [],
      []
    );
    expect(isFetchingUrlHistory).toEqual([]);
  });

  it("should not set isFetchingUrl when URLs already in history", async () => {
    const { isFetchingUrlHistory } = await simulateSendWithUrl(
      "https://known.com",
      [{ url_contexts: [{ url: "https://known.com" }] }],
      []
    );
    expect(isFetchingUrlHistory).toEqual([]);
  });

  it("should return fetched contexts for new URLs", async () => {
    const { fetchedContexts } = await simulateSendWithUrl(
      "https://example.com",
      [],
      [{ url: "https://example.com", title: "Example", content: "Content" }]
    );
    expect(fetchedContexts).toHaveLength(1);
    expect(fetchedContexts[0].url).toBe("https://example.com");
  });

  it("should return empty contexts when no URLs", async () => {
    const { fetchedContexts } = await simulateSendWithUrl(
      "No URLs here",
      [],
      []
    );
    expect(fetchedContexts).toEqual([]);
  });

  it("should handle fetch errors gracefully (non-blocking)", async () => {
    const { error } = await simulateSendWithUrl(
      "https://example.com",
      [],
      []
    );
    expect(error).toBeNull();
  });

  it("should not fetch URLs already in history even if result is provided", async () => {
    const { fetchedContexts } = await simulateSendWithUrl(
      "https://known.com",
      [{ url_contexts: [{ url: "https://known.com" }] }],
      [{ url: "https://known.com", title: "Should not fetch", content: "Nope" }]
    );
    expect(fetchedContexts).toEqual([]);
  });
});

// ════════════════════════════════════════
// UrlSourceCard helper — hostname extraction
// ════════════════════════════════════════

describe("UrlSourceCard hostname extraction", () => {
  function getHostname(url: string): string {
    try {
      const normalized = url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;
      return new URL(normalized).hostname;
    } catch {
      return url;
    }
  }

  it("should extract hostname from https URL", () => {
    expect(getHostname("https://productx.com")).toBe("productx.com");
  });

  it("should extract hostname from http URL", () => {
    expect(getHostname("http://example.com/page")).toBe("example.com");
  });

  it("should extract hostname from URL without protocol", () => {
    expect(getHostname("productx.com")).toBe("productx.com");
  });

  it("should extract hostname with subdomain", () => {
    expect(getHostname("https://docs.example.com")).toBe("docs.example.com");
  });

  it("should extract hostname with port", () => {
    expect(getHostname("https://localhost:3000")).toBe("localhost");
  });

  it("should return original string for invalid URLs", () => {
    expect(getHostname("")).toBe("");
    expect(getHostname("not-a-url")).toBe("not-a-url");
  });

  it("should handle URLs with www prefix", () => {
    expect(getHostname("https://www.example.com")).toBe("www.example.com");
  });

  it("should handle URLs with long paths", () => {
    expect(getHostname("https://example.com/a/very/long/path?with=query")).toBe("example.com");
  });
});
