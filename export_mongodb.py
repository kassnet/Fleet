#!/usr/bin/env python3
"""
Script d'export des données MongoDB vers JSON pour migration vers Laravel + MySQL
"""

import json
import os
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import uuid

# Configuration MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.billing_app

# Fonction pour convertir ObjectId en string
def convert_objectid(doc):
    if doc is None:
        return None
    if isinstance(doc, ObjectId):
        return str(doc)
    elif isinstance(doc, dict):
        return {k: convert_objectid(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [convert_objectid(item) for item in doc]
    elif isinstance(doc, datetime):
        return doc.isoformat()
    else:
        return doc

async def export_collection(collection_name, output_file):
    """Export une collection MongoDB vers un fichier JSON"""
    print(f"📦 Export de la collection '{collection_name}'...")
    
    collection = db[collection_name]
    documents = []
    
    async for doc in collection.find():
        # Convertir ObjectId en string et générer UUID si nécessaire
        doc = convert_objectid(doc)
        
        # Générer un UUID si pas d'ID existant
        if not doc.get('id'):
            doc['id'] = str(uuid.uuid4())
        
        # Assurer la cohérence des dates
        for field in ['date_creation', 'date_echeance', 'date_paiement', 'date_expiration', 'date_acceptation']:
            if field in doc and doc[field]:
                if isinstance(doc[field], str):
                    try:
                        doc[field] = datetime.fromisoformat(doc[field].replace('Z', '+00:00')).isoformat()
                    except:
                        pass
        
        documents.append(doc)
    
    # Sauvegarder vers fichier JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(documents, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Collection '{collection_name}' exportée -> {output_file} ({len(documents)} documents)")
    return len(documents)

async def main():
    """Fonction principale d'export"""
    print("🚀 DÉBUT DE L'EXPORT DES DONNÉES MONGODB")
    print("=" * 50)
    
    # Créer le dossier d'export
    export_dir = '/app/migration_data'
    os.makedirs(export_dir, exist_ok=True)
    
    # Collections à exporter
    collections = [
        'users',
        'clients', 
        'produits',
        'factures',
        'paiements',
        'devis',
        'opportunites',
        'commandes',
        'mouvements_stock',
        'taux_change'
    ]
    
    total_documents = 0
    
    for collection_name in collections:
        output_file = f"{export_dir}/{collection_name}.json"
        try:
            count = await export_collection(collection_name, output_file)
            total_documents += count
        except Exception as e:
            print(f"❌ Erreur lors de l'export de '{collection_name}': {e}")
    
    print("\n" + "=" * 50)
    print(f"🎉 EXPORT TERMINÉ - {total_documents} documents exportés")
    print(f"📁 Fichiers sauvegardés dans: {export_dir}")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())