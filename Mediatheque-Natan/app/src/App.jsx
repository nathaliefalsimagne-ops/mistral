import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ModalProvider } from './contexts/ModalContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MediaLibrary from './pages/MediaLibrary';
import MediaDetail from './pages/MediaDetail';
import AddMedia from './pages/AddMedia';
import SearchResults from './pages/SearchResults';
import Settings from './pages/Settings';
import Stats from './pages/Stats';
import Users from './pages/Users';
import Loans from './pages/Loans';
import Backup from './pages/Backup';
import BarcodeScanner from './pages/BarcodeScanner';
import VisualRecognition from './pages/VisualRecognition';
import About from './pages/About';
import AIAssistant from './pages/AIAssistant';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import LoadingScreen from './components/LoadingScreen';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Charger la configuration et vérifier l'authentification
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Charger la configuration
        const configResponse = await window.electronAPI.config.get();
        setConfig(configResponse.data);

        // Vérifier si l'authentification est requise
        // Pour l'instant, on désactive l'authentification
        setIsAuthenticated(true);

        setIsLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement initial:', error);
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleLogin = useCallback((user) => {
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <ThemeProvider config={config}>
          <AuthProvider onLogin={handleLogin}>
            <ToastProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    );
  }

  return (
    <Router>
      <ThemeProvider config={config}>
        <DatabaseProvider>
          <AuthProvider onLogin={handleLogin} onLogout={handleLogout}>
            <ToastProvider>
              <ModalProvider>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/media" element={<MediaLibrary />} />
                    <Route path="/media/:type" element={<MediaLibrary />} />
                    <Route path="/media/detail/:id" element={<MediaDetail />} />
                    <Route path="/media/add" element={<AddMedia />} />
                    <Route path="/media/edit/:id" element={<AddMedia isEdit />} />
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/stats" element={<Stats />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/loans" element={<Loans />} />
                    <Route path="/backup" element={<Backup />} />
                    <Route path="/scan" element={<BarcodeScanner />} />
                    <Route path="/recognize" element={<VisualRecognition />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/ai" element={<AIAssistant />} />
                    <Route path="/ai-assistant" element={<AIAssistant />} />
                    <Route path="/404" element={<NotFound />} />
                    <Route path="*" element={<Navigate to="/404" replace />} />
                  </Routes>
                </Layout>
              </ModalProvider>
            </ToastProvider>
          </AuthProvider>
        </DatabaseProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
