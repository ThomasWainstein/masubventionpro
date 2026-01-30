import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Globe,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/contexts/ProfileContext';
import { useAIUsage, estimateTokens } from '@/hooks/useAIUsage';
import type { WebsiteIntelligenceData } from '@/types';

interface ProfileEnrichmentSectionProps {
  onEnrichmentComplete?: () => void;
}

export function ProfileEnrichmentSection({ onEnrichmentComplete }: ProfileEnrichmentSectionProps) {
  const { profile, updateProfile } = useProfile();

  // AI usage tracking
  const { checkUsage, logUsage, canUseAI, status: usageStatus } = useAIUsage();

  // Website analysis state
  const [showWebsiteDialog, setShowWebsiteDialog] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(profile?.website_url || '');
  const [analyzingWebsite, setAnalyzingWebsite] = useState(false);
  const [websiteIntelligence, setWebsiteIntelligence] = useState<WebsiteIntelligenceData | null>(
    profile?.website_intelligence as WebsiteIntelligenceData | null
  );
  const [websiteError, setWebsiteError] = useState<string | null>(null);

  // Document analysis state
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);

  // Handle website URL change
  const handleWebsiteChange = (url: string) => {
    setWebsiteUrl(url);
    setWebsiteError(null);
  };

  // Analyze website
  const handleAnalyzeWebsite = async () => {
    if (!websiteUrl) {
      setWebsiteError('Veuillez entrer une URL');
      return;
    }

    // Validate URL format
    let validUrl = websiteUrl;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    try {
      new URL(validUrl);
    } catch {
      setWebsiteError('URL invalide. Exemple: www.mon-entreprise.fr');
      return;
    }

    // Check AI usage before proceeding
    const usageCheck = await checkUsage();
    if (!usageCheck.allowed) {
      setWebsiteError(usageCheck.error || 'Limite d\'utilisation IA atteinte');
      return;
    }

    setAnalyzingWebsite(true);
    setWebsiteError(null);

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !session?.user?.id) {
        throw new Error('Non authentifie');
      }

      // Call the analyze-company-website edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-company-website`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            website_url: validUrl,
            profile_id: profile?.id,
            user_id: session.user.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur serveur: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Analyse echouee');
      }

      // Log AI usage (estimate tokens from URL and result)
      const inputTokens = result.tokens_used?.input || estimateTokens(validUrl);
      const outputTokens = result.tokens_used?.output || estimateTokens(JSON.stringify(result.intelligence));
      logUsage({
        function_name: 'analyze-company-website',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        profile_id: profile?.id,
        success: true,
      });

      // Store the intelligence data
      setWebsiteIntelligence(result.intelligence);

      // Update profile with website URL and intelligence data
      await updateProfile({
        website_url: validUrl,
        website_intelligence: result.intelligence,
      });

      // Close dialog after success
      setTimeout(() => {
        setShowWebsiteDialog(false);
        onEnrichmentComplete?.();
      }, 1500);
    } catch (error: any) {
      console.error('Website analysis failed:', error);
      setWebsiteError(error.message || 'Echec de l\'analyse. Veuillez reessayer.');
    } finally {
      setAnalyzingWebsite(false);
    }
  };

  // Use AI-generated description
  const handleUseDescription = async (description: string) => {
    try {
      await updateProfile({ description });
      onEnrichmentComplete?.();
    } catch (error) {
      console.error('Failed to update description:', error);
    }
  };

  return (
    <>
      {/* Enrichment Action Buttons */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Enrichissement IA du profil
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Analysez automatiquement votre site web et vos documents pour ameliorer les recommandations
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Website Enrichment Button */}
            <button
              onClick={() => setShowWebsiteDialog(true)}
              className="flex flex-col items-center gap-3 p-6 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-purple-200 transition-colors text-center"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Analyser mon site web</p>
                <p className="text-sm text-slate-500 mt-1">
                  Extraction automatique des informations
                </p>
              </div>
              {websiteIntelligence && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  Analyse effectuee
                </span>
              )}
            </button>

            {/* Document Enrichment Button */}
            <button
              onClick={() => setShowDocumentsDialog(true)}
              className="flex flex-col items-center gap-3 p-6 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-purple-200 transition-colors text-center"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Enrichir par documents</p>
                <p className="text-sm text-slate-500 mt-1">
                  Uploadez des documents pour enrichir le profil
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Website Analysis Dialog */}
      <Dialog open={showWebsiteDialog} onOpenChange={setShowWebsiteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Analyse du site web
            </DialogTitle>
            <DialogDescription>
              Entrez l'URL de votre site web pour extraire automatiquement des informations sur votre entreprise
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">URL du site web</Label>
              <Input
                id="websiteUrl"
                type="text"
                value={websiteUrl}
                onChange={(e) => handleWebsiteChange(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    handleWebsiteChange('https://' + value);
                  }
                }}
                placeholder="www.mon-entreprise.fr"
                disabled={analyzingWebsite}
              />
              {websiteError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {websiteError}
                </p>
              )}
            </div>

            {websiteUrl && (
              <div className="space-y-2">
                <Button
                  onClick={handleAnalyzeWebsite}
                  disabled={analyzingWebsite || !canUseAI()}
                  className="w-full gap-2"
                >
                  {analyzingWebsite ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyser le site web
                    </>
                  )}
                </Button>
                {usageStatus?.isBlocked && (
                  <p className="text-xs text-red-600 text-center">
                    Limite d'utilisation atteinte. Passez a un forfait superieur pour continuer.
                  </p>
                )}
                {!usageStatus?.isBlocked && (usageStatus?.percentage ?? 0) > 80 && (
                  <p className="text-xs text-amber-600 text-center">
                    Attention: Vous approchez de votre limite d'utilisation IA
                  </p>
                )}
              </div>
            )}

            {/* Success Message with Intelligence Data */}
            {websiteIntelligence && !analyzingWebsite && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <p className="font-medium text-emerald-800">
                    Site web analyse avec succes
                  </p>
                </div>

                {/* Business Activities */}
                {websiteIntelligence.businessActivities && websiteIntelligence.businessActivities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-emerald-700 mb-1">
                      Activites identifiees:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {websiteIntelligence.businessActivities.slice(0, 5).map((activity, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded"
                        >
                          {activity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI-Generated Description */}
                {websiteIntelligence.companyDescription && (
                  <div className="bg-white p-3 rounded border border-emerald-200">
                    <p className="text-xs font-medium text-emerald-700 mb-1">
                      Description generee par l'IA:
                    </p>
                    <p className="text-sm text-slate-700 mb-2">
                      {websiteIntelligence.companyDescription.substring(0, 200)}
                      {websiteIntelligence.companyDescription.length > 200 ? '...' : ''}
                    </p>
                    {!profile?.description && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleUseDescription(websiteIntelligence.companyDescription!)}
                        className="text-xs h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      >
                        Utiliser cette description
                      </Button>
                    )}
                  </div>
                )}

                {/* Innovation Score */}
                {websiteIntelligence.innovations && websiteIntelligence.innovations.score > 0 && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                    <span>Score innovation:</span>
                    <span className="font-semibold">{websiteIntelligence.innovations.score}/100</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWebsiteDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Documents Dialog */}
      <Dialog open={showDocumentsDialog} onOpenChange={setShowDocumentsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Enrichissement par documents
            </DialogTitle>
            <DialogDescription>
              Uploadez des documents (business plan, statuts, rapports) pour enrichir automatiquement votre profil
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-slate-600 text-center py-8">
              Utilisez la section "Documents" ci-dessous pour uploader vos fichiers.
              <br />
              L'IA analysera automatiquement leur contenu.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocumentsDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProfileEnrichmentSection;
