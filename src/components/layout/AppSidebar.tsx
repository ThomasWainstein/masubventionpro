import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Search,
  Bookmark,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNewSubsidies } from '@/hooks/useNewSubsidies';
import { useProfile } from '@/contexts/ProfileContext';

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    title: 'Tableau de bord',
    href: '/app',
    icon: LayoutDashboard,
  },
  {
    title: 'Moteur de recherche',
    href: '/app/search',
    icon: Search,
  },
  {
    title: 'Assistant IA',
    href: '/app/ai',
    icon: Sparkles,
  },
  {
    title: 'Mes subventions',
    href: '/app/saved',
    icon: Bookmark,
  },
  {
    title: 'Mon profil',
    href: '/app/profile',
    icon: Building2,
  },
];

const bottomNavItems = [
  {
    title: 'Paramètres',
    href: '/app/settings',
    icon: Settings,
  },
];

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const { newCount, hasNew, markAsViewed } = useNewSubsidies();
  const { profile, profiles, setActiveProfile } = useProfile();
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);

  // Only show company switcher if user has multiple profiles
  const hasMultipleProfiles = profiles.length > 1;

  // Mark subsidies as viewed when user visits search page
  useEffect(() => {
    if (location.pathname === '/app/search' && hasNew) {
      markAsViewed();
    }
  }, [location.pathname, hasNew, markAsViewed]);

  const isActive = (href: string) => {
    if (href === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
        {!isCollapsed && (
          <Link to="/app" className="flex items-center gap-2">
            <div className="text-lg font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              MaSubventionPro
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Company Selector - Only show when multiple profiles exist */}
      {hasMultipleProfiles && profile && (
        <div className="relative px-2 py-2 border-b border-slate-700">
          <button
            onClick={() => setShowCompanyMenu(!showCompanyMenu)}
            className={cn(
              'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors',
              'bg-slate-800 hover:bg-slate-700 text-slate-200',
              isCollapsed && 'justify-center'
            )}
            title={profile.company_name}
          >
            <div className="flex items-center justify-center w-6 h-6 bg-blue-600 rounded text-white text-xs font-medium flex-shrink-0">
              {profile.company_name.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <>
                <span className="truncate flex-1 text-sm font-medium">
                  {profile.company_name}
                </span>
                <ChevronDown className={cn(
                  'h-4 w-4 text-slate-400 transition-transform',
                  showCompanyMenu && 'rotate-180'
                )} />
              </>
            )}
          </button>

          {/* Company Dropdown */}
          {showCompanyMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowCompanyMenu(false)}
              />
              {/* Menu */}
              <div className={cn(
                'absolute z-50 mt-1 bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden',
                isCollapsed ? 'left-full ml-2 top-0 w-48' : 'left-2 right-2'
              )}>
                <div className="py-1">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        console.log('[Sidebar] Switching to profile:', p.id, p.company_name);
                        setActiveProfile(p.id);
                        setShowCompanyMenu(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                        p.id === profile.id
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-slate-300 hover:bg-slate-700'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-6 h-6 rounded text-xs font-medium flex-shrink-0',
                        p.id === profile.id ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300'
                      )}>
                        {p.company_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate flex-1">{p.company_name}</span>
                      {p.id === profile.id && (
                        <Check className="h-4 w-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
          const showBadge = item.href === '/app/search' && hasNew && newCount > 0;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors relative',
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="truncate flex-1">{item.title}</span>
              )}
              {showBadge && (
                <span
                  className={cn(
                    'flex items-center justify-center text-xs font-medium bg-emerald-500 text-white rounded-full',
                    isCollapsed
                      ? 'absolute -top-1 -right-1 w-5 h-5'
                      : 'px-2 py-0.5 min-w-[20px]'
                  )}
                >
                  {newCount > 99 ? '99+' : newCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 p-2">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
              isActive(item.href)
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">{item.title}</span>}
          </Link>
        ))}
      </div>
    </aside>
  );
}

export default AppSidebar;
