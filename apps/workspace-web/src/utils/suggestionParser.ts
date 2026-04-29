export type SuggestionType = 'slash' | 'user' | 'agent' | 'channel';

export interface TriggerResult {
  type: SuggestionType;
  query: string;
  triggerChar: '/' | '@' | '#';
  triggerIndex: number;
}

export function detectSuggestionTrigger(
  content: string,
  cursor: number
): TriggerResult | null {
  if (cursor === 0) return null;
  
  const beforeCursor = content.slice(0, cursor);
  
  // Find the last trigger character
  const lastSlash = beforeCursor.lastIndexOf('/');
  const lastAt = beforeCursor.lastIndexOf('@');
  const lastHash = beforeCursor.lastIndexOf('#');
  
  // Determine which trigger was typed most recently
  const triggers = [
    { char: '/' as const, index: lastSlash },
    { char: '@' as const, index: lastAt },
    { char: '#' as const, index: lastHash },
  ].filter((t) => t.index !== -1);
  
  if (triggers.length === 0) return null;
  
  // Get the most recent trigger
  const latest = triggers.reduce((a, b) => (a.index > b.index ? a : b));
  
  // Check if trigger is at word start (after whitespace or at beginning)
  if (latest.index > 0) {
    const charBefore = beforeCursor[latest.index - 1];
    if (charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t') {
      return null;
    }
  }
  
  // Check if there's a space after the trigger (already completed word)
  const textAfterTrigger = beforeCursor.slice(latest.index + 1);
  if (textAfterTrigger.includes(' ')) {
    return null;
  }
  
  let type: SuggestionType;
  if (latest.char === '/') {
    type = 'slash';
  } else if (latest.char === '@') {
    type = 'user'; // includes both users and agents
  } else {
    type = 'channel';
  }
  
  return {
    type,
    query: textAfterTrigger,
    triggerChar: latest.char,
    triggerIndex: latest.index,
  };
}

export function replaceSuggestionInContent(
  content: string,
  triggerIndex: number,
  triggerChar: '/' | '@' | '#',
  selectedName: string
): string {
  const before = content.slice(0, triggerIndex);
  const after = content.slice(triggerIndex);
  
  // Remove any existing suggestion text after trigger
  const afterSuggestion = after.replace(/^\S*/, '');
  
  return `${before}${triggerChar}${selectedName}${afterSuggestion}`;
}
