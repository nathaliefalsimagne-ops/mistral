import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
import ProfileSelect from './pages/ProfileSelect';
import NotFound from './pages/NotFound';
import LoadingScreen from './components/LoadingScreen';

// Décide, une fois les profils chargés, s'il faut afficher l'écran
// "Qui regarde ?" ou l'application complète pour le profil sélectionné.
const AppRoutes = () => {
  const { isAuthenticated, isLoadingProfiles } = useAuth();

  if (isLoadingProfiles) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/profiles" element={<ProfileSelect />} />
        <Route path="*" element={<Navigate to="/profiles" replace />} />
      </Routes>
    );
  }

  return (
    <DatabaseProvider>
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
    </DatabaseProvider>
  );
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState(null);

  // Charger la configuration de l'application
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const configResponse = await window.electronAPI.config.get();
        setConfig(configResponse.data);
      } catch (error) {
        console.error('Erreur lors du chargement initial:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <ThemeProvider config={config}>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
