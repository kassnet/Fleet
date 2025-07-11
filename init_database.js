# Script d'initialisation MongoDB pour Windows
# Sauvegardez ce fichier sous : init_database.js

// Base de données FacturApp
use billing_app;

// ===== UTILISATEURS =====
db.users.deleteMany({});
db.users.insertMany([
  {
    "id": "0d5386b7-3b9a-43be-8651-c2937d41be94",
    "email": "admin@facturapp.rdc",
    "nom": "Administrateur",
    "prenom": "Système",
    "role": "admin",
    "is_active": true,
    "hashed_password": "$2b$12$ZyMPxRDlrJmwM5KjAb9RDeu8MrOJpAkK1d1DwV84LNX1ChLGauGtS",
    "date_creation": new Date(),
    "derniere_connexion": null
  },
  {
    "id": "c6a55aae-d38f-4a53-b959-16b8f088dd90",
    "email": "manager@demo.com",
    "nom": "Manager",
    "prenom": "Demo",
    "role": "manager",
    "is_active": true,
    "hashed_password": "$2b$12$3qzuv6vFlKvAkWNIryAx1Ovc6XwJIGokmUps68PNHe16Cm8PJqByy",
    "date_creation": new Date(),
    "derniere_connexion": null
  },
  {
    "id": "b4849ccf-b305-4189-b013-8e99d520786d",
    "email": "comptable@demo.com",
    "nom": "Comptable",
    "prenom": "Demo",
    "role": "comptable",
    "is_active": true,
    "hashed_password": "$2b$12$ncjH0phFcjTsZ7BelMN4jOfQ9ItZoQcnDEiIOOBmDQ5Ji2HU73/vu",
    "date_creation": new Date(),
    "derniere_connexion": null
  },
  {
    "id": "046f7699-900f-45a9-8af2-134330f07f95",
    "email": "user@demo.com",
    "nom": "Utilisateur",
    "prenom": "Demo",
    "role": "utilisateur",
    "is_active": true,
    "hashed_password": "$2b$12$KyZkH7ISFAnT0EEqFNRu.ezXE8p4M.Ta7smW.ajYw6NWFzcvodosa",
    "date_creation": new Date(),
    "derniere_connexion": null
  }
]);

// ===== CLIENTS =====
db.clients.deleteMany({});
db.clients.insertMany([
  {
    "id": "client1-uuid-demo",
    "nom": "Entreprise ABC",
    "email": "contact@abc.com",
    "telephone": "+243 81 234 5678",
    "adresse": "Avenue de la Libération 123",
    "ville": "Kinshasa",
    "code_postal": "12345",
    "pays": "RDC",
    "devise_preferee": "USD",
    "date_creation": new Date()
  },
  {
    "id": "client2-uuid-demo",
    "nom": "SARL Congo Digital",
    "email": "info@congodigital.cd",
    "telephone": "+243 99 876 5432",
    "adresse": "Boulevard du 30 Juin 456",
    "ville": "Lubumbashi",
    "code_postal": "54321",
    "pays": "RDC",
    "devise_preferee": "FC",
    "date_creation": new Date()
  }
]);

// ===== PRODUITS =====
db.produits.deleteMany({});
db.produits.insertMany([
  {
    "id": "produit1-uuid-demo",
    "nom": "Développement site web",
    "description": "Création de site web sur mesure",
    "prix_usd": 2500.0,
    "prix_fc": 7000000.0,
    "unite": "projet",
    "tva": 16.0,
    "actif": true,
    "gestion_stock": false,
    "date_creation": new Date()
  },
  {
    "id": "produit2-uuid-demo",
    "nom": "Maintenance mensuelle",
    "description": "Maintenance et mise à jour du site",
    "prix_usd": 150.0,
    "prix_fc": 420000.0,
    "unite": "mois",
    "tva": 16.0,
    "actif": true,
    "gestion_stock": false,
    "date_creation": new Date()
  },
  {
    "id": "produit3-uuid-demo",
    "nom": "Formation utilisateur",
    "description": "Formation à l'utilisation du site",
    "prix_usd": 80.0,
    "prix_fc": 224000.0,
    "unite": "heure",
    "tva": 16.0,
    "actif": true,
    "gestion_stock": true,
    "stock_actuel": 50,
    "stock_minimum": 10,
    "stock_maximum": 100,
    "date_creation": new Date()
  },
  {
    "id": "produit4-uuid-demo",
    "nom": "Ordinateur portable",
    "description": "Ordinateur portable Dell Inspiron",
    "prix_usd": 800.0,
    "prix_fc": 2240000.0,
    "unite": "unité",
    "tva": 16.0,
    "actif": true,
    "gestion_stock": true,
    "stock_actuel": 25,
    "stock_minimum": 5,
    "stock_maximum": 50,
    "date_creation": new Date()
  }
]);

// ===== TAUX DE CHANGE =====
db.taux_change.deleteMany({});
db.taux_change.insertOne({
  "id": "taux-uuid-demo",
  "devise_base": "USD",
  "devise_cible": "FC",
  "taux": 2800.0,
  "date_creation": new Date(),
  "actif": true
});

// ===== CONFIGURATION =====
db.app_config.deleteMany({});
db.app_config.insertMany([
  {
    "id": "app-name-config",
    "key": "app_name",
    "value": "FacturApp",
    "description": "Nom de l'application",
    "date_creation": new Date()
  },
  {
    "id": "logo-config",
    "key": "logo_url",
    "value": "/logo.png",
    "description": "URL du logo de l'application",
    "date_creation": new Date()
  }
]);

print("✅ Base de données FacturApp initialisée avec succès!");
print("📊 Données créées:");
print("   - " + db.users.count() + " utilisateurs");
print("   - " + db.clients.count() + " clients");
print("   - " + db.produits.count() + " produits");
print("   - " + db.taux_change.count() + " taux de change");
print("   - " + db.app_config.count() + " éléments de configuration");
print("");
print("🔐 Comptes de test:");
print("   - Admin: admin@facturapp.rdc / admin123");
print("   - Manager: manager@demo.com / manager123");
print("   - Comptable: comptable@demo.com / comptable123");
print("   - Utilisateur: user@demo.com / user123");