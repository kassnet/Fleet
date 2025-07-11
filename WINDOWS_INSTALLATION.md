# 🪟 Guide d'Installation FacturApp - Windows

Ce guide est spécialement conçu pour Windows (local) et Windows Server (VPS).

## 📋 Prérequis Windows

### Outils nécessaires :
- **Node.js** (v18+) - https://nodejs.org/en/download/
- **Python** (v3.8+) - https://www.python.org/downloads/windows/
- **MongoDB** - https://www.mongodb.com/try/download/community
- **Git** - https://git-scm.com/download/win
- **Docker Desktop** (optionnel) - https://docs.docker.com/desktop/windows/

## 🗃️ Récupération de la Base de Données

### Option 1 : Exportation depuis l'environnement actuel

Puisque vous ne pouvez pas télécharger directement le fichier, voici comment récupérer les données :

#### Méthode A : Export MongoDB direct
Connectez-vous à votre base MongoDB actuelle et exportez :

```bash
# Si vous avez accès à la base actuelle
mongodump --host <host-actuel> --port 27017 --db billing_app --out ./database_backup

# Compresser pour Windows
tar -czf factural_database_export.tar.gz database_backup/
```

#### Méthode B : Reconstruction automatique
L'application peut recréer les données de démonstration automatiquement au premier démarrage.

## 🏠 Installation Locale Windows

### 1. Installer MongoDB sur Windows

#### Téléchargement et Installation :
1. Aller sur https://www.mongodb.com/try/download/community
2. Télécharger MongoDB Community Server pour Windows
3. Exécuter l'installateur et suivre les instructions
4. **Important** : Cocher "Install MongoDB as a Service"

#### Démarrer MongoDB :
```cmd
# Ouvrir PowerShell en tant qu'administrateur
net start MongoDB

# Ou via les services Windows
services.msc → MongoDB → Démarrer
```

#### Vérifier l'installation :
```cmd
# Ouvrir une nouvelle invite de commande
mongosh
# Si ça marche, MongoDB est installé correctement
exit
```

### 2. Installer Python

1. Télécharger Python depuis https://www.python.org/downloads/windows/
2. **Important** : Cocher "Add Python to PATH" lors de l'installation
3. Vérifier : `python --version` dans cmd

### 3. Installer Node.js

1. Télécharger depuis https://nodejs.org/en/download/
2. Installer avec les paramètres par défaut
3. Vérifier : `node --version` et `npm --version` dans cmd

### 4. Cloner et Configurer le Projet

```cmd
# Ouvrir PowerShell ou cmd
git clone <votre-repo-url>
cd facturapp

# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Créer le fichier .env
echo MONGO_URL=mongodb://localhost:27017 > .env
echo SECRET_KEY=your-secret-key-change-this >> .env
echo ALGORITHM=HS256 >> .env
echo ACCESS_TOKEN_EXPIRE_MINUTES=30 >> .env
```

### 5. Configurer le Frontend

```cmd
# Nouveau terminal, dans le dossier du projet
cd frontend

# Créer le fichier .env
echo REACT_APP_BACKEND_URL=http://localhost:8001 > .env

# Installer les dépendances
npm install
```

### 6. Démarrer l'Application

```cmd
# Terminal 1 - Backend
cd backend
venv\Scripts\activate
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend
npm start
```

## 🌍 Déploiement Windows Server VPS

### 1. Préparation Windows Server

#### Installation des outils :
1. **IIS** (Internet Information Services)
2. **Node.js** via https://nodejs.org
3. **Python** via https://www.python.org
4. **MongoDB** via https://www.mongodb.com

#### Via PowerShell (en tant qu'administrateur) :
```powershell
# Installer Chocolatey (gestionnaire de paquets Windows)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# Installer les outils
choco install nodejs python mongodb git -y

# Redémarrer PowerShell après installation
```

### 2. Configuration IIS comme Reverse Proxy

#### Installer IIS et modules nécessaires :
```powershell
# Activer IIS
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All

# Installer URL Rewrite et Application Request Routing
# Télécharger depuis Microsoft IIS downloads
```

#### Configuration IIS (web.config) :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- Redirection API vers backend -->
                <rule name="API" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:8001/api/{R:1}" />
                </rule>
                
                <!-- Frontend React -->
                <rule name="Frontend" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="http://localhost:3000/{R:0}" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

### 3. Configuration des Services Windows

#### Créer des services pour Backend et Frontend :

**Backend Service (backend.bat) :**
```batch
@echo off
cd /d "C:\inetpub\wwwroot\facturapp\backend"
call venv\Scripts\activate
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

**Frontend Service (frontend.bat) :**
```batch
@echo off
cd /d "C:\inetpub\wwwroot\facturapp\frontend"
npm run build
npx serve -s build -l 3000
```

#### Utiliser NSSM pour créer des services Windows :
```cmd
# Télécharger NSSM : https://nssm.cc/download
# Installer les services
nssm install FacturAppBackend "C:\path\to\backend.bat"
nssm install FacturAppFrontend "C:\path\to\frontend.bat"

# Démarrer les services
net start FacturAppBackend
net start FacturAppFrontend
```

### 4. Configuration SSL avec IIS

1. **Obtenir un certificat SSL** (Let's Encrypt, CloudFlare, ou acheté)
2. **Importer le certificat** dans IIS
3. **Configurer HTTPS binding** sur le port 443
4. **Forcer HTTPS** avec une règle de redirection

### 5. Configuration du Firewall Windows

```powershell
# Ouvrir les ports nécessaires
New-NetFirewallRule -DisplayName "FacturApp HTTP" -Direction Inbound -Protocol TCP -LocalPort 80
New-NetFirewallRule -DisplayName "FacturApp HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443
New-NetFirewallRule -DisplayName "MongoDB" -Direction Inbound -Protocol TCP -LocalPort 27017
```

## 🛠️ Scripts PowerShell d'Installation

### Script d'installation automatique (install.ps1) :
```powershell
# Installation automatique FacturApp Windows
Write-Host "Installation FacturApp pour Windows..." -ForegroundColor Green

# Vérifier si lancé en tant qu'administrateur
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Ce script doit être exécuté en tant qu'administrateur!" -ForegroundColor Red
    exit 1
}

# Installer Chocolatey si nécessaire
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installation de Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
}

# Installer les dépendances
Write-Host "Installation des dépendances..."
choco install nodejs python mongodb git -y

# Créer les répertoires
$appPath = "C:\FacturApp"
New-Item -ItemType Directory -Force -Path $appPath

# Clone du projet (à adapter avec votre repo)
Set-Location $appPath
git clone <votre-repo-url> .

# Configuration Backend
Set-Location "$appPath\backend"
python -m venv venv
& "$appPath\backend\venv\Scripts\activate.ps1"
pip install -r requirements.txt

# Configuration Frontend
Set-Location "$appPath\frontend"
npm install
npm run build

# Démarrer MongoDB
net start MongoDB

Write-Host "Installation terminée!" -ForegroundColor Green
Write-Host "Démarrez les services avec les scripts batch créés." -ForegroundColor Yellow
```

## 🔧 Dépannage Windows

### Problèmes courants :

#### 1. MongoDB ne démarre pas
```cmd
# Vérifier le service
sc query MongoDB

# Redémarrer le service
net stop MongoDB
net start MongoDB

# Vérifier les logs
# Logs dans : C:\Program Files\MongoDB\Server\X.X\log\
```

#### 2. Python/Node.js non reconnu
```cmd
# Ajouter au PATH manuellement
# Panneau de configuration → Système → Variables d'environnement
# Ajouter les chemins :
# C:\Users\[User]\AppData\Local\Programs\Python\Python3X\
# C:\Program Files\nodejs\
```

#### 3. Ports bloqués
```powershell
# Vérifier les ports en écoute
netstat -an | findstr :3000
netstat -an | findstr :8001

# Libérer un port si nécessaire
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
```

## 📞 Support Windows

### Outils de diagnostic :
- **Event Viewer** : `eventvwr.msc`
- **Services** : `services.msc`
- **Task Manager** : `taskmgr`
- **Resource Monitor** : `resmon`

### Commandes utiles :
```cmd
# Vérifier les services
sc query FacturAppBackend
sc query FacturAppFrontend

# Redémarrer IIS
iisreset

# Vérifier la connectivité
telnet localhost 3000
telnet localhost 8001
```

---

## 🎯 Prochaines Étapes

1. **Installer** tous les prérequis sur votre machine Windows
2. **Configurer** l'environnement de développement local
3. **Tester** l'application localement
4. **Préparer** le déploiement sur Windows Server
5. **Configurer** IIS et les services Windows

**Pour la base de données, l'application peut recréer les données de démonstration automatiquement au premier démarrage !**