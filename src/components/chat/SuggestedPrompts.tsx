import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Target,
  Layers,
  Calendar,
  TrendingUp,
  Lightbulb,
  HelpCircle,
} from 'lucide-react';

interface PromptSuggestion {
  id: string;
  label: string;
  prompt: string;
  icon: React.ElementType;
  description?: string;
}

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  profileName?: string;
  topSubsidyName?: string;
  matchedCount?: number;
  variant?: 'chips' | 'buttons';
  className?: string;
  disabled?: boolean;
}

/**
 * SuggestedPrompts - Clickable prompt suggestions for AI chat
 * Shows context-aware prompts to help users start conversations.
 */
export function SuggestedPrompts({
  onSelectPrompt,
  topSubsidyName,
  matchedCount = 0,
  variant = 'chips',
  className,
  disabled = false,
}: SuggestedPromptsProps) {
  // Build dynamic prompts based on context
  const prompts: PromptSuggestion[] = [
    {
      id: 'analyze-chances',
      label: 'Analyser mes chances',
      prompt:
        'Analyse mes chances de succes pour les subventions qui correspondent a mon profil.',
      icon: Target,
      description: 'Score de succes base sur les donnees historiques',
    },
    {
      id: 'stackable',
      label: 'Aides cumulables',
      prompt:
        'Quelles aides peuvent etre cumulees pour maximiser mes financements ?',
      icon: Layers,
      description: 'Strategie de cumul optimale',
    },
    {
      id: 'deadlines',
      label: 'Prochaines echeances',
      prompt:
        'Quelles sont les prochaines echeances importantes pour mes subventions ?',
      icon: Calendar,
      description: 'Ne manquez aucune deadline',
    },
    {
      id: 'best-match',
      label: topSubsidyName
        ? `Score pour ${topSubsidyName.substring(0, 20)}...`
        : 'Meilleure opportunite',
      prompt: topSubsidyName
        ? `Analyse en detail mes chances pour "${topSubsidyName}".`
        : 'Quelle est ma meilleure opportunite de financement actuellement ?',
      icon: TrendingUp,
      description: 'Analyse detaillee',
    },
  ];

  // Add context-aware prompt if we have match count
  if (matchedCount > 0) {
    prompts.push({
      id: 'overview',
      label: `Resumer mes ${matchedCount} aides`,
      prompt: `Donne-moi un resume de mes ${matchedCount} aides eligibles et par ou je devrais commencer.`,
      icon: Lightbulb,
      description: "Vue d'ensemble de vos opportunites",
    });
  }

  // Add general help prompt
  prompts.push({
    id: 'help',
    label: 'Comment ca marche ?',
    prompt:
      "Explique-moi comment tu peux m'aider a trouver et obtenir des subventions.",
    icon: HelpCircle,
    description: "Guide d'utilisation",
  });

  if (variant === 'buttons') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2', className)}>
        {prompts.slice(0, 4).map((suggestion) => (
          <Button
            key={suggestion.id}
            variant="outline"
            className={cn(
              'h-auto py-3 px-4 justify-start gap-3 text-left',
              'hover:bg-purple-50 hover:border-purple-200 transition-colors',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => !disabled && onSelectPrompt(suggestion.prompt)}
            disabled={disabled}
          >
            <suggestion.icon className="h-5 w-5 text-purple-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate text-slate-900">
                {suggestion.label}
              </div>
              {suggestion.description && (
                <div className="text-xs text-slate-500 truncate">
                  {suggestion.description}
                </div>
              )}
            </div>
          </Button>
        ))}
      </div>
    );
  }

  // Chips variant (default)
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {prompts.slice(0, 5).map((suggestion) => (
        <button
          key={suggestion.id}
          className={cn(
            'inline-flex items-center gap-1.5 py-1.5 px-3 text-sm rounded-full',
            'border border-slate-200 bg-white text-slate-700',
            'hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700',
            'transition-colors',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && onSelectPrompt(suggestion.prompt)}
          disabled={disabled}
        >
          <suggestion.icon className="h-3.5 w-3.5" />
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

export default SuggestedPrompts;
