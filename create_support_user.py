#!/usr/bin/env python3
"""
Script pour créer l'utilisateur support@facturapp.rdc
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
import uuid
import os

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_support_user():
    """Créer l'utilisateur support"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.billing_app
    
    # Vérifier si l'utilisateur existe déjà
    existing_user = await db.users.find_one({"email": "support@facturapp.rdc"})
    if existing_user:
        print("👤 Utilisateur support@facturapp.rdc existe déjà")
        return
    
    # Créer l'utilisateur support
    support_user = {
        "id": str(uuid.uuid4()),
        "email": "support@facturapp.rdc",
        "nom": "Support",
        "prenom": "FacturApp",
        "role": "support",
        "is_active": True,
        "hashed_password": pwd_context.hash("support123"),
        "date_creation": datetime.utcnow(),
        "derniere_connexion": None
    }
    
    await db.users.insert_one(support_user)
    print("✅ Utilisateur support@facturapp.rdc créé avec succès")
    print("   Email: support@facturapp.rdc")
    print("   Mot de passe: support123")
    print("   Rôle: support")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_support_user())