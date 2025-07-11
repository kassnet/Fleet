# Script PowerShell d'installation FacturApp pour Windows
# Exécuter avec : PowerShell -ExecutionPolicy Bypass -File install_windows.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     Installation FacturApp Windows     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Vérifier les privilèges administrateur
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ Ce script doit être exécuté en tant qu'administrateur!" -ForegroundColor Red
    Write-Host "Clic droit → Exécuter en tant qu'administrateur" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

# Fonction pour vérifier les prérequis
function Check-Prerequisite {
    param($Command, $Name, $InstallUrl)
    
    try {
        $null = Get-Command $Command -ErrorAction Stop
        Write-Host "✅ $Name installé" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ $Name non installé" -ForegroundColor Red
        Write-Host "   Téléchargez depuis: $InstallUrl" -ForegroundColor Yellow
        return $false
    }
}

Write-Host "`n🔍 Vérification des prérequis..." -ForegroundColor Blue

$prerequisites = @()
$prerequisites += Check-Prerequisite "node" "Node.js" "https://nodejs.org"
$prerequisites += Check-Prerequisite "python" "Python" "https://python.org"
$prerequisites += Check-Prerequisite "mongod" "MongoDB" "https://mongodb.com/try/download/community"
$prerequisites += Check-Prerequisite "git" "Git" "https://git-scm.com"

if ($prerequisites -contains $false) {
    Write-Host "`n❌ Veuillez installer les outils manquants avant de continuer." -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "`n✅ Tous les prérequis sont installés!" -ForegroundColor Green

# Démarrer MongoDB
Write-Host "`n🍃 Démarrage de MongoDB..." -ForegroundColor Blue
try {
    Start-Service MongoDB -ErrorAction Stop
    Write-Host "✅ MongoDB démarré" -ForegroundColor Green
} catch {
    Write-Host "⚠️  MongoDB ne peut pas être démarré comme service" -ForegroundColor Yellow
    Write-Host "   Assurez-vous que MongoDB est installé correctement" -ForegroundColor Yellow
}

# Attendre que MongoDB soit prêt
Write-Host "⏳ Attente de MongoDB (5 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Initialiser la base de données
Write-Host "`n💾 Initialisation de la base de données..." -ForegroundColor Blue
if (Test-Path "init_database.js") {
    try {
        $result = mongosh --quiet --file init_database.js 2>&1
        Write-Host "✅ Base de données initialisée!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Erreur lors de l'initialisation - les données par défaut seront créées au démarrage" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Fichier init_database.js non trouvé - les données par défaut seront créées au démarrage" -ForegroundColor Yellow
}

# Configuration Backend
Write-Host "`n🐍 Configuration du Backend..." -ForegroundColor Blue
if (Test-Path "backend") {
    Set-Location "backend"
    
    # Créer l'environnement virtuel
    python -m venv venv
    
    # Activer l'environnement virtuel et installer les dépendances
    & "venv\Scripts\Activate.ps1"
    pip install -r requirements.txt
    
    # Créer le fichier .env
    @"
MONGO_URL=mongodb://localhost:27017
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Set-Location ".."
    Write-Host "✅ Backend configuré!" -ForegroundColor Green
} else {
    Write-Host "❌ Dossier backend non trouvé!" -ForegroundColor Red
}

# Configuration Frontend
Write-Host "`n⚛️  Configuration du Frontend..." -ForegroundColor Blue
if (Test-Path "frontend") {
    Set-Location "frontend"
    
    # Créer le fichier .env
    @"
REACT_APP_BACKEND_URL=http://localhost:8001
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    # Installer les dépendances
    npm install
    
    Set-Location ".."
    Write-Host "✅ Frontend configuré!" -ForegroundColor Green
} else {
    Write-Host "❌ Dossier frontend non trouvé!" -ForegroundColor Red
}

# Créer les scripts de démarrage
Write-Host "`n📝 Création des scripts de démarrage..." -ForegroundColor Blue

# Script Backend
@"
@echo off
echo Démarrage du Backend FacturApp...
cd backend
call venv\Scripts\activate.bat
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
pause
"@ | Out-File -FilePath "start_backend.bat" -Encoding ASCII

# Script Frontend
@"
@echo off
echo Démarrage du Frontend FacturApp...
cd frontend
npm start
pause
"@ | Out-File -FilePath "start_frontend.bat" -Encoding ASCII

# Script complet
@"
@echo off
title FacturApp - Système de Gestion de Facturation
echo ========================================
echo      FacturApp - Démarrage
echo ========================================
echo.
echo Démarrage des services...
echo.

echo 🐍 Démarrage du Backend...
start "FacturApp Backend" /min start_backend.bat

echo ⏳ Attente du backend (10 secondes)...
timeout /t 10 /nobreak >nul

echo ⚛️  Démarrage du Frontend...
start "FacturApp Frontend" start_frontend.bat

echo.
echo ========================================
echo ✅ FacturApp est en cours de démarrage!
echo ========================================
echo.
echo 🌐 URLs d'accès:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8001
echo   API Docs: http://localhost:8001/docs
echo.
echo 🔐 Comptes de test:
echo   Admin:     admin@facturapp.rdc / admin123
echo   Manager:   manager@demo.com / manager123
echo   Comptable: comptable@demo.com / comptable123
echo   Utilisateur: user@demo.com / user123
echo.
echo Fermez cette fenêtre une fois l'application démarrée.
echo.
pause
"@ | Out-File -FilePath "start_facturapp.bat" -Encoding ASCII

# Script d'arrêt
@"
@echo off
echo Arrêt de FacturApp...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1
echo FacturApp arrêté.
pause
"@ | Out-File -FilePath "stop_facturapp.bat" -Encoding ASCII

Write-Host "✅ Scripts de démarrage créés!" -ForegroundColor Green

# Créer un raccourci sur le bureau
Write-Host "`n🖥️  Création du raccourci..." -ForegroundColor Blue
try {
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\FacturApp.lnk")
    $Shortcut.TargetPath = "$PWD\start_facturapp.bat"
    $Shortcut.WorkingDirectory = $PWD
    $Shortcut.Description = "FacturApp - Système de Gestion de Facturation"
    $Shortcut.Save()
    Write-Host "✅ Raccourci créé sur le bureau!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Impossible de créer le raccourci" -ForegroundColor Yellow
}

# Résumé final
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ Installation terminée avec succès!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n🚀 Pour démarrer FacturApp:" -ForegroundColor White
Write-Host "   1. Double-cliquez sur le raccourci 'FacturApp' sur votre bureau" -ForegroundColor Yellow
Write-Host "   2. Ou double-cliquez sur 'start_facturapp.bat'" -ForegroundColor Yellow

Write-Host "`n🌐 URLs d'accès:" -ForegroundColor White
Write-Host "   • Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "   • Backend:  http://localhost:8001" -ForegroundColor Yellow
Write-Host "   • API Docs: http://localhost:8001/docs" -ForegroundColor Yellow

Write-Host "`n🔐 Comptes de test:" -ForegroundColor White
Write-Host "   • Admin:      admin@facturapp.rdc / admin123" -ForegroundColor Yellow
Write-Host "   • Manager:    manager@demo.com / manager123" -ForegroundColor Yellow
Write-Host "   • Comptable:  comptable@demo.com / comptable123" -ForegroundColor Yellow
Write-Host "   • Utilisateur: user@demo.com / user123" -ForegroundColor Yellow

Write-Host "`n📚 Fichiers créés:" -ForegroundColor White
Write-Host "   • start_facturapp.bat - Démarrer l'application" -ForegroundColor Yellow
Write-Host "   • stop_facturapp.bat  - Arrêter l'application" -ForegroundColor Yellow
Write-Host "   • start_backend.bat   - Démarrer seulement le backend" -ForegroundColor Yellow
Write-Host "   • start_frontend.bat  - Démarrer seulement le frontend" -ForegroundColor Yellow

Write-Host "`n🎉 FacturApp est prêt à être utilisé!" -ForegroundColor Green

Read-Host "`nAppuyez sur Entrée pour quitter"