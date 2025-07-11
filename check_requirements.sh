#!/bin/bash

# Script de vérification des prérequis pour FacturApp
# Ce script vérifie que tous les outils nécessaires sont installés

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Variables
MISSING_TOOLS=()
WARNINGS=()

echo -e "${BLUE}🔍 Vérification des prérequis pour FacturApp${NC}"
echo "=================================================="

# Vérifier Node.js
print_info "Vérification de Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_status "Node.js $NODE_VERSION (OK)"
    else
        print_warning "Node.js $NODE_VERSION (Version 18+ recommandée)"
        WARNINGS+=("Node.js version < 18")
    fi
else
    print_error "Node.js n'est pas installé"
    MISSING_TOOLS+=("Node.js")
fi

# Vérifier npm
print_info "Vérification de npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "npm $NPM_VERSION (OK)"
else
    print_error "npm n'est pas installé"
    MISSING_TOOLS+=("npm")
fi

# Vérifier yarn
print_info "Vérification de yarn..."
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn --version)
    print_status "yarn $YARN_VERSION (OK)"
else
    print_warning "yarn n'est pas installé (optionnel mais recommandé)"
    WARNINGS+=("yarn non installé")
fi

# Vérifier Python
print_info "Vérification de Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_status "$PYTHON_VERSION (OK)"
else
    print_error "Python 3 n'est pas installé"
    MISSING_TOOLS+=("Python 3")
fi

# Vérifier pip
print_info "Vérification de pip..."
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version)
    print_status "pip3 $(echo $PIP_VERSION | cut -d' ' -f2) (OK)"
else
    print_error "pip3 n'est pas installé"
    MISSING_TOOLS+=("pip3")
fi

# Vérifier MongoDB
print_info "Vérification de MongoDB..."
if command -v mongod &> /dev/null; then
    MONGO_VERSION=$(mongod --version | grep "db version" | cut -d' ' -f3)
    print_status "MongoDB $MONGO_VERSION (OK)"
else
    print_error "MongoDB n'est pas installé"
    MISSING_TOOLS+=("MongoDB")
fi

# Vérifier Docker
print_info "Vérification de Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | sed 's/,//')
    print_status "Docker $DOCKER_VERSION (OK)"
else
    print_warning "Docker n'est pas installé (optionnel pour le déploiement)"
    WARNINGS+=("Docker non installé")
fi

# Vérifier Docker Compose
print_info "Vérification de Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | sed 's/,//')
    print_status "Docker Compose $COMPOSE_VERSION (OK)"
else
    print_warning "Docker Compose n'est pas installé (optionnel pour le déploiement)"
    WARNINGS+=("Docker Compose non installé")
fi

# Vérifier Git
print_info "Vérification de Git..."
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    print_status "Git $GIT_VERSION (OK)"
else
    print_error "Git n'est pas installé"
    MISSING_TOOLS+=("Git")
fi

# Vérifier les ports
print_info "Vérification des ports..."
check_port() {
    local port=$1
    local service=$2
    
    if netstat -an 2>/dev/null | grep ":$port " | grep -q LISTEN; then
        print_warning "Port $port ($service) est déjà utilisé"
        WARNINGS+=("Port $port occupé")
    else
        print_status "Port $port ($service) disponible"
    fi
}

check_port 3000 "Frontend"
check_port 8001 "Backend"
check_port 27017 "MongoDB"

# Vérifier l'espace disque
print_info "Vérification de l'espace disque..."
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    print_warning "Espace disque faible ($DISK_USAGE% utilisé)"
    WARNINGS+=("Espace disque < 10%")
else
    print_status "Espace disque OK ($DISK_USAGE% utilisé)"
fi

# Vérifier la mémoire
print_info "Vérification de la mémoire..."
if command -v free &> /dev/null; then
    MEMORY_MB=$(free -m | awk 'NR==2{print $2}')
    if [ "$MEMORY_MB" -lt 1024 ]; then
        print_warning "Mémoire faible (${MEMORY_MB}MB, 1GB+ recommandé)"
        WARNINGS+=("Mémoire < 1GB")
    else
        print_status "Mémoire OK (${MEMORY_MB}MB)"
    fi
else
    print_info "Impossible de vérifier la mémoire"
fi

echo ""
echo "=================================================="
echo -e "${BLUE}📋 Résumé de la vérification${NC}"
echo "=================================================="

# Afficher les outils manquants
if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Outils manquants (requis):${NC}"
    for tool in "${MISSING_TOOLS[@]}"; do
        echo "   - $tool"
    done
    echo ""
fi

# Afficher les avertissements
if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Avertissements:${NC}"
    for warning in "${WARNINGS[@]}"; do
        echo "   - $warning"
    done
    echo ""
fi

# Instructions d'installation
if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo -e "${BLUE}📚 Instructions d'installation:${NC}"
    echo ""
    
    for tool in "${MISSING_TOOLS[@]}"; do
        case $tool in
            "Node.js")
                echo "🟢 Node.js:"
                echo "   Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
                echo "   macOS: brew install node"
                echo "   Windows: https://nodejs.org/en/download/"
                ;;
            "Python 3")
                echo "🐍 Python 3:"
                echo "   Ubuntu/Debian: sudo apt-get install python3 python3-pip"
                echo "   macOS: brew install python3"
                echo "   Windows: https://python.org/downloads/"
                ;;
            "MongoDB")
                echo "🍃 MongoDB:"
                echo "   Ubuntu/Debian: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/"
                echo "   macOS: brew tap mongodb/brew && brew install mongodb-community"
                echo "   Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/"
                ;;
            "Git")
                echo "🌿 Git:"
                echo "   Ubuntu/Debian: sudo apt-get install git"
                echo "   macOS: brew install git"
                echo "   Windows: https://git-scm.com/download/win"
                ;;
        esac
        echo ""
    done
fi

# Conclusion
if [ ${#MISSING_TOOLS[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 Tous les outils requis sont installés!${NC}"
    echo -e "${GREEN}Vous pouvez maintenant installer et démarrer FacturApp.${NC}"
    echo ""
    echo "Commandes suivantes:"
    echo "   1. git clone <votre-repo>"
    echo "   2. cd facturapp"
    echo "   3. ./deploy.sh local"
    exit 0
else
    echo -e "${RED}❌ Veuillez installer les outils manquants avant de continuer.${NC}"
    exit 1
fi