// src/components/agents/ToolBar.tsx
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import type { ToolDefinition } from '@/types';
import { Globe, Wrench } from 'lucide-react';

export const toolIconMap: Record<string, ReactNode> = {
  webfetch: <Globe className="h-4 w-4" />,
};

function getToolIcon(toolName: string): ReactNode {
  return toolIconMap[toolName] || <Wrench className="h-4 w-4" />;
}

interface ToolBarProps {
  tools: ToolDefinition[];
  activeTool: string | null;
  onToolClick: (toolName: string) => void;
}

export function ToolBar({ tools, activeTool, onToolClick }: ToolBarProps) {
  if (tools.length === 0) return null;

  return (
    <>
      {tools.map((tool) => (
        <button
          key={tool.name}
          onClick={() => onToolClick(tool.name)}
          className={cn(
            'inline-flex items-center justify-center h-8 w-8 rounded-[var(--radius-md)] transition-all duration-150 border-2',
            activeTool === tool.name
              ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]'
              : 'border-transparent text-text-secondary hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-primary)]'
          )}
          title={tool.description}
        >
          {getToolIcon(tool.name)}
        </button>
      ))}
    </>
  );
}
