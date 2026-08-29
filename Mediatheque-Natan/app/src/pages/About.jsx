import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  ArrowLeft,
  Info,
  Heart,
  Code,
  Users,
  Database,
  Shield,
  Globe,
  Mail,
  GitHub,
  Linkedin,
  Twitter
} from 'lucide-react';

const About = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Informations sur l'application
  const appInfo = {
    name: 'Médiathèque NATAN',
    version: '1.0.0',
    description: 'Gestion intelligente de CDs, DVDs et Blu-rays avec profilage utilisateur et recommandations',
    author: 'Nathalie FALSIMAGNE - NATAN Consulting',
    license: 'Propriétaire - Réservé à NATAN Consulting et ses clients',
    releaseDate: '29 août 2026'
  };

  // Fonctionnalités principales
  const features = [
    {
      icon: <Database className="w-6 h-6" />,
      title: 'Gestion du catalogue',
      description: 'Cataloguez tous vos médias avec des métadonnées complètes'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Profilage utilisateur',
      description: 'Personnalisez l\'expérience pour chaque utilisateur'
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Recommandations intelligentes',
      description: 'Système de suggestion basé sur vos goûts'
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: 'Scan code-barres',
      description: 'Identifiez rapidement vos médias avec le scanner'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Sécurité des données',
      description: 'Toutes vos données restent locales et sécurisées'
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Mode hors-ligne',
      description: 'Fonctionne sans connexion Internet'
    }
  ];

  // Équipe
  const team = [
    {
      name: 'Nathalie FALSIMAGNE',
      role: 'Fondatrice & Développeuse principale',
      email: 'nathalie@natan-consulting.com',
      description: 'Expert en gestion de données et architecture logicielle'
    }
  ];

  // Technologies utilisées
  const technologies = [
    {
      name: 'Electron',
      description: 'Framework pour les applications desktop cross-platform'
    },
    {
      name: 'React',
      description: 'Bibliothèque JavaScript pour les interfaces utilisateur'
    },
    {
      name: 'SQLite',
      description: 'Base de données embarquée légère et performante'
    },
    {
      name: 'TensorFlow.js',
      description: 'Machine learning dans le navigateur pour la reconnaissance visuelle'
    },
    {
      name: 'ZXing',
      description: 'Bibliothèque de scan de codes-barres et QR codes'
    }
  ];

  // Style du fond
  const backgroundStyle = {
    background: `linear-gradient(135deg, 
      ${theme === 'dark' ? '#1A1B2E' : '#F8F9FA'} 0%, 
      ${theme === 'dark' ? '#2B2D42' : '#E9ECEF'} 100%)`
  };

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
          <h1 className="text-2xl font-bold">À propos de Médiathèque NATAN</h1>
          <p className="text-tertiary mt-xs">
            Découvrez notre application de gestion de médiathèque
          </p>
        </div>
      </div>

      {/* En-tête de l'application */}
      <div className="bg-secondary rounded-xl p-lg text-center">
        <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-md">
          <span className="text-white text-4xl font-bold">N</span>
        </div>
        <h2 className="text-2xl font-bold">{appInfo.name}</h2>
        <p className="text-lg text-secondary mt-xs">{appInfo.description}</p>
        <div className="mt-md flex justify-center gap-lg text-sm text-tertiary">
          <span>Version {appInfo.version}</span>
          <span>•</span>
          <span>Sorti le {appInfo.releaseDate}</span>
          <span>•</span>
          <span>{appInfo.license}</span>
        </div>
        <p className="mt-md text-secondary">
          Développé par <span className="text-accent font-medium">{appInfo.author}</span>
        </p>
      </div>

      {/* Fonctionnalités */}
      <div className="bg-secondary rounded-xl p-lg">
        <h2 className="text-xl font-semibold mb-md">Fonctionnalités principales</h2>
        <p className="text-secondary mb-lg">
          Médiathèque NATAN offre une solution complète pour gérer votre collection de médias physiques.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>

      {/* Équipe */}
      <div className="bg-secondary rounded-xl p-lg">
        <h2 className="text-xl font-semibold mb-md">Notre équipe</h2>
        <p className="text-secondary mb-lg">
          Rencontrez les personnes derrière Médiathèque NATAN
        </p>
        
        <div className="grid md:grid-cols-2 gap-lg">
          {team.map((member, index) => (
            <TeamMember
              key={index}
              member={member}
            />
          ))}
        </div>
      </div>

      {/* Technologies */}
      <div className="bg-secondary rounded-xl p-lg">
        <h2 className="text-xl font-semibold mb-md">Technologies utilisées</h2>
        <p className="text-secondary mb-lg">
          Médiathèque NATAN utilise les technologies modernes pour offrir une expérience optimale
        </p>
        
        <div className="grid md:grid-cols-2 gap-md">
          {technologies.map((tech, index) => (
            <TechCard
              key={index}
              name={tech.name}
              description={tech.description}
            />
          ))}
        </div>
      </div>

      {/* Métaphore comptable */}
      <div className="bg-tertiary rounded-xl p-lg">
        <h2 className="text-xl font-semibold mb-md">Notre philosophie</h2>
        <p className="text-secondary mb-lg">
          Chez NATAN, nous croyons qu'une médiathèque bien gérée est comme un grand livre de comptes :
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-sm px-md font-medium">Concept Comptable</th>
                <th className="text-left py-sm px-md font-medium">Application Médiathèque</th>
                <th className="text-left py-sm px-md font-medium">Bénéfice</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Plan de comptes', 'Arborescence des catégories', 'Structuration claire et recherche instantanée'],
                ['Écriture comptable', 'Fiche détaillée d\'un média', 'Traçabilité totale de chaque élément'],
                ['Pièce justificative', 'Code-barres sur jacquette', 'Preuve physique et scan rapide'],
                ['Écriture de régularisation', 'Copie sans jacquette', 'Intégration des éléments "hors norme"'],
                ['Fichier client', 'Profil utilisateur', 'Personnalisation des recommandations'],
                ['Conseil en gestion', 'Système de suggestion intelligent', 'Valorisation du catalogue existant'],
                ['Inventaire physique', 'Scan des codes-barres ou saisie manuelle', 'Vérification des stocks réels'],
                ['Amortissement', 'Usure des médias', 'Gestion du cycle de vie']
              ].map(([concept, application, benefit], index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="py-sm px-md font-medium">{concept}</td>
                  <td className="py-sm px-md">{application}</td>
                  <td className="py-sm px-md text-secondary">{benefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <p className="mt-lg text-secondary italic text-center">
          "Une médiathèque bien gérée, c'est comme un bilan comptable équilibré : 
          chaque élément a sa place, chaque mouvement est traçable, et la valeur globale est optimisée."
        </p>
      </div>

      {/* Contact */}
      <div className="bg-secondary rounded-xl p-lg">
        <h2 className="text-xl font-semibold mb-md">Contact et support</h2>
        
        <div className="grid md:grid-cols-2 gap-lg">
          <div>
            <h3 className="font-medium mb-md">Support technique</h3>
            <p className="text-secondary mb-md">
              Si vous rencontrez des problèmes ou avez des questions, n'hésitez pas à nous contacter.
            </p>
            <div className="space-y-sm">
              <button className="w-full bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors flex items-center justify-center gap-sm">
                <Mail className="w-5 h-5" />
                <span>Envoyer un email</span>
              </button>
              <button className="w-full bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors flex items-center justify-center gap-sm">
                <Info className="w-5 h-5" />
                <span>Documentation</span>
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-md">Réseaux sociaux</h3>
            <p className="text-secondary mb-md">
              Suivez-nous pour rester informé des dernières mises à jour.
            </p>
            <div className="flex gap-sm">
              <button className="w-full bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors flex items-center justify-center gap-sm">
                <Linkedin className="w-5 h-5" />
                <span>LinkedIn</span>
              </button>
              <button className="w-full bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors flex items-center justify-center gap-sm">
                <GitHub className="w-5 h-5" />
                <span>GitHub</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mentions légales */}
      <div className="bg-secondary rounded-xl p-lg text-sm text-tertiary">
        <h2 className="text-lg font-semibold mb-md text-primary">Mentions légales</h2>
        
        <div className="space-y-md">
          <p>
            Médiathèque NATAN est une application développée par NATAN Consulting. 
            Toutes les données sont la propriété de leurs utilisateurs respectifs.
          </p>
          
          <p>
            L'application est fournie "telle quelle" sans garantie d'aucune sorte. 
            NATAN Consulting ne peut être tenu responsable des dommages directs, indirects 
            ou accessoires résultant de l'utilisation ou de l'impossibilité d'utiliser l'application.
          </p>
          
          <p>
            © {new Date().getFullYear()} NATAN Consulting. Tous droits réservés.
          </p>
        </div>
      </div>

      {/* Bouton de retour */}
      <div className="text-center">
        <button
          onClick={() => navigate(-1)}
          className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
        >
          Retour
        </button>
      </div>
    </div>
  );
};

// Composant FeatureCard
const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-primary rounded-lg p-md hover:bg-tertiary transition-colors">
    <div className="flex items-center gap-md">
      <div className="p-sm rounded-lg bg-accent bg-opacity-10 flex-shrink-0">
        <span className="text-accent">{icon}</span>
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-secondary">{description}</p>
      </div>
    </div>
  </div>
);

// Composant TeamMember
const TeamMember = ({ member }) => (
  <div className="bg-primary rounded-lg p-md">
    <div className="flex items-center gap-md">
      <div className="w-16 h-16 bg-accent bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-accent text-2xl font-bold">
          {member.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div>
        <h3 className="font-medium">{member.name}</h3>
        <p className="text-sm text-info">{member.role}</p>
        <p className="text-xs text-secondary mt-xs">{member.email}</p>
        <p className="text-sm text-secondary mt-sm">{member.description}</p>
      </div>
    </div>
  </div>
);

// Composant TechCard
const TechCard = ({ name, description }) => (
  <div className="bg-primary rounded-lg p-md">
    <div className="flex items-center gap-md">
      <div className="p-sm rounded-lg bg-accent bg-opacity-10 flex-shrink-0">
        <Code className="w-5 h-5 text-accent" />
      </div>
      <div>
        <h3 className="font-medium">{name}</h3>
        <p className="text-sm text-secondary">{description}</p>
      </div>
    </div>
  </div>
);

export default About;
