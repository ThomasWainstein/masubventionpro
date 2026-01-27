import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ProfileAIChat } from '@/components/chat';
import { useProfile } from '@/contexts/ProfileContext';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AIAssistantPage() {
  const navigate = useNavigate();
  const { profile, hasProfile } = useProfile();

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <Helmet>
        <title>Assistant IA - MaSubventionPro</title>
      </Helmet>

      {/* Compact Header Row */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app')}
            className="-ml-2 text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Assistant IA</h1>
              <p className="text-slate-500 text-xs">
                {hasProfile
                  ? `Conseiller pour ${profile?.company_name || 'votre entreprise'}`
                  : 'Complétez votre profil'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface - Takes remaining space */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <ProfileAIChat className="h-full" />
      </div>
    </div>
  );
}

export default AIAssistantPage;
