import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Search,
  Bookmark,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNewSubsidies } from '@/hooks/useNewSubsidies';

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
    title: 'Rechercher',
    href: '/app/search',
    icon: Search,
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
    title: 'Parametres',
    href: '/app/settings',
    icon: Settings,
  },
];

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const { newCount, hasNew, markAsViewed } = useNewSubsidies();

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
