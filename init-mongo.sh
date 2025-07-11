#!/bin/bash

# Script d'initialisation MongoDB pour FacturApp
# Ce script sera exécuté automatiquement lors du premier démarrage de MongoDB

echo "🔧 Initialisation de la base de données FacturApp..."

# Attendre que MongoDB soit prêt
until mongosh --eval "db.adminCommand('ismaster')" &> /dev/null; do
    echo "⏳ Attente de MongoDB..."
    sleep 1
done

echo "✅ MongoDB est prêt"

# Importer les données si elles existent
if [ -d "/docker-entrypoint-initdb.d/database_export/billing_app" ]; then
    echo "📥 Importation des données de sauvegarde..."
    
    # Utiliser mongorestore pour importer les données
    mongorestore --db billing_app /docker-entrypoint-initdb.d/database_export/billing_app/
    
    echo "✅ Données importées avec succès"
else
    echo "ℹ️ Aucune sauvegarde trouvée, utilisation des données par défaut"
fi

echo "🎉 Initialisation terminée"