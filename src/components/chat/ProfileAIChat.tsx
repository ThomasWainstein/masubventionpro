import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Sparkles,
  AlertCircle,
  Trash2,
  ArrowRight,
  Euro,
  Target,
  TrendingUp,
  Shield,
  History,
  Plus,
  MessageSquare,
  ChevronDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStreamingAI } from '@/hooks/useStreamingAI';
import { useProfile } from '@/contexts/ProfileContext';
import { useSavedSubsidies } from '@/hooks/useSavedSubsidies';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { SuggestedPrompts } from './SuggestedPrompts';
import { IntelligenceScoreCard } from './IntelligenceScoreCard';
import { PIIWarningDialog } from '@/components/ai';

interface ProfileAIChatProps {
  className?: string;
}

export function ProfileAIChat({ className = '' }: ProfileAIChatProps) {
  const { profile, hasProfile } = useProfile();
  const { toggleSave, isSaved } = useSavedSubsidies();
  const {
    messages,
    isStreaming,
    error,
    intelligence,
    conversationId,
    conversations,
    pendingPII,
    sendMessage,
    handlePIIChoice,
    clearMessages,
    loadConversation,
    loadConversationById,
    createNewConversation,
  } = useStreamingAI();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistory]);

  // Load conversation when profile changes
  useEffect(() => {
    if (profile?.id) {
      loadConversation(profile.id);
    }
  }, [profile?.id, loadConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const handleSendMessage = (content: string) => {
    console.log('[ProfileAIChat] handleSendMessage called', { content, profileId: profile?.id, hasProfile });
    if (!profile?.id) {
      console.warn('[ProfileAIChat] No profile.id, cannot send message');
      return;
    }
    sendMessage(content, profile.id, profile);
  };

  const handleTrackSubsidy = async (subsidyId: string) => {
    try {
      await toggleSave(subsidyId);
    } catch (err) {
      console.error('Error saving subsidy:', err);
    }
  };

  const handleSelectConversation = async (id: string) => {
    await loadConversationById(id);
    setShowHistory(false);
  };

  const handleNewConversation = () => {
    createNewConversation();
    setShowHistory(false);
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M EUR`;
    if (amount >= 1000) return `${Math.round(amount / 1000)}K EUR`;
    return `${amount} EUR`;
  };

  // No profile - prompt to complete it
  if (!hasProfile) {
    return (
      <div
        className={`bg-white rounded-xl border border-slate-200 p-8 text-center ${className}`}
      >
        <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4">
          <Bot className="h-8 w-8 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Assistant IA disponible
        </h3>
        <p className="text-slate-600 mb-4">
          Complétez votre profil entreprise pour accéder à l'assistant IA et
          recevoir des recommandations personnalisées.
        </p>
        <Link to="/app/profile/setup">
          <Button>
            Compléter mon profil
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  // Get top match info for suggested prompts
  const topMatch = intelligence?.profileMatches?.matches?.[0];
  const matchedCount = intelligence?.profileMatches?.stats?.totalMatches || 0;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full">
            <Bot className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Assistant IA</h3>
            <p className="text-xs text-slate-500">
              Votre conseiller en subventions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* RGPD Badge */}
          {intelligence?.rgpdProtection?.wasAnonymized && (
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded text-xs text-emerald-700">
              <Shield className="h-3 w-3" />
              <span>RGPD</span>
            </div>
          )}

          {/* Conversation History Dropdown */}
          <div className="relative" ref={historyRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-slate-500 hover:text-slate-700"
            >
              <History className="h-4 w-4 mr-1" />
              Historique
              <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </Button>

            {/* Dropdown Panel */}
            {showHistory && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
                  <span className="text-sm font-medium text-slate-700">Conversations</span>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                </div>

                {/* New Conversation Button */}
                <button
                  onClick={handleNewConversation}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-purple-50 text-purple-600 border-b border-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Nouvelle conversation</span>
                </button>

                {/* Conversation List */}
                <div className="max-h-64 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-slate-500">
                      Aucune conversation précédente
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 ${
                          conv.id === conversationId ? 'bg-purple-50' : ''
                        }`}
                      >
                        <MessageSquare className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          conv.id === conversationId ? 'text-purple-600' : 'text-slate-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${
                            conv.id === conversationId ? 'font-medium text-purple-700' : 'text-slate-700'
                          }`}>
                            {conv.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatRelativeTime(conv.updated_at)}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-slate-500 hover:text-slate-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="h-6 w-6" />
                <h3 className="font-semibold text-lg">
                  Bonjour{profile?.company_name ? `, ${profile.company_name}` : ''}{' '}
                  !
                </h3>
              </div>
              <p className="text-purple-100">
                Je suis votre assistant IA spécialisé dans les subventions. Je
                peux vous aider à :
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-200" />
                  Trouver les aides adaptées à votre profil
                </li>
                <li className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-purple-200" />
                  Estimer vos chances de succès
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-200" />
                  Optimiser vos candidatures
                </li>
              </ul>
            </div>

            {/* Suggested Prompts */}
            <div>
              <p className="text-sm text-slate-500 mb-3">
                Questions suggérées :
              </p>
              <SuggestedPrompts
                onSelectPrompt={handleSendMessage}
                profileName={profile?.company_name}
                topSubsidyName={topMatch?.title}
                matchedCount={matchedCount}
                variant="buttons"
                disabled={isStreaming}
              />
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Typing Indicator */}
        {isStreaming &&
          messages.length > 0 &&
          messages[messages.length - 1]?.content === '' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <TypingIndicator label="Analyse en cours..." />
            </div>
          )}

        {/* Quick Score Card */}
        {intelligence?.quickScore?.raw && (
          <IntelligenceScoreCard
            data={intelligence.quickScore.raw}
            mode="compact"
            onTrackSubsidy={handleTrackSubsidy}
            isTracked={
              intelligence.quickScore.raw.subsidy_context
                ? isSaved(intelligence.quickScore.raw.subsidy_context.subsidy_id)
                : false
            }
          />
        )}

        {/* Matched Subsidies Panel */}
        {intelligence?.profileMatches?.matches &&
          intelligence.profileMatches.matches.length > 0 &&
          !intelligence.quickScore && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h4 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Aides recommandées pour vous
              </h4>
              <div className="space-y-2">
                {intelligence.profileMatches.matches.slice(0, 5).map((match) => (
                  <Link
                    key={match.id}
                    to={`/app/subsidy/${match.id}`}
                    className="block bg-white rounded-lg p-3 border border-emerald-100 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {match.title}
                        </p>
                        {match.organization && (
                          <p className="text-xs text-slate-500 truncate">
                            {match.organization}
                          </p>
                        )}
                        {match.successReasons && match.successReasons.length > 0 && (
                          <p className="text-xs text-emerald-600 mt-1">
                            {match.successReasons[0]}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          {match.successProbability}%
                        </span>
                        {match.amountMax && (
                          <span className="text-xs text-slate-600">
                            {formatCurrency(match.amountMax)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Stats */}
              {intelligence.profileMatches.stats && (
                <div className="mt-3 pt-3 border-t border-emerald-200 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-700">
                  <span>
                    {intelligence.profileMatches.stats.totalMatches} aides
                    éligibles
                  </span>
                  {intelligence.profileMatches.stats.highProbabilityCount > 0 && (
                    <span>
                      {intelligence.profileMatches.stats.highProbabilityCount}{' '}
                      forte probabilité
                    </span>
                  )}
                  {intelligence.profileMatches.stats.totalPotential > 0 && (
                    <span>
                      Potentiel:{' '}
                      {formatCurrency(
                        intelligence.profileMatches.stats.totalPotential
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Benchmark */}
              {intelligence.profileMatches.benchmark && (
                <div className="mt-2 text-xs text-emerald-600">
                  Taux de succès moyen du secteur:{' '}
                  {intelligence.profileMatches.benchmark.baseSuccessRate}%
                </div>
              )}
            </div>
          )}

        {/* Stacking Recommendations */}
        {intelligence?.stacking?.raw && intelligence.stacking.raw.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Aides cumulables recommandées
            </h4>
            <div className="space-y-2">
              {intelligence.stacking.raw.slice(0, 3).map((subsidy) => (
                <Link
                  key={subsidy.subsidy_id}
                  to={`/app/subsidy/${subsidy.subsidy_id}`}
                  className="block bg-white rounded-lg p-3 border border-blue-100 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {subsidy.subsidy_title}
                      </p>
                      <p className="text-xs text-slate-500">{subsidy.agency}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {subsidy.compatibility_score}% compatible
                    </span>
                  </div>
                  {subsidy.companies_stacked > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      {subsidy.companies_stacked} entreprises ont cumulé ces aides
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Detected Context Badge */}
        {intelligence?.detectedContext?.newRegion && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            <span>Région détectée:</span>
            <span className="font-medium">
              {intelligence.detectedContext.detectedCity
                ? `${intelligence.detectedContext.detectedCity} (${intelligence.detectedContext.newRegion})`
                : intelligence.detectedContext.newRegion}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Erreur</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Quick Prompts after conversation started */}
        {messages.length > 0 && messages.length < 6 && !isStreaming && (
          <div className="pt-2">
            <SuggestedPrompts
              onSelectPrompt={handleSendMessage}
              profileName={profile?.company_name}
              topSubsidyName={topMatch?.title}
              matchedCount={matchedCount}
              variant="chips"
              disabled={isStreaming}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isStreaming}
          disabled={!profile?.id}
          placeholder="Posez une question sur les subventions..."
        />
        <p className="text-xs text-slate-400 mt-2 text-center">
          L'IA peut faire des erreurs. Vérifiez les informations importantes.
        </p>
      </div>

      {/* PII Warning Dialog */}
      <PIIWarningDialog
        open={!!pendingPII}
        matches={pendingPII?.matches || []}
        onChoice={handlePIIChoice}
      />
    </div>
  );
}

export default ProfileAIChat;
