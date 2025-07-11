#!/bin/bash

# Script de sauvegarde FacturApp
# Ce script sauvegarde la base de données MongoDB et les fichiers de configuration

# Configuration
BACKUP_DIR="/backup/facturapp"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="facturapp_backup_$DATE"
MONGO_DB="billing_app"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher des messages colorés
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Créer le répertoire de sauvegarde
mkdir -p "$BACKUP_DIR"

print_status "Début de la sauvegarde FacturApp - $DATE"

# Sauvegarde MongoDB
print_status "Sauvegarde de la base de données MongoDB..."
mongodump --db "$MONGO_DB" --out "$BACKUP_DIR/$BACKUP_NAME/"

if [ $? -eq 0 ]; then
    print_status "Sauvegarde MongoDB terminée"
else
    print_error "Échec de la sauvegarde MongoDB"
    exit 1
fi

# Sauvegarde des fichiers de configuration
print_status "Sauvegarde des fichiers de configuration..."
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/config"

# Copier les fichiers .env (sans les clés secrètes)
if [ -f "/app/backend/.env" ]; then
    cp "/app/backend/.env" "$BACKUP_DIR/$BACKUP_NAME/config/backend.env"
fi

if [ -f "/app/frontend/.env" ]; then
    cp "/app/frontend/.env" "$BACKUP_DIR/$BACKUP_NAME/config/frontend.env"
fi

# Copier docker-compose.yml
if [ -f "/app/docker-compose.yml" ]; then
    cp "/app/docker-compose.yml" "$BACKUP_DIR/$BACKUP_NAME/config/"
fi

# Compresser la sauvegarde
print_status "Compression de la sauvegarde..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME/"

if [ $? -eq 0 ]; then
    print_status "Compression terminée: $BACKUP_NAME.tar.gz"
    # Supprimer le répertoire non compressé
    rm -rf "$BACKUP_NAME/"
else
    print_error "Échec de la compression"
    exit 1
fi

# Nettoyage des anciennes sauvegardes (garder les 7 dernières)
print_status "Nettoyage des anciennes sauvegardes..."
find "$BACKUP_DIR" -name "facturapp_backup_*.tar.gz" -mtime +7 -delete

# Afficher la taille de la sauvegarde
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)
print_status "Sauvegarde terminée avec succès"
print_status "Fichier: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
print_status "Taille: $BACKUP_SIZE"

# Optionnel : Envoyer la sauvegarde vers un serveur distant
# rsync -av "$BACKUP_DIR/$BACKUP_NAME.tar.gz" user@remote-server:/backup/

print_status "🎉 Sauvegarde FacturApp terminée avec succès!"