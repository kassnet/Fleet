#!/bin/bash

# Script de déploiement automatique pour FacturApp
# Usage: ./deploy.sh [local|production]

MODE=${1:-local}

echo "🚀 Déploiement FacturApp en mode: $MODE"

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

# Vérifier les prérequis
check_requirements() {
    print_status "Vérification des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    print_status "Prérequis OK"
}

# Préparer l'environnement
prepare_environment() {
    print_status "Préparation de l'environnement..."
    
    # Créer le fichier .env s'il n'existe pas
    if [ ! -f .env ]; then
        print_warning "Création du fichier .env"
        cat > .env << EOF
SECRET_KEY=$(openssl rand -hex 32)
MONGO_URL=mongodb://mongodb:27017
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF
    fi
    
    # Extraire la base de données si nécessaire
    if [ ! -d "database_export" ] && [ -f "factural_database_export.tar.gz" ]; then
        print_status "Extraction de la base de données..."
        tar -xzf factural_database_export.tar.gz
    fi
    
    print_status "Environnement préparé"
}

# Déploiement local
deploy_local() {
    print_status "Déploiement en mode local..."
    
    # Arrêter les conteneurs existants
    docker-compose down
    
    # Construire et démarrer les services
    docker-compose up --build -d
    
    print_status "Déploiement local terminé"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend API: http://localhost:8001"
}

# Déploiement production
deploy_production() {
    print_status "Déploiement en mode production..."
    
    # Arrêter les conteneurs existants
    docker-compose -f docker-compose.prod.yml down
    
    # Construire et démarrer les services
    docker-compose -f docker-compose.prod.yml up --build -d
    
    print_status "Déploiement production terminé"
}

# Fonction principale
main() {
    echo "🏁 Début du déploiement FacturApp"
    
    check_requirements
    prepare_environment
    
    case $MODE in
        "local")
            deploy_local
            ;;
        "production")
            deploy_production
            ;;
        *)
            print_error "Mode invalide. Utilisez 'local' ou 'production'"
            exit 1
            ;;
    esac
    
    echo ""
    print_status "🎉 Déploiement terminé avec succès!"
    echo ""
    echo "📚 Comptes de test:"
    echo "   - Admin: admin@facturapp.rdc / admin123"
    echo "   - Manager: manager@demo.com / manager123"
    echo "   - Comptable: comptable@demo.com / comptable123"
    echo ""
    echo "🔧 Commandes utiles:"
    echo "   - Voir les logs: docker-compose logs -f"
    echo "   - Arrêter: docker-compose down"
    echo "   - Redémarrer: docker-compose restart"
}

# Exécuter le script
main