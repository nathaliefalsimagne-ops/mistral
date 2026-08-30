import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { useModal } from '../contexts/ModalContext';
import { Menu, Search, Bell, User, Sun, Moon, Plus } from 'lucide-react';

const Header = ({ onMenuClick, isSidebarCollapsed }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { searchMedia, updateFilters } = useDatabase();
  const { openModal } = useModal();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Charger les notifications (simulées)
  useEffect(() => {
    // Dans une vraie implémentation, on chargerait depuis la base
    setNotifications([
      { id: 1, title: 'Nouvelle recommandation', message: 'Nous avons une nouvelle suggestion pour vous', time: '10 min' },
      { id: 2, title: 'Sauvegarde terminée', message: 'Votre sauvegarde automatique a été effectuée', time: '1 heure' }
    ]);
  }, []);

  // Gérer la recherche
  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      updateFilters({ search: searchQuery });
      navigate('/search');
    }
  };

  // Effacer la recherche
  const clearSearch = () => {
    setSearchQuery('');
    updateFilters({ search: '' });
  };

  // Basculer le thème
  const handleToggleTheme = () => {
    toggleTheme();
  };

  // Ajouter un nouveau média
  const handleAddMedia = () => {
    navigate('/media/add');
  };

  // Basculer les notifications
  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
    setShowUserMenu(false);
  };

  // Basculer le menu utilisateur
  const toggleUserMenu = () => {
    setShowUserMenu(prev => !prev);
    setShowNotifications(false);
  };

  // Fermer les menus
  const closeMenus = () => {
    setShowNotifications(false);
    setShowUserMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.notification-center') && !e.target.closest('.user-menu')) {
        closeMenus();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <header className="bg-secondary border-b sticky top-0 z-sticky">
      <div className="flex items-center justify-between h-16 px-lg">
        {/* Partie gauche */}
        <div className="flex items-center gap-lg">
          {/* Bouton menu */}
          <button
            onClick={onMenuClick}
            className="p-sm rounded hover:bg-tertiary transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Barre de recherche */}
          <form onSubmit={handleSearch} className="relative hidden sm:flex">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-md top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un média..."
                className="w-full pl-10 pr-10 py-sm bg-primary border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-md top-1/2 -translate-y-1/2 text-tertiary hover:text-primary"
                >
                  ×
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Partie droite */}
        <div className="flex items-center gap-md">
          {/* Bouton thème */}
          <button
            onClick={handleToggleTheme}
            className="p-sm rounded hover:bg-tertiary transition-colors"
            aria-label={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative notification-center">
            <button
              onClick={toggleNotifications}
              className="relative p-sm rounded hover:bg-tertiary transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Dropdown notifications */}
            {showNotifications && (
              <div className="absolute right-0 mt-sm w-80 bg-secondary rounded-lg shadow-lg border overflow-hidden z-dropdown">
                <div className="p-md border-b">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(notification => (
                      <button
                        key={notification.id}
                        className="w-full p-md text-left hover:bg-tertiary transition-colors border-b last:border-0"
                      >
                        <div className="flex gap-md">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-xs text-tertiary">{notification.message}</p>
                          </div>
                          <span className="text-xs text-tertiary whitespace-nowrap">
                            {notification.time}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-lg text-center text-tertiary text-sm">
                      Aucune notification
                    </div>
                  )}
                </div>
                <div className="p-md border-t">
                  <button
                    onClick={() => {
                      setNotifications([]);
                      closeMenus();
                    }}
                    className="text-sm text-accent hover:underline w-full"
                  >
                    Tout marquer comme lu
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ajouter un média */}
          <button
            onClick={handleAddMedia}
            className="p-sm rounded hover:bg-tertiary transition-colors hidden sm:flex"
            aria-label="Ajouter un média"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Menu utilisateur */}
          <div className="relative user-menu">
            <button
              onClick={toggleUserMenu}
              className="flex items-center gap-sm p-sm rounded hover:bg-tertiary transition-colors"
            >
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-tertiary">
                  {user?.accessLevel === 3 ? 'Admin' : user?.accessLevel === 2 ? 'Membre' : 'Invité'}
                </p>
              </div>
            </button>

            {/* Dropdown utilisateur */}
            {showUserMenu && (
              <div className="absolute right-0 mt-sm w-64 bg-secondary rounded-lg shadow-lg border overflow-hidden z-dropdown">
                <div className="p-md border-b">
                  <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                  <p className="text-sm text-tertiary">{user?.email}</p>
                </div>
                <div className="p-sm">
                  <NavLink
                    to="/settings"
                    onClick={closeMenus}
                    className={({ isActive }) => `
                      block w-full px-md py-sm text-left hover:bg-tertiary transition-colors rounded
                      ${isActive ? 'bg-tertiary' : ''}
                    `}
                  >
                    Paramètres
                  </NavLink>
                  <NavLink
                    to="/about"
                    onClick={closeMenus}
                    className={({ isActive }) => `
                      block w-full px-md py-sm text-left hover:bg-tertiary transition-colors rounded
                      ${isActive ? 'bg-tertiary' : ''}
                    `}
                  >
                    À propos
                  </NavLink>
                </div>
                <div className="p-sm border-t">
                  <button
                    onClick={() => {
                      logout();
                      closeMenus();
                    }}
                    className="w-full px-md py-sm text-left text-danger hover:bg-danger hover:bg-opacity-10 transition-colors rounded"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barre de recherche mobile */}
      <div className="sm:hidden border-t">
        <form onSubmit={handleSearch} className="p-md">
          <div className="relative flex">
            <Search className="absolute left-md top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un média..."
              className="flex-1 pl-10 pr-10 py-sm bg-primary border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-md top-1/2 -translate-y-1/2 text-tertiary hover:text-primary"
              >
                ×
              </button>
            )}
          </div>
        </form>
      </div>
    </header>
  );
};

export default Header;
