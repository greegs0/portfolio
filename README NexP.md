<div align="center">

# NexP

### Plateforme collaborative nouvelle génération pour développeurs

[![Ruby](https://img.shields.io/badge/Ruby-3.3.5-red.svg)](https://www.ruby-lang.org/)
[![Rails](https://img.shields.io/badge/Rails-7.1.6-red.svg)](https://rubyonrails.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0-blue.svg)]()
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()
[![Redis](https://img.shields.io/badge/redis-8.4-red.svg)](https://redis.io/)

*"Pas un job board. Pas du freelance. Des projets."*

[Documentation technique](TECHNICAL_RECAP.md) | [Guide Production](PRODUCTION_READY_CHECKLIST.md) | [Setup Production](PRODUCTION_SETUP.md)

</div>

---

## Table des matières

- [À propos](#à-propos)
- [Screenshots](#screenshots)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Installation](#installation)
- [API](#api)
- [Tests](#tests)
- [Roadmap](#roadmap)
- [Contribuer](#contribuer)
- [License](#license)

---

## À propos

**NexP** est une plateforme collaborative SaaS conçue pour connecter les développeurs autour de projets communs. Elle combine :

- **Matching intelligent** : Algorithme de scoring pour trouver les meilleurs projets/collaborateurs
- **Gamification** : XP, niveaux, et 24+ badges déblocables automatiquement
- **Social** : Feed, likes, commentaires, suivis
- **Temps réel** : Notifications et messagerie via ActionCable

### Ce que NexP permet de faire :

- **Découvrir** des projets correspondant à vos compétences
- **Collaborer** avec d'autres devs en temps réel
- **Suivre** l'avancement des projets via un dashboard intuitif
- **Gagner** des badges et XP en fonction de vos contributions
- **Échanger** via messagerie directe ou chat projet

---

## Screenshots

<div align="center">

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)
*Vue d'ensemble avec XP, projets actifs et activité récente*

### Profil Développeur
![Profil](docs/screenshots/profile.png)
*Profil avec compétences, badges et statistiques*

### Page Projet
![Projet](docs/screenshots/project.png)
*Détails du projet avec équipe et chat intégré*

### Feed Social
![Feed](docs/screenshots/feed.png)
*Fil d'actualité avec posts, likes et commentaires*

### Matching
![Matching](docs/screenshots/matching.png)
*Recommandations intelligentes de projets*

</div>

> **Note**: Pour ajouter vos propres screenshots, placez les images dans `docs/screenshots/` avec les noms correspondants.

---

## Fonctionnalités

### Implémentées

- [x] **Authentification** (Devise + JWT API)
- [x] **Profils développeurs** avec bio, portfolio, GitHub, LinkedIn
- [x] **Système de compétences** (200+ skills, 14 catégories, recherche fuzzy)
- [x] **Gestion de projets** (CRUD, statuts, visibilité, équipes)
- [x] **Feed social** (posts, likes, commentaires imbriqués)
- [x] **Système de following** avec feed personnalisé
- [x] **Messagerie** (DM + chat projet)
- [x] **Notifications temps réel** (ActionCable)
- [x] **Matching intelligent** (algorithme 7 critères)
- [x] **Gamification** (XP, levels, 24+ badges)
- [x] **Analytics** (platform, user, project, trending)
- [x] **API REST complète** (50+ endpoints)
- [x] **Recherche avancée** (pg_trgm, autocomplétion)
- [x] **Skills avancées** (niveaux, réordonnement drag & drop)

### À venir

- [ ] Intégrations OAuth GitHub/GitLab
- [ ] Système de paiements (Stripe)
- [ ] Mode sombre complet
- [ ] Notifications email
- [ ] CI/CD

---

## Stack technique

### Backend

| Technologie | Version | Usage |
|-------------|---------|-------|
| Ruby | 3.3.5 | Langage principal |
| Rails | 7.1.6 | Framework MVC |
| PostgreSQL | 17 | Base de données + pg_trgm |
| Puma | 6.5+ | Serveur web multi-thread |
| Devise | Latest | Authentification |
| JWT | Latest | Authentification API |
| ActionCable | 7.1 | WebSockets temps réel |
| Rack::Attack | Latest | Rate limiting |
| Kaminari | Latest | Pagination |

### Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| Hotwire | 3.2 | Turbo + Stimulus |
| Tailwind CSS | 3.4 | Framework CSS utility-first |
| ImportMap | Latest | Gestion JS sans bundler |
| Active Storage | 7.1 | Upload fichiers/images |

### DevOps & Testing

| Outil | Usage |
|-------|-------|
| RSpec | Tests (395+ exemples) |
| FactoryBot | Factories de test |
| Faker | Données de test |
| Shoulda Matchers | Matchers RSpec |

---

## Architecture

### Métriques du projet

```
Lignes Ruby:              ~4,019
Lignes JavaScript:        ~1,498
Lignes Specs:             ~2,654
Vues ERB:                 82 templates
Contrôleurs:              24 (16 web + 8 API)
Stimulus Controllers:     22
Services:                 7
Modèles:                  16
Migrations:               29
Tables DB:                19 (16 + 3 Active Storage)
API Endpoints:            50+
```

### Modèles principaux

- **User** : Développeur avec compétences, portfolio, XP, level
- **Project** : Projet collaboratif avec équipe et skills requises
- **Team** : Association user ↔ project avec rôles et statuts
- **Skill** : Compétences techniques (aliases, recherche fuzzy)
- **Post** : Publications du feed social
- **Message** : Messagerie (DM + chat projet)
- **Notification** : Notifications temps réel polymorphes
- **Badge** : Système de gamification

### Services métier

1. `MatchingService` : Algorithme de matching projet/user
2. `BadgeService` : Attribution automatique des badges
3. `AnalyticsService` : Stats platform/user/project
4. `SkillSuggestionService` : Autocomplétion intelligente
5. `JsonWebToken` : Gestion des tokens JWT
6. `GithubIntegrationService` : OAuth GitHub (préparé)
7. `GitlabIntegrationService` : OAuth GitLab (préparé)

---

## Installation

### Prérequis

- Ruby 3.3.5
- Rails 7.1.6
- PostgreSQL 17
- Node.js 20+

### Setup

```bash
# Clone le repo
git clone https://github.com/greegs0/NexP.git
cd NexP

# Install dependencies
bundle install

# Setup database
rails db:create
rails db:migrate
rails db:seed

# Lancer le serveur
bin/dev
```

### Variables d'environnement (optionnel)

```bash
# config/credentials.yml.enc
# Éditer avec: rails credentials:edit

secret_key_base: <généré automatiquement>
jwt_secret: <votre_secret_jwt>

# Pour OAuth (optionnel)
github:
  client_id: xxx
  client_secret: xxx
gitlab:
  client_id: xxx
  client_secret: xxx
```

---

## API

L'API REST est disponible sous `/api/v1/`.

### Authentification

```bash
# Login
POST /api/v1/auth/login
{ "email": "user@example.com", "password": "password" }

# Signup
POST /api/v1/auth/signup
{ "email": "...", "password": "...", "username": "..." }

# Utilisation du token
Authorization: Bearer <token>
```

### Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/users` | Liste utilisateurs |
| GET | `/api/v1/users/me` | Profil connecté |
| GET | `/api/v1/projects` | Liste projets |
| POST | `/api/v1/projects/:id/join` | Rejoindre un projet |
| GET | `/api/v1/posts/feed` | Feed personnalisé |
| GET | `/api/v1/matching/projects` | Projets recommandés |
| GET | `/api/v1/analytics/platform` | Stats plateforme |

Pour la documentation API complète, voir [docs/API.md](docs/API.md).

---

## Tests

```bash
# Tous les tests
bundle exec rspec

# Par catégorie
bundle exec rspec spec/models/
bundle exec rspec spec/services/
bundle exec rspec spec/requests/

# Avec documentation
bundle exec rspec --format documentation
```

**Couverture actuelle** : 395+ exemples (50+ fichiers specs)

---

## Roadmap

### Version 0.8 (En cours)
- [ ] Corriger les tests cassés
- [ ] Finaliser OAuth GitHub/GitLab
- [ ] Ajouter les emails transactionnels

### Version 1.0 (Production)
- [ ] Système de paiements Stripe
- [ ] Déploiement production (Render/Railway)
- [ ] CI/CD avec GitHub Actions
- [ ] Monitoring (Sentry + New Relic)

### Futur
- [ ] Application mobile (React Native ou Flutter)
- [ ] GraphQL API
- [ ] Video chat intégré
- [ ] Workspaces entreprise

---

## Contribuer

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Committez vos changements (`git commit -m 'Add amazing feature'`)
4. Push sur la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

---

## License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">

**NexP** - Développé avec ❤️ par [greegs0](https://github.com/greegs0)

*Dernière mise à jour : 2 février 2026*

</div>
