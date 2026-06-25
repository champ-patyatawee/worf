/**
 * Parse [[wikilinks]] from Markdown content.
 * Returns an array of { target, display } objects.
 */
export interface Wikilink {
  target: string;
  display: string;
}

const WIKILINK_REGEX = /\[\[([^\[\]]+?)(?:\|([^\[\]]+?))?\]\]/g;

export function parseWikilinks(content: string): Wikilink[] {
  if (!content) return [];
  const links: Wikilink[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(WIKILINK_REGEX.source, "g");
  while ((match = regex.exec(content)) !== null) {
    links.push({
      target: match[1].trim(),
      display: (match[2] || match[1]).trim(),
    });
  }
  return links;
}

/**
 * Generate a URL-safe slug from a title string.
 */
export function generateSlug(title: string): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/**
 * Count words in content, excluding whitespace and Markdown headings.
 */
export function countWords(content: string): number {
  if (!content) return 0;
  // Strip leading # heading markers for cleaner count
  const cleaned = content.replace(/^#+\s*/gm, "");
  const words = cleaned.trim().split(/\s+/);
  return words.filter((w) => w.length > 0).length;
}

/**
 * Extract #tags from content (tags at word boundaries).
 */
export function extractTags(content: string): string[] {
  if (!content) return [];
  const tagRegex = /(?:^|\s)(#([a-zA-Z0-9_-]+))/g;
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(content)) !== null) {
    if (match[2]) {
      tags.push(match[2]);
    }
  }
  return [...new Set(tags)];
}

/**
 * Strip markdown to plain text for previews/snippets.
 */
export function markdownToPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, "$2$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, "$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Pre-process markdown content to convert [[wikilinks]] into markdown links
 * that ReactMarkdown can render as clickable anchors.
 */
export function preprocessWikilinks(
  content: string,
  notesLookup: Map<string, { slug: string; title: string }>
): string {
  return content.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match: string, target: string, display?: string) => {
      const key = target.trim();
      const found = notesLookup.get(key);
      const text = display?.trim() || key;
      if (found) {
        return `[${text}](/notes/${found.slug})`;
      }
      return `[${text}](/notes/${encodeURIComponent(key)})`;
    }
  );
}

/**
 * Build a lookup map from notes array for quick wikilink resolution.
 */
export function buildNotesLookup(
  notes: Array<{ title: string; slug: string }>
): Map<string, { slug: string; title: string }> {
  const map = new Map<string, { slug: string; title: string }>();
  for (const note of notes) {
    map.set(note.title, { slug: note.slug, title: note.title });
    map.set(note.slug, { slug: note.slug, title: note.title });
  }
  return map;
}