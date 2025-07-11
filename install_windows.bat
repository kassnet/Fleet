@echo off
REM Script d'installation FacturApp pour Windows
REM Exécutez ce script en tant qu'administrateur

echo ========================================
echo Installation FacturApp pour Windows
echo ========================================

REM Vérifier les privilèges administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Ce script doit être execute en tant qu'administrateur!
    pause
    exit /b 1
)

echo Verification des prerequis...

REM Vérifier Node.js
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe!
    echo Telechargez et installez Node.js depuis https://nodejs.org
    pause
    exit /b 1
)

REM Vérifier Python
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Python n'est pas installe!
    echo Telechargez et installez Python depuis https://python.org
    pause
    exit /b 1
)

REM Vérifier MongoDB
mongod --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: MongoDB n'est pas installe!
    echo Telechargez et installez MongoDB depuis https://mongodb.com
    pause
    exit /b 1
)

echo ✅ Tous les prerequis sont installes!

REM Démarrer MongoDB si pas déjà démarré
echo Demarrage de MongoDB...
net start MongoDB >nul 2>&1

REM Attendre que MongoDB soit prêt
timeout /t 5 /nobreak >nul

REM Créer la base de données
echo Initialisation de la base de donnees...
if exist init_database.js (
    mongosh < init_database.js
    if %errorLevel% equ 0 (
        echo ✅ Base de donnees initialisee avec succes!
    ) else (
        echo ⚠️  Erreur lors de l'initialisation de la base de donnees
    )
) else (
    echo ⚠️  Fichier init_database.js non trouve - utilisation des donnees par defaut
)

REM Installation Backend
echo Configuration du backend...
if exist backend (
    cd backend
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    
    REM Créer le fichier .env
    echo MONGO_URL=mongodb://localhost:27017 > .env
    echo SECRET_KEY=your-secret-key-change-this-in-production >> .env
    echo ALGORITHM=HS256 >> .env
    echo ACCESS_TOKEN_EXPIRE_MINUTES=30 >> .env
    
    cd ..
    echo ✅ Backend configure!
) else (
    echo ❌ Dossier backend non trouve!
)

REM Installation Frontend
echo Configuration du frontend...
if exist frontend (
    cd frontend
    
    REM Créer le fichier .env
    echo REACT_APP_BACKEND_URL=http://localhost:8001 > .env
    
    npm install
    if %errorLevel% equ 0 (
        echo ✅ Frontend configure!
    ) else (
        echo ❌ Erreur lors de l'installation des dependances frontend
    )
    cd ..
) else (
    echo ❌ Dossier frontend non trouve!
)

REM Créer les scripts de démarrage
echo Creation des scripts de demarrage...

REM Script de démarrage backend
echo @echo off > start_backend.bat
echo cd backend >> start_backend.bat
echo call venv\Scripts\activate.bat >> start_backend.bat
echo python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload >> start_backend.bat

REM Script de démarrage frontend
echo @echo off > start_frontend.bat
echo cd frontend >> start_frontend.bat
echo npm start >> start_frontend.bat

REM Script pour démarrer les deux
echo @echo off > start_all.bat
echo echo Demarrage de FacturApp... >> start_all.bat
echo start "FacturApp Backend" start_backend.bat >> start_all.bat
echo timeout /t 5 /nobreak >nul >> start_all.bat
echo start "FacturApp Frontend" start_frontend.bat >> start_all.bat
echo echo FacturApp demarre! >> start_all.bat
echo echo Frontend: http://localhost:3000 >> start_all.bat
echo echo Backend: http://localhost:8001 >> start_all.bat

echo ========================================
echo ✅ Installation terminee avec succes!
echo ========================================
echo.
echo Pour demarrer FacturApp:
echo   1. Double-cliquez sur 'start_all.bat'
echo   2. Ou executez manuellement:
echo      - Backend: start_backend.bat
echo      - Frontend: start_frontend.bat
echo.
echo Acces a l'application:
echo   - Frontend: http://localhost:3000
echo   - Backend API: http://localhost:8001
echo   - Documentation: http://localhost:8001/docs
echo.
echo Comptes de test:
echo   - Admin: admin@facturapp.rdc / admin123
echo   - Manager: manager@demo.com / manager123
echo   - Comptable: comptable@demo.com / comptable123
echo   - Utilisateur: user@demo.com / user123
echo.
pause