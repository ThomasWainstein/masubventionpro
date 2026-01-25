import { Link } from 'react-router-dom';
import { SavedSubsidy, getSubsidyTitle } from '@/types';
import {
  Bookmark,
  Send,
  Trophy,
  Clock,
  XCircle,
  CheckCircle,
} from 'lucide-react';

interface ActivityFeedProps {
  savedSubsidies: SavedSubsidy[];
  maxItems?: number;
}

// Get icon and color for activity status
function getActivityStyle(status: SavedSubsidy['status']) {
  switch (status) {
    case 'saved':
      return { icon: Bookmark, color: 'bg-blue-100 text-blue-600', label: 'Sauvegardée' };
    case 'interested':
      return { icon: CheckCircle, color: 'bg-indigo-100 text-indigo-600', label: 'Intéressée' };
    case 'applied':
      return { icon: Send, color: 'bg-amber-100 text-amber-600', label: 'Candidature envoyée' };
    case 'received':
      return { icon: Trophy, color: 'bg-emerald-100 text-emerald-600', label: 'Obtenue' };
    case 'rejected':
      return { icon: XCircle, color: 'bg-red-100 text-red-600', label: 'Refusée' };
    default:
      return { icon: Clock, color: 'bg-slate-100 text-slate-600', label: 'En attente' };
  }
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "A l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function ActivityFeed({ savedSubsidies, maxItems = 5 }: ActivityFeedProps) {
  // Sort by created_at descending and take max items
  const recentActivities = [...savedSubsidies]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, maxItems);

  if (recentActivities.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Aucune activité récente</p>
        <p className="text-xs text-slate-400 mt-1">
          Sauvegardez des aides pour voir votre activité ici
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentActivities.map((activity) => {
        const style = getActivityStyle(activity.status);
        const Icon = style.icon;
        const subsidyTitle = activity.subsidy
          ? getSubsidyTitle(activity.subsidy)
          : 'Aide';

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${style.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900">
                <span className="font-medium">{style.label}</span>
              </p>
              <Link
                to={`/app/subsidy/${activity.subsidy_id}`}
                className="text-sm text-slate-600 hover:text-blue-600 line-clamp-1"
              >
                {subsidyTitle}
              </Link>
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">
              {formatRelativeTime(activity.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default ActivityFeed;
