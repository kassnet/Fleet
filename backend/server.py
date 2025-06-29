from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient
import json
from bson import ObjectId
from passlib.context import CryptContext
from jose import jwt, JWTError
import secrets

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

app = FastAPI(title="Application de Facturation", description="Application de facturation pour freelances avec authentification")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB client
client = AsyncIOMotorClient(MONGO_URL)
db = client.billing_app

# Taux de change par défaut
TAUX_CHANGE = {
    "USD_TO_FC": 2800.0,
    "FC_TO_USD": 1.0 / 2800.0
}

# Models
class Client(BaseModel):
    id: Optional[str] = None
    nom: str
    email: EmailStr
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    pays: str = "RDC"
    devise_preferee: str = "USD"  # USD ou FC
    date_creation: Optional[datetime] = None

class Produit(BaseModel):
    id: Optional[str] = None
    nom: str
    description: Optional[str] = None
    prix_usd: float
    prix_fc: Optional[float] = None
    unite: str = "unité"
    tva: float = 20.0
    actif: bool = True
    # Gestion des stocks
    gestion_stock: bool = False
    stock_actuel: Optional[int] = None
    stock_minimum: Optional[int] = None
    stock_maximum: Optional[int] = None
    date_creation: Optional[datetime] = None

class MouvementStock(BaseModel):
    id: Optional[str] = None
    produit_id: str
    type_mouvement: str  # "entree", "sortie", "correction"
    quantite: int
    stock_avant: int
    stock_après: int
    motif: Optional[str] = None
    date_mouvement: Optional[datetime] = None

class LigneFacture(BaseModel):
    produit_id: str
    nom_produit: str
    quantite: float
    prix_unitaire_usd: float
    prix_unitaire_fc: float
    devise: str  # USD ou FC
    tva: float
    total_ht_usd: float
    total_ht_fc: float
    total_ttc_usd: float
    total_ttc_fc: float

class Facture(BaseModel):
    id: Optional[str] = None
    numero: Optional[str] = None
    client_id: str
    client_nom: str
    client_email: str
    client_adresse: Optional[str] = None
    devise: str = "USD"  # Devise principale de la facture
    lignes: List[LigneFacture]
    total_ht_usd: float
    total_ht_fc: float
    total_tva_usd: float
    total_tva_fc: float
    total_ttc_usd: float
    total_ttc_fc: float
    statut: str = "brouillon"  # brouillon, envoyee, payee, annulee
    date_creation: Optional[datetime] = None
    date_echeance: Optional[datetime] = None
    date_paiement: Optional[datetime] = None
    notes: Optional[str] = None

class Paiement(BaseModel):
    id: Optional[str] = None
    facture_id: str
    facture_numero: str
    montant_usd: float
    montant_fc: float
    devise_paiement: str
    methode_paiement: str = "stripe"  # stripe, cash, bank_transfer
    statut: str = "pending"  # pending, completed, failed, cancelled
    transaction_id: Optional[str] = None
    date_paiement: Optional[datetime] = None
    notes: Optional[str] = None

class TauxChange(BaseModel):
    id: Optional[str] = None
    devise_base: str = "USD"
    devise_cible: str = "FC"
    taux: float
    date_creation: Optional[datetime] = None
    actif: bool = True

class StatsResponse(BaseModel):
    total_clients: int
    total_produits: int
    total_factures: int
    ca_mensuel_usd: float
    ca_mensuel_fc: float
    ca_annuel_usd: float
    ca_annuel_fc: float
    factures_impayees: int
    montant_impaye_usd: float
    montant_impaye_fc: float
    produits_stock_bas: int
    taux_change_actuel: float

# Authentication Models
class User(BaseModel):
    id: Optional[str] = None
    email: EmailStr
    nom: str
    prenom: str
    role: str = "utilisateur"  # admin, manager, utilisateur, comptable
    is_active: bool = True
    hashed_password: Optional[str] = None  # Ne sera pas retourné dans les réponses
    date_creation: Optional[datetime] = None
    derniere_connexion: Optional[datetime] = None

class UserCreate(BaseModel):
    email: EmailStr
    nom: str
    prenom: str
    password: str
    role: str = "utilisateur"

class UserUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

# Helper functions
def generate_invoice_number():
    return f"FACT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

def convertir_devise(montant: float, devise_source: str, devise_cible: str, taux: float = None) -> float:
    """Convertit un montant d'une devise à une autre"""
    if devise_source == devise_cible:
        return montant
    
    if not taux:
        taux = TAUX_CHANGE.get(f"{devise_source}_TO_{devise_cible}", 1.0)
    
    return round(montant * taux, 2)

# Authentication helper functions
def hash_password(password: str) -> str:
    """Hash un mot de passe"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crée un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    """Décode un token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

async def get_user_by_email(email: str):
    """Récupère un utilisateur par email"""
    user = await db.users.find_one({"email": email})
    if user:
        user["id"] = str(user["_id"]) if "_id" in user else user.get("id")
        if "_id" in user:
            del user["_id"]
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Récupère l'utilisateur actuel à partir du token"""
    try:
        token = credentials.credentials
        payload = decode_token(token)
        
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalide",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalide",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = await get_user_by_email(email)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Utilisateur non trouvé",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Utilisateur inactif"
            )
        
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )

def check_permissions(required_roles: List[str]):
    """Décorateur pour vérifier les permissions"""
    def permission_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role", "utilisateur")
        
        # Admin a tous les droits
        if user_role == "admin":
            return current_user
            
        # Vérifier si le rôle est autorisé
        if user_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes"
            )
        
        return current_user
    return permission_checker

# Fonctions helper pour les permissions spécifiques
def admin_only():
    """Seuls les admins peuvent accéder"""
    return check_permissions(["admin"])

def manager_and_admin():
    """Managers et admins peuvent accéder"""
    return check_permissions(["admin", "manager"])

def comptable_manager_admin():
    """Comptables, managers et admins peuvent accéder"""
    return check_permissions(["admin", "manager", "comptable"])

def all_authenticated():
    """Tous les utilisateurs authentifiés peuvent accéder"""
    return check_permissions(["admin", "manager", "comptable", "utilisateur"])

def calculer_prix_produit(prix_base: float, devise_base: str, devise_cible: str, taux: float = None) -> float:
    """Calcule le prix d'un produit dans la devise cible"""
    return convertir_devise(prix_base, devise_base, devise_cible, taux)

async def mettre_a_jour_stock(produit_id: str, quantite_vendue: float, motif: str = "vente"):
    """Met à jour le stock d'un produit et enregistre le mouvement"""
    produit = await db.produits.find_one({"id": produit_id})
    if not produit or not produit.get("gestion_stock", False):
        return
    
    stock_avant = produit.get("stock_actuel", 0)
    nouveau_stock = max(0, stock_avant - int(quantite_vendue))
    
    # Mettre à jour le stock du produit
    await db.produits.update_one(
        {"id": produit_id},
        {"$set": {"stock_actuel": nouveau_stock}}
    )
    
    # Enregistrer le mouvement de stock
    mouvement = {
        "id": str(uuid.uuid4()),
        "produit_id": produit_id,
        "type_mouvement": "sortie",
        "quantite": int(quantite_vendue),
        "stock_avant": stock_avant,
        "stock_après": nouveau_stock,
        "motif": motif,
        "date_mouvement": datetime.now()
    }
    
    await db.mouvements_stock.insert_one(mouvement)

async def init_demo_data():
    """Initialise des données de démonstration"""
    # Nettoyer et réinitialiser les données pour corriger les erreurs
    await db.clients.delete_many({})
    await db.produits.delete_many({})
    await db.factures.delete_many({})
    await db.taux_change.delete_many({})
    
    # Taux de change par défaut
    taux_change = {
        "id": str(uuid.uuid4()),
        "devise_base": "USD",
        "devise_cible": "FC",
        "taux": 2800.0,
        "date_creation": datetime.now(),
        "actif": True
    }
    await db.taux_change.insert_one(taux_change)
    
    # Clients de démonstration
    demo_clients = [
        {
            "id": str(uuid.uuid4()),
            "nom": "Entreprise ABC",
            "email": "contact@abc.com",
            "telephone": "+243 81 234 5678",
            "adresse": "Avenue de la Libération 123",
            "ville": "Kinshasa",
            "code_postal": "12345",
            "pays": "RDC",
            "devise_preferee": "USD",
            "date_creation": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "nom": "SARL Congo Digital",
            "email": "info@congodigital.cd",
            "telephone": "+243 99 876 5432",
            "adresse": "Boulevard du 30 Juin 456",
            "ville": "Lubumbashi",
            "code_postal": "54321",
            "pays": "RDC",
            "devise_preferee": "FC",
            "date_creation": datetime.now()
        }
    ]
    
    # Produits de démonstration avec stock
    demo_produits = [
        {
            "id": str(uuid.uuid4()),
            "nom": "Développement site web",
            "description": "Création de site web sur mesure",
            "prix_usd": 2500.0,
            "prix_fc": 7000000.0,
            "unite": "projet",
            "tva": 16.0,
            "actif": True,
            "gestion_stock": False,
            "date_creation": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "nom": "Maintenance mensuelle",
            "description": "Maintenance et mise à jour du site",
            "prix_usd": 150.0,
            "prix_fc": 420000.0,
            "unite": "mois",
            "tva": 16.0,
            "actif": True,
            "gestion_stock": False,
            "date_creation": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "nom": "Formation utilisateur",
            "description": "Formation à l'utilisation du site",
            "prix_usd": 80.0,
            "prix_fc": 224000.0,
            "unite": "heure",
            "tva": 16.0,
            "actif": True,
            "gestion_stock": True,
            "stock_actuel": 50,
            "stock_minimum": 10,
            "stock_maximum": 100,
            "date_creation": datetime.now()
        },
        {
            "id": str(uuid.uuid4()),
            "nom": "Ordinateur portable",
            "description": "Ordinateur portable Dell Inspiron",
            "prix_usd": 800.0,
            "prix_fc": 2240000.0,
            "unite": "unité",
            "tva": 16.0,
            "actif": True,
            "gestion_stock": True,
            "stock_actuel": 25,
            "stock_minimum": 5,
            "stock_maximum": 50,
            "date_creation": datetime.now()
        }
    ]
    
    await db.clients.insert_many(demo_clients)
    await db.produits.insert_many(demo_produits)

@app.on_event("startup")
async def startup_event():
    await init_demo_data()
    await init_admin_user()

async def init_admin_user():
    """Crée un utilisateur administrateur par défaut s'il n'existe pas"""
    admin_email = "admin@facturepro.rdc"
    existing_admin = await db.users.find_one({"email": admin_email})
    
    if not existing_admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "nom": "Administrateur",
            "prenom": "Système",
            "role": "admin",
            "is_active": True,
            "hashed_password": hash_password("admin123"),  # Mot de passe par défaut
            "date_creation": datetime.now(),
            "derniere_connexion": None
        }
        await db.users.insert_one(admin_user)
        print(f"✅ Utilisateur admin créé: {admin_email} / mot de passe: admin123")

# Routes d'authentification
@app.post("/api/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    """Connexion utilisateur"""
    user = await get_user_by_email(user_data.email)
    
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Compte utilisateur désactivé"
        )
    
    # Mettre à jour la dernière connexion
    await db.users.update_one(
        {"email": user_data.email},
        {"$set": {"derniere_connexion": datetime.now()}}
    )
    
    access_token = create_access_token(data={"sub": user["email"]})
    
    # Retourner le token avec les infos utilisateur (sans le mot de passe)
    user_info = {k: v for k, v in user.items() if k != "hashed_password"}
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_info
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Récupère les informations de l'utilisateur connecté"""
    user_info = {k: v for k, v in current_user.items() if k != "hashed_password"}
    return user_info

@app.post("/api/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Déconnexion utilisateur"""
    return {"message": "Déconnexion réussie"}

# Routes de gestion des utilisateurs (Admin seulement)
@app.post("/api/users", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(check_permissions(["admin"]))
):
    """Créer un nouvel utilisateur (Admin seulement)"""
    # Vérifier si l'email existe déjà
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec cet email existe déjà"
        )
    
    # Créer le nouvel utilisateur
    user_dict = user_data.dict()
    user_dict["id"] = str(uuid.uuid4())
    user_dict["hashed_password"] = hash_password(user_dict.pop("password"))
    user_dict["date_creation"] = datetime.now()
    user_dict["is_active"] = True
    user_dict["derniere_connexion"] = None
    
    await db.users.insert_one(user_dict)
    
    # Retourner l'utilisateur sans le mot de passe
    return User(**{k: v for k, v in user_dict.items() if k != "hashed_password"})

@app.get("/api/users", response_model=List[User])
async def get_users(current_user: dict = Depends(check_permissions(["admin"]))):
    """Récupérer tous les utilisateurs (Admin seulement)"""
    users = []
    async for user in db.users.find().sort("date_creation", -1):
        user["id"] = str(user["_id"]) if "_id" in user else user.get("id")
        if "_id" in user:
            del user["_id"]
        # Retirer le mot de passe hashé
        user_without_password = {k: v for k, v in user.items() if k != "hashed_password"}
        users.append(User(**user_without_password))
    return users

@app.get("/api/users/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    current_user: dict = Depends(check_permissions(["admin"]))
):
    """Récupérer un utilisateur par ID (Admin seulement)"""
    user = await db.users.find_one({"$or": [{"id": user_id}, {"_id": user_id}]})
    
    if not user:
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
        except:
            pass
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    user["id"] = str(user["_id"]) if "_id" in user else user.get("id")
    if "_id" in user:
        del user["_id"]
    
    # Retirer le mot de passe hashé
    user_without_password = {k: v for k, v in user.items() if k != "hashed_password"}
    return User(**user_without_password)

@app.put("/api/users/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: dict = Depends(check_permissions(["admin"]))
):
    """Mettre à jour un utilisateur (Admin seulement)"""
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune donnée à mettre à jour"
        )
    
    result = await db.users.update_one(
        {"$or": [{"id": user_id}, {"_id": user_id}]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        try:
            result = await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data}
            )
        except:
            pass
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Récupérer l'utilisateur mis à jour
    return await get_user(user_id, current_user)

@app.delete("/api/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(check_permissions(["admin"]))
):
    """Supprimer un utilisateur (Admin seulement)"""
    # Empêcher la suppression de son propre compte
    if user_id == current_user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas supprimer votre propre compte"
        )
    
    result = await db.users.delete_one({"$or": [{"id": user_id}, {"_id": user_id}]})
    
    if result.deleted_count == 0:
        try:
            result = await db.users.delete_one({"_id": ObjectId(user_id)})
        except:
            pass
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": "Utilisateur supprimé avec succès"}

@app.post("/api/auth/reset-password")
async def reset_password_request(reset_data: PasswordReset):
    """Demande de réinitialisation de mot de passe"""
    user = await get_user_by_email(reset_data.email)
    if not user:
        # Pour des raisons de sécurité, on ne révèle pas si l'email existe
        return {"message": "Si l'email existe, un lien de réinitialisation a été envoyé"}
    
    # Créer un token de réinitialisation (valide 1 heure)
    reset_token = create_access_token(
        data={"sub": user["email"], "type": "password_reset"},
        expires_delta=timedelta(hours=1)
    )
    
    # En production, vous enverriez cet email. Ici on le retourne pour demo
    print(f"🔐 Token de réinitialisation pour {reset_data.email}: {reset_token}")
    
    return {"message": "Si l'email existe, un lien de réinitialisation a été envoyé"}

@app.post("/api/auth/reset-password/confirm")
async def reset_password_confirm(reset_data: PasswordResetConfirm):
    """Confirmer la réinitialisation de mot de passe"""
    payload = decode_token(reset_data.token)
    
    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de réinitialisation invalide ou expiré"
        )
    
    email = payload.get("sub")
    user = await get_user_by_email(email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de réinitialisation invalide"
        )
    
    # Mettre à jour le mot de passe
    hashed_password = hash_password(reset_data.new_password)
    await db.users.update_one(
        {"email": email},
        {"$set": {"hashed_password": hashed_password}}
    )
    
    return {"message": "Mot de passe réinitialisé avec succès"}

# Routes Taux de change
@app.get("/api/taux-change", response_model=TauxChange)
async def get_taux_change():
    taux = await db.taux_change.find_one({"actif": True}, sort=[("date_creation", -1)])
    if not taux:
        # Créer un taux par défaut
        nouveau_taux = {
            "id": str(uuid.uuid4()),
            "devise_base": "USD",
            "devise_cible": "FC",
            "taux": 2800.0,
            "date_creation": datetime.now(),
            "actif": True
        }
        await db.taux_change.insert_one(nouveau_taux)
        taux = nouveau_taux
    
    taux["id"] = str(taux["_id"]) if "_id" in taux else taux.get("id")
    if "_id" in taux:
        del taux["_id"]
    return TauxChange(**taux)

@app.put("/api/taux-change", response_model=TauxChange)
async def update_taux_change(nouveau_taux: float):
    # Désactiver l'ancien taux
    await db.taux_change.update_many({"actif": True}, {"$set": {"actif": False}})
    
    # Créer le nouveau taux
    taux = {
        "id": str(uuid.uuid4()),
        "devise_base": "USD",
        "devise_cible": "FC",
        "taux": nouveau_taux,
        "date_creation": datetime.now(),
        "actif": True
    }
    
    await db.taux_change.insert_one(taux)
    
    # Mettre à jour le cache
    TAUX_CHANGE["USD_TO_FC"] = nouveau_taux
    TAUX_CHANGE["FC_TO_USD"] = 1.0 / nouveau_taux
    
    return TauxChange(**taux)

# Routes Clients (Manager et Admin)
@app.get("/api/clients", response_model=List[Client])
async def get_clients(current_user: dict = Depends(all_authenticated())):
    """Récupérer tous les clients - Tous les utilisateurs authentifiés"""
    clients = []
    async for client in db.clients.find():
        client["id"] = str(client["_id"]) if "_id" in client else client.get("id")
        if "_id" in client:
            del client["_id"]
        clients.append(Client(**client))
    return clients

@app.post("/api/clients", response_model=Client)
async def create_client(client: Client, current_user: dict = Depends(manager_and_admin())):
    """Créer un client - Manager et Admin uniquement"""
    client.id = str(uuid.uuid4())
    client.date_creation = datetime.now()
    client_dict = client.dict()
    await db.clients.insert_one(client_dict)
    return client

@app.put("/api/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client: Client, current_user: dict = Depends(manager_and_admin())):
    client.id = client_id
    client_dict = client.dict()
    if "_id" in client_dict:
        del client_dict["_id"]
    
    # Chercher par id ou _id
    result = await db.clients.update_one(
        {"$or": [{"id": client_id}, {"_id": client_id}]},
        {"$set": client_dict}
    )
    
    if result.matched_count == 0:
        # Si pas trouvé, essayer de convertir l'ID MongoDB
        try:
            from bson import ObjectId
            result = await db.clients.update_one(
                {"_id": ObjectId(client_id)},
                {"$set": client_dict}
            )
        except:
            pass
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    return client

@app.delete("/api/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(manager_and_admin())):
    """Supprimer un client - Manager et Admin uniquement"""
    # Chercher par id ou _id
    result = await db.clients.delete_one({"$or": [{"id": client_id}, {"_id": client_id}]})
    
    if result.deleted_count == 0:
        # Si pas trouvé, essayer de convertir l'ID MongoDB
        try:
            from bson import ObjectId
            result = await db.clients.delete_one({"_id": ObjectId(client_id)})
        except:
            pass
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    return {"message": "Client supprimé"}

# Routes Produits (Manager et Admin, sauf consultation pour tous)
@app.get("/api/produits", response_model=List[Produit])
async def get_produits(current_user: dict = Depends(all_authenticated())):
    """Récupérer tous les produits - Tous les utilisateurs authentifiés"""
    produits = []
    async for produit in db.produits.find():
        produit["id"] = str(produit["_id"]) if "_id" in produit else produit.get("id")
        if "_id" in produit:
            del produit["_id"]
        
        # Assurer la compatibilité avec les anciens produits
        if "prix_usd" not in produit and "prix" in produit:
            produit["prix_usd"] = produit["prix"]
        
        # Calculer le prix FC si pas défini
        if "prix_fc" not in produit or produit["prix_fc"] is None:
            if "prix_usd" in produit:
                produit["prix_fc"] = convertir_devise(produit["prix_usd"], "USD", "FC", TAUX_CHANGE["USD_TO_FC"])
            else:
                produit["prix_fc"] = 0
                
        # Assurer que prix_usd existe
        if "prix_usd" not in produit:
            produit["prix_usd"] = produit.get("prix", 0)
            
        produits.append(Produit(**produit))
    return produits

@app.get("/api/produits/{produit_id}", response_model=Produit)
async def get_produit(produit_id: str, current_user: dict = Depends(all_authenticated())):
    """Récupérer un produit - Tous les utilisateurs authentifiés"""
    produit = await db.produits.find_one({"id": produit_id})
    if not produit:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    produit["id"] = str(produit["_id"]) if "_id" in produit else produit.get("id")
    if "_id" in produit:
        del produit["_id"]
    
    # Assurer la compatibilité avec les anciens produits
    if "prix_usd" not in produit and "prix" in produit:
        produit["prix_usd"] = produit["prix"]
    
    # Calculer le prix FC si pas défini
    if "prix_fc" not in produit or produit["prix_fc"] is None:
        if "prix_usd" in produit:
            produit["prix_fc"] = convertir_devise(produit["prix_usd"], "USD", "FC", TAUX_CHANGE["USD_TO_FC"])
        else:
            produit["prix_fc"] = 0
            
    # Assurer que prix_usd existe
    if "prix_usd" not in produit:
        produit["prix_usd"] = produit.get("prix", 0)
    
    return Produit(**produit)

@app.post("/api/produits", response_model=Produit)
async def create_produit(produit: Produit, current_user: dict = Depends(manager_and_admin())):
    """Créer un produit - Manager et Admin uniquement"""
    produit.id = str(uuid.uuid4())
    produit.date_creation = datetime.now()
    
    # Calculer automatiquement le prix FC
    if produit.prix_fc is None:
        produit.prix_fc = convertir_devise(produit.prix_usd, "USD", "FC", TAUX_CHANGE["USD_TO_FC"])
    
    produit_dict = produit.dict()
    await db.produits.insert_one(produit_dict)
    return produit

@app.put("/api/produits/{produit_id}", response_model=Produit)
async def update_produit(produit_id: str, produit: Produit, current_user: dict = Depends(manager_and_admin())):
    """Modifier un produit - Manager et Admin uniquement"""
    produit.id = produit_id
    
    # Recalculer le prix FC
    if produit.prix_fc is None:
        produit.prix_fc = convertir_devise(produit.prix_usd, "USD", "FC", TAUX_CHANGE["USD_TO_FC"])
    
    produit_dict = produit.dict()
    if "_id" in produit_dict:
        del produit_dict["_id"]
    
    # Chercher par id ou _id
    result = await db.produits.update_one(
        {"$or": [{"id": produit_id}, {"_id": produit_id}]},
        {"$set": produit_dict}
    )
    
    if result.matched_count == 0:
        # Si pas trouvé, essayer de convertir l'ID MongoDB
        try:
            from bson import ObjectId
            result = await db.produits.update_one(
                {"_id": ObjectId(produit_id)},
                {"$set": produit_dict}
            )
        except:
            pass
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    return produit

@app.delete("/api/produits/{produit_id}")
async def delete_produit(produit_id: str, current_user: dict = Depends(manager_and_admin())):
    """Supprimer un produit - Manager et Admin uniquement"""
    # Chercher par id ou _id
    result = await db.produits.delete_one({"$or": [{"id": produit_id}, {"_id": produit_id}]})
    
    if result.deleted_count == 0:
        # Si pas trouvé, essayer de convertir l'ID MongoDB
        try:
            from bson import ObjectId
            result = await db.produits.delete_one({"_id": ObjectId(produit_id)})
        except:
            pass
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    return {"message": "Produit supprimé"}

# Gestion des stocks
@app.put("/api/produits/{produit_id}/stock")
async def update_stock(produit_id: str, request: dict, current_user: dict = Depends(manager_and_admin())):
    """Mettre à jour le stock d'un produit - Manager et Admin uniquement"""
    nouvelle_quantite = request.get("nouvelle_quantite")
    motif = request.get("motif", "correction")
    
    if nouvelle_quantite is None:
        raise HTTPException(status_code=400, detail="nouvelle_quantite requis")
    
    # Chercher par id ou _id
    produit = await db.produits.find_one({"$or": [{"id": produit_id}, {"_id": produit_id}]})
    
    if not produit:
        # Si pas trouvé, essayer de convertir l'ID MongoDB
        try:
            produit = await db.produits.find_one({"_id": ObjectId(produit_id)})
        except:
            pass
    
    if not produit:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    stock_avant = produit.get("stock_actuel", 0)
    
    # Mettre à jour le stock
    update_result = await db.produits.update_one(
        {"$or": [{"id": produit_id}, {"_id": produit_id}]},
        {"$set": {"stock_actuel": int(nouvelle_quantite)}}
    )
    
    if update_result.matched_count == 0:
        try:
            await db.produits.update_one(
                {"_id": ObjectId(produit_id)},
                {"$set": {"stock_actuel": int(nouvelle_quantite)}}
            )
        except:
            pass
    
    # Enregistrer le mouvement
    mouvement = {
        "id": str(uuid.uuid4()),
        "produit_id": produit_id,  # Utiliser l'ID passé en paramètre
        "type_mouvement": "correction",
        "quantite": int(nouvelle_quantite) - stock_avant,
        "stock_avant": stock_avant,
        "stock_après": int(nouvelle_quantite),
        "motif": motif,
        "date_mouvement": datetime.now()
    }
    
    await db.mouvements_stock.insert_one(mouvement)
    
    return {"message": "Stock mis à jour", "ancien_stock": stock_avant, "nouveau_stock": int(nouvelle_quantite)}

@app.get("/api/produits/{produit_id}/mouvements")
async def get_mouvements_stock(produit_id: str):
    mouvements = []
    # Chercher par id ou _id
    async for mouvement in db.mouvements_stock.find({
        "$or": [{"produit_id": produit_id}, {"produit_id": str(produit_id)}]
    }).sort("date_mouvement", -1):
        mouvement["id"] = str(mouvement["_id"]) if "_id" in mouvement else mouvement.get("id")
        if "_id" in mouvement:
            del mouvement["_id"]
        mouvements.append(mouvement)
    
    # Si aucun mouvement trouvé avec l'ID donné, essayer de chercher par ObjectId
    if not mouvements:
        try:
            from bson import ObjectId
            async for mouvement in db.mouvements_stock.find({"produit_id": ObjectId(produit_id)}).sort("date_mouvement", -1):
                mouvement["id"] = str(mouvement["_id"]) if "_id" in mouvement else mouvement.get("id")
                if "_id" in mouvement:
                    del mouvement["_id"]
                mouvements.append(mouvement)
        except:
            pass
    
    return mouvements

# Routes Factures (Comptable, Manager et Admin)
@app.get("/api/factures", response_model=List[Facture])
async def get_factures(current_user: dict = Depends(comptable_manager_admin())):
    """Récupérer toutes les factures - Comptable, Manager et Admin"""
    factures = []
    async for facture in db.factures.find().sort("date_creation", -1):
        facture["id"] = str(facture["_id"]) if "_id" in facture else facture.get("id")
        if "_id" in facture:
            del facture["_id"]
        factures.append(Facture(**facture))
    return factures

@app.get("/api/factures/{facture_id}", response_model=Facture)
async def get_facture(facture_id: str, current_user: dict = Depends(comptable_manager_admin())):
    """Récupérer une facture - Comptable, Manager et Admin"""
    # Utiliser la même logique de recherche que les autres fonctions
    facture = await db.factures.find_one({"$or": [{"id": facture_id}, {"_id": facture_id}]})
    
    if not facture:
        # Si pas trouvé, essayer de convertir l'ID MongoDB
        try:
            from bson import ObjectId
            facture = await db.factures.find_one({"_id": ObjectId(facture_id)})
        except:
            pass
    
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    facture["id"] = str(facture["_id"]) if "_id" in facture else facture.get("id")
    if "_id" in facture:
        del facture["_id"]
    return Facture(**facture)

@app.post("/api/factures", response_model=Facture)
async def create_facture(facture: Facture):
    facture.id = str(uuid.uuid4())
    facture.numero = generate_invoice_number()
    facture.date_creation = datetime.now()
    if not facture.date_echeance:
        facture.date_echeance = datetime.now() + timedelta(days=30)
    
    # Vérifier et mettre à jour les stocks SEULEMENT si la facture n'est pas encore créée
    stocks_mis_a_jour = []
    try:
        for ligne in facture.lignes:
            produit = await db.produits.find_one({"id": ligne.produit_id})
            if produit and produit.get("gestion_stock", False):
                stock_actuel = produit.get("stock_actuel", 0)
                if stock_actuel < ligne.quantite:
                    # Annuler les mises à jour déjà effectuées
                    for stock_info in stocks_mis_a_jour:
                        await db.produits.update_one(
                            {"id": stock_info["produit_id"]},
                            {"$set": {"stock_actuel": stock_info["ancien_stock"]}}
                        )
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Stock insuffisant pour {produit['nom']}. Stock disponible: {stock_actuel}, demandé: {ligne.quantite}"
                    )
                
                # Mettre à jour le stock
                nouveau_stock = stock_actuel - int(ligne.quantite)
                await db.produits.update_one(
                    {"id": ligne.produit_id},
                    {"$set": {"stock_actuel": nouveau_stock}}
                )
                
                # Enregistrer le mouvement
                mouvement = {
                    "id": str(uuid.uuid4()),
                    "produit_id": ligne.produit_id,
                    "type_mouvement": "sortie",
                    "quantite": -int(ligne.quantite),
                    "stock_avant": stock_actuel,
                    "stock_après": nouveau_stock,
                    "motif": f"Vente - Facture {facture.numero}",
                    "date_mouvement": datetime.now()
                }
                await db.mouvements_stock.insert_one(mouvement)
                
                stocks_mis_a_jour.append({
                    "produit_id": ligne.produit_id,
                    "ancien_stock": stock_actuel,
                    "nouveau_stock": nouveau_stock
                })
        
        # Sauvegarder la facture
        facture_dict = facture.dict()
        await db.factures.insert_one(facture_dict)
        
        print(f"✅ Facture {facture.numero} créée avec succès")
        if stocks_mis_a_jour:
            print(f"📦 Stocks mis à jour pour {len(stocks_mis_a_jour)} produit(s)")
            for stock_info in stocks_mis_a_jour:
                print(f"   - Produit {stock_info['produit_id']}: {stock_info['ancien_stock']} → {stock_info['nouveau_stock']}")
        
        return facture
        
    except HTTPException:
        raise
    except Exception as e:
        # En cas d'erreur, restaurer les stocks
        for stock_info in stocks_mis_a_jour:
            await db.produits.update_one(
                {"id": stock_info["produit_id"]},
                {"$set": {"stock_actuel": stock_info["ancien_stock"]}}
            )
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de la facture: {str(e)}")

@app.put("/api/factures/{facture_id}", response_model=Facture)
async def update_facture(facture_id: str, facture: Facture):
    facture.id = facture_id
    facture_dict = facture.dict()
    if "_id" in facture_dict:
        del facture_dict["_id"]
    
    # Utiliser la même logique de recherche que les autres fonctions
    result = await db.factures.update_one(
        {"$or": [{"id": facture_id}, {"_id": facture_id}]},
        {"$set": facture_dict}
    )
    
    if result.matched_count == 0:
        # Si pas trouvé, essayer de convertir l'ID MongoDB
        try:
            from bson import ObjectId
            result = await db.factures.update_one(
                {"_id": ObjectId(facture_id)},
                {"$set": facture_dict}
            )
        except:
            pass
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    return facture

@app.post("/api/factures/{facture_id}/envoyer")
async def envoyer_facture(facture_id: str, background_tasks: BackgroundTasks):
    # Utiliser la même logique de recherche que les autres fonctions
    facture = await db.factures.find_one({"$or": [{"id": facture_id}, {"_id": facture_id}]})
    
    if not facture:
        # Si pas trouvé, essayer de convertir l'ID MongoDB
        try:
            from bson import ObjectId
            facture = await db.factures.find_one({"_id": ObjectId(facture_id)})
        except:
            pass
    
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    # Simulation d'envoi email
    background_tasks.add_task(simulate_email_send, facture["client_email"], facture["numero"])
    
    # Mettre à jour le statut - utiliser le même ID que celui trouvé
    if "_id" in facture and not facture.get("id"):
        # Facture trouvée avec ObjectId MongoDB
        await db.factures.update_one(
            {"_id": facture["_id"]},
            {"$set": {"statut": "envoyee", "date_envoi": datetime.now()}}
        )
    else:
        # Facture trouvée avec ID UUID
        await db.factures.update_one(
            {"id": facture["id"]},
            {"$set": {"statut": "envoyee", "date_envoi": datetime.now()}}
        )
    
    return {"message": "Facture envoyée par email"}

@app.post("/api/paiements/simulate")
async def simulate_payment(request: dict):
    facture_id = request.get("facture_id")
    devise_paiement = request.get("devise_paiement", "USD")
    
    if not facture_id:
        raise HTTPException(status_code=400, detail="facture_id requis")
    
    # Chercher par id ou _id comme dans les autres fonctions
    facture = await db.factures.find_one({"$or": [{"id": facture_id}, {"_id": facture_id}]})
    
    if not facture:
        # Si pas trouvé, essayer de convertir l'ID MongoDB
        try:
            from bson import ObjectId
            facture = await db.factures.find_one({"_id": ObjectId(facture_id)})
        except:
            pass
    
    if not facture:
        print(f"❌ PAIEMENT SIMULÉ - Facture avec ID {facture_id} non trouvée")
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    print(f"✅ PAIEMENT SIMULÉ - Facture trouvée: {facture.get('numero', 'N/A')}")
    
    # Créer un enregistrement de paiement simulé
    paiement = {
        "id": str(uuid.uuid4()),
        "facture_id": facture_id,
        "facture_numero": facture["numero"],
        "montant_usd": facture["total_ttc_usd"],
        "montant_fc": facture["total_ttc_fc"],
        "devise_paiement": devise_paiement,
        "methode_paiement": "stripe_simulation",
        "statut": "pending",
        "transaction_id": f"sim_tx_{uuid.uuid4().hex[:8]}",
        "date_paiement": datetime.now(),
        "notes": "Paiement simulé pour démonstration"
    }
    
    await db.paiements.insert_one(paiement)
    
    # Simulation du lien de paiement Stripe
    payment_url = f"https://checkout.stripe.com/pay/cs_test_simulate_{facture_id}"
    
    print(f"💳 PAIEMENT SIMULÉ - Création du lien de paiement pour la facture {facture['numero']}")
    print(f"   Montant: {facture['total_ttc_usd']} USD / {facture['total_ttc_fc']} FC")
    print(f"   Devise: {devise_paiement}")
    
    return {
        "payment_url": payment_url,
        "session_id": f"cs_test_simulate_{facture_id}",
        "paiement_id": paiement["id"],
        "transaction_id": paiement["transaction_id"],
        "message": "Lien de paiement généré (simulation)"
    }

@app.post("/api/factures/{facture_id}/payer")
async def marquer_payee(facture_id: str, paiement_id: Optional[str] = None):
    print(f"🔍 MARQUAGE PAYÉE - Tentative de marquage pour ID: {facture_id}")
    
    # D'abord, vérifier si la facture existe avec find_one (même logique que simulate_payment)
    facture = await db.factures.find_one({"$or": [{"id": facture_id}, {"_id": facture_id}]})
    
    if not facture:
        # Si pas trouvé, essayer de convertir l'ID MongoDB
        try:
            from bson import ObjectId
            facture = await db.factures.find_one({"_id": ObjectId(facture_id)})
            print(f"✅ MARQUAGE PAYÉE - Facture trouvée avec ObjectId: {facture_id}")
        except Exception as e:
            print(f"❌ MARQUAGE PAYÉE - Erreur ObjectId: {e}")
            pass
    else:
        print(f"✅ MARQUAGE PAYÉE - Facture trouvée avec requête $or: {facture.get('numero', 'N/A')}")
    
    if not facture:
        print(f"❌ MARQUAGE PAYÉE - Facture avec ID {facture_id} non trouvée")
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    # Maintenant, marquer la facture comme payée en utilisant le même ID que celui trouvé
    # Si on a trouvé avec ObjectId, utiliser l'_id, sinon utiliser l'id
    if "_id" in facture and not facture.get("id"):
        # Facture trouvée avec ObjectId MongoDB
        result = await db.factures.update_one(
            {"_id": facture["_id"]},
            {"$set": {"statut": "payee", "date_paiement": datetime.now()}}
        )
        print(f"🔄 MARQUAGE PAYÉE - Mise à jour avec _id MongoDB: {facture['_id']}")
    else:
        # Facture trouvée avec ID UUID
        result = await db.factures.update_one(
            {"id": facture["id"]},
            {"$set": {"statut": "payee", "date_paiement": datetime.now()}}
        )
        print(f"🔄 MARQUAGE PAYÉE - Mise à jour avec ID UUID: {facture['id']}")
    
    if result.matched_count == 0:
        print(f"❌ MARQUAGE PAYÉE - Aucune facture mise à jour malgré la présence")
        raise HTTPException(status_code=404, detail="Erreur lors de la mise à jour de la facture")
    
    print(f"✅ MARQUAGE PAYÉE - Facture {facture.get('numero', 'N/A')} marquée comme payée")
    
    # Si aucun paiement_id n'est fourni, créer un enregistrement de paiement manuel
    if not paiement_id:
        print(f"💳 MARQUAGE PAYÉE - Création d'un enregistrement de paiement manuel")
        
        # Créer un enregistrement de paiement pour l'historique
        paiement_manuel = {
            "id": str(uuid.uuid4()),
            "facture_id": facture.get("id") or str(facture.get("_id")),
            "facture_numero": facture["numero"],
            "montant_usd": facture["total_ttc_usd"],
            "montant_fc": facture["total_ttc_fc"],
            "devise_paiement": "USD",  # Par défaut USD pour marquage manuel
            "methode_paiement": "manuel",
            "statut": "completed",
            "transaction_id": f"manual_{uuid.uuid4().hex[:8]}",
            "date_paiement": datetime.now(),
            "notes": "Paiement marqué manuellement comme payé"
        }
        
        await db.paiements.insert_one(paiement_manuel)
        print(f"✅ MARQUAGE PAYÉE - Enregistrement de paiement créé avec ID: {paiement_manuel['id']}")
    else:
        # Mettre à jour le statut du paiement existant
        paiement_result = await db.paiements.update_one(
            {"$or": [{"id": paiement_id}, {"_id": paiement_id}]},
            {"$set": {"statut": "completed", "date_paiement": datetime.now()}}
        )
        
        if paiement_result.matched_count == 0:
            try:
                await db.paiements.update_one(
                    {"_id": ObjectId(paiement_id)},
                    {"$set": {"statut": "completed", "date_paiement": datetime.now()}}
                )
            except:
                pass
    
    return {"message": "Facture marquée comme payée"}

@app.get("/api/paiements")
async def get_paiements():
    paiements = []
    async for paiement in db.paiements.find().sort("date_paiement", -1):
        paiement["id"] = str(paiement["_id"]) if "_id" in paiement else paiement.get("id")
        if "_id" in paiement:
            del paiement["_id"]
        paiements.append(paiement)
    return paiements

# Simulation des intégrations
async def simulate_email_send(email: str, numero_facture: str):
    """Simule l'envoi d'email"""
    print(f"📧 EMAIL SIMULÉ - Envoi de la facture {numero_facture} à {email}")

# Route Statistics
@app.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    total_clients = await db.clients.count_documents({})
    total_produits = await db.produits.count_documents({"actif": True})
    total_factures = await db.factures.count_documents({})
    
    # Calculer le CA mensuel et annuel
    now = datetime.now()
    debut_mois = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    debut_annee = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    factures_mois = []
    async for facture in db.factures.find({
        "statut": "payee",
        "date_paiement": {"$gte": debut_mois}
    }):
        factures_mois.append(facture)
    
    factures_annee = []
    async for facture in db.factures.find({
        "statut": "payee",
        "date_paiement": {"$gte": debut_annee}
    }):
        factures_annee.append(facture)
    
    ca_mensuel_usd = sum(f.get("total_ttc_usd", 0) for f in factures_mois)
    ca_mensuel_fc = sum(f.get("total_ttc_fc", 0) for f in factures_mois)
    ca_annuel_usd = sum(f.get("total_ttc_usd", 0) for f in factures_annee)
    ca_annuel_fc = sum(f.get("total_ttc_fc", 0) for f in factures_annee)
    
    # Factures impayées
    factures_impayees = []
    async for facture in db.factures.find({"statut": {"$in": ["envoyee", "brouillon"]}}):
        factures_impayees.append(facture)
    
    nb_impayees = len(factures_impayees)
    montant_impaye_usd = sum(f.get("total_ttc_usd", 0) for f in factures_impayees)
    montant_impaye_fc = sum(f.get("total_ttc_fc", 0) for f in factures_impayees)
    
    # Produits en stock bas
    produits_stock_bas = await db.produits.count_documents({
        "gestion_stock": True,
        "$expr": {"$lt": ["$stock_actuel", "$stock_minimum"]}
    })
    
    # Taux de change actuel
    taux = await db.taux_change.find_one({"actif": True}, sort=[("date_creation", -1)])
    taux_actuel = taux.get("taux", 2800.0) if taux else 2800.0
    
    return StatsResponse(
        total_clients=total_clients,
        total_produits=total_produits,
        total_factures=total_factures,
        ca_mensuel_usd=ca_mensuel_usd,
        ca_mensuel_fc=ca_mensuel_fc,
        ca_annuel_usd=ca_annuel_usd,
        ca_annuel_fc=ca_annuel_fc,
        factures_impayees=nb_impayees,
        montant_impaye_usd=montant_impaye_usd,
        montant_impaye_fc=montant_impaye_fc,
        produits_stock_bas=produits_stock_bas,
        taux_change_actuel=taux_actuel
    )

@app.post("/api/produits/{produit_id}/test-mouvement")
async def create_test_movement(produit_id: str):
    """Crée un mouvement de stock de test pour vérifier l'historique"""
    mouvement = {
        "id": str(uuid.uuid4()),
        "produit_id": produit_id,
        "type_mouvement": "correction",
        "quantite": 10,
        "stock_avant": 40,
        "stock_après": 50,
        "motif": "Test de mouvement de stock",
        "date_mouvement": datetime.now()
    }
    
    await db.mouvements_stock.insert_one(mouvement)
    return {"message": "Mouvement de test créé", "mouvement": mouvement}

@app.post("/api/paiements/{paiement_id}/valider")
async def valider_paiement(paiement_id: str):
    """Valide un paiement en changeant son statut vers 'completed'"""
    # Chercher le paiement
    paiement = await db.paiements.find_one({"$or": [{"id": paiement_id}, {"_id": paiement_id}]})
    
    if not paiement:
        try:
            paiement = await db.paiements.find_one({"_id": ObjectId(paiement_id)})
        except:
            pass
    
    if not paiement:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    # Mettre à jour le statut du paiement
    result = await db.paiements.update_one(
        {"$or": [{"id": paiement_id}, {"_id": paiement_id}]},
        {"$set": {"statut": "completed", "date_paiement": datetime.now()}}
    )
    
    if result.matched_count == 0:
        try:
            await db.paiements.update_one(
                {"_id": ObjectId(paiement_id)},
                {"$set": {"statut": "completed", "date_paiement": datetime.now()}}
            )
        except:
            pass
    
    # Marquer la facture correspondante comme payée
    facture_id = paiement.get("facture_id")
    if facture_id:
        await db.factures.update_one(
            {"$or": [{"id": facture_id}, {"_id": facture_id}]},
            {"$set": {"statut": "payee", "date_paiement": datetime.now()}}
        )
    
    return {"message": "Paiement validé et facture marquée comme payée"}

@app.get("/api/conversion")
async def convertir_montant(montant: float, devise_source: str, devise_cible: str):
    """Convertit un montant d'une devise à une autre"""
    if devise_source == devise_cible:
        return {"montant_converti": montant, "taux": 1.0}
    
    taux = TAUX_CHANGE.get(f"{devise_source}_TO_{devise_cible}")
    if not taux:
        # Récupérer le taux depuis la base de données
        taux_db = await db.taux_change.find_one({"actif": True}, sort=[("date_creation", -1)])
        if taux_db:
            if devise_source == "USD" and devise_cible == "FC":
                taux = taux_db.get("taux", 2800.0)
            elif devise_source == "FC" and devise_cible == "USD":
                taux = 1.0 / taux_db.get("taux", 2800.0)
        else:
            taux = 1.0
    
    montant_converti = convertir_devise(montant, devise_source, devise_cible, taux)
    
    return {
        "montant_converti": montant_converti,
        "taux": taux,
        "devise_source": devise_source,
        "devise_cible": devise_cible
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Application de facturation opérationnelle"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)