import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { generateId } from '../utils';

interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  favicon: string | null;
  siteName: string | null;
}

interface MetadataResult {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

export class LinkService {
  private readonly URL_MAX_LENGTH = 2048;
  private readonly TITLE_MAX_LENGTH = 500;
  private readonly DESCRIPTION_MAX_LENGTH = 1000;

  /**
   * Validate and sanitize a URL
   */
  sanitizeUrl(rawUrl: string): string {
    try {
      const url = new URL(rawUrl);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new AppError(400, 'Only HTTP and HTTPS URLs are allowed');
      }

      // Block dangerous protocols
      const dangerousProtocols = ['javascript:', 'data:', 'blob:'];
      const cleanUrl = rawUrl.replace(dangerousProtocols.join(''), '');
      if (cleanUrl !== rawUrl) {
        throw new AppError(400, 'Invalid URL protocol');
      }

      // Limit URL length
      if (rawUrl.length > this.URL_MAX_LENGTH) {
        throw new AppError(400, `URL too long (max ${this.URL_MAX_LENGTH} characters)`);
      }

      return rawUrl;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(400, 'Invalid URL format');
    }
  }

  /**
   * Check if URL is accessible (basic check)
   */
  isUrlAccessible(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Block localhost, private IPs, etc in production
      if (process.env.NODE_ENV === 'production') {
        const blockedHosts = [
          'localhost',
          '127.0.0.1',
          '0.0.0.0',
          '::1',
        ];
        const host = parsed.hostname.toLowerCase();
        if (blockedHosts.some(blocked => host.includes(blocked))) {
          return false;
        }
        // Block private IP ranges
        if (/^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^192\.168\./.test(host)) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract metadata from HTML content
   */
  parseHtmlMetadata(html: string, baseUrl: string): MetadataResult {
    const result: MetadataResult = {};

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      result.title = this.truncate(titleMatch[1].trim(), this.TITLE_MAX_LENGTH);
    }

    // Extract meta tags
    const metaPatterns: Array<{ pattern: RegExp; key: keyof MetadataResult }> = [
      // Open Graph
      { pattern: /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i, key: 'title' },
      { pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i, key: 'title' },
      { pattern: /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i, key: 'description' },
      { pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*>/i, key: 'description' },
      { pattern: /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i, key: 'image' },
      { pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i, key: 'image' },
      { pattern: /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i, key: 'siteName' },
      // Standard meta tags
      { pattern: /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i, key: 'description' },
      { pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i, key: 'description' },
      { pattern: /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i, key: 'image' },
      // Link tags for favicon
      { pattern: /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["'][^>]*>/i, key: 'favicon' },
      { pattern: /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["'][^>]*>/i, key: 'favicon' },
    ];

    for (const { pattern, key } of metaPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        if (!result[key]) {
          result[key] = this.resolveUrl(value, baseUrl);
        }
      }
    }

    // Special handling for description
    if (!result.description) {
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
      if (descMatch) {
        const contentMatch = html.substring(html.indexOf(descMatch[0])).match(/content=["']([^"']+)["']/i);
        if (contentMatch && contentMatch[1]) {
          result.description = this.truncate(contentMatch[1].trim(), this.DESCRIPTION_MAX_LENGTH);
        }
      }
    }

    return result;
  }

  /**
   * Resolve relative URLs to absolute
   */
  resolveUrl(relativeUrl: string, baseUrl: string): string {
    if (!relativeUrl) return '';
    
    try {
      // If already absolute, return as-is
      if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
        return relativeUrl;
      }
      
      const base = new URL(baseUrl);
      
      // Handle protocol-relative URLs
      if (relativeUrl.startsWith('//')) {
        return `${base.protocol}${relativeUrl}`;
      }
      
      // Handle absolute paths
      if (relativeUrl.startsWith('/')) {
        return `${base.protocol}//${base.host}${relativeUrl}`;
      }
      
      // Handle relative paths
      return new URL(relativeUrl, baseUrl).toString();
    } catch {
      return relativeUrl;
    }
  }

  /**
   * Extract site name from URL or HTML
   */
  extractSiteName(url: string, html: string): string | null {
    // First try og:site_name
    const ogSiteMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    if (ogSiteMatch && ogSiteMatch[1]) {
      return ogSiteMatch[1].trim();
    }

    // Fall back to hostname
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  /**
   * Truncate string to max length
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Fetch and extract link preview metadata
   */
  async extractLinkPreview(rawUrl: string): Promise<LinkPreview> {
    const url = this.sanitizeUrl(rawUrl);

    if (!this.isUrlAccessible(url)) {
      throw new AppError(400, 'URL is not accessible');
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new AppError(502, 'Failed to fetch URL');
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new AppError(400, 'URL does not point to an HTML page');
      }

      const html = await response.text();
      const metadata = this.parseHtmlMetadata(html, url);

      return {
        url,
        title: metadata.title || null,
        description: metadata.description || null,
        imageUrl: metadata.image || null,
        favicon: metadata.favicon || null,
        siteName: metadata.siteName || this.extractSiteName(url, html),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Link preview extraction failed:', error);
      // Return basic info if extraction fails
      return {
        url,
        title: null,
        description: null,
        imageUrl: null,
        favicon: null,
        siteName: null,
      };
    }
  }

  /**
   * Save link preview to database
   */
  async saveLinkPreview(
    userId: string,
    url: string,
    messageId?: string
  ): Promise<{ id: string; url: string; title: string | null; description: string | null; imageUrl: string | null; favicon: string | null; siteName: string | null }> {
    const preview = await this.extractLinkPreview(url);

    const link = await prisma.chatLink.create({
      data: {
        id: generateId(),
        messageId,
        userId,
        url: preview.url,
        title: preview.title,
        description: preview.description,
        imageUrl: preview.imageUrl,
        favicon: preview.favicon,
        siteName: preview.siteName,
      },
    });

    return link;
  }

  /**
   * Get link preview from cache or extract fresh
   */
  async getLinkPreview(userId: string, url: string, messageId?: string): Promise<LinkPreview> {
    // Check for existing unexpired preview (1 hour cache)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const existingLink = await prisma.chatLink.findFirst({
      where: {
        url,
        userId,
        createdAt: { gte: oneHourAgo },
        deletedAt: null,
      },
    });

    if (existingLink) {
      return {
        url: existingLink.url,
        title: existingLink.title,
        description: existingLink.description,
        imageUrl: existingLink.imageUrl,
        favicon: existingLink.favicon,
        siteName: existingLink.siteName,
      };
    }

    // Extract fresh preview and save
    return this.saveLinkPreview(userId, url, messageId);
  }

  /**
   * Delete a link (soft delete)
   */
  async deleteLink(linkId: string, userId: string): Promise<void> {
    const link = await prisma.chatLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new AppError(404, 'Link not found');
    }

    if (link.userId !== userId) {
      throw new AppError(403, 'You can only delete your own links');
    }

    await prisma.chatLink.update({
      where: { id: linkId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get links for a message
   */
  async getMessageLinks(messageId: string): Promise<Array<{ id: string; url: string; title: string | null; description: string | null; imageUrl: string | null; favicon: string | null }>> {
    const links = await prisma.chatLink.findMany({
      where: {
        messageId,
        deletedAt: null,
      },
      select: {
        id: true,
        url: true,
        title: true,
        description: true,
        imageUrl: true,
        favicon: true,
      },
    });

    return links;
  }
}

export const linkService = new LinkService();
