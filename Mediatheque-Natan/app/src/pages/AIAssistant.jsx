import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useDatabase } from '../contexts/DatabaseContext';
import { useToast } from '../contexts/ToastContext';
import { getAiService } from '../services';
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Settings as SettingsIcon,
  StopCircle,
  Trash2,
  RefreshCw,
  Lightbulb,
  Search,
  Film,
  Music,
  Disc,
  BarChart3,
  HelpCircle,
  X
} from 'lucide-react';

const AIAssistant = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { media, users, loans } = useDatabase();
  const { success, error: showError, info } = useToast();
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Bonjour ! Je suis Médiathèque NATAN, votre assistant IA. Je peux vous aider à :\n\n- **Rechercher** des médias avec des requêtes naturelles\n- **Recommander** des films, séries ou musiques\n- **Analyser** votre collection\n- **Répondre** à vos questions sur la gestion de médiathèque\n\nEssayez par exemple : \"Quels sont mes films d'action les plus populaires ?\" ou \"Recommande-moi des comédies françaises\"",
      timestamp: new Date().toISOString(),
      isStreaming: false
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOllamaRunning, setIsOllamaRunning] = useState(null);
  const [currentModel, setCurrentModel] = useState('mistral:7b');
  const [availableModels, setAvailableModels] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    model: 'mistral:7b',
    temperature: 0.7,
    max_tokens: 2048,
    systemPrompt: ''
  });

  const aiServiceRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialiser le service IA
  useEffect(() => {
    aiServiceRef.current = getAiService({
      model: settings.model,
      temperature: settings.temperature,
      max_tokens: settings.max_tokens
    });

    checkOllamaStatus();
    loadModels();

    return () => {
      // Nettoyer
      if (aiServiceRef.current) {
        aiServiceRef.current.cancelGeneration();
      }
    };
  }, []);

  // Vérifier l'état d'Ollama
  const checkOllamaStatus = useCallback(async () => {
    try {
      const status = await aiServiceRef.current.checkOllamaStatus();
      setIsOllamaRunning(status.running);
      if (status.models && status.models.length > 0) {
        setAvailableModels(status.models);
      }
    } catch (err) {
      setIsOllamaRunning(false);
    }
  }, []);

  // Charger les modèles disponibles
  const loadModels = useCallback(async () => {
    try {
      const response = await aiServiceRef.current.listModels();
      if (response.success) {
        setAvailableModels(response.models);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des modèles:', err);
    }
  }, []);

  // Faire défiler vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus sur l'input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Gérer l'envoi du message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Ajouter le message utilisateur
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);

    // Vérifier si Ollama est disponible
    if (!isOllamaRunning) {
      showError('Ollama n\'est pas démarré. Lancez Ollama avec `ollama serve` ou `ollama run mistral:7b`');
      return;
    }

    setIsLoading(true);

    // Message assistant initial (vide, sera rempli par streaming)
    const assistantMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    };
    
    setMessages(prev => [...prev, assistantMsg]);

    try {
      // Mettre à jour les paramètres du service
      aiServiceRef.current.setConfig({
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens
      });

      // Envoyer le message
      await aiServiceRef.current.chat(
        userMessage,
        (chunk) => {
          // Mettre à jour le message assistant
          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (newMessages[lastIndex].role === 'assistant' && newMessages[lastIndex].isStreaming) {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content: newMessages[lastIndex].content + chunk
              };
            }
            return newMessages;
          });
        },
        (fullResponse) => {
          // Fin du streaming
          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (newMessages[lastIndex].role === 'assistant') {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                isStreaming: false
              };
            }
            return newMessages;
          });
          setIsLoading(false);
        },
        (err) => {
          showError(err.error || 'Erreur lors de la génération');
          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (newMessages[lastIndex].role === 'assistant') {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content: 'Désolé, une erreur est survenue lors de la génération.',
                isStreaming: false
              };
            }
            return newMessages;
          });
          setIsLoading(false);
        }
      );

    } catch (err) {
      showError(err.message || 'Erreur lors de la génération');
      setIsLoading(false);
    }
  }, [inputValue, isLoading, isOllamaRunning, settings, showError]);

  // Gérer l'envoi avec la touche Entrée
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Annuler la génération
  const handleCancel = useCallback(() => {
    if (aiServiceRef.current && aiServiceRef.current.cancelGeneration()) {
      setIsLoading(false);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (newMessages[lastIndex].role === 'assistant' && newMessages[lastIndex].isStreaming) {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: newMessages[lastIndex].content + '\n\n[Génération annulée]',
            isStreaming: false
          };
        }
        return newMessages;
      });
      success('Génération annulée');
    }
  }, [success]);

  // Effacer la conversation
  const handleClearConversation = useCallback(() => {
    if (aiServiceRef.current) {
      aiServiceRef.current.clearConversation();
    }
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: "Bonjour ! Je suis Médiathèque NATAN, votre assistant IA. Comment puis-je vous aider aujourd'hui ?",
        timestamp: new Date().toISOString(),
        isStreaming: false
      }
    ]);
    success('Conversation effacée');
  }, [success]);

  // Changer de modèle
  const handleModelChange = useCallback(async (modelName) => {
    try {
      setCurrentModel(modelName);
      setSettings(prev => ({ ...prev, model: modelName }));
      
      // Mettre à jour le service
      aiServiceRef.current.setConfig({ model: modelName });
      
      // Effacer la conversation
      handleClearConversation();
      
      success(`Modèle changé pour ${modelName}`);
    } catch (err) {
      showError(err.message || 'Erreur lors du changement de modèle');
    }
  }, [handleClearConversation, showError, success]);

  // Sauvegarder les paramètres
  const handleSaveSettings = useCallback(() => {
    if (aiServiceRef.current) {
      aiServiceRef.current.setConfig({
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens
      });
    }
    setShowSettings(false);
    success('Paramètres sauvegardés');
  }, [settings, success]);

  // Actions rapides
  const quickActions = [
    {
      label: 'Rechercher des films',
      icon: Film,
      prompt: 'Quels sont les films disponibles dans ma collection ?'
    },
    {
      label: 'Recommandations',
      icon: Lightbulb,
      prompt: 'Recommande-moi des médias basés sur mon historique'
    },
    {
      label: 'Statistiques',
      icon: BarChart3,
      prompt: 'Donne-moi des statistiques sur ma collection'
    },
    {
      label: 'Aide',
      icon: HelpCircle,
      prompt: 'Comment utiliser l\'assistant IA ?'
    }
  ];

  // Suggestions basées sur le contexte
  const getContextSuggestions = useCallback(() => {
    const suggestions = [];
    
    if (media.length > 0) {
      suggestions.push({
        label: `Analyser ${media.length} médias`,
        prompt: `Analyse ma collection de ${media.length} médias et donne-moi des insights`
      });
    }
    
    if (loans.length > 0) {
      suggestions.push({
        label: `Emprunts en cours (${loans.length})`,
        prompt: `Quels médias sont actuellement empruntés et par qui ?`
      });
    }
    
    return suggestions;
  }, [media.length, loans.length]);

  return (
    <div className={`ai-assistant-page ${theme}`}>
      {/* Header */}
      <div className="ai-assistant-header">
        <div className="header-left">
          <button 
            className="back-button" 
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="header-title">
            <Bot size={24} />
            <span>Assistant IA</span>
          </div>
        </div>
        
        <div className="header-right">
          {isOllamaRunning !== null && (
            <div className={`ollama-status ${isOllamaRunning ? 'running' : 'stopped'}`}>
              <span className="status-dot" />
              <span>{isOllamaRunning ? 'Ollama en ligne' : 'Ollama hors ligne'}</span>
            </div>
          )}
          
          <button 
            className="settings-button" 
            onClick={() => setShowSettings(!showSettings)}
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </div>

      {/* Conteneur principal */}
      <div className="ai-assistant-container">
        {/* Zone de chat */}
        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <Bot size={64} className="empty-icon" />
              <h3>Bienvenue dans l'assistant IA</h3>
              <p>Commencez une conversation pour gérer votre médiathèque de manière intelligente.</p>
              
              <div className="quick-actions">
                <h4>Actions rapides :</h4>
                <div className="quick-actions-grid">
                  {quickActions.map((action, index) => (
                    <button 
                      key={index}
                      className="quick-action-button"
                      onClick={() => setInputValue(action.prompt)}
                    >
                      <action.icon size={16} />
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`message ${message.role} ${message.isStreaming ? 'streaming' : ''}`}
                >
                  <div className="message-avatar">
                    {message.role === 'user' ? (
                      <User size={24} />
                    ) : (
                      <Bot size={24} />
                    )}
                  </div>
                  
                  <div className="message-content">
                    <div className="message-bubble">
                      {message.isStreaming ? (
                        <>
                          <span>{message.content}</span>
                          <span className="typing-indicator">
                            <span />
                            <span />
                            <span />
                          </span>
                        </>
                      ) : (
                        <div className="message-text">
                          {formatMessage(message.content)}
                        </div>
                      )}
                    </div>
                    
                    <div className="message-time">
                      {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
              
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Suggestions contextuelles */}
          {messages.length > 1 && getContextSuggestions().length > 0 && (
            <div className="context-suggestions">
              <h4>Suggestions :</h4>
              <div className="suggestions-grid">
                {getContextSuggestions().map((suggestion, index) => (
                  <button 
                    key={index}
                    className="suggestion-button"
                    onClick={() => setInputValue(suggestion.prompt)}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Zone d'input */}
        <div className="input-area">
          <div className="input-container">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isLoading ? "Génération en cours..." : "Posez votre question ou tapez une commande... (Ctrl+Entrée pour nouvelle ligne)"}
              disabled={isLoading || !isOllamaRunning}
              rows={1}
              className="chat-input"
            />
            
            <div className="input-actions">
              {isLoading ? (
                <button 
                  className="action-button cancel" 
                  onClick={handleCancel}
                  title="Annuler"
                >
                  <StopCircle size={18} />
                </button>
              ) : (
                <>
                  <button 
                    className="action-button clear" 
                    onClick={handleClearConversation}
                    title="Effacer la conversation"
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  <button 
                    className="action-button send" 
                    onClick={handleSend}
                    disabled={!inputValue.trim() || !isOllamaRunning}
                    title="Envoyer"
                  >
                    <Send size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Info Ollama */}
          {!isOllamaRunning && (
            <div className="ollama-warning">
              <span>⚠️ Ollama n'est pas démarré. </span>
              <button 
                className="refresh-button" 
                onClick={checkOllamaStatus}
              >
                <RefreshCw size={14} />
                Vérifier
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal des paramètres */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Paramètres de l'IA</h3>
              <button className="close-button" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="setting-group">
                <label>Modèle</label>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                  className="setting-input"
                >
                  {availableModels.length > 0 ? (
                    availableModels.map(model => (
                      <option key={model.name} value={model.name}>
                        {model.name} ({model.size})
                      </option>
                    ))
                  ) : (
                    <option value="mistral:7b">mistral:7b (par défaut)</option>
                  )}
                </select>
                <button 
                  className="refresh-models" 
                  onClick={loadModels}
                >
                  <RefreshCw size={14} />
                  Rafraîchir
                </button>
              </div>

              <div className="setting-group">
                <label>Température (0.0 - 1.0)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="slider"
                />
                <span className="slider-value">{settings.temperature}</span>
                <p className="setting-hint">
                  Plus la valeur est élevée, plus les réponses seront créatives (mais moins prévisibles)
                </p>
              </div>

              <div className="setting-group">
                <label>Tokens maximum</label>
                <input
                  type="number"
                  min="256"
                  max="4096"
                  value={settings.max_tokens}
                  onChange={(e) => setSettings(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 2048 }))}
                  className="setting-input"
                />
                <p className="setting-hint">
                  Limite la longueur des réponses générées
                </p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="button secondary" onClick={() => setShowSettings(false)}>
                Annuler
              </button>
              <button className="button primary" onClick={handleSaveSettings}>
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Fonction pour formater le message (remplace ReactMarkdown)
const formatMessage = (text) => {
  if (!text) return text;
  
  // Remplacer les sauts de ligne
  let formatted = text.replace(/\n/g, '<br />');
  
  // Remplacer le markdown basique
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');
  formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>');
  formatted = formatted.replace(/\n\n```([\s\S]*?)```\n\n/g, '<pre class="code-block"><code>$1</code></pre>');
  
  // Remplacer les listes
  formatted = formatted.replace(/^\s*[-*+]\s+/gm, '<li>');
  formatted = formatted.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  
  // Remplacer les liens
  formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
};

export default AIAssistant;
