import { Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/hooks/useStreamingAI';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Parse markdown-style formatting for display
  const formatContent = (content: string) => {
    if (!content) return null;

    // Split by newlines and process each line
    const lines = content.split('\n');

    return lines.map((line, i) => {
      // Bold text: **text**
      let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

      // Links: [text](url) or /aide/uuid pattern
      processed = processed.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener">$1</a>'
      );

      // Convert /aide/uuid to clickable links
      processed = processed.replace(
        /\/aide\/([a-f0-9-]{36})/g,
        '<a href="/app/subsidy/$1" class="text-blue-600 hover:underline">/aide/$1</a>'
      );

      // Headers: ### text or ## text
      if (line.startsWith('### ')) {
        return (
          <h4
            key={i}
            className="font-semibold text-slate-900 mt-3 mb-1"
            dangerouslySetInnerHTML={{ __html: processed.slice(4) }}
          />
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3
            key={i}
            className="font-bold text-slate-900 mt-4 mb-2"
            dangerouslySetInnerHTML={{ __html: processed.slice(3) }}
          />
        );
      }

      // List items: - text
      if (line.startsWith('- ')) {
        return (
          <li
            key={i}
            className="ml-4 list-disc text-slate-700"
            dangerouslySetInnerHTML={{ __html: processed.slice(2) }}
          />
        );
      }

      // Empty lines
      if (!line.trim()) {
        return <br key={i} />;
      }

      // Regular paragraph
      return (
        <p
          key={i}
          className="text-slate-700"
          dangerouslySetInnerHTML={{ __html: processed }}
        />
      );
    });
  };

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        isUser ? 'bg-blue-50' : 'bg-white border border-slate-200'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-blue-600' : 'bg-purple-600'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 mb-1">
          {isUser ? 'Vous' : 'Assistant IA'}
        </div>
        <div className="prose prose-sm max-w-none">
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Reflexion en cours...</span>
            </div>
          ) : (
            formatContent(message.content)
          )}
          {message.isStreaming && message.content && (
            <span className="inline-block w-2 h-4 bg-purple-600 animate-pulse ml-0.5" />
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
