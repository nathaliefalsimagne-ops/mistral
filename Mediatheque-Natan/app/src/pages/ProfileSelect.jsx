import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { Plus, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';

const AVATAR_CHOICES = ['🎬', '🍿', '📀', '🎧', '🦊', '🐱', '🐶', '🌟', '👤'];

const ProfileTile = ({ profile, isManaging, onSelect, onEdit, onDelete }) => (
  <div className="flex flex-col items-center gap-sm">
    <button
      type="button"
      onClick={() => (isManaging ? onEdit(profile) : onSelect(profile))}
      className="flex flex-col items-center gap-sm group"
    >
      <span className="relative w-28 h-28 rounded-xl bg-secondary flex items-center justify-center text-5xl group-hover:ring-4 group-hover:ring-accent transition-all">
        {profile.avatar_url || '👤'}
        {isManaging && (
          <span className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center">
            <Pencil className="w-8 h-8 text-white" />
          </span>
        )}
      </span>
      <span className="text-sm text-center max-w-[7rem] truncate">{profile.first_name}</span>
    </button>
    {isManaging && (
      <button
        type="button"
        onClick={() => onDelete(profile)}
        className="text-xs text-danger hover:underline flex items-center gap-xs"
      >
        <Trash2 className="w-3 h-3" /> Supprimer
      </button>
    )}
  </div>
);

const ProfileForm = ({ initial, onCancel, onSubmit, isSubmitting }) => {
  const [firstName, setFirstName] = useState(initial?.first_name || '');
  const [avatar, setAvatar] = useState(initial?.avatar_url || AVATAR_CHOICES[0]);
  const [pin, setPin] = useState('');
  const [clearPin, setClearPin] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ firstName, avatarUrl: avatar, pin: pin || undefined, clearPin });
      }}
      className="bg-secondary rounded-xl p-lg w-full max-w-sm space-y-md"
    >
      <h3 className="text-lg font-semibold">{initial ? 'Modifier le profil' : 'Nouveau profil'}</h3>

      <div>
        <label className="block text-sm font-medium mb-sm">Prénom</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full px-md py-sm bg-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-sm">Avatar</label>
        <div className="flex flex-wrap gap-sm">
          {AVATAR_CHOICES.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(emoji)}
              className={`w-10 h-10 rounded-lg text-2xl flex items-center justify-center bg-primary ${avatar === emoji ? 'ring-2 ring-accent' : ''}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-sm">
          Code PIN {initial ? '(laisser vide pour ne pas changer)' : '(optionnel, 4 à 6 chiffres)'}
        </label>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••"
          className="w-full px-md py-sm bg-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {initial?.has_pin && (
          <label className="flex items-center gap-sm mt-sm text-sm cursor-pointer">
            <input type="checkbox" checked={clearPin} onChange={(e) => setClearPin(e.target.checked)} />
            Retirer le code PIN de ce profil
          </label>
        )}
      </div>

      <div className="flex gap-sm justify-end pt-sm">
        <button type="button" onClick={onCancel} className="px-md py-sm rounded-lg text-secondary hover:bg-primary transition-colors">
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !firstName.trim()}
          className="px-md py-sm bg-accent text-white rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50 flex items-center gap-sm"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Enregistrer
        </button>
      </div>
    </form>
  );
};

const PinPrompt = ({ profile, onCancel, onSubmit, isSubmitting, error }) => {
  const [pin, setPin] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(pin);
      }}
      className="bg-secondary rounded-xl p-lg w-full max-w-xs space-y-md text-center"
    >
      <div className="text-5xl">{profile.avatar_url || '👤'}</div>
      <h3 className="text-lg font-semibold">{profile.first_name}</h3>
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="Code PIN"
        className="w-full text-center tracking-[0.5em] px-md py-sm bg-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-sm justify-center pt-sm">
        <button type="button" onClick={onCancel} className="px-md py-sm rounded-lg text-secondary hover:bg-primary transition-colors">
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting || pin.length < 4}
          className="px-md py-sm bg-accent text-white rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50 flex items-center gap-sm"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Valider
        </button>
      </div>
    </form>
  );
};

const ProfileSelect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profiles, isLoadingProfiles, selectProfile, createProfile, updateProfile, deleteProfile } = useAuth();
  const { error: showError } = useToast();
  const { theme } = useTheme();

  const [isManaging, setIsManaging] = useState(false);
  const [pinTarget, setPinTarget] = useState(null);
  const [pinError, setPinError] = useState('');
  const [editingProfile, setEditingProfile] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goToApp = useCallback(() => {
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  }, [navigate, location]);

  const handleSelect = useCallback((profile) => {
    if (profile.has_pin) {
      setPinError('');
      setPinTarget(profile);
    } else {
      selectProfile(profile.id).then((res) => {
        if (res.success) goToApp();
        else showError(res.error || 'Erreur lors de la sélection du profil');
      });
    }
  }, [selectProfile, goToApp, showError]);

  const handlePinSubmit = useCallback(async (pin) => {
    setIsSubmitting(true);
    const res = await selectProfile(pinTarget.id, pin);
    setIsSubmitting(false);
    if (res.success) {
      goToApp();
    } else {
      setPinError(res.error || 'Code PIN incorrect');
    }
  }, [pinTarget, selectProfile, goToApp]);

  const handleCreate = useCallback(async (data) => {
    setIsSubmitting(true);
    const res = await createProfile(data);
    setIsSubmitting(false);
    if (res.success) {
      setShowAddForm(false);
    } else {
      showError(res.error || 'Erreur lors de la création du profil');
    }
  }, [createProfile, showError]);

  const handleEditSubmit = useCallback(async (data) => {
    setIsSubmitting(true);
    const res = await updateProfile(editingProfile.id, data);
    setIsSubmitting(false);
    if (res.success) {
      setEditingProfile(null);
    } else {
      showError(res.error || 'Erreur lors de la mise à jour du profil');
    }
  }, [editingProfile, updateProfile, showError]);

  const handleDelete = useCallback(async (profile) => {
    if (profiles.length <= 1) {
      showError('Impossible de supprimer le dernier profil.');
      return;
    }
    const res = await deleteProfile(profile.id);
    if (!res.success) {
      showError(res.error || 'Erreur lors de la suppression du profil');
    }
  }, [profiles.length, deleteProfile, showError]);

  const backgroundStyle = {
    background: `linear-gradient(135deg,
      ${theme === 'dark' ? '#1A1B2E' : '#2B2D42'} 0%,
      ${theme === 'dark' ? '#2B2D42' : '#4A4D6A'} 100%)`
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-lg text-white" style={backgroundStyle}>
      <h1 className="text-3xl font-bold mb-xl">Qui regarde ?</h1>

      {isLoadingProfiles ? (
        <Loader2 className="w-8 h-8 animate-spin" />
      ) : (
        <div className="flex flex-wrap justify-center gap-lg max-w-3xl">
          {profiles.map((profile) => (
            <ProfileTile
              key={profile.id}
              profile={profile}
              isManaging={isManaging}
              onSelect={handleSelect}
              onEdit={setEditingProfile}
              onDelete={handleDelete}
            />
          ))}

          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex flex-col items-center gap-sm"
          >
            <span className="w-28 h-28 rounded-xl border-2 border-dashed border-white/40 flex items-center justify-center hover:border-white transition-colors">
              <Plus className="w-10 h-10" />
            </span>
            <span className="text-sm">Ajouter un profil</span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsManaging((prev) => !prev)}
        className="mt-xl px-lg py-sm border rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors flex items-center gap-sm"
      >
        {isManaging ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        {isManaging ? 'Terminé' : 'Gérer les profils'}
      </button>

      {pinTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-md">
          <div className="relative">
            <button type="button" onClick={() => setPinTarget(null)} className="absolute -top-10 right-0 text-white">
              <X className="w-6 h-6" />
            </button>
            <PinPrompt
              profile={pinTarget}
              onCancel={() => setPinTarget(null)}
              onSubmit={handlePinSubmit}
              isSubmitting={isSubmitting}
              error={pinError}
            />
          </div>
        </div>
      )}

      {(showAddForm || editingProfile) && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-md">
          <ProfileForm
            initial={editingProfile}
            onCancel={() => { setShowAddForm(false); setEditingProfile(null); }}
            onSubmit={editingProfile ? handleEditSubmit : handleCreate}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      <p className="mt-xl text-sm text-white/60">© {new Date().getFullYear()} NATAN Consulting</p>
    </div>
  );
};

export default ProfileSelect;
