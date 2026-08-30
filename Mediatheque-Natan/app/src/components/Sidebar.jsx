import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useDatabase } from '../contexts/DatabaseContext';
import {
  LayoutDashboard,
  Film,
  Music,
  Disc,
  Search,
  Users,
  BarChart3,
  Settings,
  Archive,
  ScanBarcode,
  Eye,
  HelpCircle,
  Bot,
  X
} from 'lucide-react';

const Sidebar = ({ isCollapsed, onClose }) => {
  const { theme } = useTheme();
  const { media } = useDatabase();
  const location = useLocation();

  const getMediaCountByType = (typeId) => {
    return media.filter(m => m.type_id === typeId).length;
  };

  const navItems = [
    {
      to: '/dashboard',
      icon: LayoutDashboard,
      label: 'Tableau de bord',
      badge: null
    },
    {
      to: '/media',
      icon: Film,
      label: 'Tous les médias',
      badge: media.length
    },
    {
      to: '/media/DVD',
      icon: Disc,
      label: 'DVDs',
      badge: getMediaCountByType(1)
    },
    {
      to: '/media/Blu-ray',
      icon: Film,
      label: 'Blu-rays',
      badge: getMediaCountByType(2)
    },
    {
      to: '/media/CD',
      icon: Music,
      label: 'CDs',
      badge: getMediaCountByType(3)
    },
    {
      to: '/search',
      icon: Search,
      label: 'Recherche',
      badge: null
    },
    {
      to: '/users',
      icon: Users,
      label: 'Utilisateurs',
      badge: null
    },
    {
      to: '/loans',
      icon: Archive,
      label: 'Emprunts',
      badge: null
    },
    {
      to: '/stats',
      icon: BarChart3,
      label: 'Statistiques',
      badge: null
    },
    {
      to: '/scan',
      icon: ScanBarcode,
      label: 'Scanner',
      badge: null
    },
    {
      to: '/recognize',
      icon: Eye,
      label: 'Reconnaissance',
      badge: null
    },
    {
      to: '/settings',
      icon: Settings,
      label: 'Paramètres',
      badge: null
    },
    {
      to: '/ai',
      icon: Bot,
      label: 'Assistant IA',
      badge: null
    },
    {
      to: '/about',
      icon: HelpCircle,
      label: 'À propos',
      badge: null
    }
  ];

  const NavItem = ({ to, icon: Icon, label, badge, isCollapsed }) => (
    <NavLink
      to={to}
      className={({ isActive }) => `
        relative flex items-center gap-md px-md py-sm rounded-lg
        transition-all duration-200 ease-out
        ${isActive
          ? 'bg-accent text-white shadow-glow translate-x-0.5'
          : 'text-secondary hover:bg-tertiary hover:text-primary hover:translate-x-0.5'}
      `}
      title={isCollapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-[-0.75rem] top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-accent-light animate-fade-in" />
          )}
          <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isCollapsed ? 'mx-auto' : ''} ${isActive ? 'scale-110' : ''}`} />
          {!isCollapsed && (
            <>
              <span className="flex-1">{label}</span>
              {badge !== null && badge > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-secondary text-primary'}`}>
                  {badge}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="p-lg border-b border-color border-opacity-20">
        {!isCollapsed ? (
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <div>
              <h1 className="font-semibold text-lg">Médiathèque</h1>
              <p className="text-xs text-secondary">NATAN</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-lg">N</span>
          </div>
        )}
      </div>

      {/* Bouton de fermeture pour mobile */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-lg right-md text-secondary hover:text-primary transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-md space-y-sm overflow-y-auto">
        <div className="space-y-xs">
          {navItems.map((item, index) => (
            <NavItem
              key={index}
              to={item.to}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      </nav>

      {/* Footer de la sidebar */}
      <div className="p-md border-t border-color border-opacity-20">
        {!isCollapsed && (
          <p className="text-xs text-tertiary text-center">
            v1.0.0
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
