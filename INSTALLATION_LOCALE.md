# 🏠 Guide d'Importation et Installation Locale - FacturApp

Ce guide vous explique étape par étape comment installer FacturApp sur votre machine locale avec toutes les données existantes.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir les outils suivants installés :

- **Node.js** v18+ et npm
- **Python** 3.8+ et pip
- **MongoDB** 4.4+
- **Git**

Vous pouvez vérifier vos prérequis avec :
```bash
./check_requirements.sh
```

## 🗂️ Fichiers fournis

Vous devriez avoir reçu les fichiers suivants :

1. **`factural_database_export.tar.gz`** - Sauvegarde complète de la base de données
2. **Code source complet** - Tous les fichiers du projet
3. **Scripts de déploiement** - Scripts automatisés pour l'installation

## 🚀 Installation Rapide (Méthode Docker)

### 1. Télécharger les fichiers
```bash
# Créer un répertoire pour le projet
mkdir facturapp-local
cd facturapp-local

# Extraire tous les fichiers du projet (assurez-vous d'avoir tous les fichiers)
# Le projet devrait contenir :
# - backend/
# - frontend/
# - factural_database_export.tar.gz
# - docker-compose.yml
# - deploy.sh
# - etc.
```

### 2. Lancer l'installation automatique
```bash
# Rendre le script exécutable
chmod +x deploy.sh

# Démarrer avec Docker (le plus simple)
./deploy.sh local
```

Cette commande va :
- ✅ Extraire automatiquement la base de données
- ✅ Créer les variables d'environnement
- ✅ Construire et démarrer tous les services
- ✅ Importer les données dans MongoDB

### 3. Accéder à l'application

Une fois l'installation terminée :

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8001
- **Documentation API** : http://localhost:8001/docs

## 🔧 Installation Manuelle (Sans Docker)

Si vous préférez installer manuellement ou si Docker n'est pas disponible :

### 1. Installer et démarrer MongoDB

#### Ubuntu/Debian :
```bash
# Installer MongoDB
sudo apt-get update
sudo apt-get install -y mongodb

# Ou installer la version Community
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Démarrer MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### macOS :
```bash
# Avec Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Windows :
- Télécharger depuis https://www.mongodb.com/try/download/community
- Installer et démarrer le service

### 2. Restaurer la base de données

```bash
# Extraire la sauvegarde
tar -xzf factural_database_export.tar.gz

# Importer dans MongoDB
mongorestore --db billing_app database_export/billing_app/

# Vérifier l'importation
mongosh
use billing_app
db.users.find()
db.clients.find()
exit
```

### 3. Configurer le Backend

```bash
cd backend

# Créer un environnement virtuel Python
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Créer le fichier .env
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
SECRET_KEY=your-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF

# Démarrer le backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 4. Configurer le Frontend

```bash
# Nouveau terminal
cd frontend

# Créer le fichier .env
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Installer les dépendances
npm install
# ou
yarn install

# Démarrer le frontend
npm start
# ou
yarn start
```

## 🔐 Comptes de Test

Une fois l'application démarrée, vous pouvez vous connecter avec :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **Admin** | admin@facturapp.rdc | admin123 |
| **Manager** | manager@demo.com | manager123 |
| **Comptable** | comptable@demo.com | comptable123 |
| **Utilisateur** | user@demo.com | user123 |

## 📊 Données Importées

La base de données contient :

- **2 clients** de démonstration
- **4 produits** avec gestion de stock
- **Plusieurs factures** avec différents statuts
- **Devis** de test
- **Paiements** simulés
- **4 utilisateurs** avec différents rôles
- **Configuration** de taux de change (2800 FC = 1 USD)

## 🔧 Dépannage

### Problèmes courants :

#### 1. MongoDB ne démarre pas
```bash
# Vérifier le statut
sudo systemctl status mongod

# Redémarrer MongoDB
sudo systemctl restart mongod

# Vérifier les logs
sudo tail -f /var/log/mongodb/mongod.log
```

#### 2. Port déjà utilisé
```bash
# Vérifier les ports occupés
netstat -an | grep :3000
netstat -an | grep :8001

# Tuer les processus si nécessaire
kill -9 $(lsof -ti:3000)
kill -9 $(lsof -ti:8001)
```

#### 3. Erreur de dépendances Python
```bash
# Mettre à jour pip
pip install --upgrade pip

# Installer les dépendances une par une
pip install fastapi uvicorn pymongo motor python-multipart
```

#### 4. Erreur de dépendances Node.js
```bash
# Nettoyer le cache
npm cache clean --force

# Supprimer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install
```

## 🔄 Mise à jour

Pour mettre à jour l'application :

```bash
# Sauvegarder les données actuelles
./backup.sh

# Mettre à jour le code
git pull origin main

# Redémarrer avec Docker
./deploy.sh local

# Ou manuellement
cd backend && source venv/bin/activate && pip install -r requirements.txt
cd ../frontend && npm install
```

## 📚 Documentation Supplémentaire

- **API Documentation** : http://localhost:8001/docs
- **Guide de déploiement** : [deployment_guide.md](deployment_guide.md)
- **README complet** : [README.md](README.md)

## 📞 Support

En cas de problème :

1. Vérifiez les logs : `docker-compose logs -f`
2. Consultez le dépannage ci-dessus
3. Vérifiez que tous les services sont démarrés
4. Assurez-vous que les ports 3000 et 8001 sont libres

## 🎉 Félicitations !

Vous avez maintenant FacturApp installé localement avec toutes les données !

**Prochaines étapes :**
1. Explorez l'interface avec les comptes de test
2. Créez vos propres clients, produits et factures
3. Configurez les paramètres selon vos besoins
4. Préparez le déploiement sur votre serveur VPS

---

**Temps d'installation estimé :** 15-30 minutes selon votre configuration