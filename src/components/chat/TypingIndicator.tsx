import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface TypingIndicatorProps {
  label?: string;
  showIcon?: boolean;
  className?: string;
}

/**
 * TypingIndicator - Animated indicator showing AI is processing
 * Shows animated dots with optional label text.
 */
export function TypingIndicator({
  label,
  showIcon = true,
  className,
}: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 text-slate-500', className)}>
      {showIcon && (
        <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
      )}
      <div className="flex items-center gap-1">
        <div className="flex space-x-1">
          <span
            className="w-2 h-2 bg-purple-500/60 rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '600ms' }}
          />
          <span
            className="w-2 h-2 bg-purple-500/60 rounded-full animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '600ms' }}
          />
          <span
            className="w-2 h-2 bg-purple-500/60 rounded-full animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '600ms' }}
          />
        </div>
        {label && <span className="ml-2 text-xs">{label}</span>}
      </div>
    </div>
  );
}

export default TypingIndicator;
