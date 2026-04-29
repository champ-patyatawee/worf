import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isToday(d)) {
    return format(d, 'h:mm a');
  }

  if (isYesterday(d)) {
    return `Yesterday at ${format(d, 'h:mm a')}`;
  }

  if (isThisWeek(d)) {
    return format(d, 'EEEE at h:mm a');
  }

  return format(d, 'MMM d, yyyy at h:mm a');
}

export function formatMessageDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isToday(d)) {
    return 'Today';
  }

  if (isYesterday(d)) {
    return 'Yesterday';
  }

  if (isThisWeek(d)) {
    return format(d, 'EEEE');
  }

  return format(d, 'MMMM d, yyyy');
}

export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}
