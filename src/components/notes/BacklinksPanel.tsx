import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { noteStore } from "./noteStore";
import type { LinkInfo } from "./Types";

interface BacklinksPanelProps {
  backlinks: LinkInfo[];
}

export function BacklinksPanel({ backlinks }: BacklinksPanelProps) {
  const navigate = useNavigate();

  if (!backlinks || backlinks.length === 0) return null;

  const handleLinkClick = (slug: string) => {
    navigate(`/notes/${slug}`);
  };

  return (
    <div
      className="rounded-[var(--radius-md)] border-2 overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg-tertiary)",
        borderColor: "var(--color-border-primary)",
      }}
    >
      <details open>
        <summary
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:opacity-80 transition-opacity"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Backlinks ({backlinks.length})
        </summary>
        <div className="px-2 pb-2 space-y-1">
          {backlinks.map((link) => (
            <button
              key={`${link.note_id}-${link.link_text}`}
              onClick={() => handleLinkClick(link.note_slug)}
              className="flex items-start gap-2 w-full px-2.5 py-2 rounded-[var(--radius-sm)] text-left text-sm transition-colors hover:bg-[var(--color-bg-hover)] group"
              style={{ color: "var(--color-text-primary)" }}
            >
              <ExternalLink
                className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                style={{ color: "var(--color-accent-primary)" }}
              />
              <div className="min-w-0 flex-1">
                <span className="font-medium text-xs" style={{ color: "var(--color-accent-primary)" }}>
                  {link.note_title}
                </span>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-tertiary)" }}>
                  {link.link_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}