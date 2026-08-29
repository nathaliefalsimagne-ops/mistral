const { createRoot } = require('react-dom/client');
const React = require('react');
const { StrictMode } = React;
const App = require('@/App').default;

// Charger les styles
require('@/index.css');

// Point d'entrée de l'application
const container = document.getElementById('root');
const root = createRoot(container);

// Rendre l'application
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
  console.error('Erreur globale:', event.error);
  // Afficher une notification à l'utilisateur
  if (window.electronAPI && window.electronAPI.notify) {
    window.electronAPI.notify.show(
      'Erreur',
      'Une erreur inattendue est survenue. Veuillez consulter les logs.'
    );
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Rejet non géré:', event.reason);
  if (window.electronAPI && window.electronAPI.notify) {
    window.electronAPI.notify.show(
      'Erreur',
      'Un rejet de promesse n\'a pas été géré.'
    );
  }
});

// Exporter pour les tests
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    render: (component) => {
      root.render(component);
    },
    unmount: () => {
      root.unmount();
    }
  };
}
