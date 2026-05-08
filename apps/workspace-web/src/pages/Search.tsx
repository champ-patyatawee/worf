import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Hash, MessageCircle, ArrowLeft, Loader2, X, Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import { Avatar } from '@/components/common';
import { formatDistanceToNow } from 'date-fns';
import { useUserStore } from '@/stores/userStore';
import { useChannelStore } from '@/stores/channelStore';
import { parseSearchQuery, detectSearchMentionTrigger, replaceMentionInContent } from '@/utils/searchQueryParser';
import { MentionSuggestions } from '@/components/search/MentionSuggestions';

type SearchMode = 'fts' | 'semantic';

interface SearchResult {
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
  createdAt: string;
  score: number;
  dmParticipant?: {
    id: string;
    name: string;
  };
}

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('fts');
  const inputRef = useRef<HTMLInputElement>(null);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'user' | 'channel' | null>(null);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [triggerIndex, setTriggerIndex] = useState(0);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0, width: 0 });

  const [scopeInfo, setScopeInfo] = useState<{
    searchTerms: string;
    channels: string[];
    users: string[];
  } | null>(null);

  const users = useUserStore((s) => s.users);
  const channels = useChannelStore((s) => s.channels);
  const fetchUsers = useUserStore((s) => s.fetchUsers);
  const fetchChannels = useChannelStore((s) => s.fetchChannels);

  const performSearch = useCallback(async (
    searchQuery: string,
    options?: { channelNames?: string[]; dmUserNames?: string[]; mode?: SearchMode }
  ) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await api.searchMessages(searchQuery, options);
      const data = response as { success: boolean; data: SearchResult[]; total: number };
      setResults(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchUsers(), fetchChannels()]);
      
      if (initialQuery) {
        const parsed = parseSearchQuery(initialQuery);
        setScopeInfo({
          searchTerms: parsed.searchTerms,
          channels: parsed.channelMentions,
          users: parsed.userMentions,
        });
        const searchTerms = parsed.searchTerms || ' ';
        const channelNames = parsed.channelMentions;
        const dmUserNames = parsed.userMentions;
        performSearch(searchTerms, { channelNames, dmUserNames, mode: searchMode });
      }
    };
    loadData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? value.length;

    setQuery(value);

    const trigger = detectSearchMentionTrigger(value, cursor);

    if (trigger) {
      setSuggestionType(trigger.type);
      setSuggestionQuery(trigger.query);
      setTriggerIndex(trigger.triggerIndex);
      setShowSuggestions(true);

      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setSuggestionPosition({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        });
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (name: string) => {
    const triggerChar = suggestionType === 'user' ? '@' : '#';
    const newContent = replaceMentionInContent(query, triggerIndex, triggerChar, name);
    setQuery(newContent);
    setShowSuggestions(false);

    setTimeout(() => {
      if (inputRef.current) {
        const newCursor = triggerIndex + triggerChar.length + name.length;
        inputRef.current.selectionStart = newCursor;
        inputRef.current.selectionEnd = newCursor;
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const parsed = parseSearchQuery(query);
    const searchTerms = parsed.searchTerms || ' ';

    const channelNames = parsed.channelMentions;

    const dmUserNames = parsed.userMentions;

    setScopeInfo({
      searchTerms: parsed.searchTerms,
      channels: parsed.channelMentions,
      users: parsed.userMentions,
    });

    setSearchParams({ q: query });
    performSearch(searchTerms, { channelNames, dmUserNames, mode: searchMode });
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setSearchParams({});
    setScopeInfo(null);
    setShowSuggestions(false);
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'message' && result.channelId) {
      navigate(`/search-result/${result.id}?type=channel&channelId=${result.channelId}`);
    } else if (result.type === 'directMessage' && result.dmParticipant) {
      navigate(`/search-result/${result.id}?type=directMessage&dmUserId=${result.dmParticipant.id}&dmUserName=${result.dmParticipant.name}`);
    }
  };

  const highlightMatch = (content: string, searchQuery: string) => {
    if (!searchQuery.trim()) return content;
    const parsed = parseSearchQuery(searchQuery);
    const termsToHighlight = parsed.searchTerms || searchQuery;
    if (!termsToHighlight.trim()) return content;
    const regex = new RegExp(`(${termsToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = content.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)] px-1 rounded-[var(--radius-sm)] font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border-primary bg-bg-secondary">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md hover:bg-bg-hover transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
          </button>
          <form onSubmit={handleSubmit} className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search... use @ for users, # for channels"
              className="w-full pl-10 pr-10 py-2 bg-bg-primary border border-border-primary rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-bg-hover"
              >
                <X className="h-4 w-4 text-text-tertiary" />
              </button>
            )}
          </form>
          <div className="flex items-center rounded-[var(--radius-md)] border-2 border-[var(--color-border-primary)] overflow-hidden shadow-[var(--shadow-sm)]">
            <button
              onClick={() => setSearchMode('fts')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                searchMode === 'fts'
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-primary text-text-secondary hover:bg-bg-hover'
              }`}
            >
              FTS
            </button>
            <button
              onClick={() => setSearchMode('semantic')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                searchMode === 'semantic'
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-primary text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI
            </button>
          </div>
        </div>
        {scopeInfo && (scopeInfo.channels.length > 0 || scopeInfo.users.length > 0) && (
          <div className="px-4 py-2 bg-bg-tertiary border-t-2 border-[var(--color-border-primary)]">
            <p className="text-sm text-text-secondary">
              {scopeInfo.searchTerms && (
                <span>Searching for "{scopeInfo.searchTerms}"</span>
              )}
              {scopeInfo.channels.length > 0 && (
                <span> in <span className="text-accent-primary">#{scopeInfo.channels.join(', #')}</span></span>
              )}
              {scopeInfo.users.length > 0 && (
                <span> from <span className="text-accent-primary">@{scopeInfo.users.join(', @')}</span></span>
              )}
            </p>
          </div>
        )}
        {searchMode === 'semantic' && hasSearched && (
          <div className="px-4 py-1.5 bg-bg-tertiary border-t-2 border-[var(--color-border-primary)]">
            <p className="text-xs text-text-tertiary">
              <Sparkles className="h-3 w-3 inline mr-1" />
              AI Semantic Search - finds results by meaning
            </p>
          </div>
        )}
      </div>

      {showSuggestions && suggestionType && (
        <MentionSuggestions
          type={suggestionType}
          query={suggestionQuery}
          users={users}
          agents={[]}
          channels={channels}
          onSelect={handleSuggestionSelect}
          onClose={() => setShowSuggestions(false)}
          position={suggestionPosition}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-accent-primary animate-spin" />
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <SearchIcon className="h-12 w-12 text-text-tertiary mb-3" />
            <p className="text-text-secondary font-medium">No results found</p>
            <p className="text-text-tertiary text-sm mt-1">
              No messages matching "{query}"
            </p>
          </div>
        )}

        {!isLoading && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <SearchIcon className="h-12 w-12 text-text-tertiary mb-3" />
            <p className="text-text-secondary">Search for messages</p>
            <p className="text-text-tertiary text-sm mt-1">
              Use <span className="text-accent-primary">@user</span> to search DMs or <span className="text-accent-primary">#channel</span> to filter by channel
            </p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="divide-y divide-border-primary">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-bg-hover transition-colors text-left"
              >
                <Avatar
                  src={result.sender.avatar ?? undefined}
                  name={result.sender.name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-text-primary text-sm">
                      {result.sender.name}
                    </span>
                    {result.type === 'message' && result.channelName && (
                      <span className="flex items-center gap-1 text-xs text-text-tertiary">
                        <Hash className="h-3 w-3" />
                        {result.channelName}
                      </span>
                    )}
                    {result.type === 'directMessage' && (
                      <span className="flex items-center gap-1 text-xs text-text-tertiary">
                        <MessageCircle className="h-3 w-3" />
                        {result.dmParticipant?.name || 'Direct Message'}
                      </span>
                    )}
                    <span className="text-xs text-text-tertiary">
                      {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2">
                    {highlightMatch(result.content, query)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {!isLoading && hasSearched && results.length > 0 && (
          <div className="px-4 py-3 text-center text-xs text-text-tertiary border-t border-border-primary">
            {total} result{total !== 1 ? 's' : ''} found
          </div>
        )}
      </div>
    </div>
  );
}