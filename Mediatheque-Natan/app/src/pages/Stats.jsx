import React, { useState, useEffect, useMemo } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useTheme } from '../contexts/ThemeContext';
import { BarChart3, PieChart, TrendingUp, TrendingDown, Calendar, Clock, Users, Film, Disc, Music, BookOpen, Star } from 'lucide-react';

// Importation de Chart.js
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';

// Enregistrer les composants Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Stats = () => {
  const { media, locations, users, loans, isLoading, getStats } = useDatabase();
  const { theme } = useTheme();
  
  const [stats, setStats] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // all, year, month, week
  const [activeTab, setActiveTab] = useState('overview');

  // Charger les statistiques
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await getStats();
        setStats(statsData);
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      }
    };

    if (!isLoading) {
      loadStats();
    }
  }, [media, isLoading, getStats]);

  // Filtrer les données selon la plage de temps
  const filteredMedia = useMemo(() => {
    const now = new Date();
    
    return media.filter(m => {
      const addedDate = new Date(m.added_date || m.created_at);
      
      switch (timeRange) {
        case 'week': {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return addedDate >= weekAgo;
        }
        case 'month': {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return addedDate >= monthAgo;
        }
        case 'year': {
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          return addedDate >= yearAgo;
        }
        default:
          return true;
      }
    });
  }, [media, timeRange]);

  // Calculer les statistiques dynamiques
  const dynamicStats = useMemo(() => {
    if (filteredMedia.length === 0) return null;

    // Par type
    const byType = {};
    filteredMedia.forEach(m => {
      const type = window.electronAPI.utils.getMediaTypeLabel(m.type_id);
      byType[type] = (byType[type] || 0) + 1;
    });

    // Par année
    const byYear = {};
    filteredMedia.forEach(m => {
      if (m.release_year) {
        byYear[m.release_year] = (byYear[m.release_year] || 0) + 1;
      }
    });

    // Par état
    const byState = {};
    filteredMedia.forEach(m => {
      const state = window.electronAPI.utils.getMediaStateLabel(m.state_id);
      byState[state] = (byState[state] || 0) + 1;
    });

    // Par emplacement
    const byLocation = {};
    filteredMedia.forEach(m => {
      const location = locations.find(l => l.id === m.location_id);
      const locationName = location ? location.name : 'Non spécifié';
      byLocation[locationName] = (byLocation[locationName] || 0) + 1;
    });

    // Par durée (en heures)
    const byDuration = {};
    filteredMedia.forEach(m => {
      if (m.duration_minutes) {
        const hours = Math.floor(m.duration_minutes / 60);
        const range = hours < 1 ? '< 1h' : 
                     hours < 2 ? '1-2h' : 
                     hours < 3 ? '2-3h' : 
                     hours < 4 ? '3-4h' : 
                     '> 4h';
        byDuration[range] = (byDuration[range] || 0) + 1;
      }
    });

    // Notes moyennes
    const ratings = filteredMedia
      .filter(m => m.average_rating > 0)
      .map(m => m.average_rating);
    
    const avgRating = ratings.length > 0 
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : 0;

    return {
      byType,
      byYear,
      byState,
      byLocation,
      byDuration,
      avgRating,
      total: filteredMedia.length
    };
  }, [filteredMedia, locations]);

  // Statistiques des emprunts
  const loanStats = useMemo(() => {
    const totalLoans = loans.length;
    const activeLoans = loans.filter(l => !l.return_date).length;
    const returnedLoans = loans.filter(l => l.return_date).length;
    
    // Par utilisateur
    const byUser = {};
    loans.forEach(l => {
      const user = users.find(u => u.id === l.user_id);
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Inconnu';
      byUser[userName] = (byUser[userName] || 0) + 1;
    });

    // Par mois
    const byMonth = {};
    loans.forEach(l => {
      const date = new Date(l.loan_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    });

    return {
      totalLoans,
      activeLoans,
      returnedLoans,
      byUser,
      byMonth
    };
  }, [loans, users]);

  // Couleurs du thème
  const getChartColors = () => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    return {
      primary: isDark ? '#D90429' : '#2B2D42',
      secondary: isDark ? '#8D99AE' : '#4A4D6A',
      success: '#27AE60',
      info: '#2980B9',
      warning: '#F2994A',
      danger: '#EB5757',
      text: isDark ? '#E9ECEF' : '#2B2D42',
      background: isDark ? '#1A1B2E' : '#FFFFFF',
      grid: isDark ? '#4A4D6A' : '#DEE2E6'
    };
  };

  // Données pour les graphiques
  const chartData = useMemo(() => {
    if (!dynamicStats) return null;
    
    const colors = getChartColors();

    // Graphique par type
    const typeData = {
      labels: Object.keys(dynamicStats.byType),
      datasets: [{
        label: 'Médias par type',
        data: Object.values(dynamicStats.byType),
        backgroundColor: [
          colors.info,
          colors.success,
          colors.warning,
          colors.danger
        ],
        borderColor: [
          colors.info,
          colors.success,
          colors.warning,
          colors.danger
        ],
        borderWidth: 1
      }]
    };

    // Graphique par année
    const yearData = {
      labels: Object.keys(dynamicStats.byYear).sort(),
      datasets: [{
        label: 'Médias par année',
        data: Object.keys(dynamicStats.byYear).sort().map(year => dynamicStats.byYear[year]),
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      }]
    };

    // Graphique par état
    const stateData = {
      labels: Object.keys(dynamicStats.byState),
      datasets: [{
        label: 'Médias par état',
        data: Object.values(dynamicStats.byState),
        backgroundColor: [
          colors.success,
          colors.info,
          colors.warning,
          colors.danger
        ],
        borderColor: [
          colors.success,
          colors.info,
          colors.warning,
          colors.danger
        ],
        borderWidth: 1
      }]
    };

    // Graphique par emplacement
    const locationData = {
      labels: Object.keys(dynamicStats.byLocation),
      datasets: [{
        label: 'Médias par emplacement',
        data: Object.values(dynamicStats.byLocation),
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      }]
    };

    // Graphique par durée
    const durationData = {
      labels: Object.keys(dynamicStats.byDuration),
      datasets: [{
        label: 'Médias par durée',
        data: Object.values(dynamicStats.byDuration),
        backgroundColor: [
          colors.info,
          colors.success,
          colors.warning,
          colors.danger,
          colors.secondary
        ],
        borderColor: [
          colors.info,
          colors.success,
          colors.warning,
          colors.danger,
          colors.secondary
        ],
        borderWidth: 1
      }]
    };

    // Graphique des emprunts par utilisateur
    const loanUserData = {
      labels: Object.keys(loanStats.byUser),
      datasets: [{
        label: 'Emprunts par utilisateur',
        data: Object.values(loanStats.byUser),
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      }]
    };

    return {
      typeData,
      yearData,
      stateData,
      locationData,
      durationData,
      loanUserData
    };
  }, [dynamicStats, loanStats, theme]);

  // Options des graphiques
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: getChartColors().text,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: getChartColors().background,
        titleColor: getChartColors().text,
        bodyColor: getChartColors().text,
        borderColor: getChartColors().grid,
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: getChartColors().grid
        },
        ticks: {
          color: getChartColors().text
        }
      },
      y: {
        grid: {
          color: getChartColors().grid
        },
        ticks: {
          color: getChartColors().text
        }
      }
    }
  };

  // Formatage des nombres
  const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Formatage des pourcentages
  const formatPercentage = (num, total) => {
    if (total === 0) return '0%';
    return `${Math.round((num / total) * 100)}%`;
  };

  if (isLoading || !dynamicStats) {
    return (
      <div className="p-lg">
        <div className="animate-pulse space-y-md">
          <div className="h-8 bg-tertiary rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-tertiary rounded" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-md">
            <div className="h-64 bg-tertiary rounded" />
            <div className="h-64 bg-tertiary rounded" />
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
          <h1 className="text-2xl font-bold">Statistiques</h1>
          <p className="text-tertiary mt-xs">
            Analyse détaillée de votre médiathèque
          </p>
        </div>
        
        {/* Filtre de temps */}
        <div className="flex items-center gap-sm">
          <span className="text-sm text-tertiary">Période:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-primary border rounded px-sm py-xs focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">Tous</option>
            <option value="year">1 an</option>
            <option value="month">1 mois</option>
            <option value="week">1 semaine</option>
          </select>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-md">
        <StatCard
          icon={<BookOpen className="w-6 h-6" />}
          label="Total des médias"
          value={formatNumber(dynamicStats.total)}
          color="bg-accent"
          subtitle={`Sur ${formatNumber(media.length)} au total`}
        />
        
        <StatCard
          icon={<Film className="w-6 h-6" />}
          label="Films"
          value={formatNumber(dynamicStats.byType?.['DVD'] || 0 + dynamicStats.byType?.['Blu-ray'] || 0)}
          color="bg-info"
          subtitle={`${formatPercentage(
            (dynamicStats.byType?.['DVD'] || 0 + dynamicStats.byType?.['Blu-ray'] || 0), 
            dynamicStats.total
          )} des médias`}
        />
        
        <StatCard
          icon={<Music className="w-6 h-6" />}
          label="Musique"
          value={formatNumber(dynamicStats.byType?.['CD'] || 0)}
          color="bg-success"
          subtitle={`${formatPercentage(dynamicStats.byType?.['CD'] || 0, dynamicStats.total)} des médias`}
        />
        
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Utilisateurs"
          value={formatNumber(users.length)}
          color="bg-primary"
          subtitle={`${users.filter(u => u.is_active).length} actifs`}
        />
        
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Emprunts"
          value={formatNumber(loanStats.totalLoans)}
          color="bg-warning"
          subtitle={`${loanStats.activeLoans} en cours`}
        />
        
        <StatCard
          icon={<Star className="w-6 h-6" />}
          label="Note moyenne"
          value={dynamicStats.avgRating}
          color="bg-danger"
          subtitle={`/ 10`}
        />
      </div>

      {/* Onglets */}
      <div className="bg-secondary rounded-xl p-lg">
        <div className="border-b mb-lg">
          <nav className="flex gap-lg overflow-x-auto">
            <TabButton
              icon={<BarChart3 className="w-5 h-5" />}
              label="Aperçu"
              isActive={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            />
            <TabButton
              icon={<PieChart className="w-5 h-5" />}
              label="Répartition"
              isActive={activeTab === 'distribution'}
              onClick={() => setActiveTab('distribution')}
            />
            <TabButton
              icon={<Calendar className="w-5 h-5" />}
              label="Historique"
              isActive={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            />
            <TabButton
              icon={<Users className="w-5 h-5" />}
              label="Utilisateurs"
              isActive={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
            />
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="min-h-96">
          {activeTab === 'overview' && (
            <OverviewTab 
              dynamicStats={dynamicStats} 
              loanStats={loanStats} 
              chartData={chartData} 
              chartOptions={chartOptions} 
              locations={locations}
            />
          )}

          {activeTab === 'distribution' && (
            <DistributionTab
              dynamicStats={dynamicStats}
              chartData={chartData}
              chartOptions={chartOptions}
              media={media}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab 
              loanStats={loanStats} 
              chartData={chartData} 
              chartOptions={chartOptions}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab 
              users={users} 
              loans={loans} 
              loanStats={loanStats}
            />
          )}
        </div>
      </div>

      {/* Top médias */}
      <div className="grid md:grid-cols-2 gap-lg">
        <div className="bg-secondary rounded-xl p-lg">
          <h2 className="text-xl font-semibold mb-md">Top médias les plus notés</h2>
          <TopMediaList
            media={media
              .filter(m => m.average_rating > 0)
              .sort((a, b) => b.average_rating - a.average_rating)
              .slice(0, 5)}
            type="rating"
          />
        </div>
        
        <div className="bg-secondary rounded-xl p-lg">
          <h2 className="text-xl font-semibold mb-md">Top médias les plus empruntés</h2>
          <TopMediaList
            media={media
              .map(m => ({
                ...m,
                loanCount: loans.filter(l => l.media_id === m.id).length
              }))
              .filter(m => m.loanCount > 0)
              .sort((a, b) => b.loanCount - a.loanCount)
              .slice(0, 5)}
            type="loans"
          />
        </div>
      </div>
    </div>
  );
};

// Composants

const TabButton = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-sm pb-sm border-b-2 transition-colors ${
      isActive 
        ? 'border-accent text-accent font-medium' 
        : 'border-transparent text-tertiary hover:text-primary'
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const StatCard = ({ icon, label, value, color, subtitle }) => (
  <div className="bg-secondary rounded-xl p-lg">
    <div className="flex items-center gap-md">
      <div className={`p-sm rounded-lg ${color}`}>
        <span className="text-white">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-tertiary">{label}</p>
        {subtitle && <p className="text-xs text-secondary mt-xs">{subtitle}</p>}
      </div>
    </div>
  </div>
);

const OverviewTab = ({ dynamicStats, loanStats, chartData, chartOptions, locations }) => (
  <div className="space-y-lg">
    {/* Résumé */}
    <div className="grid md:grid-cols-2 gap-lg">
      <div>
        <h3 className="font-medium mb-md">Répartition par type</h3>
        <div className="h-64">
          {chartData?.typeData && (
            <Doughnut 
              data={chartData.typeData} 
              options={chartOptions} 
            />
          )}
        </div>
      </div>
      
      <div>
        <h3 className="font-medium mb-md">Répartition par état</h3>
        <div className="h-64">
          {chartData?.stateData && (
            <Pie 
              data={chartData.stateData} 
              options={chartOptions} 
            />
          )}
        </div>
      </div>
    </div>

    {/* Statistiques détaillées */}
    <div className="grid md:grid-cols-2 gap-lg">
      <div>
        <h3 className="font-medium mb-md">Médias par année</h3>
        <p className="text-sm text-tertiary mb-md">
          Distribution des médias selon leur année de sortie
        </p>
        <div className="h-64">
          {chartData?.yearData && (
            <Bar 
              data={chartData.yearData} 
              options={chartOptions} 
            />
          )}
        </div>
      </div>
      
      <div>
        <h3 className="font-medium mb-md">Médias par durée</h3>
        <p className="text-sm text-tertiary mb-md">
          Répartition des médias selon leur durée
        </p>
        <div className="h-64">
          {chartData?.durationData && (
            <Bar 
              data={chartData.durationData} 
              options={chartOptions} 
            />
          )}
        </div>
      </div>
    </div>
  </div>
);

const DistributionTab = ({ dynamicStats, chartData, chartOptions, media }) => (
  <div className="space-y-lg">
    {/* Répartition par emplacement */}
    <div>
      <h3 className="font-medium mb-md">Médias par emplacement</h3>
      <div className="h-64 mb-lg">
        {chartData?.locationData && (
          <Bar 
            data={chartData.locationData} 
            options={chartOptions} 
          />
        )}
      </div>
    </div>

    {/* Tableau de répartition */}
    <div>
      <h3 className="font-medium mb-md">Tableau de répartition</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-sm px-md font-medium">Type</th>
              <th className="text-left py-sm px-md font-medium">Nombre</th>
              <th className="text-left py-sm px-md font-medium">Pourcentage</th>
              <th className="text-left py-sm px-md font-medium">Note moyenne</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(dynamicStats.byType || {}).map(([type, count]) => {
              const typeMedia = media.filter(m => 
                window.electronAPI.utils.getMediaTypeLabel(m.type_id) === type
              );
              const avgRating = typeMedia.length > 0 
                ? (typeMedia.reduce((sum, m) => sum + (m.average_rating || 0), 0) / typeMedia.length).toFixed(1)
                : 0;
              
              return (
                <tr key={type} className="border-b last:border-0">
                  <td className="py-sm px-md">{type}</td>
                  <td className="py-sm px-md">{count}</td>
                  <td className="py-sm px-md">
                    {((count / dynamicStats.total) * 100).toFixed(1)}%
                  </td>
                  <td className="py-sm px-md">{avgRating > 0 ? avgRating : 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* Répartition par état */}
    <div>
      <h3 className="font-medium mb-md">Médias par état</h3>
      <div className="h-64">
        {chartData?.stateData && (
          <Doughnut 
            data={chartData.stateData} 
            options={chartOptions} 
          />
        )}
      </div>
    </div>
  </div>
);

const HistoryTab = ({ loanStats, chartData, chartOptions }) => (
  <div className="space-y-lg">
    {/* Statistiques des emprunts */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
      <StatCard
        icon={<TrendingUp className="w-6 h-6" />}
        label="Total des emprunts"
        value={loanStats.totalLoans}
        color="bg-info"
      />
      <StatCard
        icon={<TrendingUp className="w-6 h-6" />}
        label="Emprunts actifs"
        value={loanStats.activeLoans}
        color="bg-success"
      />
      <StatCard
        icon={<TrendingDown className="w-6 h-6" />}
        label="Médias retournés"
        value={loanStats.returnedLoans}
        color="bg-secondary"
      />
      <StatCard
        icon={<Users className="w-6 h-6" />}
        label="Utilisateurs actifs"
        value={Object.keys(loanStats.byUser).length}
        color="bg-warning"
      />
    </div>

    {/* Graphique des emprunts par utilisateur */}
    <div>
      <h3 className="font-medium mb-md">Emprunts par utilisateur</h3>
      <div className="h-64 mb-lg">
        {chartData?.loanUserData && (
          <Bar 
            data={chartData.loanUserData} 
            options={chartOptions} 
          />
        )}
      </div>
    </div>

    {/* Historique mensuel */}
    <div>
      <h3 className="font-medium mb-md">Historique mensuel des emprunts</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-sm px-md font-medium">Mois</th>
              <th className="text-left py-sm px-md font-medium">Nombre</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(loanStats.byMonth || {})
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([month, count]) => (
                <tr key={month} className="border-b last:border-0">
                  <td className="py-sm px-md">{month}</td>
                  <td className="py-sm px-md">{count}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const UsersTab = ({ users, loans, loanStats }) => (
  <div className="space-y-lg">
    {/* Statistiques utilisateurs */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-md">
      <StatCard
        icon={<Users className="w-6 h-6" />}
        label="Total utilisateurs"
        value={users.length}
        color="bg-info"
      />
      <StatCard
        icon={<TrendingUp className="w-6 h-6" />}
        label="Utilisateurs actifs"
        value={users.filter(u => u.is_active).length}
        color="bg-success"
      />
      <StatCard
        icon={<Film className="w-6 h-6" />}
        label="Moyenne par utilisateur"
        value={Math.round(loanStats.totalLoans / users.length) || 0}
        color="bg-warning"
        subtitle="emprunts"
      />
    </div>

    {/* Liste des utilisateurs */}
    <div>
      <h3 className="font-medium mb-md">Liste des utilisateurs</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-sm px-md font-medium">Utilisateur</th>
              <th className="text-left py-sm px-md font-medium">Type</th>
              <th className="text-left py-sm px-md font-medium">Emprunts</th>
              <th className="text-left py-sm px-md font-medium">Actif</th>
              <th className="text-left py-sm px-md font-medium">Dernier emprunt</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const userLoans = loans.filter(l => l.user_id === user.id);
              const lastLoan = userLoans.length > 0 
                ? new Date(Math.max(...userLoans.map(l => new Date(l.loan_date).getTime()))).toLocaleDateString('fr-FR')
                : 'Jamais';
              
              return (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-sm px-md">
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-tertiary">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-sm px-md">
                    {user.accessLevel === 3 ? 'Admin' : user.accessLevel === 2 ? 'Membre' : 'Invité'}
                  </td>
                  <td className="py-sm px-md">{userLoans.length}</td>
                  <td className="py-sm px-md">
                    <span className={`px-sm py-xs rounded text-xs ${
                      user.is_active ? 'bg-success text-white' : 'bg-tertiary text-tertiary'
                    }`}>
                      {user.is_active ? 'Oui' : 'Non'}
                    </span>
                  </td>
                  <td className="py-sm px-md text-sm text-tertiary">{lastLoan}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const TopMediaList = ({ media, type }) => (
  <div className="space-y-sm">
    {media.length > 0 ? (
      media.map((m, index) => (
        <div
          key={m.id}
          className="flex items-center gap-md p-md rounded-lg hover:bg-tertiary transition-colors"
        >
          <span className="text-xl font-bold text-tertiary">{index + 1}</span>
          <div className="w-12 h-16 bg-tertiary rounded overflow-hidden flex-shrink-0">
            {m.jacket_image_url ? (
              <img
                src={m.jacket_image_url}
                alt={m.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-2xl">
                  {window.electronAPI.utils.getMediaTypeLabel(m.type_id).charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ellipsis overflow-hidden whitespace-nowrap">{m.title}</p>
            <p className="text-xs text-tertiary">
              {m.release_year} • {window.electronAPI.utils.getMediaTypeLabel(m.type_id)}
            </p>
          </div>
          <div className="text-right">
            {type === 'rating' ? (
              <>
                <p className="font-medium">⭐ {m.average_rating}</p>
                <p className="text-xs text-tertiary">/ 10</p>
              </>
            ) : (
              <>
                <p className="font-medium">{m.loanCount}</p>
                <p className="text-xs text-tertiary">emprunt(s)</p>
              </>
            )}
          </div>
        </div>
      ))
    ) : (
      <p className="text-sm text-tertiary">Aucun média trouvé</p>
    )}
  </div>
);

export default Stats;
