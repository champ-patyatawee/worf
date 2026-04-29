export interface ParsedSearchQuery {
  searchTerms: string;
  channelMentions: string[];
  userMentions: string[];
}

const MAX_MENTIONS = 5;

export function parseSearchQuery(input: string): ParsedSearchQuery {
  const mentionRegex = /([@#])(\w+)/g;
  
  const channelMentions: string[] = [];
  const userMentions: string[] = [];
  let searchTerms = input;
  
  let match;
  while ((match = mentionRegex.exec(input)) !== null) {
    const [, type, name] = match;
    if (type === '#' && channelMentions.length < MAX_MENTIONS) {
      channelMentions.push(name);
    } else if (type === '@' && userMentions.length < MAX_MENTIONS) {
      userMentions.push(name);
    }
  }
  
  searchTerms = input.replace(mentionRegex, ' ');
  searchTerms = searchTerms.trim().replace(/\s+/g, ' ');
  
  return {
    searchTerms,
    channelMentions,
    userMentions,
  };
}

export function detectSearchMentionTrigger(
  content: string,
  cursor: number
): { type: 'user' | 'channel'; query: string; triggerIndex: number } | null {
  if (cursor === 0) return null;
  
  const beforeCursor = content.slice(0, cursor);
  
  const lastAt = beforeCursor.lastIndexOf('@');
  const lastHash = beforeCursor.lastIndexOf('#');
  
  const triggers = [
    { char: '@' as const, index: lastAt },
    { char: '#' as const, index: lastHash },
  ].filter((t) => t.index !== -1);
  
  if (triggers.length === 0) return null;
  
  const latest = triggers.reduce((a, b) => (a.index > b.index ? a : b));
  
  if (latest.index > 0) {
    const charBefore = beforeCursor[latest.index - 1];
    if (charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t') {
      return null;
    }
  }
  
  const textAfterTrigger = beforeCursor.slice(latest.index + 1);
  if (textAfterTrigger.includes(' ')) {
    return null;
  }
  
  return {
    type: latest.char === '@' ? 'user' : 'channel',
    query: textAfterTrigger,
    triggerIndex: latest.index,
  };
}

export function replaceMentionInContent(
  content: string,
  triggerIndex: number,
  triggerChar: '@' | '#',
  selectedName: string
): string {
  const before = content.slice(0, triggerIndex);
  const after = content.slice(triggerIndex);
  
  const afterSuggestion = after.replace(/^\w*/, '');
  
  return `${before}${triggerChar}${selectedName}${afterSuggestion}`;
}
