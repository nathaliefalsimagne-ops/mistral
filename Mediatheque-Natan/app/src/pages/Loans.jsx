import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Archive,
  BookOpen,
  Calendar,
  Clock,
  Search,
  Filter,
  MoreVertical,
  User,
  CheckCircle,
  XCircle,
  TrendingUp,
  X
} from 'lucide-react';

const Loans = () => {
  const navigate = useNavigate();
  const { media, users, loans, isLoading, refreshData } = useDatabase();
  const { success, error: showError } = useToast();
  const { user: currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, returned
  const [filterUser, setFilterUser] = useState('');
  const [filterMedia, setFilterMedia] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [newLoan, setNewLoan] = useState({
    user_id: '',
    media_id: '',
    due_date: '',
    user_note: ''
  });
  const [returnState, setReturnState] = useState('Bon');
  const [returnNote, setReturnNote] = useState('');

  // Filtrer les emprunts
  const filteredLoans = loans.filter(loan => {
    // Filtre par statut
    if (filterStatus === 'active' && loan.return_date) return false;
    if (filterStatus === 'returned' && !loan.return_date) return false;

    // Filtre par utilisateur
    if (filterUser && loan.user_id !== filterUser) return false;

    // Filtre par média
    if (filterMedia && loan.media_id !== filterMedia) return false;

    // Filtre par recherche
    if (searchQuery) {
      const user = users.find(u => u.id === loan.user_id);
      const mediaItem = media.find(m => m.id === loan.media_id);
      
      const userName = user ? `${user.firstName} ${user.lastName}` : '';
      const mediaTitle = mediaItem ? mediaItem.title : '';
      const query = searchQuery.toLowerCase();
      
      if (!userName.toLowerCase().includes(query) && 
          !mediaTitle.toLowerCase().includes(query) &&
          !(loan.user_note || '').toLowerCase().includes(query)) {
        return false;
      }
    }

    return true;
  });

  // Calculer les statistiques
  const stats = {
    total: loans.length,
    active: loans.filter(l => !l.return_date).length,
    returned: loans.filter(l => l.return_date).length,
    overdue: loans.filter(l => {
      if (l.return_date) return false;
      const dueDate = new Date(l.due_date);
      const today = new Date();
      return dueDate < today;
    }).length
  };

  // Ajouter un emprunt
  const handleAddLoan = useCallback(async () => {
    if (!newLoan.user_id || !newLoan.media_id || !newLoan.due_date) {
      showError('Tous les champs obligatoires doivent être remplis');
      return;
    }

    try {
      const response = await window.electronAPI.db.execute({
        sql: `INSERT INTO loans (id, user_id, media_id, loan_date, due_date, user_note)
              VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        params: [
          window.electronAPI.utils.generateId(),
          newLoan.user_id,
          newLoan.media_id,
          newLoan.due_date,
          newLoan.user_note
        ]
      });

      if (response.success) {
        success('Emprunt ajouté avec succès');
        setShowAddModal(false);
        setNewLoan({
          user_id: '',
          media_id: '',
          due_date: '',
          user_note: ''
        });
        refreshData();
      } else {
        showError(response.error || 'Erreur lors de l\'ajout');
      }
    } catch (err) {
      console.error('Erreur lors de l\'ajout:', err);
      showError(`Erreur lors de l'ajout: ${err.message}`);
    }
  }, [newLoan, showError, success, refreshData]);

  // Retourner un emprunt
  const handleReturnLoan = useCallback(async () => {
    if (!selectedLoan) return;

    try {
      const response = await window.electronAPI.db.execute({
        sql: `UPDATE loans SET 
              return_date = CURRENT_TIMESTAMP,
              return_state = ?,
              user_note = ?
              WHERE id = ?`,
        params: [
          returnState,
          returnNote,
          selectedLoan.id
        ]
      });

      if (response.success) {
        success('Média retourné avec succès');
        setShowReturnModal(false);
        setSelectedLoan(null);
        setReturnState('Bon');
        setReturnNote('');
        refreshData();
      } else {
        showError(response.error || 'Erreur lors du retour');
      }
    } catch (err) {
      console.error('Erreur lors du retour:', err);
      showError(`Erreur lors du retour: ${err.message}`);
    }
  }, [selectedLoan, returnState, returnNote, showError, success, refreshData]);

  // Supprimer un emprunt
  const handleDeleteLoan = useCallback(async (loan) => {
    if (window.confirm(`Voulez-vous vraiment supprimer cet emprunt ?`)) {
      try {
        const response = await window.electronAPI.db.execute({
          sql: 'DELETE FROM loans WHERE id = ?',
          params: [loan.id]
        });

        if (response.success) {
          success('Emprunt supprimé avec succès');
          refreshData();
        } else {
          showError(response.error || 'Erreur lors de la suppression');
        }
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        showError(`Erreur lors de la suppression: ${err.message}`);
      }
    }
  }, [showError, success, refreshData]);

  // Ouvrir le modal de retour
  const openReturnModal = useCallback((loan) => {
    setSelectedLoan(loan);
    setReturnState('Bon');
    setReturnNote('');
    setShowReturnModal(true);
  }, []);

  // Gérer le changement des champs
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setNewLoan(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Formatage de la date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Formatage de l'heure
  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculer les jours restants
  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Obtenir la couleur du statut
  const getStatusColor = (loan) => {
    if (loan.return_date) {
      return 'bg-success text-white';
    }
    
    const daysRemaining = getDaysRemaining(loan.due_date);
    if (daysRemaining < 0) {
      return 'bg-danger text-white';
    } else if (daysRemaining <= 3) {
      return 'bg-warning text-dark';
    } else {
      return 'bg-info text-white';
    }
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (loan) => {
    if (loan.return_date) {
      return 'Retourné';
    }
    
    const daysRemaining = getDaysRemaining(loan.due_date);
    if (daysRemaining < 0) {
      return 'En retard';
    } else if (daysRemaining <= 3) {
      return 'À retourner bientôt';
    } else {
      return 'En cours';
    }
  };

  // Vérifier si l'utilisateur peut emprunter
  const canBorrow = (user) => {
    if (!user) return false;
    
    // Vérifier si l'utilisateur a déjà des emprunts en retard
    const userLoans = loans.filter(l => l.user_id === user.id && !l.return_date);
    const overdueLoans = userLoans.filter(loan => {
      const dueDate = new Date(loan.due_date);
      const today = new Date();
      return dueDate < today;
    });
    
    return overdueLoans.length === 0;
  };

  if (isLoading) {
    return (
      <div className="p-lg">
        <div className="animate-pulse space-y-md">
          <div className="h-8 bg-tertiary rounded w-1/3" />
          <div className="h-12 bg-tertiary rounded w-full max-w-md" />
          <div className="space-y-md">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-tertiary rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
        <div>
          <h1 className="text-2xl font-bold">Gestion des emprunts</h1>
          <p className="text-tertiary mt-xs">
            {loans.length} emprunt(s) enregistré(s)
          </p>
        </div>
        
        {(currentUser?.accessLevel === 2 || currentUser?.accessLevel === 3) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-white px-md py-sm rounded hover:bg-accent-light transition-colors flex items-center gap-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvel emprunt</span>
          </button>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        <StatCard
          icon={<BookOpen className="w-6 h-6" />}
          label="Total emprunts"
          value={stats.total}
          color="bg-info"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="En cours"
          value={stats.active}
          color="bg-warning"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6" />}
          label="Retournés"
          value={stats.returned}
          color="bg-success"
        />
        <StatCard
          icon={<XCircle className="w-6 h-6" />}
          label="En retard"
          value={stats.overdue}
          color="bg-danger"
        />
      </div>

      {/* Filtres */}
      <div className="bg-secondary rounded-xl p-lg">
        <div className="flex flex-col md:flex-row md:items-center gap-lg">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-md top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un emprunt..."
                className="w-full pl-12 pr-12 py-sm bg-primary border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-md top-1/2 -translate-y-1/2 text-tertiary hover:text-primary"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-md">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">Tous les emprunts</option>
              <option value="active">En cours</option>
              <option value="returned">Retournés</option>
            </select>

            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Tous les utilisateurs</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>

            <select
              value={filterMedia}
              onChange={(e) => setFilterMedia(e.target.value)}
              className="bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Tous les médias</option>
              {media.map(m => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des emprunts */}
      <div className="bg-secondary rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="py-sm px-md text-left">Média</th>
              <th className="py-sm px-md text-left hidden md:table-cell">Emprunteur</th>
              <th className="py-sm px-md text-left hidden lg:table-cell">Date d'emprunt</th>
              <th className="py-sm px-md text-left hidden lg:table-cell">Date de retour prévu</th>
              <th className="py-sm px-md text-left">Statut</th>
              <th className="py-sm px-md text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length > 0 ? (
              filteredLoans.map(loan => {
                const mediaItem = media.find(m => m.id === loan.media_id);
                const user = users.find(u => u.id === loan.user_id);
                
                return (
                  <tr
                    key={loan.id}
                    className="border-b last:border-0 hover:bg-tertiary transition-colors"
                  >
                    <td className="py-sm px-md">
                      <div className="flex items-center gap-md">
                        <div className="w-10 h-14 bg-tertiary rounded overflow-hidden flex-shrink-0">
                          {mediaItem?.jacket_image_url ? (
                            <img
                              src={mediaItem.jacket_image_url}
                              alt={mediaItem.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-tertiary" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{mediaItem?.title || 'Média inconnu'}</p>
                          <p className="text-xs text-tertiary">
                            {mediaItem ? window.electronAPI.utils.getMediaTypeLabel(mediaItem.type_id) : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-sm px-md hidden md:table-cell">
                      {user ? (
                        <div className="flex items-center gap-sm">
                          <div className="w-8 h-8 bg-accent bg-opacity-10 rounded-full flex items-center justify-center">
                            <span className="text-accent font-bold text-sm">
                              {user.firstName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span>{user.firstName} {user.lastName}</span>
                        </div>
                      ) : 'Utilisateur inconnu'}
                    </td>
                    <td className="py-sm px-md hidden lg:table-cell text-sm text-tertiary">
                      {formatDate(loan.loan_date)} {formatTime(loan.loan_date)}
                    </td>
                    <td className="py-sm px-md hidden lg:table-cell text-sm text-tertiary">
                      {formatDate(loan.due_date)}
                    </td>
                    <td className="py-sm px-md">
                      <span className={`px-sm py-xs rounded text-xs ${getStatusColor(loan)}`}>
                        {getStatusLabel(loan)}
                      </span>
                      {loan.return_date && (
                        <p className="text-xs text-tertiary mt-xs">
                          Retourné le {formatDate(loan.return_date)}
                        </p>
                      )}
                    </td>
                    <td className="py-sm px-md">
                      <div className="flex items-center gap-sm">
                        {(!loan.return_date && 
                          (currentUser?.accessLevel === 2 || currentUser?.accessLevel === 3 || 
                           loan.user_id === currentUser?.id)) && (
                            <button
                              onClick={() => openReturnModal(loan)}
                              className="text-info hover:text-info-light transition-colors"
                              title="Retourner"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                        
                        {(currentUser?.accessLevel === 3 || loan.user_id === currentUser?.id) && (
                          <button
                            onClick={() => handleDeleteLoan(loan)}
                            className="text-danger hover:text-danger-light transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                        
                        <Link to={`/loans/${loan.id}`} className="text-accent hover:text-accent-light transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="py-lg text-center text-tertiary">
                  Aucun emprunt trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Emprunts en retard */}
      {stats.overdue > 0 && (
        <div className="bg-danger bg-opacity-10 rounded-xl p-lg">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-xl font-semibold text-danger">Emprunts en retard</h2>
            <span className="bg-danger text-white px-sm py-xs rounded text-sm font-medium">
              {stats.overdue}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-danger border-opacity-20">
                  <th className="py-sm px-md text-left">Média</th>
                  <th className="py-sm px-md text-left hidden md:table-cell">Emprunteur</th>
                  <th className="py-sm px-md text-left hidden lg:table-cell">Date d'emprunt</th>
                  <th className="py-sm px-md text-left">Jours de retard</th>
                  <th className="py-sm px-md text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans
                  .filter(loan => !loan.return_date)
                  .filter(loan => {
                    const dueDate = new Date(loan.due_date);
                    const today = new Date();
                    return dueDate < today;
                  })
                  .map(loan => {
                    const mediaItem = media.find(m => m.id === loan.media_id);
                    const user = users.find(u => u.id === loan.user_id);
                    const daysOverdue = Math.abs(getDaysRemaining(loan.due_date));
                    
                    return (
                      <tr
                        key={loan.id}
                        className="border-b last:border-0 border-danger border-opacity-10"
                      >
                        <td className="py-sm px-md">
                          <Link 
                            to={`/media/detail/${mediaItem?.id}`} 
                            className="font-medium hover:text-accent transition-colors"
                          >
                            {mediaItem?.title || 'Média inconnu'}
                          </Link>
                        </td>
                        <td className="py-sm px-md hidden md:table-cell">
                          {user ? `${user.firstName} ${user.lastName}` : 'Utilisateur inconnu'}
                        </td>
                        <td className="py-sm px-md hidden lg:table-cell text-sm text-tertiary">
                          {formatDate(loan.loan_date)}
                        </td>
                        <td className="py-sm px-md text-danger font-medium">
                          {daysOverdue} jour(s)
                        </td>
                        <td className="py-sm px-md">
                          <button
                            onClick={() => openReturnModal(loan)}
                            className="text-info hover:text-info-light transition-colors"
                            title="Retourner"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-md">
          <div className="bg-secondary rounded-xl p-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="text-xl font-semibold">Nouvel emprunt</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-tertiary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-md">
              <div>
                <label className="block text-sm font-medium mb-sm">Utilisateur *</label>
                <select
                  name="user_id"
                  value={newLoan.user_id}
                  onChange={handleChange}
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Sélectionnez un utilisateur</option>
                  {users
                    .filter(user => canBorrow(user))
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} {user.id === currentUser?.id ? '(Vous)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-sm">Média *</label>
                <select
                  name="media_id"
                  value={newLoan.media_id}
                  onChange={handleChange}
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Sélectionnez un média</option>
                  {media
                    .filter(m => {
                      // Vérifier si le média n'est pas déjà emprunté
                      const activeLoans = loans.filter(l => !l.return_date && l.media_id === m.id);
                      return activeLoans.length === 0;
                    })
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({window.electronAPI.utils.getMediaTypeLabel(m.type_id)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-sm">Date de retour prévue *</label>
                <input
                  type="date"
                  name="due_date"
                  value={newLoan.due_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-sm">Note</label>
                <textarea
                  name="user_note"
                  value={newLoan.user_note}
                  onChange={handleChange}
                  placeholder="Note sur l'emprunt..."
                  rows="3"
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>
            </div>

            <div className="mt-lg flex items-center justify-end gap-md pt-md border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddLoan}
                className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de retour */}
      {showReturnModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-md">
          <div className="bg-secondary rounded-xl p-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="text-xl font-semibold">Retourner le média</h2>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-tertiary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-md">
              <div className="bg-tertiary rounded-lg p-md">
                <p className="font-medium">
                  {media.find(m => m.id === selectedLoan.media_id)?.title || 'Média inconnu'}
                </p>
                <p className="text-sm text-tertiary">
                  Emprunté par: {users.find(u => u.id === selectedLoan.user_id)?.firstName} 
                  {users.find(u => u.id === selectedLoan.user_id)?.lastName}
                </p>
                <p className="text-sm text-tertiary">
                  Date d'emprunt: {formatDate(selectedLoan.loan_date)}
                </p>
                <p className="text-sm text-tertiary">
                  Date de retour prévue: {formatDate(selectedLoan.due_date)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-sm">État du média *</label>
                <select
                  value={returnState}
                  onChange={(e) => setReturnState(e.target.value)}
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="Bon">Bon</option>
                  <option value="Rayé">Rayé</option>
                  <option value="Perdu">Perdu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-sm">Note</label>
                <textarea
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="Note sur le retour..."
                  rows="3"
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>
            </div>

            <div className="mt-lg flex items-center justify-end gap-md pt-md border-t">
              <button
                onClick={() => setShowReturnModal(false)}
                className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReturnLoan}
                className="bg-success text-white px-lg py-sm rounded hover:bg-success-light transition-colors"
              >
                Confirmer le retour
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant StatCard
const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-secondary rounded-xl p-lg">
    <div className="flex items-center gap-md">
      <div className={`p-sm rounded-lg ${color}`}>
        <span className="text-white">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-tertiary">{label}</p>
      </div>
    </div>
  </div>
);

export default Loans;
