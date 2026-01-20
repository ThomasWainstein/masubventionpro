import { useState } from 'react';
import {
  Sparkles,
  Globe,
  ChevronDown,
  ChevronUp,
  Briefcase,
  FileText,
  Leaf,
  TrendingUp,
  Monitor,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WebsiteIntelligenceData } from '@/types';

interface WebsiteIntelligenceDisplayProps {
  data: WebsiteIntelligenceData;
  websiteUrl?: string | null;
}

export function WebsiteIntelligenceDisplay({
  data,
  websiteUrl,
}: WebsiteIntelligenceDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Count total extracted elements
  const elementCount =
    (data.businessActivities?.length || 0) +
    (data.companyDescription ? 1 : 0) +
    (data.innovations?.indicators?.length || 0) +
    (data.sustainability?.initiatives?.length || 0) +
    (data.export?.markets?.length || 0) +
    (data.digital?.technologies?.length || 0);

  // Check if we have any data to display
  const hasData =
    data.companyDescription ||
    (data.businessActivities && data.businessActivities.length > 0) ||
    (data.innovations && data.innovations.score > 0) ||
    (data.sustainability && data.sustainability.score > 0) ||
    (data.export && data.export.score > 0) ||
    (data.digital && data.digital.score > 0);

  if (!hasData) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="font-semibold text-slate-900">Intelligence IA</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-500"
        >
          {isExpanded ? (
            <>
              Reduire
              <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              {elementCount} elements extraits
              <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Business Activities */}
          {data.businessActivities && data.businessActivities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-slate-900">
                  Activites Commerciales
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.businessActivities.map((activity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full"
                  >
                    <span className="mr-1.5 text-blue-400">•</span>
                    {activity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Data Summary Card */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  Donnees Enrichies par IA
                </span>
              </div>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                {elementCount} elements extraits
              </span>
            </div>

            {websiteUrl && (
              <p className="text-xs text-purple-600 mb-2">
                Site web: {elementCount} elements
              </p>
            )}

            {/* Company Description */}
            {data.companyDescription && (
              <div className="bg-white rounded-lg p-4 border border-purple-200 mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <h4 className="text-sm font-medium text-slate-900">
                    Description de l'Entreprise
                  </h4>
                  {websiteUrl && (
                    <span className="text-xs text-slate-400">Site web</span>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {data.companyDescription}
                </p>
              </div>
            )}

            {/* Activities List */}
            {data.businessActivities && data.businessActivities.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-purple-200 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <h4 className="text-sm font-medium text-slate-900">
                      Activites Commerciales
                    </h4>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {data.businessActivities.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {data.businessActivities.map((activity, index) => (
                    <p key={index} className="text-sm text-slate-600">
                      {activity}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Innovation Score */}
            {data.innovations && data.innovations.score > 0 && (
              <ScoreCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Innovation"
                score={data.innovations.score}
                color="emerald"
                details={data.innovations.technologies}
              />
            )}

            {/* Sustainability Score */}
            {data.sustainability && data.sustainability.score > 0 && (
              <ScoreCard
                icon={<Leaf className="h-4 w-4" />}
                label="Durabilite"
                score={data.sustainability.score}
                color="green"
                details={data.sustainability.initiatives}
              />
            )}

            {/* Export Score */}
            {data.export && data.export.score > 0 && (
              <ScoreCard
                icon={<Globe className="h-4 w-4" />}
                label="Export"
                score={data.export.score}
                color="blue"
                details={data.export.markets}
              />
            )}

            {/* Digital Score */}
            {data.digital && data.digital.score > 0 && (
              <ScoreCard
                icon={<Monitor className="h-4 w-4" />}
                label="Digital"
                score={data.digital.score}
                color="purple"
                details={data.digital.technologies}
              />
            )}
          </div>

          {/* Footer */}
          <p className="text-xs text-slate-400 text-center pt-2 border-t border-slate-100">
            Donnees extraites automatiquement par IA depuis le site web
            {data.analysis?.analysisDate && (
              <> • Analyse du {new Date(data.analysis.analysisDate).toLocaleDateString('fr-FR')}</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

interface ScoreCardProps {
  icon: React.ReactNode;
  label: string;
  score: number;
  color: 'emerald' | 'green' | 'blue' | 'purple';
  details?: string[];
}

function ScoreCard({ icon, label, score, color, details }: ScoreCardProps) {
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: 'text-emerald-600',
      bar: 'bg-emerald-500',
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      icon: 'text-green-600',
      bar: 'bg-green-500',
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: 'text-blue-600',
      bar: 'bg-blue-500',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      icon: 'text-purple-600',
      bar: 'bg-purple-500',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} rounded-lg p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={colors.icon}>{icon}</span>
        <span className={`text-xs font-medium ${colors.text}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bar} rounded-full transition-all`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-xs font-semibold ${colors.text}`}>{score}%</span>
      </div>
      {details && details.length > 0 && (
        <p className={`text-xs ${colors.text} mt-1 truncate opacity-75`}>
          {details[0]}
          {details.length > 1 && ` +${details.length - 1}`}
        </p>
      )}
    </div>
  );
}

export default WebsiteIntelligenceDisplay;
