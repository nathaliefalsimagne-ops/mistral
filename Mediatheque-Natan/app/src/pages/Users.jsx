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
  Users,
  User,
  Shield,
  Mail,
  Calendar,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';

const Users = () => {
  const navigate = useNavigate();
  const { users, isLoading } = useDatabase();
  const { success, error: showError } = useToast();
  const { user: currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    accessLevel: 2,
    isActive: true
  });
  const [editUser, setEditUser] = useState({ ...newUser });

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || email.includes(query);
  });

  // Ajouter un utilisateur
  const handleAddUser = useCallback(async () => {
    if (!newUser.firstName.trim() || !newUser.lastName.trim()) {
      showError('Le prénom et le nom sont obligatoires');
      return;
    }

    try {
      // Dans une vraie implémentation, on appelera l'API
      const response = await window.electronAPI.db.execute({
        sql: `INSERT INTO users (id, first_name, last_name, email, access_level_id, is_active, registration_date)
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        params: [
          window.electronAPI.utils.generateId(),
          newUser.firstName,
          newUser.lastName,
          newUser.email,
          newUser.accessLevel,
          newUser.isActive ? 1 : 0
        ]
      });

      if (response.success) {
        success('Utilisateur ajouté avec succès');
        setShowAddModal(false);
        setNewUser({
          firstName: '',
          lastName: '',
          email: '',
          accessLevel: 2,
          isActive: true
        });
        // Rafraîchir les données
        window.location.reload();
      } else {
        showError(response.error || 'Erreur lors de l\'ajout');
      }
    } catch (err) {
      console.error('Erreur lors de l\'ajout:', err);
      showError(`Erreur lors de l'ajout: ${err.message}`);
    }
  }, [newUser, showError, success]);

  // Modifier un utilisateur
  const handleEditUser = useCallback(async () => {
    if (!editUser.firstName.trim() || !editUser.lastName.trim()) {
      showError('Le prénom et le nom sont obligatoires');
      return;
    }

    try {
      const response = await window.electronAPI.db.execute({
        sql: `UPDATE users SET 
              first_name = ?,
              last_name = ?,
              email = ?,
              access_level_id = ?,
              is_active = ?,
              updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        params: [
          editUser.firstName,
          editUser.lastName,
          editUser.email,
          editUser.accessLevel,
          editUser.isActive ? 1 : 0,
          selectedUser.id
        ]
      });

      if (response.success) {
        success('Utilisateur modifié avec succès');
        setShowEditModal(false);
        setSelectedUser(null);
        // Rafraîchir les données
        window.location.reload();
      } else {
        showError(response.error || 'Erreur lors de la modification');
      }
    } catch (err) {
      console.error('Erreur lors de la modification:', err);
      showError(`Erreur lors de la modification: ${err.message}`);
    }
  }, [editUser, selectedUser, showError, success]);

  // Supprimer un utilisateur
  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser) return;

    try {
      // Vérifier si l'utilisateur a des emprunts actifs
      const loansResponse = await window.electronAPI.db.query({
        sql: 'SELECT COUNT(*) as count FROM loans WHERE user_id = ? AND return_date IS NULL',
        params: [selectedUser.id]
      });

      if (loansResponse.success && loansResponse.data[0].count > 0) {
        showError('Impossible de supprimer cet utilisateur: il a des emprunts actifs');
        return;
      }

      const response = await window.electronAPI.db.execute({
        sql: 'DELETE FROM users WHERE id = ?',
        params: [selectedUser.id]
      });

      if (response.success) {
        success('Utilisateur supprimé avec succès');
        setShowDeleteConfirm(false);
        setSelectedUser(null);
        // Rafraîchir les données
        window.location.reload();
      } else {
        showError(response.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      showError(`Erreur lors de la suppression: ${err.message}`);
    }
  }, [selectedUser, showError, success]);

  // Ouvrir le modal d'édition
  const openEditModal = useCallback((user) => {
    setSelectedUser(user);
    setEditUser({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      accessLevel: user.accessLevel,
      isActive: user.isActive === 1
    });
    setShowEditModal(true);
  }, []);

  // Ouvrir la confirmation de suppression
  const openDeleteConfirm = useCallback((user) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  }, []);

  // Gérer le changement des champs
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const handleEditChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setEditUser(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value) : value
    }));
  }, []);

  // Obtenir le nom du niveau d'accès
  const getAccessLevelName = (level) => {
    switch (level) {
      case 1: return 'Invité';
      case 2: return 'Membre';
      case 3: return 'Administrateur';
      default: return 'Inconnu';
    }
  };

  // Obtenir la couleur du niveau d'accès
  const getAccessLevelColor = (level) => {
    switch (level) {
      case 1: return 'bg-secondary';
      case 2: return 'bg-info';
      case 3: return 'bg-success';
      default: return 'bg-tertiary';
    }
  };

  // Formatage de la date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Vérifier si l'utilisateur peut modifier/supprimer
  const canEdit = (user) => {
    // Un administrateur peut tout modifier
    if (currentUser?.accessLevel === 3) return true;
    // Un utilisateur peut modifier son propre profil
    return user.id === currentUser?.id;
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
          <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-tertiary mt-xs">
            {users.length} utilisateur(s) enregistré(s)
          </p>
        </div>
        
        {currentUser?.accessLevel === 3 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-accent text-white px-md py-sm rounded hover:bg-accent-light transition-colors flex items-center gap-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter un utilisateur</span>
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="bg-secondary rounded-xl p-lg">
        <div className="relative">
          <Search className="absolute left-md top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un utilisateur..."
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

      {/* Liste des utilisateurs */}
      <div className="bg-secondary rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="py-sm px-md text-left">Utilisateur</th>
              <th className="py-sm px-md text-left hidden md:table-cell">Email</th>
              <th className="py-sm px-md text-left hidden md:table-cell">Niveau d'accès</th>
              <th className="py-sm px-md text-left hidden lg:table-cell">Date d'inscription</th>
              <th className="py-sm px-md text-left">Statut</th>
              <th className="py-sm px-md text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <tr
                  key={user.id}
                  className="border-b last:border-0 hover:bg-tertiary transition-colors"
                >
                  <td className="py-sm px-md">
                    <div className="flex items-center gap-md">
                      <div className="w-10 h-10 bg-accent bg-opacity-10 rounded-full flex items-center justify-center">
                        <span className="text-accent font-bold">{user.firstName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        {user.id === currentUser?.id && (
                          <p className="text-xs text-accent">(Vous)</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-sm px-md hidden md:table-cell">
                    {user.email || 'N/A'}
                  </td>
                  <td className="py-sm px-md hidden md:table-cell">
                    <span className={`px-sm py-xs rounded text-xs ${getAccessLevelColor(user.accessLevel)} text-white`}>
                      {getAccessLevelName(user.accessLevel)}
                    </span>
                  </td>
                  <td className="py-sm px-md hidden lg:table-cell text-sm text-tertiary">
                    {formatDate(user.registration_date)}
                  </td>
                  <td className="py-sm px-md">
                    <span className={`px-sm py-xs rounded text-xs ${
                      user.isActive === 1 ? 'bg-success text-white' : 'bg-tertiary text-tertiary'
                    }`}>
                      {user.isActive === 1 ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="py-sm px-md">
                    <div className="flex items-center gap-sm">
                      {canEdit(user) && (
                        <>
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-secondary hover:text-primary transition-colors"
                            title="Modifier"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          {currentUser?.accessLevel === 3 && user.id !== currentUser?.id && (
                            <button
                              onClick={() => openDeleteConfirm(user)}
                              className="text-danger hover:text-danger-light transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </>
                      )}
                      <Link to={`/users/${user.id}`} className="text-accent hover:text-accent-light transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-lg text-center text-tertiary">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Total utilisateurs"
          value={users.length}
          color="bg-info"
        />
        <StatCard
          icon={<Shield className="w-6 h-6" />}
          label="Administrateurs"
          value={users.filter(u => u.accessLevel === 3).length}
          color="bg-success"
        />
        <StatCard
          icon={<User className="w-6 h-6" />}
          label="Membres"
          value={users.filter(u => u.accessLevel === 2).length}
          color="bg-warning"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Actifs"
          value={users.filter(u => u.isActive === 1).length}
          color="bg-primary"
        />
      </div>

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-md">
          <div className="bg-secondary rounded-xl p-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="text-xl font-semibold">Ajouter un utilisateur</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-tertiary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-sm font-medium mb-sm">Prénom *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={newUser.firstName}
                    onChange={handleChange}
                    placeholder="Prénom"
                    className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-sm">Nom *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={newUser.lastName}
                    onChange={handleChange}
                    placeholder="Nom"
                    className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-sm">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-sm">Niveau d'accès</label>
                <select
                  name="accessLevel"
                  value={newUser.accessLevel}
                  onChange={handleChange}
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="1">Invité</option>
                  <option value="2">Membre</option>
                  <option value="3">Administrateur</option>
                </select>
              </div>

              <label className="flex items-center gap-sm cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={newUser.isActive}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Utilisateur actif</span>
              </label>
            </div>

            <div className="mt-lg flex items-center justify-end gap-md pt-md border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddUser}
                className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-md">
          <div className="bg-secondary rounded-xl p-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="text-xl font-semibold">Modifier l'utilisateur</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-tertiary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-sm font-medium mb-sm">Prénom *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={editUser.firstName}
                    onChange={handleEditChange}
                    placeholder="Prénom"
                    className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-sm">Nom *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={editUser.lastName}
                    onChange={handleEditChange}
                    placeholder="Nom"
                    className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-sm">Email</label>
                <input
                  type="email"
                  name="email"
                  value={editUser.email}
                  onChange={handleEditChange}
                  placeholder="email@example.com"
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {currentUser?.accessLevel === 3 && (
                <div>
                  <label className="block text-sm font-medium mb-sm">Niveau d'accès</label>
                  <select
                    name="accessLevel"
                    value={editUser.accessLevel}
                    onChange={handleEditChange}
                    className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={selectedUser.id === currentUser?.id}
                  >
                    <option value="1">Invité</option>
                    <option value="2">Membre</option>
                    <option value="3">Administrateur</option>
                  </select>
                </div>
              )}

              {currentUser?.accessLevel === 3 && selectedUser.id !== currentUser?.id && (
                <label className="flex items-center gap-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={editUser.isActive}
                    onChange={handleEditChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Utilisateur actif</span>
                </label>
              )}
            </div>

            <div className="mt-lg flex items-center justify-end gap-md pt-md border-t">
              <button
                onClick={() => setShowEditModal(false)}
                className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEditUser}
                className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-md">
          <div className="bg-secondary rounded-xl p-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="text-xl font-semibold">Supprimer l'utilisateur</h2>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-tertiary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-md">
              <p className="text-secondary">
                Vous êtes sur le point de supprimer l'utilisateur <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>.
              </p>
              <p className="text-secondary">
                Cette action est irréversible. Tous les emprunts associés seront conservés.
              </p>
            </div>

            <div className="mt-lg flex items-center justify-end gap-md pt-md border-t">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteUser}
                className="bg-danger text-white px-lg py-sm rounded hover:bg-danger-light transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

        <span className="text-white">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-tertiary">{label}</p>
      </div>
    </div>
  </div>
);

export default Users;
