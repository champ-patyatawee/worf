export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createDMSlug(name: string): string {
  return slugify(name);
}

export function parseDMSlug(slug: string): string | null {
  if (!slug || slug.length === 0) return null;
  return slug;
}

export function createChannelSlug(name: string): string {
  return slugify(name);
}

export function parseChannelSlug(slug: string): string | null {
  if (!slug || slug.length === 0) return null;
  return slug;
}
