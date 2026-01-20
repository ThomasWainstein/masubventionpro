import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  User,
  Settings,
  Menu,
  ChevronDown,
} from 'lucide-react';

interface AppHeaderProps {
  onMenuClick: () => void;
  isSidebarCollapsed: boolean;
}

export function AppHeader({ onMenuClick, isSidebarCollapsed }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Utilisateur';

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-white border-b border-slate-200 transition-all duration-300 ${
        isSidebarCollapsed ? 'left-16' : 'left-60'
      }`}
    >
      <div className="flex h-full items-center justify-between px-4">
        {/* Left side - Mobile menu button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Right side - User menu */}
        <div className="relative">
          <Button
            variant="ghost"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline-block font-medium">{userName}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              {/* Menu */}
              <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-medium text-slate-900">{userName}</p>
                  <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                </div>
                <Link
                  to="/app/profile/edit"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <User className="h-4 w-4" />
                  Mon profil
                </Link>
                <Link
                  to="/app/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4" />
                  Parametres
                </Link>
                <div className="border-t border-slate-100 mt-2 pt-2">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Deconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
