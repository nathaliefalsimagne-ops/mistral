import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Film,
  Star,
  MapPin,
  Barcode,
  Image as ImageIcon,
  Users,
  BookOpen,
  Plus,
  Minus
} from 'lucide-react';

const MediaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMediaById, deleteMedia, isLoading } = useDatabase();
  const { success, error: showError } = useToast();
  const { user } = useAuth();

  const [media, setMedia] = useState(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [relatedMedia, setRelatedMedia] = useState([]);
  const [persons, setPersons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [location, setLocation] = useState(null);
  const [loans, setLoans] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  // Charger les détails du média
  useEffect(() => {
    const loadMediaData = async () => {
      try {
        setIsLoadingMedia(true);

        // Charger le média
        const response = await getMediaById(id);
        if (response.success) {
          setMedia(response.data);

          // Charger les données associées (simulées pour l'instant)
          // Dans une vraie implémentation, on chargerait depuis la base
          const mockPersons = [
            { id: 'person-1', name: 'Christopher Nolan', role: 'Réalisateur', type: 1 },
            { id: 'person-2', name: 'Leonardo DiCaprio', role: 'Acteur', type: 2 },
            { id: 'person-3', name: 'Joseph Gordon-Levitt', role: 'Acteur', type: 2 }
          ];
          setPersons(mockPersons);

          const mockCategories = [
            { id: 'cat-1', name: 'Science-Fiction', relevance: 10 },
            { id: 'cat-2', name: 'Action', relevance: 8 },
            { id: 'cat-3', name: 'Thriller', relevance: 7 }
          ];
          setCategories(mockCategories);

          const mockLocation = {
            id: 'loc-1',
            name: 'DVDthèque - Étagère A - Rang 3',
            type_id: 1
          };
          setLocation(mockLocation);

          const mockLoans = [
            {
              id: 'loan-1',
              user_id: 'user-1',
              user_name: 'Nathalie FALSIMAGNE',
              loan_date: '2024-01-15',
              due_date: '2024-02-15',
              return_date: null,
              user_rating: null
            }
          ];
          setLoans(mockLoans);

          // Charger les médias similaires
          const allMediaResponse = await window.electronAPI.db.getMedia();
          if (allMediaResponse.success) {
            const allMedia = allMediaResponse.data;
            const similarMedia = allMedia
              .filter(m => m.id !== id && (
                m.type_id === response.data.type_id ||
                Math.abs((m.release_year || 0) - (response.data.release_year || 0)) <= 2
              ))
              .slice(0, 5);
            setRelatedMedia(similarMedia);
          }
        } else {
          showError('Média introuvable');
          navigate('/404');
        }
      } catch (err) {
        console.error('Erreur lors du chargement du média:', err);
        showError('Erreur lors du chargement du média');
        navigate('/404');
      } finally {
        setIsLoadingMedia(false);
      }
    };

    loadMediaData();
  }, [id, getMediaById, showError, navigate]);

  // Supprimer le média
  const handleDelete = useCallback(async () => {
    if (window.confirm(`Voulez-vous vraiment supprimer "${media?.title}" ?`)) {
      try {
        const response = await deleteMedia(id);
        if (response.success) {
          success('Média supprimé avec succès');
          navigate('/media');
        } else {
          showError(response.error || 'Erreur lors de la suppression');
        }
      } catch (err) {
        showError(`Erreur lors de la suppression: ${err.message}`);
      }
    }
  }, [id, media?.title, deleteMedia, showError, success, navigate]);

  // Mettre à jour la note
  const handleRatingChange = useCallback(async (newRating) => {
    try {
      // Mettre à jour la note dans la base
      // Cela serait implémenté avec un appel API
      setMedia(prev => ({ ...prev, average_rating: newRating }));
      success('Note mise à jour');
    } catch (err) {
      showError(`Erreur lors de la mise à jour de la note: ${err.message}`);
    }
  }, [success, showError]);

  // Emprunter le média
  const handleBorrow = useCallback(async () => {
    try {
      // Créer un nouvel emprunt
      // Cela serait implémenté avec un appel API
      const newLoan = {
        id: window.electronAPI.utils.generateId(),
        user_id: user?.id || 'user-1',
        media_id: id,
        loan_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
        return_date: null,
        user_rating: null,
        user_note: null
      };

      // Ajouter à la liste des emprunts
      setLoans(prev => [newLoan, ...prev]);
      success('Média emprunté avec succès');
    } catch (err) {
      showError(`Erreur lors de l'emprunt: ${err.message}`);
    }
  }, [id, user?.id, success, showError]);

  // Retourner le média
  const handleReturn = useCallback(async (loanId) => {
    try {
      // Mettre à jour l'emprunt
      // Cela serait implémenté avec un appel API
      setLoans(prev => prev.map(loan =>
        loan.id === loanId ? { ...loan, return_date: new Date().toISOString() } : loan
      ));
      success('Média retourné avec succès');
    } catch (err) {
      showError(`Erreur lors du retour: ${err.message}`);
    }
  }, [success, showError]);

  // Obtenir le nom du type de média
  const getTypeName = (typeId) => {
    return window.electronAPI.utils.getMediaTypeLabel(typeId);
  };

  // Obtenir le nom de l'état
  const getStateName = (stateId) => {
    return window.electronAPI.utils.getMediaStateLabel(stateId);
  };

  // Obtenir la couleur de l'état
  const getStateColor = (stateId) => {
    switch (stateId) {
      case 1: return 'bg-success';
      case 2: return 'bg-info';
      case 3: return 'bg-warning';
      case 4: return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  // Formatage de la durée
  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Formatage de la date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Vérifier si le média est actuellement emprunté
  const isCurrentlyBorrowed = loans.some(loan => loan.return_date === null);

  if (isLoading || isLoadingMedia) {
    return (
      <div className="p-lg">
        <div className="animate-pulse space-y-md">
          <div className="h-8 bg-tertiary rounded w-1/3" />
          <div className="grid lg:grid-cols-3 gap-lg">
            <div className="lg:col-span-1 aspect-[2/3] bg-tertiary rounded" />
            <div className="lg:col-span-2 space-y-md">
              <div className="h-6 bg-tertiary rounded w-1/2" />
              <div className="h-4 bg-tertiary rounded w-full" />
              <div className="h-4 bg-tertiary rounded w-full" />
              <div className="h-4 bg-tertiary rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="p-lg text-center">
        <p className="text-tertiary mb-md">Média introuvable</p>
        <Link to="/media">
          <button className="bg-accent text-white px-md py-sm rounded-lg hover:bg-accent-light transition-colors">
            Retour à la liste
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* En-tête */}
      <div className="flex items-center gap-md">
        <button
          onClick={() => navigate(-1)}
          className="p-sm rounded-full hover:bg-tertiary transition-colors"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{media.title}</h1>
          {media.original_title && media.original_title !== media.title && (
            <p className="text-tertiary italic">{media.original_title}</p>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid lg:grid-cols-3 gap-lg">
        {/* Colonne de gauche - Image et infos principales */}
        <div className="lg:col-span-1">
          {/* Image */}
          <div className="bg-secondary rounded-xl p-lg mb-lg">
            <div className="aspect-[2/3] bg-tertiary rounded-lg overflow-hidden mb-md relative">
              {media.jacket_image_url ? (
                <img
                  src={media.jacket_image_url}
                  alt={media.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                  <span className="text-white text-6xl font-bold opacity-50">
                    {getTypeIcon(media.type_id)}
                  </span>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-sm left-sm flex flex-col gap-xs">
                <span className="bg-black bg-opacity-50 text-white text-xs px-sm py-xs rounded">
                  {getTypeName(media.type_id)}
                </span>
                {media.state_id && (
                  <span className={`text-white text-xs px-sm py-xs rounded ${getStateColor(media.state_id)}`}>
                    {getStateName(media.state_id)}
                  </span>
                )}
              </div>

              {!media.has_jacket && (
                <div className="absolute bottom-sm left-sm">
                  <span className="bg-black bg-opacity-50 text-white text-xs px-sm py-xs rounded">
                    Sans jaquette
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-sm">
              <Link to={`/media/edit/${media.id}`} className="flex-1">
                <button className="w-full flex items-center justify-center gap-sm bg-primary text-white px-md py-sm rounded-lg hover:bg-primary-light transition-colors">
                  <Pencil className="w-5 h-5" />
                  <span>Modifier</span>
                </button>
              </Link>
              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-sm bg-danger text-white px-md py-sm rounded-lg hover:bg-danger-light transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span>Supprimer</span>
              </button>
            </div>

            {/* Note */}
            <div className="mt-lg pt-lg border-t">
              <h3 className="font-medium mb-md">Note</h3>
              <div className="flex items-center gap-sm">
                <div className="flex gap-xs">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                    <button
                      key={star}
                      onClick={() => handleRatingChange(star)}
                      className={`text-2xl ${star <= (media.average_rating || 0) ? 'text-yellow-400' : 'text-tertiary'}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                {media.average_rating && (
                  <span className="text-lg font-medium">{media.average_rating}/10</span>
                )}
              </div>
            </div>
          </div>

          {/* Emprunts */}
          <div className="bg-secondary rounded-xl p-lg">
            <div className="flex items-center justify-between mb-md">
              <h3 className="font-medium">Emprunts</h3>
              {!isCurrentlyBorrowed && user?.accessLevel >= 2 && (
                <button
                  onClick={handleBorrow}
                  className="text-sm bg-accent text-white px-sm py-xs rounded hover:bg-accent-light transition-colors"
                >
                  Emprunter
                </button>
              )}
            </div>

            {loans.length > 0 ? (
              <div className="space-y-sm">
                {loans.map(loan => (
                  <div
                    key={loan.id}
                    className="p-md rounded-lg bg-tertiary border"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{loan.user_name}</p>
                        <p className="text-xs text-tertiary">
                          Emprunté le {formatDate(loan.loan_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        {loan.return_date ? (
                          <span className="text-sm bg-success text-white px-sm py-xs rounded">
                            Retourné le {formatDate(loan.return_date)}
                          </span>
                        ) : (
                          <>
                            <p className="text-sm text-warning">
                              À retourner avant le {formatDate(loan.due_date)}
                            </p>
                            {user?.accessLevel >= 2 && (
                              <button
                                onClick={() => handleReturn(loan.id)}
                                className="mt-sm text-xs bg-success text-white px-sm py-xs rounded hover:bg-success-light transition-colors"
                              >
                                Marquer comme retourné
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-tertiary">Aucun emprunt enregistré</p>
            )}
          </div>
        </div>

        {/* Colonne de droite - Détails et métadonnées */}
        <div className="lg:col-span-2">
          {/* Onglets */}
          <div className="bg-secondary rounded-xl p-lg">
            <div className="border-b mb-lg">
              <nav className="flex gap-lg">
                <button className="pb-sm border-b-2 border-accent text-accent font-medium">
                  Détails
                </button>
                <button className="pb-sm text-tertiary hover:text-primary transition-colors">
                  Personnes
                </button>
                <button className="pb-sm text-tertiary hover:text-primary transition-colors">
                  Catégories
                </button>
              </nav>
            </div>

            {/* Onglet Détails */}
            <div className="space-y-lg">
              {/* Informations de base */}
              <div>
                <h2 className="text-xl font-semibold mb-md">Informations de base</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  <div className="space-y-sm">
                    <InfoRow icon={<Film className="w-5 h-5" />} label="Titre" value={media.title} />
                    {media.original_title && (
                      <InfoRow icon={<BookOpen className="w-5 h-5" />} label="Titre original" value={media.original_title} />
                    )}
                    <InfoRow icon={<Calendar className="w-5 h-5" />} label="Année" value={media.release_year || 'N/A'} />
                    <InfoRow icon={<Clock className="w-5 h-5" />} label="Durée" value={formatDuration(media.duration_minutes)} />
                  </div>
                  <div className="space-y-sm">
                    <InfoRow icon={<Film className="w-5 h-5" />} label="Type" value={getTypeName(media.type_id)} />
                    <InfoRow icon={<Star className="w-5 h-5" />} label="Note moyenne" value={media.average_rating ? `${media.average_rating}/10` : 'Non noté'} />
                    <InfoRow icon={<Calendar className="w-5 h-5" />} label="Date d'ajout" value={formatDate(media.added_date || media.created_at)} />
                    {media.state_id && (
                      <InfoRow icon={<MapPin className="w-5 h-5" />} label="État" value={getStateName(media.state_id)} />
                    )}
                  </div>
                </div>
              </div>

              {/* Synopsis */}
              {media.synopsis && (
                <div>
                  <h3 className="font-medium mb-md">Synopsis</h3>
                  <p className="text-secondary">{media.synopsis}</p>
                </div>
              )}

              {/* Emplacement */}
              {location && (
                <div>
                  <h3 className="font-medium mb-md">Emplacement</h3>
                  <div className="bg-tertiary rounded-lg p-md flex items-center gap-md">
                    <MapPin className="w-5 h-5 text-accent" />
                    <div>
                      <p className="font-medium">{location.name}</p>
                      <p className="text-sm text-tertiary">
                        {location.type_id === 1 ? 'DVDthèque avec jaquettes' : 'CDthèque sans jaquettes'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Codes-barres */}
              {media.barcode && (
                <div>
                  <h3 className="font-medium mb-md">Code-barres</h3>
                  <div className="bg-tertiary rounded-lg p-md flex items-center gap-md">
                    <Barcode className="w-5 h-5 text-accent" />
                    <div>
                      <p className="font-mono">{media.barcode}</p>
                      <p className="text-sm text-tertiary">
                        Scannez ce code pour un accès rapide
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Identifiants externes */}
              {(media.imdb_id || media.tmdb_id || media.musicbrainz_id) && (
                <div>
                  <h3 className="font-medium mb-md">Identifiants externes</h3>
                  <div className="flex flex-wrap gap-sm">
                    {media.imdb_id && (
                      <span className="bg-tertiary text-sm px-sm py-xs rounded">
                        IMDb: {media.imdb_id}
                      </span>
                    )}
                    {media.tmdb_id && (
                      <span className="bg-tertiary text-sm px-sm py-xs rounded">
                        TMDB: {media.tmdb_id}
                      </span>
                    )}
                    {media.musicbrainz_id && (
                      <span className="bg-tertiary text-sm px-sm py-xs rounded">
                        MusicBrainz: {media.musicbrainz_id}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Personnes */}
          <div className="bg-secondary rounded-xl p-lg">
            <h2 className="text-xl font-semibold mb-md">Personnes associées</h2>
            
            {persons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {persons.map(person => (
                  <div key={person.id} className="flex items-center gap-md p-md rounded-lg hover:bg-tertiary transition-colors">
                    <div className="w-10 h-10 bg-accent bg-opacity-10 rounded-full flex items-center justify-center">
                      <span className="text-accent font-bold">{person.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{person.name}</p>
                      <p className="text-sm text-tertiary">{person.role}</p>
                    </div>
                    <span className="text-xs bg-tertiary px-sm py-xs rounded">
                      {person.type === 1 ? 'Réalisateur' : person.type === 2 ? 'Acteur' : 'Autre'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-tertiary">Aucune personne associée</p>
            )}
          </div>

          {/* Catégories */}
          <div className="bg-secondary rounded-xl p-lg">
            <h2 className="text-xl font-semibold mb-md">Catégories</h2>
            
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-sm">
                {categories.map(category => (
                  <span
                    key={category.id}
                    className="bg-tertiary text-sm px-md py-xs rounded-full"
                    style={{ opacity: category.relevance / 10 }}
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-tertiary">Aucune catégorie associée</p>
            )}
          </div>
        </div>
      </div>

      {/* Médias similaires */}
      {relatedMedia.length > 0 && (
        <div className="bg-secondary rounded-xl p-lg">
          <h2 className="text-xl font-semibold mb-md">Médias similaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-md">
            {relatedMedia.map(related => (
              <div key={related.id} className="group">
                <Link to={`/media/detail/${related.id}`} className="block">
                  <div className="aspect-[2/3] bg-tertiary rounded-lg overflow-hidden mb-sm">
                    {related.jacket_image_url ? (
                      <img
                        src={related.jacket_image_url}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                        <span className="text-white text-4xl font-bold opacity-50">
                          {getTypeIcon(related)}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-ellipsis overflow-hidden whitespace-nowrap">
                    {related.title}
                  </h3>
                  <p className="text-xs text-tertiary mt-xs">
                    {related.release_year} • {formatDuration(related.duration_minutes)}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Composant InfoRow
const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center gap-md">
    <span className="text-tertiary">{icon}</span>
    <div>
      <p className="text-sm text-tertiary">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  </div>
);

// Fonction pour obtenir l'icône du type
const getTypeIcon = (mediaItem) => {
  switch (mediaItem.type_id) {
    case 1: return '📀';
    case 2: return '🎬';
    case 3: return '💿';
    default: return '📚';
  }
};

export default MediaDetail;
