# 📦 Guide de Déploiement - FacturApp

## 🎯 Vue d'ensemble
Ce guide vous explique comment installer FacturApp en local et le déployer sur votre serveur VPS.

## 📋 Prérequis

### Pour installation locale :
- **Node.js** (v18 ou supérieur)
- **Python** (v3.8 ou supérieur)
- **MongoDB** (v4.4 ou supérieur)
- **Git**

### Pour déploiement VPS :
- **Ubuntu/Debian** VPS
- **Domaine configuré** (optionnel)
- **SSL/TLS** (Let's Encrypt)

---

## 🏠 PARTIE 1 : Installation Locale

### 1. Cloner le projet
```bash
git clone <votre-repo-url>
cd facturapp
```

### 2. Installer MongoDB localement

#### Sur Ubuntu/Debian :
```bash
# Importer la clé GPG
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Ajouter le repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Installer MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Démarrer MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Sur macOS :
```bash
# Avec Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Sur Windows :
- Télécharger MongoDB Community Server depuis [mongodb.com](https://www.mongodb.com/try/download/community)
- Installer et démarrer le service

### 3. Restaurer la base de données
```bash
# Extraire l'archive de la base de données
tar -xzf factural_database_export.tar.gz

# Restaurer dans MongoDB local
mongorestore --db billing_app database_export/billing_app/

# Vérifier la restauration
mongo
use billing_app
db.users.find()
db.clients.find()
db.produits.find()
```

### 4. Configuration Backend

#### Créer le fichier `.env` :
```bash
# /backend/.env
MONGO_URL=mongodb://localhost:27017
SECRET_KEY=votre-secret-key-super-secure
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### Installer les dépendances :
```bash
cd backend
pip install -r requirements.txt
```

#### Démarrer le backend :
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 5. Configuration Frontend

#### Créer le fichier `.env` :
```bash
# /frontend/.env
REACT_APP_BACKEND_URL=http://localhost:8001
```

#### Installer les dépendances :
```bash
cd frontend
npm install
# ou
yarn install
```

#### Démarrer le frontend :
```bash
npm start
# ou
yarn start
```

### 6. Accès à l'application locale
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8001
- **Comptes de test** :
  - Admin : admin@facturapp.rdc / admin123
  - Manager : manager@demo.com / manager123
  - Comptable : comptable@demo.com / comptable123

---

## 🚀 PARTIE 2 : Déploiement sur VPS

### 1. Préparation du serveur

#### Connexion et mise à jour :
```bash
ssh root@votre-serveur-ip
apt update && apt upgrade -y
```

#### Installation des dépendances :
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Python et pip
apt-get install -y python3 python3-pip python3-venv

# MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# Nginx
apt-get install -y nginx

# PM2 pour gérer les processus
npm install -g pm2

# Certbot pour SSL
apt-get install -y certbot python3-certbot-nginx
```

#### Créer un utilisateur pour l'application :
```bash
useradd -m -s /bin/bash facturapp
usermod -aG sudo facturapp
su - facturapp
```

### 2. Déploiement de l'application

#### Cloner le code :
```bash
cd /home/facturapp
git clone <votre-repo-url> facturapp
cd facturapp
```

#### Transférer et restaurer la base de données :
```bash
# Transférer le fichier depuis votre machine locale
scp factural_database_export.tar.gz facturapp@votre-serveur-ip:/home/facturapp/

# Sur le serveur
tar -xzf factural_database_export.tar.gz
mongorestore --db billing_app database_export/billing_app/
```

#### Configuration Backend :
```bash
cd /home/facturapp/facturapp/backend

# Créer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Créer le fichier .env
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF
```

#### Configuration Frontend :
```bash
cd /home/facturapp/facturapp/frontend

# Créer le fichier .env
cat > .env << EOF
REACT_APP_BACKEND_URL=https://votre-domaine.com/api
EOF

# Installer les dépendances
npm install

# Builder l'application
npm run build
```

### 3. Configuration PM2

#### Créer le fichier ecosystem.config.js :
```bash
cat > /home/facturapp/facturapp/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'facturapp-backend',
      script: 'venv/bin/uvicorn',
      args: 'server:app --host 0.0.0.0 --port 8001',
      cwd: '/home/facturapp/facturapp/backend',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'facturapp-frontend',
      script: 'serve',
      args: '-s build -l 3000',
      cwd: '/home/facturapp/facturapp/frontend',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF
```

#### Installer serve et démarrer les applications :
```bash
npm install -g serve
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Configuration Nginx

#### Créer la configuration Nginx :
```bash
sudo cat > /etc/nginx/sites-available/facturapp << 'EOF'
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

    # Redirection vers HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    # SSL Configuration (sera configuré par Certbot)
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Gestion des fichiers statiques
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
EOF
```

#### Activer la configuration :
```bash
sudo ln -s /etc/nginx/sites-available/facturapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL avec Let's Encrypt

```bash
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

### 6. Configuration du Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### 7. Automatisation des sauvegardes

#### Créer un script de sauvegarde :
```bash
cat > /home/facturapp/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/facturapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/facturapp_backup_$DATE.tar.gz"

# Créer le répertoire de sauvegarde
mkdir -p $BACKUP_DIR

# Sauvegarde MongoDB
mongodump --db billing_app --out $BACKUP_DIR/temp_$DATE/

# Compresser la sauvegarde
tar -czf $BACKUP_FILE $BACKUP_DIR/temp_$DATE/

# Nettoyer le répertoire temporaire
rm -rf $BACKUP_DIR/temp_$DATE/

# Garder seulement les 7 dernières sauvegardes
find $BACKUP_DIR -name "facturapp_backup_*.tar.gz" -mtime +7 -delete

echo "Sauvegarde terminée: $BACKUP_FILE"
EOF

chmod +x /home/facturapp/backup_db.sh
```

#### Programmation avec cron :
```bash
crontab -e
# Ajouter cette ligne pour une sauvegarde quotidienne à 2h du matin
0 2 * * * /home/facturapp/backup_db.sh
```

---

## 🔧 Maintenance et Monitoring

### Commandes utiles :

#### Vérifier l'état des services :
```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status mongod
```

#### Redémarrer les services :
```bash
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart mongod
```

#### Voir les logs :
```bash
pm2 logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/mongodb/mongod.log
```

#### Mettre à jour l'application :
```bash
cd /home/facturapp/facturapp
git pull origin main
cd backend && source venv/bin/activate && pip install -r requirements.txt
cd ../frontend && npm install && npm run build
pm2 restart all
```

---

## 🛡️ Sécurité

### Recommandations :
1. **Changez tous les mots de passe par défaut**
2. **Configurez un firewall strict**
3. **Activez la surveillance des logs**
4. **Mettez à jour régulièrement le système**
5. **Configurez des sauvegardes automatiques**

### Surveillance :
```bash
# Installer htop pour surveiller le système
sudo apt-get install htop

# Surveiller l'utilisation des ressources
htop
```

---

## 📞 Support

En cas de problème :
1. Vérifiez les logs avec `pm2 logs`
2. Vérifiez l'état des services avec `pm2 status`
3. Consultez les logs Nginx : `/var/log/nginx/error.log`
4. Consultez les logs MongoDB : `/var/log/mongodb/mongod.log`

---

## 🎉 Félicitations !

Votre application FacturApp est maintenant déployée et prête à être utilisée !

**Accès :** https://votre-domaine.com
**Comptes de test :**
- Admin : admin@facturapp.rdc / admin123
- Manager : manager@demo.com / manager123
- Comptable : comptable@demo.com / comptable123