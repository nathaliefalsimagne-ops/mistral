# Formation Architecture IA — Mini-site

Mini-site statique pour suivre et partager une montée en compétences en **architecture IA**
(août 2026 → janvier 2027).

## Structure

```
.
├── index.html         # Accueil : présentation + liens
├── diagnostic.html    # Auto-évaluation (5 blocs de compétences)
├── objectifs.html     # Objectifs SMARTER par bloc
├── calendrier.html    # Planning mensuel août 2026 → janvier 2027
├── ressources.html    # Formations, hackathons, outils (+ ChallengeMyThinking)
├── main.css           # Style commun (bleu foncé #2c3e50 / blanc)
└── assets/            # Images et PDFs (à ajouter)
```

## Aperçu local

Aucune dépendance requise : ce sont des fichiers HTML/CSS statiques.

```bash
# Option 1 : ouvrir directement
open index.html        # macOS
xdg-open index.html    # Linux

# Option 2 : serveur local (recommandé pour les chemins relatifs)
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Hébergement

### GitHub Pages (gratuit)

1. Pousser ce dépôt sur GitHub.
2. Settings → Pages → **Source : Deploy from a branch**.
3. Choisir la branche (`main`) et le dossier (`/root`).
4. Le site est publié à : `https://<utilisateur>.github.io/<repo>/`.

### Netlify (déploiement en 1 clic)

1. Connecter le dépôt GitHub sur [netlify.com](https://www.netlify.com/).
2. Build command : *(vide)* — Publish directory : `.` (racine).
3. Déploiement automatique à chaque push.

## Personnalisation

- **Diagnostic** (`diagnostic.html`) : ajuster niveaux, preuves et objectifs par bloc.
- **Objectifs** (`objectifs.html`) : mettre à jour échéances et statuts chaque mois.
- **Calendrier** (`calendrier.html`) : adapter les focuses et jalons mensuels.
- **Ressources** (`ressources.html`) : ajouter/supprimer liens vers formations, hackathons et outils.
- **Couleurs** (`main.css`) : la palette se base sur `#2c3e50` (en-tête) et `#ffffff` (contenu).

## Légende des badges

| Badge | Niveau |
|-------|--------|
| <span class="badge badge-initie">Initié</span> | Découverte |
| <span class="badge badge-praticien">Praticien</span> | Mise en pratique |
| <span class="badge badge-confirme">Confirmé</span> | Autonomie |
| <span class="badge badge-expert">Expert</span> | Maîtrise & transmission |
