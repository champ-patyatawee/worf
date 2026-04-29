import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import { ArrowLeft, MessageSquare, AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/common';
import { EnhancedMessage } from './EnhancedMessage';
import { EnhancedMessageInput } from './EnhancedMessageInput';
import { api } from '@/services/api';
import { socketService } from '@/services/socket';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import { formatDate } from '@/utils/formatDate';
import type { Message, ImageUpload, ChatImage } from '@/types';

interface ThreadViewProps {
  message: Message;
  channelId: string;
  onBack: () => void;
}

export function ThreadView({ message, channelId, onBack }: ThreadViewProps) {
  const [replies, setReplies] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const prevRepliesLength = useRef(0);
  
  const localThreadMessages = useMessageStore((state) => 
    state.messages[`thread-${message.id}`] || []
  );

  console.log('[ThreadView] message.id from props:', message.id);
  console.log('[ThreadView] Looking for key: thread-', message.id);
  console.log('[ThreadView] localThreadMessages count:', localThreadMessages.length);
  if (localThreadMessages.length > 0) {
    console.log('[ThreadView] Local messages:', localThreadMessages.map(m => ({ id: m.id, content: m.content?.substring(0, 30) })));
  }
  console.log('[ThreadView] API replies count:', replies.length);

  const fetchReplies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getMessageThread(message.id);
      const threadData = (response as any).data || response;
      if (threadData && typeof threadData === 'object' && 'replies' in threadData) {
        const transformedReplies = (threadData.replies || []).map((reply: any) => ({
          ...reply,
          images: reply.chatImages || [],
        }));
        setReplies(transformedReplies);
      } else if (Array.isArray(threadData)) {
        const transformedReplies = threadData.map((reply: any) => ({
          ...reply,
          images: reply.chatImages || [],
        }));
        setReplies(transformedReplies);
      } else {
        setReplies([]);
      }
    } catch (err) {
      console.error('Failed to fetch thread replies:', err);
      setError('Failed to load replies');
      setReplies([]);
    } finally {
      setIsLoading(false);
    }
  }, [message.id]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  useEffect(() => {
    const handleNewReply = (reply: any) => {
      if (reply.threadId === message.id) {
        const transformedReply = {
          ...reply,
          images: reply.chatImages || [],
        };
        setReplies((prev) => {
          const exists = prev.some((r) => r.id === reply.id);
          if (exists) return prev;
          return [...prev, transformedReply];
        });
      }
    };

    socketService.on('receive_message', handleNewReply as (...args: unknown[]) => void);
    return () => {
      socketService.off('receive_message', handleNewReply as (...args: unknown[]) => void);
    };
  }, [message.id]);

  useEffect(() => {
    const handleReactionAdded = (reaction: any) => {
      if (!reaction.messageId) return;
      
      setReplies((prev) => 
        prev.map((reply) => {
          if (reply.id === reaction.messageId) {
            return {
              ...reply,
              reactions: [...(reply.reactions || []), reaction],
            };
          }
          return reply;
        })
      );
    };

    const handleReactionRemoved = (data: { messageId: string; userId: string; emoji: string }) => {
      setReplies((prev) => 
        prev.map((reply) => {
          if (reply.id === data.messageId) {
            return {
              ...reply,
              reactions: (reply.reactions || []).filter(
                (r: any) => !(r.emoji === data.emoji && r.userId === data.userId)
              ),
            };
          }
          return reply;
        })
      );
    };

    socketService.onReactionAdded(handleReactionAdded);
    socketService.onReactionRemoved(handleReactionRemoved);

    return () => {
      socketService.offReactionAdded(handleReactionAdded);
      socketService.offReactionRemoved(handleReactionRemoved);
    };
  }, [message.id]);

  const handleSendReply = useCallback(async (content: string, uploads?: ImageUpload[]) => {
    try {
      let imageIds: string[] | undefined;
      
      if (uploads && uploads.length > 0) {
        const validUploads = uploads.filter((u) => u.result && u.result.id);
        imageIds = validUploads.map((u) => u.result!.id);
        
        if (imageIds.length === 0 && !content.trim()) {
          setError('Please add an image or message content');
          return;
        }
      }
      
      console.log('[ThreadView] Sending reply:', { content, imageIds, threadId: message.id });
      
      const agentMatch = content.match(/^@(\w+)\s+(.+)$/);
      if (agentMatch && !imageIds?.length) {
        const agentName = agentMatch[1];
        const task = agentMatch[2].trim();
        
        console.log('[ThreadView] Agent mention detected:', agentName, task);
        
        const history: { role: string; content: string }[] = [];
        const recentReplies = replies.slice(-4);
        for (const reply of recentReplies) {
          const replyUser = reply.user;
          if (replyUser?.id === currentUserId && reply.content.startsWith(`@${agentName}`)) {
            history.push({ role: 'user', content: reply.content.replace(/^@\w+\s+/, '') });
          } else if (replyUser?.email?.startsWith('agent-') || replyUser?.role === 'agent') {
            history.push({ role: 'assistant', content: reply.content });
          }
        }
        console.log('[ThreadView] History from thread:', history.length, 'messages');
        
        const response = await api.sendMessage(channelId, content, imageIds, message.id);
        console.log('[ThreadView] User message sent:', response);
        
        const { streamAgentChat } = await import('@/services/agentService');
        try {
          await streamAgentChat(agentName, task, history, (chunk, done) => {
            if (done) {
              setTimeout(() => {
                fetchReplies();
              }, 500);
            }
          }, message.id, channelId);
        } catch (err: any) {
          console.error('[ThreadView] Agent error:', err.message);
          setError(err.message || 'Failed to get agent response');
        }
        
        return;
      }
      
      const response = await api.sendMessage(channelId, content, imageIds, message.id);
      console.log('[ThreadView] Reply sent successfully:', response);
      
      const responseData = (response as any).data || response;
      if (responseData?.id) {
        const newReply = {
          ...responseData,
          images: responseData.chatImages || [],
        };
        setReplies((prev) => [...prev, newReply]);
      }
    } catch (err: any) {
      console.error('[ThreadView] Failed to send reply:', err);
      setError(err.message || 'Failed to send reply');
    }
  }, [channelId, message.id, replies, currentUserId]);

  const handleImageUpload = useCallback(async (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<ChatImage | undefined> => {
    try {
      console.log('[ThreadView] Uploading image:', file.name);
      const result = await api.uploadImage(channelId, file, onProgress);
      console.log('[ThreadView] Upload result:', result);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error('Upload failed');
    } catch (err: any) {
      console.error('[ThreadView] Image upload error:', err);
      throw err;
    }
  }, [channelId]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)] border-l-2 border-[var(--color-border-primary)] shadow-[4px_0_24px_rgba(0,0,0,0.08)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
        <button
          onClick={onBack}
          className="p-1 rounded-[var(--radius-md)] transition-all border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-text-secondary)]" />
        </button>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          <h2 className="font-bold text-[var(--color-text-primary)]">Thread</h2>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm bg-status-error/10 text-status-error border-b-2 border-status-error">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto opacity-70 hover:opacity-100 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Replies */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Parent Message */}
        <div className="px-4 py-3 border-b-2 border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)]">
          <div className="flex gap-3">
            <Avatar
              name={message.user?.name || 'Unknown'}
              src={message.user?.avatar}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-sm text-[var(--color-text-primary)]">
                  {message.user?.name || 'Unknown User'}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)] font-medium">
                  {formatDate(message.createdAt)}
                </span>
              </div>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, { strict: false, trust: true, throwOnError: false }]]}
                components={{
                  pre: ({ children }) => <>{children}</>,
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
                          className="px-1.5 py-0.5 rounded bg-bg-tertiary text-accent-primary font-mono text-[13px]"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }

                    if (rawLanguage === 'mermaid') {
                      const MermaidDiag = () => {
                        const [svg, setSvg] = useState('');
                        const [error, setError] = useState('');
                        useEffect(() => {
                          const render = async () => {
                            try {
                              const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                              const { svg } = await mermaid.render(id, String(children).replace(/\n$/, ''));
                              setSvg(svg);
                              setError('');
                            } catch (err) {
                              setError('Failed to render diagram');
                            }
                          };
                          render();
                        }, [children]);
                        if (error) return <div className="p-4 my-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>;
                        return <div className="my-2 flex justify-center overflow-auto" style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', maxWidth: '50%' }} dangerouslySetInnerHTML={{ __html: svg.replace(/<svg/, '<svg style="background-color:#ffffff"') }} />;
                      };
                      return <MermaidDiag />;
                    }

                    return (
                      <div className="rounded-lg overflow-hidden border border-gray-700 w-full my-2">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2d2d] border-b border-gray-700">
                          <span className="text-xs font-mono uppercase tracking-wide text-text-tertiary">
                            {language || 'text'}
                          </span>
                        </div>
                        <SyntaxHighlighter
                          language={language || 'plaintext'}
                          style={vscDarkPlus}
                          customStyle={{ margin: 0, padding: '1rem', background: '#1e1e1e', fontSize: '13px', lineHeight: '1.5' }}
                          codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace' } }}
                          showLineNumbers={false}
                          wrapLines={true}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    );
                  },
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
                      {children}
                    </a>
                  ),
                  p: ({ children }) => <p className="text-sm text-text-primary mt-1">{children}</p>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-accent-primary)]" />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--color-text-tertiary)]">
            <MessageSquare className="h-8 w-8 mb-2 text-[var(--color-text-placeholder)]" />
            <p className="text-sm font-medium">No replies yet</p>
            <p className="text-xs text-[var(--color-text-placeholder)]">Be the first to reply</p>
          </div>
        ) : (
          <div className="py-2">
            {(() => {
              const allReplies = [...replies];
              for (const localMsg of localThreadMessages) {
                if (!allReplies.some(r => r.id === localMsg.id)) {
                  allReplies.push(localMsg);
                }
              }
              return allReplies.map((reply) => {
                const isOwn = reply.userId === currentUserId;
                return (
                  <EnhancedMessage
                    key={reply.id}
                    message={reply}
                    isOwn={isOwn}
                    showAvatar={true}
                  />
                );
              });
            })()}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <EnhancedMessageInput
        onSend={handleSendReply}
        onImageUpload={handleImageUpload}
        placeholder="Reply to thread..."
      />
    </div>
  );
}
