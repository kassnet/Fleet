# 🧾 FacturApp - Système de Gestion de Facturation

**FacturApp** est un système complet de gestion de facturation développé en Python (FastAPI) et React, conçu spécialement pour les entreprises de la République Démocratique du Congo avec support multi-devises (USD/FC).

## 🚀 Fonctionnalités

### 💼 Gestion Commerciale
- **Gestion des clients** - Ajout, modification, suppression
- **Gestion des produits** - Avec support de stock automatique
- **Gestion des devis** - Création, suivi, conversion en factures
- **Gestion des opportunités** - Pipeline de ventes
- **Gestion des commandes** - Suivi des livraisons

### 🧾 Facturation
- **Création de factures** - Interface intuitive
- **Multi-devises** - Support USD/FC avec taux de change configurable
- **Calculs automatiques** - TTC, TVA, totaux
- **Simulation de paiement** - Intégration Stripe
- **Marquage manuel** - Factures payées en espèces

### 👥 Authentification & Rôles
- **4 niveaux d'accès** : Admin, Manager, Comptable, Utilisateur
- **JWT sécurisé** - Authentification robuste
- **Gestion des utilisateurs** - Interface d'administration

### 📊 Reporting & Analytics
- **Tableau de bord** - Statistiques en temps réel
- **Historique des paiements** - Suivi complet
- **Gestion des stocks** - Alerts stock bas

### 🎨 Interface Moderne
- **Design responsive** - Mobile-friendly
- **Thème sombre/clair** - Confort visuel
- **Notifications** - Système moderne de notifications
- **Multi-langue** - Support français/anglais

## 🛠️ Technologies

### Backend
- **FastAPI** - Framework API moderne et rapide
- **MongoDB** - Base de données NoSQL
- **JWT** - Authentification sécurisée
- **Pydantic** - Validation des données
- **Stripe** - Processeur de paiements

### Frontend
- **React 19** - Interface utilisateur moderne
- **TailwindCSS** - Styling rapide et responsive
- **Axios** - Client HTTP
- **React Router** - Navigation

### DevOps
- **Docker** - Containerisation
- **Nginx** - Reverse proxy
- **PM2** - Gestionnaire de processus
- **Let's Encrypt** - SSL gratuit

## 📦 Installation Rapide

### Option 1 : Docker (Recommandé)
```bash
# Cloner le projet
git clone <votre-repo>
cd facturapp

# Démarrer avec Docker
./deploy.sh local

# Accéder à l'application
# Frontend: http://localhost:3000
# Backend: http://localhost:8001
```

### Option 2 : Installation manuelle
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --port 8001

# Frontend
cd frontend
npm install
npm start
```

## 🔐 Comptes de Test

| Rôle | Email | Mot de passe | Permissions |
|------|-------|--------------|-------------|
| **Admin** | admin@facturapp.rdc | admin123 | Accès complet |
| **Manager** | manager@demo.com | manager123 | Gestion commerciale |
| **Comptable** | comptable@demo.com | comptable123 | Facturation et paiements |
| **Utilisateur** | user@demo.com | user123 | Consultation |

## 🌍 Déploiement VPS

### Prérequis
- Ubuntu/Debian VPS
- Nom de domaine
- Accès root

### Déploiement automatique
```bash
# Cloner sur le serveur
git clone <votre-repo>
cd facturapp

# Exécuter le script de déploiement
sudo ./deploy.sh production

# Configurer SSL
sudo certbot --nginx -d votre-domaine.com
```

### Configuration manuelle
Consultez le fichier [deployment_guide.md](deployment_guide.md) pour les instructions détaillées.

## 📁 Structure du Projet

```
facturapp/
├── backend/                 # API FastAPI
│   ├── server.py           # Serveur principal
│   ├── requirements.txt    # Dépendances Python
│   └── .env               # Variables d'environnement
├── frontend/               # Application React
│   ├── src/
│   │   ├── App.js         # Composant principal
│   │   └── components/    # Composants réutilisables
│   ├── package.json       # Dépendances Node.js
│   └── .env              # Variables d'environnement
├── database_export/        # Sauvegarde MongoDB
├── docker-compose.yml     # Configuration Docker
├── deployment_guide.md    # Guide de déploiement
└── README.md             # Ce fichier
```

## 🔧 Configuration

### Variables d'environnement Backend
```env
MONGO_URL=mongodb://localhost:27017
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Variables d'environnement Frontend
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 📊 API Documentation

L'API est automatiquement documentée via FastAPI :
- **Swagger UI** : http://localhost:8001/docs
- **ReDoc** : http://localhost:8001/redoc

### Endpoints principaux
- `POST /api/auth/login` - Connexion utilisateur
- `GET /api/clients` - Liste des clients
- `POST /api/factures` - Création de facture
- `GET /api/devis` - Liste des devis
- `POST /api/devis/{id}/convertir-facture` - Conversion devis→facture

## 🧪 Tests

### Tests Backend
```bash
cd backend
python -m pytest tests/
```

### Tests Frontend
```bash
cd frontend
npm test
```

## 📈 Monitoring

### Logs avec Docker
```bash
# Voir tous les logs
docker-compose logs -f

# Logs spécifiques
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Monitoring avec PM2
```bash
# Statut des services
pm2 status

# Logs en temps réel
pm2 logs

# Monitoring web
pm2 web
```

## 🔒 Sécurité

### Bonnes pratiques implémentées
- ✅ Authentification JWT sécurisée
- ✅ Validation des données avec Pydantic
- ✅ CORS configuré correctement
- ✅ Variables d'environnement sécurisées
- ✅ Hashage des mots de passe (bcrypt)

### Recommandations pour production
- 🔐 Changez tous les mots de passe par défaut
- 🔥 Configurez un firewall (ufw)
- 🔄 Mettez à jour régulièrement le système
- 📦 Utilisez des sauvegardes automatiques
- 🚨 Surveillez les logs d'erreur

## 🔄 Sauvegarde et Restauration

### Sauvegarde automatique
```bash
# Créer une sauvegarde
./backup.sh

# Programmer des sauvegardes quotidiennes
crontab -e
0 2 * * * /chemin/vers/backup.sh
```

### Restauration
```bash
# Restaurer depuis une sauvegarde
mongorestore --db billing_app backup/billing_app/
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## 📞 Support

### Problèmes courants
- **MongoDB connexion** : Vérifiez que MongoDB est démarré
- **Port 3000/8001 occupé** : Changez les ports dans docker-compose.yml
- **Erreur CORS** : Vérifiez REACT_APP_BACKEND_URL

### Obtenir de l'aide
1. Consultez les [issues GitHub](https://github.com/votre-repo/issues)
2. Créez une nouvelle issue avec :
   - Description du problème
   - Étapes pour reproduire
   - Logs d'erreur
   - Environnement (OS, versions)

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🎯 Roadmap

### Version 1.1
- [ ] Export PDF des factures
- [ ] Envoi automatique d'emails
- [ ] Intégration mobile money
- [ ] Rapports avancés

### Version 1.2
- [ ] Multi-entreprises
- [ ] API mobile
- [ ] Intégration comptable
- [ ] Dashboard avancé

## 🏆 Remerciements

- **FastAPI** - Framework backend moderne
- **React** - Bibliothèque frontend
- **TailwindCSS** - Framework CSS
- **MongoDB** - Base de données NoSQL
- **Stripe** - Processeur de paiements

---

**FacturApp** - Développé avec ❤️ pour les entreprises de la RDC