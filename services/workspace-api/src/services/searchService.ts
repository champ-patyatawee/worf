import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { embeddingService } from './embeddingService';

export type SearchMode = 'fts' | 'semantic';

export interface SearchResult {
  type: 'message' | 'directMessage';
  id: string;
  content: string;
  channelId: string | null;
  channelName: string | null;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
  createdAt: Date;
  score: number;
  dmParticipant?: {
    id: string;
    name: string;
  };
}

export interface SearchOptions {
  query: string;
  userId: string;
  channelIds?: string[];
  dmUserIds?: string[];
  limit?: number;
  offset?: number;
  mode?: SearchMode;
}

export class SearchService {
  async search(options: SearchOptions): Promise<{ results: SearchResult[]; total: number }> {
    const { query, userId, channelIds, dmUserIds, limit = 20, offset = 0, mode = 'fts' } = options;

    if (!query || query.trim().length === 0) {
      throw new AppError(400, 'Search query is required');
    }

    const normalizedQuery = query.trim().toLowerCase();

    const [publicChannelIds, privateChannelIds] = await Promise.all([
      this.getPublicChannelIds(),
      this.getPrivateChannelIds(userId),
    ]);
    const accessibleChannelIds = [...publicChannelIds, ...privateChannelIds];
    const dmPartnerIds = await this.getDMConversationPartners(userId);

    const hasChannelFilter = channelIds && channelIds.length > 0;
    const hasDmFilter = dmUserIds && dmUserIds.length > 0;

    let channelMessages: SearchResult[] = [];
    let dmMessages: SearchResult[] = [];

    if (mode === 'semantic') {
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      
      if (hasChannelFilter) {
        channelMessages = await this.semanticSearchChannelMessages(
          queryEmbedding,
          accessibleChannelIds,
          channelIds,
          limit + offset
        );
      } else if (hasDmFilter) {
        dmMessages = await this.semanticSearchDirectMessages(
          queryEmbedding,
          userId,
          dmPartnerIds,
          dmUserIds,
          limit + offset
        );
      } else {
        [channelMessages, dmMessages] = await Promise.all([
          this.semanticSearchChannelMessages(
            queryEmbedding,
            accessibleChannelIds,
            undefined,
            limit + offset
          ),
          this.semanticSearchDirectMessages(
            queryEmbedding,
            userId,
            dmPartnerIds,
            undefined,
            limit + offset
          ),
        ]);
      }
    } else {
      const searchAll = !hasChannelFilter && !hasDmFilter;

      if (searchAll) {
        [channelMessages, dmMessages] = await Promise.all([
          this.searchChannelMessages(normalizedQuery, accessibleChannelIds, undefined, limit + offset),
          this.searchDirectMessages(normalizedQuery, userId, dmPartnerIds, undefined, limit + offset),
        ]);
      } else if (hasChannelFilter && hasDmFilter) {
        [channelMessages, dmMessages] = await Promise.all([
          this.searchChannelMessages(normalizedQuery, accessibleChannelIds, channelIds, limit + offset),
          this.searchDirectMessages(normalizedQuery, userId, dmPartnerIds, dmUserIds, limit + offset),
        ]);
      } else if (hasChannelFilter) {
        channelMessages = await this.searchChannelMessages(normalizedQuery, accessibleChannelIds, channelIds, limit + offset);
      } else if (hasDmFilter) {
        dmMessages = await this.searchDirectMessages(normalizedQuery, userId, dmPartnerIds, dmUserIds, limit + offset);
      }
    }

    const combined = this.combineAndRank(channelMessages, dmMessages);
    const paginated = combined.slice(offset, offset + limit);

    return {
      results: paginated,
      total: combined.length,
    };
  }

  private async getPublicChannelIds(): Promise<string[]> {
    const channels = await prisma.channel.findMany({
      where: { type: 'public' },
      select: { id: true },
    });
    return channels.map((c) => c.id);
  }

  private async getPrivateChannelIds(userId: string): Promise<string[]> {
    const memberships = await prisma.channelMember.findMany({
      where: { userId },
      include: { channel: { select: { id: true, type: true } } },
    });
    return memberships
      .filter((m) => m.channel.type === 'private')
      .map((m) => m.channelId);
  }

  private async getDMConversationPartners(userId: string): Promise<string[]> {
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [{ userId }, { recipientId: userId }],
      },
      select: {
        userId: true,
        recipientId: true,
      },
    });

    const partners = new Set<string>();
    for (const msg of messages) {
      if (msg.userId !== userId) partners.add(msg.userId);
      if (msg.recipientId !== userId) partners.add(msg.recipientId);
    }
    return Array.from(partners);
  }

  private async searchChannelMessages(
    query: string,
    accessibleChannelIds: string[],
    filterChannelIds: string[] | undefined,
    limit: number
  ): Promise<SearchResult[]> {
    if (accessibleChannelIds.length === 0) return [];

    let channelFilter: string[];
    if (filterChannelIds && filterChannelIds.length > 0) {
      channelFilter = accessibleChannelIds.filter(id => filterChannelIds.includes(id));
    } else {
      channelFilter = accessibleChannelIds;
    }

    if (channelFilter.length === 0) return [];

    const channelMap = await this.getChannelMap(channelFilter);

    const rawResults = await prisma.$queryRaw<
      Array<{
        id: string;
        content: string;
        channelId: string;
        userId: string;
        username: string;
        useravatar: string | null;
        createdAt: Date;
        fts_rank: number;
      }>
    >(Prisma.sql`
      SELECT 
        m.id,
        m.content,
        m."channelId" as "channelId",
        m."userId" as "userId",
        u.name as username,
        u.avatar as "useravatar",
        m."createdAt" as "createdAt",
        ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', ${query})) as fts_rank
      FROM "Message" m
      JOIN "User" u ON m."userId" = u.id
      WHERE m."channelId" = ANY(${channelFilter})
        AND to_tsvector('english', m.content) @@ plainto_tsquery('english', ${query})
      ORDER BY fts_rank DESC
      LIMIT ${limit}
    `);

    const maxRank = rawResults.length > 0 ? Math.max(...rawResults.map((r) => r.fts_rank), 1) : 1;

    return rawResults.map((r) => ({
      type: 'message' as const,
      id: r.id,
      content: r.content,
      channelId: r.channelId,
      channelName: channelMap.get(r.channelId) ?? null,
      sender: {
        id: r.userId,
        name: r.username,
        avatar: r.useravatar,
      },
      createdAt: r.createdAt,
      score: r.fts_rank / maxRank,
    }));
  }

  private async searchDirectMessages(
    query: string,
    currentUserId: string,
    partnerIds: string[],
    filterDmUserIds: string[] | undefined,
    limit: number
  ): Promise<SearchResult[]> {
    if (partnerIds.length === 0) return [];

    const isFiltering = filterDmUserIds && filterDmUserIds.length > 0;
    const effectivePartnerIds = isFiltering
      ? partnerIds.filter(id => filterDmUserIds.includes(id))
      : partnerIds;

    if (effectivePartnerIds.length === 0) return [];

    const dmMap = await this.getDMMap(effectivePartnerIds);

    const rawResults = await prisma.$queryRaw<
      Array<{
        id: string;
        content: string;
        userId: string;
        recipientId: string;
        username: string;
        useravatar: string | null;
        createdAt: Date;
        fts_rank: number;
      }>
    >(Prisma.sql`
      SELECT 
        dm.id,
        dm.content,
        dm."userId" as "userId",
        dm."recipientId" as "recipientId",
        u.name as username,
        u.avatar as "useravatar",
        dm."createdAt" as "createdAt",
        ts_rank(to_tsvector('english', dm.content), plainto_tsquery('english', ${query})) as fts_rank
      FROM "DirectMessage" dm
      JOIN "User" u ON dm."userId" = u.id
      WHERE (dm."userId" = ${currentUserId} OR dm."recipientId" = ${currentUserId})
        AND to_tsvector('english', dm.content) @@ plainto_tsquery('english', ${query})
        ${isFiltering ? Prisma.sql`AND (dm."userId" = ANY(${effectivePartnerIds}) OR dm."recipientId" = ANY(${effectivePartnerIds}))` : Prisma.sql``}
      ORDER BY fts_rank DESC
      LIMIT ${limit}
    `);

    const maxRank = rawResults.length > 0 ? Math.max(...rawResults.map((r) => r.fts_rank), 1) : 1;

    return rawResults.map((r) => {
      const partnerId = r.userId === currentUserId ? r.recipientId : r.userId;
      const partner = dmMap.get(partnerId);
      return {
        type: 'directMessage' as const,
        id: r.id,
        content: r.content,
        channelId: null,
        channelName: null,
        sender: {
          id: r.userId,
          name: r.username,
          avatar: r.useravatar,
        },
        createdAt: r.createdAt,
        score: r.fts_rank / maxRank,
        dmParticipant: partner ? { id: partner.id, name: partner.name } : undefined,
      };
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private parseEmbedding(embeddingStr: string | null): number[] | null {
    if (!embeddingStr) return null;
    try {
      const parsed = JSON.parse(embeddingStr);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private async semanticSearchChannelMessages(
    queryEmbedding: number[],
    accessibleChannelIds: string[],
    filterChannelIds: string[] | undefined,
    limit: number
  ): Promise<SearchResult[]> {
    if (accessibleChannelIds.length === 0) return [];

    let channelFilter: string[];
    if (filterChannelIds && filterChannelIds.length > 0) {
      channelFilter = accessibleChannelIds.filter(id => filterChannelIds.includes(id));
    } else {
      channelFilter = accessibleChannelIds;
    }

    if (channelFilter.length === 0) return [];

    const channelMap = await this.getChannelMap(channelFilter);

    const messages = await prisma.message.findMany({
      where: {
        channelId: { in: channelFilter },
        embedding: { not: null },
      },
      select: {
        id: true,
        content: true,
        channelId: true,
        userId: true,
        createdAt: true,
        embedding: true,
        user: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      take: limit * 3,
    });

    const scoredMessages = messages
      .map((m) => {
        const embedding = this.parseEmbedding(m.embedding);
        if (!embedding) return null;
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        return {
          message: m,
          similarity,
        };
      })
      .filter((item): item is { message: typeof messages[0]; similarity: number } => item !== null)
      .filter(item => item.similarity >= 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scoredMessages.map(({ message: m, similarity }) => ({
      type: 'message' as const,
      id: m.id,
      content: m.content,
      channelId: m.channelId,
      channelName: channelMap.get(m.channelId) ?? null,
      sender: {
        id: m.userId,
        name: m.user.name,
        avatar: m.user.avatar,
      },
      createdAt: m.createdAt,
      score: similarity,
    }));
  }

  private async semanticSearchDirectMessages(
    queryEmbedding: number[],
    currentUserId: string,
    partnerIds: string[],
    filterDmUserIds: string[] | undefined,
    limit: number
  ): Promise<SearchResult[]> {
    if (partnerIds.length === 0) return [];

    const isFiltering = filterDmUserIds && filterDmUserIds.length > 0;
    const effectivePartnerIds = isFiltering
      ? partnerIds.filter(id => filterDmUserIds.includes(id))
      : partnerIds;

    if (effectivePartnerIds.length === 0) return [];

    const dmMap = await this.getDMMap(effectivePartnerIds);

    const dms = await prisma.directMessage.findMany({
      where: {
        OR: [
          { userId: currentUserId },
          { recipientId: currentUserId },
        ],
        embedding: { not: null },
        ...(isFiltering
          ? {
              OR: [
                { userId: { in: effectivePartnerIds } },
                { recipientId: { in: effectivePartnerIds } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        content: true,
        userId: true,
        recipientId: true,
        createdAt: true,
        embedding: true,
        sender: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      take: limit * 3,
    });

    const scoredDMs = dms
      .map((dm) => {
        const embedding = this.parseEmbedding(dm.embedding);
        if (!embedding) return null;
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        return {
          dm,
          similarity,
        };
      })
      .filter((item): item is { dm: typeof dms[0]; similarity: number } => item !== null)
      .filter(item => item.similarity >= 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scoredDMs.map(({ dm, similarity }) => {
      const partnerId = dm.userId === currentUserId ? dm.recipientId : dm.userId;
      const partner = dmMap.get(partnerId);
      return {
        type: 'directMessage' as const,
        id: dm.id,
        content: dm.content,
        channelId: null,
        channelName: null,
        sender: {
          id: dm.userId,
          name: dm.sender.name,
          avatar: dm.sender.avatar,
        },
        createdAt: dm.createdAt,
        score: similarity,
        dmParticipant: partner ? { id: partner.id, name: partner.name } : undefined,
      };
    });
  }

  private combineAndRank(channelResults: SearchResult[], dmResults: SearchResult[]): SearchResult[] {
    const combined = [...channelResults, ...dmResults];
    combined.sort((a, b) => b.score - a.score);
    return combined;
  }

  private async getChannelMap(channelIds: string[]): Promise<Map<string, string>> {
    const channels = await prisma.channel.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, name: true },
    });
    return new Map(channels.map((c) => [c.id, c.name]));
  }

  private async getDMMap(
    partnerIds: string[]
  ): Promise<Map<string, { id: string; name: string }>> {
    const users = await prisma.user.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, name: true },
    });
    return new Map(users.map((u) => [u.id, { id: u.id, name: u.name }]));
  }
}

export const searchService = new SearchService();
