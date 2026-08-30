import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getRecommendationEngine } from '../services';
import {
  LayoutDashboard,
  Film,
  Music,
  Disc,
  BookOpen,
  Users,
  TrendingUp,
  Clock,
  Plus,
  Search,
  BarChart3,
  Archive,
  Layers
} from 'lucide-react';

// Obtenir la couleur de l'état d'un média
const getStateColor = (stateId) => {
  switch (stateId) {
    case 1: return 'bg-success';
    case 2: return 'bg-info';
    case 3: return 'bg-warning';
    case 4: return 'bg-danger';
    default: return 'bg-secondary';
  }
};

const Dashboard = () => {
  const { media, locations, users, loans, isLoading, getStats } = useDatabase();
  const { user } = useAuth();
  const { success } = useToast();
  const [stats, setStats] = useState(null);
  const [recentMedia, setRecentMedia] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [collectionGaps, setCollectionGaps] = useState([]);

  // Charger les statistiques et recommandations
  useEffect(() => {
    const loadData = async () => {
      try {
        const statsData = await getStats();
        setStats(statsData);

        // Récupérer les médias récents
        const recent = [...media]
          .sort((a, b) => new Date(b.added_date || b.created_at) - new Date(a.added_date || a.created_at))
          .slice(0, 5);
        setRecentMedia(recent);

        // Recommandations réelles, basées sur la collection et les emprunts
        if (user?.id) {
          const engine = await getRecommendationEngine(window.electronAPI.db);
          const engineResults = await engine.getHomepageRecommendations(user.id);
          setRecommendations(engineResults.map(({ media: recMedia, reason }) => ({
            id: recMedia.id,
            mediaId: recMedia.id,
            title: recMedia.title,
            type: window.electronAPI.utils.getMediaTypeLabel(recMedia.type_id),
            year: recMedia.release_year,
            rating: recMedia.average_rating,
            reason
          })));
        }
      } catch (error) {
        console.error('Erreur lors du chargement du tableau de bord:', error);
      }
    };

    if (!isLoading) {
      loadData();
    }
  }, [media, isLoading, getStats, user]);

  // Repérer les collections TMDB incomplètes (ex: "il manque 3 films de la
  // collection Mission: Impossible"). Un seul appel API par collection
  // distincte présente en médiathèque, pas par média.
  useEffect(() => {
    const loadCollectionGaps = async () => {
      const collections = new Map();
      for (const m of media) {
        if (m.tmdb_collection_id && !collections.has(m.tmdb_collection_id)) {
          collections.set(m.tmdb_collection_id, m.tmdb_collection_name);
        }
      }
      if (collections.size === 0) {
        setCollectionGaps([]);
        return;
      }

      const results = await Promise.all(
        Array.from(collections.keys()).map(async (collectionId) => {
          try {
            const res = await window.electronAPI.api.getCollectionStatus(collectionId);
            return res.success && res.data.missing.length > 0
              ? { collectionId, ...res.data }
              : null;
          } catch (err) {
            console.error('Erreur lors de la vérification de la collection:', err);
            return null;
          }
        })
      );
      setCollectionGaps(results.filter(Boolean));
    };

    if (!isLoading) {
      loadCollectionGaps();
    }
  }, [media, isLoading]);

  // Afficher un message de bienvenue
  useEffect(() => {
    if (user && !localStorage.getItem('hasSeenWelcome')) {
      success(`Bonjour ${user.firstName} ! Bienvenue dans Médiathèque NATAN.`);
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, [user, success]);

  // Calculer les statistiques de base
  const totalMedia = media.length;
  const dvdCount = media.filter(m => m.type_id === 1).length;
  const blurayCount = media.filter(m => m.type_id === 2).length;
  const cdCount = media.filter(m => m.type_id === 3).length;

  // Calculer les médias en prêt
  const onLoanCount = loans.filter(l => !l.return_date).length;

  // Calculer le taux d'occupation
  const totalCapacity = locations.reduce((sum, loc) => sum + (loc.capacity_max || 0), 0);
  const occupationRate = totalCapacity > 0 ? Math.round((totalMedia / totalCapacity) * 100) : 0;

  // Obtenir le nombre d'utilisateurs actifs
  const activeUsersCount = users.filter(u => u.is_active === 1).length;

  // Formatage des nombres
  const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Obtenir l'icône du type de média
  const getTypeIcon = (typeId) => {
    switch (typeId) {
      case 1: return <Disc className="w-4 h-4" />;
      case 2: return <Film className="w-4 h-4" />;
      case 3: return <Music className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-lg">
        <div className="animate-pulse space-y-md">
          <div className="h-8 bg-tertiary rounded w-1/4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-tertiary rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-xl">
      {/* En-tête cinématique */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-secondary to-primary p-xl">
        <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-info/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
            <p className="text-tertiary mt-xs">
              Bienvenue dans votre médiathèque intelligente
            </p>
          </div>
          <div className="flex items-center gap-md">
            <Link to="/media/add">
              <button className="flex items-center gap-sm bg-accent text-white px-md py-sm rounded-lg shadow-glow transition-all duration-200 hover:bg-accent-light hover:-translate-y-0.5 hover:shadow-glow-lg active:translate-y-0 active:scale-95">
                <Plus className="w-5 h-5" />
                <span>Ajouter un média</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-md">
        <StatCard
          icon={<LayoutDashboard className="w-6 h-6" />}
          label="Total des médias"
          value={formatNumber(totalMedia)}
          color="bg-accent"
        />
        <StatCard
          icon={<Film className="w-6 h-6" />}
          label="DVDs"
          value={formatNumber(dvdCount)}
          color="bg-info"
        />
        <StatCard
          icon={<Disc className="w-6 h-6" />}
          label="Blu-rays"
          value={formatNumber(blurayCount)}
          color="bg-success"
        />
        <StatCard
          icon={<Music className="w-6 h-6" />}
          label="CDs"
          value={formatNumber(cdCount)}
          color="bg-warning"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Utilisateurs"
          value={formatNumber(activeUsersCount)}
          color="bg-primary"
        />
      </div>

      {/* Section principale */}
      <div className="grid lg:grid-cols-3 gap-lg">
        {/* Graphique de répartition */}
        <div className="lg:col-span-2 bg-secondary rounded-xl p-lg">
          <div className="flex items-center justify-between mb-lg">
            <h2 className="text-xl font-semibold">Répartition des médias</h2>
            <Link to="/stats" className="text-sm text-accent hover:underline">
              Voir toutes les statistiques
            </Link>
          </div>
          
          <div>
            <h3 className="font-medium mb-md">Par type</h3>
            <div className="space-y-sm">
              <ProgressBar
                label="DVDs"
                value={dvdCount}
                max={totalMedia}
                color="bg-info"
                percentage={Math.round((dvdCount / totalMedia) * 100)}
              />
              <ProgressBar
                label="Blu-rays"
                value={blurayCount}
                max={totalMedia}
                color="bg-success"
                percentage={Math.round((blurayCount / totalMedia) * 100)}
              />
              <ProgressBar
                label="CDs"
                value={cdCount}
                max={totalMedia}
                color="bg-warning"
                percentage={Math.round((cdCount / totalMedia) * 100)}
              />
            </div>
          </div>

          {/* Taux d'occupation */}
          <div className="mt-lg pt-lg border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Taux d'occupation</h3>
                <p className="text-sm text-tertiary">
                  {totalMedia} médias sur {totalCapacity} emplacements
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{occupationRate}%</div>
                <div className="text-sm text-tertiary">
                  {occupationRate > 80 ? 'Presque plein' : occupationRate > 50 ? 'Rempli' : 'Espace disponible'}
                </div>
              </div>
            </div>
            <div className="mt-sm">
              <ProgressBar
                value={totalMedia}
                max={totalCapacity}
                color={occupationRate > 80 ? 'bg-danger' : occupationRate > 50 ? 'bg-warning' : 'bg-success'}
                percentage={occupationRate}
                showLabel={false}
              />
            </div>
          </div>
        </div>

        {/* Recommandations */}
        <div className="bg-secondary rounded-xl p-lg">
          <div className="flex items-center justify-between mb-lg">
            <h2 className="text-xl font-semibold">Recommandations</h2>
            <Link to="/settings" className="text-sm text-accent hover:underline">
              Personnaliser
            </Link>
          </div>
          
          {recommendations.length > 0 ? (
            <div className="space-y-md">
              {recommendations.map((rec, index) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  index={index + 1}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-lg text-tertiary">
              <p>Aucune recommandation disponible</p>
              <p className="text-sm mt-xs">
                Ajoutez des médias à votre collection pour obtenir des suggestions
              </p>
            </div>
          )}
        </div>
      </div>

      {collectionGaps.length > 0 && (
        <div className="bg-secondary rounded-xl p-lg">
          <div className="flex items-center gap-sm mb-lg">
            <Layers size={20} className="text-accent" />
            <h2 className="text-xl font-semibold">Complétez vos collections</h2>
          </div>
          <div className="space-y-lg">
            {collectionGaps.map((gap) => (
              <div key={gap.collectionId}>
                <p className="font-medium mb-sm">
                  Il vous manque {gap.missing.length} film{gap.missing.length > 1 ? 's' : ''} de la collection « {gap.collectionName} »
                </p>
                <div className="flex flex-wrap gap-sm">
                  {gap.missing.map((film) => (
                    <Link
                      key={film.id}
                      to={`/media/add?tmdbId=${film.id}`}
                      className="flex items-center gap-xs bg-tertiary rounded-lg px-md py-sm text-sm hover:bg-accent hover:text-white transition-colors"
                    >
                      <Plus size={14} />
                      {film.title}{film.release_year ? ` (${film.release_year})` : ''}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Médias récents */}
      <div className="bg-secondary rounded-xl p-lg">
        <div className="flex items-center justify-between mb-lg">
          <h2 className="text-xl font-semibold">Médias récemment ajoutés</h2>
          <Link to="/media" className="text-sm text-accent hover:underline">
            Voir tout le catalogue
          </Link>
        </div>
        
        {recentMedia.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-md">
            {recentMedia.map(mediaItem => (
              <MediaCard
                key={mediaItem.id}
                media={mediaItem}
                showType={true}
                showState={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-lg text-tertiary">
            <p>Aucun média récent</p>
            <p className="text-sm mt-xs">
              Commencez par ajouter votre premier média
            </p>
          </div>
        )}
      </div>

      {/* Emprunts en cours */}
      {onLoanCount > 0 && (
        <div className="bg-secondary rounded-xl p-lg">
          <div className="flex items-center justify-between mb-lg">
            <h2 className="text-xl font-semibold">Emprunts en cours</h2>
            <Link to="/loans" className="text-sm text-accent hover:underline">
              Voir tous les emprunts
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-sm px-md font-medium">Média</th>
                  <th className="text-left py-sm px-md font-medium">Emprunteur</th>
                  <th className="text-left py-sm px-md font-medium">Date</th>
                  <th className="text-left py-sm px-md font-medium">Retour prévu</th>
                </tr>
              </thead>
              <tbody>
                {loans
                  .filter(l => !l.return_date)
                  .slice(0, 5)
                  .map(loan => {
                    const mediaItem = media.find(m => m.id === loan.media_id);
                    const userItem = users.find(u => u.id === loan.user_id);
                    
                    return (
                      <tr key={loan.id} className="border-b last:border-0">
                        <td className="py-sm px-md">
                          <Link 
                            to={`/media/detail/${mediaItem?.id}`} 
                            className="text-accent hover:underline"
                          >
                            {mediaItem?.title || 'Inconnu'}
                          </Link>
                        </td>
                        <td className="py-sm px-md">
                          {userItem ? `${userItem.firstName} ${userItem.lastName}` : 'Inconnu'}
                        </td>
                        <td className="py-sm px-md">
                          {new Date(loan.loan_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-sm px-md">
                          {new Date(loan.due_date).toLocaleDateString('fr-FR')}
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
    </div>
  );
};

// Composant StatCard
const StatCard = ({ icon, label, value, color }) => (
  <div className="group bg-secondary rounded-xl p-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-glow cursor-default">
    <div className="flex items-center gap-md">
      <div className={`p-sm rounded-lg ${color} transition-transform duration-300 group-hover:scale-110`}>
        <span className="text-white">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-tertiary">{label}</p>
      </div>
    </div>
  </div>
);

// Composant ProgressBar
const ProgressBar = ({ label, value, max, color, percentage, showLabel = true }) => (
  <div className="space-y-xs">
    {showLabel && (
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
    )}
    <div className="h-3 bg-tertiary rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  </div>
);

// Composant RecommendationCard
const RecommendationCard = ({ recommendation, index }) => (
  <div className="group flex gap-md p-md rounded-lg transition-all duration-200 hover:bg-tertiary hover:-translate-y-0.5">
    <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-accent to-accent-light shadow-glow transition-transform duration-300 group-hover:scale-110">
      <span className="text-xl font-bold text-white">{index}</span>
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-ellipsis overflow-hidden whitespace-nowrap">
        {recommendation.title}
      </h3>
      <p className="text-sm text-tertiary">
        {recommendation.type} • {recommendation.year} • ⭐ {recommendation.rating}
      </p>
      <p className="text-xs text-secondary mt-xs">
        {recommendation.reason}
      </p>
    </div>
    <div className="flex-shrink-0 self-center">
      <Link
        to={`/media/detail/${recommendation.mediaId}`}
        className="inline-block bg-accent text-white px-sm py-xs rounded text-sm transition-all duration-200 hover:bg-accent-light hover:-translate-y-0.5 hover:shadow-glow active:scale-95"
      >
        Voir
      </Link>
    </div>
  </div>
);

// Composant MediaCard
const MediaCard = ({ media, showType = false, showState = false }) => (
  <Link to={`/media/detail/${media.id}`} className="group block">
    <div className="aspect-[2/3] bg-tertiary rounded-lg overflow-hidden mb-sm relative transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-glow-lg">
      {media.jacket_image_url ? (
        <img
          src={media.jacket_image_url}
          alt={media.title}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-accent to-accent-light flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-110">
          <span className="text-white text-4xl font-bold opacity-50">
            {media.title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Voile permanent pour la lisibilité, renforcé au survol */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-70 transition-opacity duration-300 group-hover:opacity-90" />

      {/* Badge de type */}
      {showType && (
        <div className="absolute top-sm left-sm">
          <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-sm py-xs rounded">
            {window.electronAPI.utils.getMediaTypeLabel(media.type_id)}
          </span>
        </div>
      )}

      {/* Badge d'état */}
      {showState && media.state_id && (
        <div className="absolute top-sm right-sm">
          <span className={`text-white text-xs px-sm py-xs rounded ${getStateColor(media.state_id)}`}>
            {window.electronAPI.utils.getMediaStateLabel(media.state_id)}
          </span>
        </div>
      )}

    </div>

    <div className="min-w-0">
      <h3 className="font-medium text-ellipsis overflow-hidden whitespace-nowrap transition-colors duration-200 group-hover:text-accent-light">
        {media.title}
      </h3>
      {media.original_title && media.original_title !== media.title && (
        <p className="text-xs text-tertiary italic">
          {media.original_title}
        </p>
      )}
      <p className="text-xs text-tertiary mt-xs">
        {media.release_year} • {media.duration_minutes} min
      </p>
    </div>
  </Link>
);

export default Dashboard;
