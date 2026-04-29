import { forwardRef, useState, useCallback, memo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import { MessageSquare } from 'lucide-react';
import { Avatar } from '@/components/common';
import { ThreadIndicator } from './ThreadIndicator';
import { ImageBubble } from './ImageBubble';
import { LinkPreviewCard } from './LinkPreviewCard';
import { copyImageToClipboard } from './CopyButton';
import { ImageLightbox } from './ImageLightbox';
import { ReactionPicker } from './ReactionPicker';
import { ReactionBadge } from './ReactionBadge';
import { formatDate } from '@/utils/formatDate';
import { cn } from '@/utils/cn';
import type { Message as MessageType, ChatImage, LinkPreview, Reaction } from '@/types';
import type { Components } from 'react-markdown';
import type { Element } from 'hast';

interface EnhancedMessageProps {
  message: MessageType;
  isOwn?: boolean;
  showAvatar?: boolean;
  isCompact?: boolean;
  showHeader?: boolean;
  className?: string;
  onOpenThread?: (message: MessageType) => void;
}

export const EnhancedMessage = memo(forwardRef<HTMLDivElement, EnhancedMessageProps>(
  ({ message, isOwn = false, showAvatar = true, isCompact = false, showHeader = true, className, onOpenThread }, ref) => {
    const user = message.user;
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const handleOpenThread = useCallback(() => {
      if (onOpenThread) {
        onOpenThread(message);
      }
    }, [message, onOpenThread]);

    const images = message.images || [];
    const links = message.links || [];
    const reactions: Reaction[] = message.reactions || [];

    const handleAddReaction = useCallback((emoji: string) => {
      import('@/services/socket').then(({ socketService }) => {
        socketService.addReaction(message.id, emoji);
      });
    }, [message.id]);

    const handleImageClick = useCallback((index: number) => {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }, []);

    const handleCopyImage = useCallback(async (image: ChatImage) => {
      await copyImageToClipboard(image.url);
    }, []);

    const handleLinkClick = useCallback((link: LinkPreview) => {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }, []);

    mermaid.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      theme: 'base',
      themeVariables: {
        primaryColor: '#7C5CFF',
        primaryTextColor: '#1A1A1A',
        primaryBorderColor: '#0D0D0D',
        lineColor: '#6B6B6B',
        secondaryColor: '#F9F7F2',
        tertiaryColor: '#F5F0E8',
        background: '#FFFFFF',
        mainBkg: '#F9F7F2',
        secondBkg: '#F5F0E8',
        nodeBorder: '#0D0D0D',
        clusterBkg: '#F5F0E8',
        clusterBorder: '#E5E5E5',
        titleColor: '#1A1A1A',
        edgeLabelBackground: '#FFFFFF',
      },
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
      flowchart: { useMaxWidth: true, curve: 'linear' },
      sequence: { actorMargin: 50, boxMargin: 10 },
      gantt: { titleTopMargin: 25, barHeight: 20, barGap: 4, topPadding: 50 },
      pie: { useMaxWidth: true },
      mindmap: { useMaxWidth: true },
    });

    function processCellContent(content: React.ReactNode): React.ReactNode {
      if (typeof content === 'string') {
        return content.split('<br>').map((part, i, arr) => (
          <span key={i}>
            {part}
            {i < arr.length - 1 && <br />}
          </span>
        ));
      }
      return content;
    }

    function MermaidDiagram({ code }: { code: string }) {
      const containerRef = useRef<HTMLDivElement>(null);
      const [svg, setSvg] = useState<string>('');
      const [error, setError] = useState<string>('');

      useEffect(() => {
        const renderDiagram = async () => {
          try {
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            const { svg } = await mermaid.render(id, code);
            setSvg(svg);
            setError('');
          } catch (err) {
            console.error('Mermaid render error:', err);
            setError('Failed to render diagram');
          }
        };

        if (code) {
          renderDiagram();
        }
      }, [code]);

      if (error) {
        return (
          <div className="mermaid-error p-4 my-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">{code}</pre>
          </div>
        );
      }

      const svgWithBg = svg.replace(/<svg/, '<svg style="background-color:#ffffff"');

      return (
        <div
          ref={containerRef}
          className="mermaid-diagram my-2 flex justify-center overflow-auto"
          style={{
            backgroundColor: '#ffffff',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            maxWidth: '100%',
            minHeight: '100px',
          }}
          dangerouslySetInnerHTML={{ __html: svgWithBg }}
        />
      );
    }

    const markdownComponents: Components = {
      pre: ({ children }) => <>{children}</>,
      h1: ({ children }) => (
        <h1 className="text-lg font-extrabold text-[var(--color-text-primary)] mt-3 mb-1.5 first:mt-0">{children}</h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-base font-bold text-[var(--color-text-primary)] mt-2.5 mb-1 first:mt-0">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] mt-2 mb-1 first:mt-0">{children}</h3>
      ),
      h4: ({ children }) => (
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mt-2 mb-0.5 first:mt-0">{children}</h4>
      ),
      h5: ({ children }) => (
        <h5 className="text-xs font-semibold text-[var(--color-text-primary)] mt-2 mb-0.5 first:mt-0">{children}</h5>
      ),
      h6: ({ children }) => (
        <h6 className="text-xs font-medium text-[var(--color-text-tertiary)] mt-2 mb-0.5 first:mt-0">{children}</h6>
      ),
      code: ({ className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || '');
        const languageMap: Record<string, string> = {
          js: 'javascript',
          ts: 'typescript',
          py: 'python',
          rb: 'ruby',
          yml: 'yaml',
          md: 'markdown',
          sh: 'bash',
          shell: 'bash',
        };
        const rawLanguage = match ? match[1] : '';
        const language = languageMap[rawLanguage] || rawLanguage;
        const isInline = !className || !className.includes('language-');

        if (isInline) {
          return (
            <code
              className={cn(
                'px-1.5 py-0.5 rounded',
                'bg-bg-tertiary',
                'text-accent-primary font-mono text-[13px]',
                className
              )}
              {...props}
            >
              {children}
            </code>
          );
        }

        if (rawLanguage === 'mermaid') {
          return <MermaidDiagram code={String(children).replace(/\n$/, '')} />;
        }

        return (
          <div className="group relative rounded-lg overflow-hidden border border-gray-700 w-full my-2">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2d2d] border-b border-gray-700">
              <span className="text-xs font-mono uppercase tracking-wide text-text-tertiary">
                {language || 'text'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <SyntaxHighlighter
                language={language || 'plaintext'}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: '#1e1e1e',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
                  }
                }}
                showLineNumbers={false}
                wrapLines={true}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      },
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)] underline font-semibold transition-colors-fast"
        >
          {children}
        </a>
      ),
      p: ({ children }) => (
        <p className="mb-2 last:mb-0">{children}</p>
      ),
      ul: ({ children }) => (
        <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>
      ),
      blockquote: ({ children }) => (
        <blockquote className="border-l-3 border-accent-primary pl-3 my-1.5 text-text-secondary italic">
          {children}
        </blockquote>
      ),
      td: ({ children }) => (
        <td className="px-3 py-1.5 border-t border-gray-700">{processCellContent(children)}</td>
      ),
      th: ({ children }) => (
        <th className="px-3 py-1.5 border-t border-gray-700 font-semibold bg-bg-hover">{processCellContent(children)}</th>
      ),
      img: ({ src, alt }) => (
        <figure className="my-2">
          <img src={src} alt={alt} className="max-w-full rounded-lg" loading="lazy" />
          {alt && <figcaption className="text-xs text-text-tertiary mt-1 text-center">{alt}</figcaption>}
        </figure>
      ),
    };

    const messageBody = (
      <>
        {message.content && (
          <div className={cn('text-sm break-words whitespace-pre-wrap', message.isError ? 'text-status-error' : 'text-[var(--color-text-primary)]')}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[[rehypeKatex, { strict: false, trust: true, throwOnError: false }]]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {images.length > 0 && (
          <div className={cn(
            'flex flex-wrap gap-2',
            isCompact ? 'mt-1.5' : 'mt-2',
            images.length === 1 && (isCompact ? 'max-w-[200px]' : 'max-w-sm'),
            images.length === 2 && (isCompact ? 'max-w-[280px]' : 'max-w-md'),
            images.length >= 3 && (isCompact ? 'max-w-[320px]' : 'max-w-lg')
          )}>
            {images.map((image, index) => (
              <ImageBubble
                key={image.id}
                image={image}
                onClick={() => handleImageClick(index)}
                onCopy={() => handleCopyImage(image)}
                className={cn(
                  isCompact
                    ? (images.length === 1 ? 'w-48' : images.length === 2 ? 'w-36' : 'w-28')
                    : (images.length === 1 ? 'w-64' : images.length === 2 ? 'w-48' : 'w-40')
                )}
              />
            ))}
          </div>
        )}
        {links.length > 0 && (
          <div className={cn('space-y-2 max-w-md', isCompact ? 'mt-1.5' : 'mt-2')}>
            {links.map((link) => (
              <LinkPreviewCard
                key={link.id}
                link={link}
                onClick={() => handleLinkClick(link)}
              />
            ))}
          </div>
        )}
        {reactions.length > 0 && (
          <div className={cn('flex items-center gap-1', isCompact ? 'mt-1' : 'mt-1.5')}>
            <ReactionBadge reactions={reactions} messageId={message.id} />
          </div>
        )}
        {!isCompact && (message.threadCount ?? 0) > 0 && onOpenThread && (
          <ThreadIndicator
            count={message.threadCount ?? 0}
            onClick={() => handleOpenThread()}
          />
        )}
      </>
    );

    if (isCompact) {
      return (
        <>
          <div
            ref={ref}
            className={cn(
              'group relative flex gap-3 px-4 py-0.5 transition-colors-fast hover:bg-[var(--color-bg-hover)]',
              className
            )}
          >
            <div className="w-[36px] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums font-medium">
                  {formatDate(message.createdAt)}
                </span>
              </div>
              {messageBody}
            </div>

            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 p-1.5">
              <ReactionPicker onSelect={handleAddReaction} />
              {onOpenThread && (
                <button
                  onClick={handleOpenThread}
                  className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] border-2 border-transparent hover:border-[var(--color-border-primary)] transition-all-fast"
                  title="Reply in thread"
                >
                  <MessageSquare className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                </button>
              )}
            </div>
          </div>

          {lightboxOpen && images.length > 0 && (
            <ImageLightbox
              images={images}
              initialIndex={lightboxIndex}
              isOpen={lightboxOpen}
              onClose={() => setLightboxOpen(false)}
              onCopy={handleCopyImage}
            />
          )}
        </>
      );
    }

    return (
      <>
        <div
          ref={ref}
          className={cn(
            'group relative flex gap-3 px-4 py-2 transition-colors-fast hover:bg-[var(--color-bg-hover)]',
            className
          )}
        >
          {showAvatar ? (
            <Avatar
              name={user?.name || 'Unknown'}
              src={user?.avatar}
              size="sm"
              className="flex-shrink-0"
            />
          ) : (
            <div className="w-[36px] flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {showHeader && (
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="font-bold text-[14px] text-[var(--color-text-primary)]">
                  {user?.name || 'Unknown User'}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums font-medium">
                  {formatDate(message.createdAt)}
                </span>
              </div>
            )}
            {messageBody}
          </div>

          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 p-1.5">
            <ReactionPicker onSelect={handleAddReaction} />
            {onOpenThread && (
              <button
                onClick={handleOpenThread}
                className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] border-2 border-transparent hover:border-[var(--color-border-primary)] transition-all-fast"
                title="Reply in thread"
              >
                <MessageSquare className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              </button>
            )}
          </div>
        </div>

        {lightboxOpen && images.length > 0 && (
          <ImageLightbox
            images={images}
            initialIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            onCopy={handleCopyImage}
          />
        )}
      </>
    );
  }
));

EnhancedMessage.displayName = 'EnhancedMessage';
