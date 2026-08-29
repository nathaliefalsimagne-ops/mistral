# Médiathèque NATAN

> **Gestion intelligente de CDs, DVDs et Blu-rays avec profilage utilisateur et recommandations**

Médiathèque NATAN est une application desktop **100% hors-ligne** conçue pour gérer efficacement votre collection de médias physiques. Basée sur une architecture **local-first**, elle permet de cataloguer, emprunter, analyser et recommander vos médias sans dépendre d'une connexion Internet.

---

## 🚀 Fonctionnalités principales

### 📚 **Gestion du catalogue**
- ✅ **Ajout complet** de médias (CDs, DVDs, Blu-rays) avec métadonnées détaillées
- ✅ **Scan de code-barres** via caméra (ZXing) pour une identification rapide
- ✅ **Reconnaissance visuelle** des disques et jaquettes (TensorFlow.js)
- ✅ **Import depuis CSV** et compatibilité avec Movie Buddy
- ✅ **Recherche avancée** avec filtres par type, catégorie, année, etc.

### 👥 **Profilage utilisateur**
- ✅ **Multi-utilisateurs** avec niveaux d'accès (Invité, Membre, Administrateur)
- ✅ **Historique des emprunts** pour chaque utilisateur
- ✅ **Préférences et notes** personnelles
- ✅ **Statistiques d'utilisation** par utilisateur

### 🎯 **Recommandations intelligentes**
- ✅ **Moteur multi-critères** basé sur :
  - Historique de l'utilisateur (40%)
  - Popularité dans les catégories (20%)
  - Tendances du moment (15%)
  - Pertinence saisonnière (10%)
  - Diversité des suggestions (10%)
  - Nouveautés (5%)
- ✅ **Suggestions personnalisées** sur la page d'accueil
- ✅ **Médias similaires** à un élément sélectionné

### 💾 **Gestion des données**
- ✅ **Base de données SQLite** embarquée (sqlite3)
- ✅ **Sauvegardes automatiques** avec fréquence configurable
- ✅ **Synchronisation avec disques externes** (detection, import/export)
- ✅ **Migration depuis Movie Buddy** et fichiers CSV
- ✅ **Export/Import** complet des données

### 📊 **Analyse et statistiques**
- ✅ **Tableau de bord** avec indicateurs clés
- ✅ **Graphiques interactifs** (Chart.js, Recharts)
- ✅ **Statistiques par type, catégorie, utilisateur, période**
- ✅ **Détection des emprunts en retard**

### 🎨 **Interface utilisateur**
- ✅ **Design moderne** avec thème clair/sombre/système
- ✅ **Responsive** pour toutes les tailles d'écran
- ✅ **Notifications** pour les événements importants
- ✅ **Recherche instantanée** avec autocomplétion

---

## 📦 Prérequis

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- **Git** (pour le clonage)
- **Système d'exploitation** : Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)

### Dépendances système (pour sqlite3)

#### Windows
Aucune dépendance supplémentaire.

#### macOS
```bash
brew install sqlite3
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install build-essential python3
```

#### Linux (Fedora)
```bash
sudo dnf install gcc-c++ python3 make
```

---

## 🛠 Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/nathaliefalsimagne-ops/mistral.git
cd mistral/Mediatheque-Natan
```

### 2. Installer les dépendances

```bash
npm install
```

> ⚠️ **Note** : L'installation de `sqlite3` peut prendre quelques minutes car elle compile des modules natifs.

### 3. Configurer l'application

Créer un fichier `.env` à la racine du projet :

```env
# Configuration de l'API TMDB (optionnelle)
TMDB_API_KEY=votre_cle_api_tmdb

# Configuration de la base de données
DB_PATH=./data/mediatheque.db

# Configuration des sauvegardes
BACKUP_DIR=./backups
MAX_BACKUPS=30
```

---

## 🚀 Utilisation

### Mode développement

```bash
npm run start:dev
```

Lance l'application avec le rechargement à chaud (Hot Module Replacement).

### Build de production

```bash
npm run build
```

Génère les fichiers optimisés dans le dossier `dist/`.

### Packaging

#### Windows
```bash
npm run package:win
```

#### macOS
```bash
npm run package:mac
```

#### Linux
```bash
npm run package:linux
```

Les packages seront générés dans le dossier `release/`.

---

## 📁 Structure du projet

```
Mediatheque-Natan/
├── app/
│   ├── main.js              # Processus principal Electron
│   ├── preload.js           # Pont sécurisé entre main et renderer
│   ├── renderer.js          # Point d'entrée React
│   └── src/
│       ├── components/      # Composants React réutilisables
│       ├── contexts/        # Contextes React (state management)
│       ├── hooks/           # Hooks personnalisés
│       ├── pages/           # Pages de l'application
│       ├── services/        # Services (recommandation, API, scan)
│       ├── styles/          # Styles CSS
│       └── utils/           # Fonctions utilitaires
├── scripts/                 # Scripts CLI
│   ├── migrate.js           # Migration des données
│   ├── backup.js            # Gestion des sauvegardes
│   └── sync-external.js     # Synchronisation disques externes
├── webpack/                 # Configurations Webpack
│   ├── main.config.js
│   ├── renderer.config.js
│   └── common.config.js
├── public/                  # Assets statiques
└── data/                   # Base de données (généré)
```

---

## 🔧 Configuration

### Base de données

La base de données SQLite est automatiquement créée au premier lancement dans le dossier `data/`.

### Sauvegardes

Les sauvegardes sont stockées dans `backups/` avec les options suivantes :
- Fréquence : horaire, quotidienne, hebdomadaire, mensuelle
- Nombre maximum de sauvegardes conservées
- Inclusion des fichiers médias dans les sauvegardes

### Synchronisation externe

L'application détecte automatiquement les disques externes et permet :
- L'export des données vers un disque
- L'import depuis un disque existant
- La synchronisation bidirectionnelle

---

## 🎨 Personnalisation

### Thème

L'application supporte trois thèmes :
- **Clair** (Light)
- **Sombre** (Dark)
- **Système** (System) - suit les préférences de l'OS

Le thème peut être changé dans les paramètres.

### Langue

Actuellement supporté :
- Français (par défaut)
- Anglais
- Espagnol

---

## 📊 Métaphore Comptable

Médiathèque NATAN utilise une approche inspirée de la comptabilité :

| Concept Comptable | Application Médiathèque | Bénéfice |
|-------------------|--------------------------|----------|
| Plan de comptes | Arborescence des catégories | Structuration claire |
| Écriture comptable | Fiche détaillée d'un média | Traçabilité totale |
| Pièce justificative | Code-barres sur jacquette | Preuve physique |
| Écriture de régularisation | Copie sans jacquette | Intégration des éléments "hors norme" |
| Fichier client | Profil utilisateur | Personnalisation |
| Conseil en gestion | Système de suggestion | Valorisation du catalogue |
| Inventaire physique | Scan des codes-barres | Vérification des stocks |
| Amortissement | Usure des médias | Gestion du cycle de vie |

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. Forker le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/ma-nouvelle-fonctionnalité`)
3. Commiter vos changements (`git commit -m 'Ajout de ma nouvelle fonctionnalité'`)
4. Pousser vers la branche (`git push origin feature/ma-nouvelle-fonctionnalité`)
5. Ouvrir une Pull Request

---

## 📄 Licence

© 2026 NATAN Consulting - Tous droits réservés.

Ce projet est propriétaire et réservé à NATAN Consulting et ses clients.

---

## 🙏 Remerciements

- **Electron** - Framework pour les applications desktop
- **React** - Bibliothèque pour les interfaces utilisateur
- **SQLite** - Base de données embarquée
- **TensorFlow.js** - Machine learning dans le navigateur
- **ZXing** - Scan de codes-barres
- **Chart.js & Recharts** - Visualisation de données
- **Lucide React** - Icônes

---

## 📞 Support

Pour toute question ou problème, contactez :

- **Email** : nathalie@natan-consulting.com
- **Site web** : [www.natan-consulting.com](https://www.natan-consulting.com)

---

*Développé avec ❤️ par Nathalie FALSIMAGNE - NATAN Consulting*
