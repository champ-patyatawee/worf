import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, FileText } from "lucide-react";
import type { FetchResult } from "../../stores/chatSessionStore";

function getHostname(url: string): string {
  try {
    // Ensure URL has protocol for the URL constructor
    const normalized = url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;
    return new URL(normalized).hostname;
  } catch {
    return url;
  }
}

export function UrlSourceCard({ sources }: { sources: FetchResult[] }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());

  if (!sources || sources.length === 0) return null;

  const validSources = sources.filter((s) => !s.error);

  if (validSources.length === 0) {
    // Show errors inline
    return (
      <div className="mt-2 px-3 py-2 rounded-[var(--radius-md)] border-2"
        style={{ backgroundColor: "var(--color-bg-primary)", borderColor: "var(--color-border-primary)" }}>
        <p className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
          ⚠️ Could not read pages: {sources.filter((s) => s.error).map((s) => s.url).join(", ")}
        </p>
      </div>
    );
  }

  const toggleUrl = (url: string) => {
    setExpandedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  return (
    <div className="mt-2">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius-md)] border-2 transition-colors"
        style={{
          backgroundColor: expanded ? "var(--color-bg-tertiary)" : "var(--color-bg-primary)",
          borderColor: "var(--color-border-primary)",
          color: "var(--color-text-secondary)",
        }}
      >
        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-xs font-semibold flex-1 text-left">
          Read page{validSources.length > 1 ? "s" : ""} ({validSources.length})
        </span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-1 space-y-1">
          {validSources.map((source, i) => (
            <div
              key={source.url}
              className="rounded-[var(--radius-md)] border-2 overflow-hidden"
              style={{ borderColor: "var(--color-border-primary)", backgroundColor: "var(--color-bg-primary)" }}
            >
              {/* Source header */}
              <button
                onClick={() => toggleUrl(source.url)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-[var(--color-bg-tertiary)] transition-colors"
                style={{ color: "var(--color-text-primary)" }}
              >
                <span className="text-xs font-bold min-w-[20px]" style={{ color: "var(--color-accent-primary)" }}>
                  [{i + 1}]
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{source.title || getHostname(source.url)}</p>
                  <p className="text-[11px] truncate" style={{ color: "var(--color-text-tertiary)" }}>
                    {source.url}
                  </p>
                </div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-[var(--color-bg-hover)] flex-shrink-0"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </button>

              {/* Expanded content (truncated) */}
              {expandedUrls.has(source.url) && source.content && (
                <div
                  className="px-3 py-2 border-t-2 max-h-40 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap"
                  style={{
                    borderColor: "var(--color-border-primary)",
                    backgroundColor: "var(--color-bg-secondary)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {source.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
