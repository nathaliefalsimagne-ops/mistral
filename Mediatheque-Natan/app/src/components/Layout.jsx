import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import ToastContainer from './ToastContainer';
import ModalContainer from './ModalContainer';

const Layout = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarCollapsed(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-primary">
      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full bg-dark text-light z-fixed transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-0 -translate-x-full' : 'w-64 translate-x-0'
        } ${isMobile && !isSidebarCollapsed ? 'z-modal' : ''}`}
      >
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onClose={closeSidebar}
        />
      </div>

      {/* Overlay pour mobile */}
      {isMobile && !isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[calc(var(--z-fixed)-1)]"
          onClick={closeSidebar}
        />
      )}

      {/* Main Content */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? '' : 'ml-0 sm:ml-64'
        }`}
      >
        {/* Header */}
        <Header 
          onMenuClick={toggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Page Content */}
        <main className="flex-1 p-lg bg-primary">
          {children || <Outlet />}
        </main>

        {/* Footer */}
        <footer className="bg-secondary border-t p-md text-center text-sm text-tertiary">
          <p>Médiathèque NATAN v1.0.0 | © {new Date().getFullYear()} NATAN Consulting</p>
        </footer>
      </div>

      {/* Toast Container */}
      <ToastContainer />

      {/* Modal Container */}
      <ModalContainer />
    </div>
  );
};

export default Layout;
