import { Helmet } from 'react-helmet-async';
import { ProfileAIChat } from '@/components/chat';
import { useProfile } from '@/contexts/ProfileContext';
import { Sparkles } from 'lucide-react';

export function AIAssistantPage() {
  const { profile, hasProfile } = useProfile();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <Helmet>
        <title>Assistant IA - MaSubventionPro</title>
      </Helmet>

      {/* Page Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Assistant IA</h1>
            <p className="text-slate-600 text-sm">
              {hasProfile
                ? `Conseiller personnalise pour ${profile?.company_name || 'votre entreprise'}`
                : 'Completez votre profil pour activer l\'assistant'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <ProfileAIChat className="h-full" />
      </div>
    </div>
  );
}

export default AIAssistantPage;
