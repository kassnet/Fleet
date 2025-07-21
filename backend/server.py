from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, status, Query
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

app = FastAPI(title="FacturApp", description="Système de gestion de facturation professionnel avec authentification")

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
    role: str = "utilisateur"  # admin, manager, utilisateur, comptable, support, technicien
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

# ===== SALES MODELS =====
class LigneDevis(BaseModel):
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

class Devis(BaseModel):
    id: Optional[str] = None
    numero: Optional[str] = None
    client_id: str
    client_nom: str
    client_email: str
    client_adresse: Optional[str] = None
    devise: str = "USD"
    lignes: List[LigneDevis]
    total_ht_usd: float
    total_ht_fc: float
    total_tva_usd: float
    total_tva_fc: float
    total_ttc_usd: float
    total_ttc_fc: float
    statut: str = "brouillon"  # brouillon, envoye, accepte, refuse, expire
    validite_jours: int = 30  # Sera supprimé dans l'interface utilisateur
    date_creation: Optional[datetime] = None
    date_expiration: Optional[datetime] = None
    date_acceptation: Optional[datetime] = None
    notes: Optional[str] = None
    conditions: Optional[str] = None
    facture_id: Optional[str] = None  # Si converti en facture

class Opportunite(BaseModel):
    id: Optional[str] = None
    titre: str
    description: Optional[str] = None
    client_id: str
    client_nom: str
    valeur_estimee_usd: float
    valeur_estimee_fc: float
    devise: str = "USD"
    probabilite: int = 50  # Pourcentage 0-100
    etape: str = "prospect"  # prospect, qualification, proposition, negociation, ferme_gagne, ferme_perdu
    priorite: str = "moyenne"  # basse, moyenne, haute
    date_creation: Optional[datetime] = None
    date_cloture_prevue: Optional[datetime] = None
    date_cloture_reelle: Optional[datetime] = None
    notes: Optional[str] = None
    commercial_id: Optional[str] = None  # ID utilisateur responsable
    devis_ids: List[str] = []
    activites: List[Dict[str, Any]] = []  # Historique des activités

class LigneCommande(BaseModel):
    produit_id: str
    nom_produit: str
    quantite: float
    prix_unitaire_usd: float
    prix_unitaire_fc: float
    devise: str
    total_usd: float
    total_fc: float
    statut_livraison: str = "en_attente"  # en_attente, expedie, livre

class Commande(BaseModel):
    id: Optional[str] = None
    numero: Optional[str] = None
    client_id: str
    client_nom: str
    client_email: str
    client_adresse: Optional[str] = None
    opportunite_id: Optional[str] = None
    devis_id: Optional[str] = None
    lignes: List[LigneCommande]
    total_usd: float
    total_fc: float
    devise: str = "USD"
    statut: str = "nouvelle"  # nouvelle, confirmee, en_preparation, expediee, livree, annulee
    date_creation: Optional[datetime] = None
    date_confirmation: Optional[datetime] = None
    date_livraison_prevue: Optional[datetime] = None
    date_livraison_reelle: Optional[datetime] = None
    adresse_livraison: Optional[str] = None
    transporteur: Optional[str] = None
    numero_suivi: Optional[str] = None
    notes: Optional[str] = None
    facture_id: Optional[str] = None

class VenteStats(BaseModel):
    # Statistiques générales
    total_devis: int
    total_devis_acceptes: int
    taux_conversion_devis: float
    total_opportunites: int
    opportunites_en_cours: int
    valeur_pipeline_usd: float
    valeur_pipeline_fc: float
    total_commandes: int
    commandes_en_cours: int
    
    # Chiffres d'affaires
    ca_devis_mois_usd: float
    ca_devis_mois_fc: float
    ca_commandes_mois_usd: float
    ca_commandes_mois_fc: float
    
    # Top performers
    top_clients: List[Dict[str, Any]]
    top_produits: List[Dict[str, Any]]
    
    # Prévisions
    objectif_mensuel_usd: float = 0
    objectif_mensuel_fc: float = 0
    realisation_pourcentage: float = 0

class ActiviteCommerciale(BaseModel):
    id: Optional[str] = None
    opportunite_id: str
    type_activite: str  # appel, email, reunion, visite, proposition, suivi
    titre: str
    description: Optional[str] = None
    date_activite: datetime
    duree_minutes: Optional[int] = None
    commercial_id: str
    commercial_nom: str
    resultat: Optional[str] = None  # positif, neutre, negatif
    prochaine_action: Optional[str] = None
    date_prochaine_action: Optional[datetime] = None

# Models Entrepôts
class Entrepot(BaseModel):
    id: Optional[str] = None
    nom: str
    description: Optional[str] = None
    adresse: Optional[str] = None
    responsable: Optional[str] = None
    capacite_max: Optional[int] = None
    statut: str = "actif"  # actif, inactif, maintenance
    date_creation: Optional[datetime] = None
    date_modification: Optional[datetime] = None

class EntrepotCreate(BaseModel):
    nom: str
    description: Optional[str] = None
    adresse: Optional[str] = None
    responsable: Optional[str] = None
    capacite_max: Optional[int] = None
    statut: str = "actif"

# Models Gestion d'Outils
class Outil(BaseModel):
    id: Optional[str] = None
    nom: str
    description: Optional[str] = None
    reference: Optional[str] = None
    entrepot_id: Optional[str] = None
    entrepot_nom: Optional[str] = None
    quantite_stock: int = 0
    quantite_disponible: int = 0
    prix_unitaire_usd: Optional[float] = None
    fournisseur: Optional[str] = None
    date_achat: Optional[datetime] = None
    etat: str = "neuf"  # neuf, bon, use, defaillant
    localisation: Optional[str] = None  # Localisation spécifique dans l'entrepôt
    numero_serie: Optional[str] = None
    date_creation: Optional[datetime] = None
    date_modification: Optional[datetime] = None

class OutilCreate(BaseModel):
    nom: str
    description: Optional[str] = None
    reference: Optional[str] = None
    entrepot_id: Optional[str] = None
    quantite_stock: int = 0
    prix_unitaire_usd: Optional[float] = None
    fournisseur: Optional[str] = None
    date_achat: Optional[datetime] = None
    etat: str = "neuf"
    localisation: Optional[str] = None
    numero_serie: Optional[str] = None

class AffectationOutil(BaseModel):
    id: Optional[str] = None
    outil_id: str
    outil_nom: str
    technicien_id: str
    technicien_nom: str
    quantite_affectee: int
    date_affectation: datetime
    date_retour_prevue: Optional[datetime] = None
    date_retour_effective: Optional[datetime] = None
    statut: str = "affecte"  # affecte, retourne, perdu, endommage
    notes_affectation: Optional[str] = None
    notes_retour: Optional[str] = None
    affecte_par: str  # ID de la personne qui a fait l'affectation

class AffectationOutilCreate(BaseModel):
    outil_id: str
    technicien_id: str
    quantite_affectee: int
    date_retour_prevue: Optional[datetime] = None
    notes_affectation: Optional[str] = None

class ApprovisionnementOutil(BaseModel):
    quantite_ajoutee: int
    prix_unitaire_usd: Optional[float] = None
    fournisseur: Optional[str] = None
    date_achat: Optional[datetime] = None
    notes: Optional[str] = None

class RetourOutil(BaseModel):
    quantite_retournee: int
    etat_retour: str = "bon"  # bon, endommage, perdu
    notes_retour: Optional[str] = None

# Helper functions
def generate_invoice_number():
    return f"FACT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

def generate_devis_number():
    return f"DEVIS-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

def generate_commande_number():
    return f"CMD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

def calculer_date_expiration(validite_jours: int = 30) -> datetime:
    """Calcule la date d'expiration d'un devis"""
    return datetime.now() + timedelta(days=validite_jours)

def calculer_etape_probabilite(etape: str) -> int:
    """Retourne la probabilité par défaut selon l'étape"""
    etapes_probabilite = {
        "prospect": 10,
        "qualification": 25,
        "proposition": 50,
        "negociation": 75,
        "ferme_gagne": 100,
        "ferme_perdu": 0
    }
    return etapes_probabilite.get(etape, 50)

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
        
        # Vérifier si le rôle est autorisé
        if user_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes"
            )
        
        return current_user
    return permission_checker

def check_permissions_with_admin_override(required_roles: List[str]):
    """Décorateur pour vérifier les permissions avec privilèges admin"""
    def permission_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role", "utilisateur")
        
        # Admin a tous les droits SAUF pour les endpoints support_only
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
    """Seul l'admin peut accéder"""
    return check_permissions_with_admin_override(["admin"])

def manager_and_admin():
    """Managers et admins peuvent accéder"""
    return check_permissions_with_admin_override(["admin", "manager"])

def comptable_manager_admin():
    """Comptables, managers et admins peuvent accéder"""
    return check_permissions_with_admin_override(["admin", "manager", "comptable"])

def all_authenticated():
    """Tous les utilisateurs authentifiés peuvent accéder"""
    return check_permissions_with_admin_override(["admin", "manager", "comptable", "utilisateur", "support"])

def support_only():
    """Seul le support peut accéder (sans override admin)"""
    return check_permissions(["support"])

def admin_support():
    """Admin et support peuvent accéder"""
    return check_permissions(["admin", "support"])

def manager_admin():
    """Manager et admin peuvent accéder"""
    return check_permissions(["manager", "admin"])

def technicien_manager_admin():
    """Technicien, manager et admin peuvent accéder"""
    return check_permissions(["technicien", "manager", "admin"])

def current_user_or_admin():
    """L'utilisateur actuel ou admin peut accéder"""
    def wrapper(current_user: dict = Depends(get_current_user)):
        return current_user
    return wrapper

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
    # Utilisateurs de démonstration
    demo_users = [
        {
            "email": "admin@facturapp.rdc",
            "nom": "Administrateur",
            "prenom": "Système",
            "role": "admin",
            "password": "admin123"
        },
        {
            "email": "manager@demo.com",
            "nom": "Manager",
            "prenom": "Demo",
            "role": "manager",
            "password": "manager123"
        },
        {
            "email": "comptable@demo.com",
            "nom": "Comptable",
            "prenom": "Demo",
            "role": "comptable",
            "password": "comptable123"
        },
        {
            "email": "user@demo.com",
            "nom": "Utilisateur",
            "prenom": "Demo",
            "role": "utilisateur",
            "password": "user123"
        },
        {
            "email": "support@facturapp.rdc",
            "nom": "Support",
            "prenom": "Technique",
            "role": "support",
            "password": "support123"
        }
    ]
    
    for user_data in demo_users:
        existing_user = await db.users.find_one({"email": user_data["email"]})
        
        if not existing_user:
            user = {
                "id": str(uuid.uuid4()),
                "email": user_data["email"],
                "nom": user_data["nom"],
                "prenom": user_data["prenom"],
                "role": user_data["role"],
                "is_active": True,
                "hashed_password": hash_password(user_data["password"]),
                "date_creation": datetime.now(),
                "derniere_connexion": None
            }
            await db.users.insert_one(user)
            print(f"✅ Utilisateur {user_data['role']} créé: {user_data['email']} / mot de passe: {user_data['password']}")

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

# Routes de gestion des utilisateurs (Admin et Support)
@app.get("/api/users", response_model=List[User])
async def get_users(current_user: dict = Depends(admin_support())):
    """Récupérer tous les utilisateurs (Admin et Support seulement)"""
    users = []
    async for user in db.users.find().sort("date_creation", -1):
        user["id"] = str(user["_id"]) if "_id" in user else user.get("id")
        if "_id" in user:
            del user["_id"]
        # Retirer le mot de passe hashé
        user_without_password = {k: v for k, v in user.items() if k != "hashed_password"}
        users.append(User(**user_without_password))
    return users

@app.post("/api/users", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(admin_support())
):
    """Créer un nouvel utilisateur (Admin et Support seulement)"""
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

@app.get("/api/users/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    current_user: dict = Depends(admin_support())
):
    """Récupérer un utilisateur spécifique (Admin et Support seulement)"""
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        # Retourner sans le mot de passe
        user_without_password = {k: v for k, v in user.items() if k != "hashed_password"}
        return User(**user_without_password)
    
    except Exception as e:
        if "non trouvé" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de l'utilisateur: {str(e)}")
    
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
async def update_taux_change(nouveau_taux: float, current_user: dict = Depends(admin_support())):
    """Mettre à jour le taux de change - Admin et Support uniquement"""
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

# Gestion des stocks - Version améliorée avec ajouter/soustraire
@app.put("/api/produits/{produit_id}/stock")
async def update_stock(produit_id: str, request: dict, current_user: dict = Depends(manager_and_admin())):
    """Mettre à jour le stock d'un produit avec opération ajouter/soustraire - Manager et Admin uniquement"""
    operation = request.get("operation")  # "ajouter" ou "soustraire"
    quantite = request.get("quantite")
    motif = request.get("motif")
    
    # Validation des paramètres
    if not operation:
        raise HTTPException(status_code=400, detail="Opération requise ('ajouter' ou 'soustraire')")
    
    if operation not in ["ajouter", "soustraire"]:
        raise HTTPException(status_code=400, detail="Opération doit être 'ajouter' ou 'soustraire'")
    
    if quantite is None:
        raise HTTPException(status_code=400, detail="Quantité requise")
    
    if not motif or not motif.strip():
        raise HTTPException(status_code=400, detail="Motif requis pour toute modification de stock")
    
    try:
        quantite = int(quantite)
        if quantite <= 0:
            raise HTTPException(status_code=400, detail="La quantité doit être positive")
    except ValueError:
        raise HTTPException(status_code=400, detail="La quantité doit être un nombre entier")
    
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
    
    # Vérifier que la gestion de stock est activée
    if not produit.get("gestion_stock", False):
        raise HTTPException(status_code=400, detail="La gestion de stock n'est pas activée pour ce produit")
    
    stock_avant = produit.get("stock_actuel", 0)
    stock_minimum = produit.get("stock_minimum", 0)
    stock_maximum = produit.get("stock_maximum", 1000000)
    
    # Calculer le nouveau stock
    if operation == "ajouter":
        nouveau_stock = stock_avant + quantite
        type_mouvement = "entree"
    else:  # soustraire
        nouveau_stock = stock_avant - quantite
        type_mouvement = "sortie"
    
    # Vérifier les limites de stock
    if nouveau_stock < 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Impossible de soustraire {quantite} unités. Stock actuel: {stock_avant}. Le stock ne peut pas être négatif."
        )
    
    if nouveau_stock > stock_maximum:
        raise HTTPException(
            status_code=400, 
            detail=f"Impossible d'ajouter {quantite} unités. Stock maximum autorisé: {stock_maximum}. Le nouveau stock serait: {nouveau_stock}"
        )
    
    # Vérifier si le stock sera en dessous du minimum
    warning_message = None
    if nouveau_stock < stock_minimum:
        warning_message = f"Attention: Le stock sera en dessous du minimum recommandé ({stock_minimum})"
    
    # Mettre à jour le stock
    update_result = await db.produits.update_one(
        {"$or": [{"id": produit_id}, {"_id": produit_id}]},
        {"$set": {"stock_actuel": nouveau_stock}}
    )
    
    if update_result.matched_count == 0:
        try:
            await db.produits.update_one(
                {"_id": ObjectId(produit_id)},
                {"$set": {"stock_actuel": nouveau_stock}}
            )
        except:
            pass
    
    # Enregistrer le mouvement
    mouvement = {
        "id": str(uuid.uuid4()),
        "produit_id": produit_id,  # Utiliser l'ID passé en paramètre
        "type_mouvement": type_mouvement,
        "quantite": quantite if operation == "ajouter" else -quantite,
        "stock_avant": stock_avant,
        "stock_après": nouveau_stock,
        "motif": motif.strip(),
        "operation": operation,
        "utilisateur": current_user.get("email", ""),
        "date_mouvement": datetime.now()
    }
    
    await db.mouvements_stock.insert_one(mouvement)
    
    response = {
        "message": f"Stock mis à jour: {operation} {quantite} unités",
        "ancien_stock": stock_avant,
        "nouveau_stock": nouveau_stock,
        "operation": operation,
        "quantite": quantite
    }
    
    if warning_message:
        response["warning"] = warning_message
    
    return response

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
async def create_facture(facture: Facture, current_user: dict = Depends(comptable_manager_admin())):
    """Créer une facture - Comptable, Manager et Admin"""
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
                        detail=f"Stock insuffisant pour {produit['nom']}. Stock disponible: {stock_actuel}, demandé: {ligne.quantite}. Vous ne pouvez pas facturer plus que le stock disponible."
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
async def envoyer_facture(facture_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(comptable_manager_admin())):
    """Envoyer une facture - Comptable, Manager et Admin"""
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
async def simulate_payment(request: dict, current_user: dict = Depends(comptable_manager_admin())):
    """Simuler un paiement - Comptable, Manager et Admin"""
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
async def marquer_payee(facture_id: str, paiement_id: Optional[str] = None, current_user: dict = Depends(comptable_manager_admin())):
    """Marquer une facture comme payée - Comptable, Manager et Admin"""
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

# Nouveaux endpoints pour annuler et supprimer des factures
@app.post("/api/factures/{facture_id}/annuler")
async def annuler_facture(facture_id: str, motif: str = Query(..., description="Motif de l'annulation"), current_user: dict = Depends(comptable_manager_admin())):
    """Annuler une facture - Comptable, Manager et Admin"""
    print(f"🚫 ANNULATION FACTURE - Tentative d'annulation pour ID: {facture_id}, Motif: {motif}")
    
    # Vérifier si la facture existe
    facture = await db.factures.find_one({"$or": [{"id": facture_id}, {"_id": facture_id}]})
    
    if not facture:
        try:
            from bson import ObjectId
            facture = await db.factures.find_one({"_id": ObjectId(facture_id)})
        except:
            pass
    
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    # Vérifier que la facture peut être annulée
    if facture.get("statut") == "annulee":
        raise HTTPException(status_code=400, detail="La facture est déjà annulée")
    
    if facture.get("statut") == "payee":
        raise HTTPException(status_code=400, detail="Impossible d'annuler une facture payée")
    
    # Restaurer les stocks si nécessaire
    if facture.get("statut") in ["brouillon", "envoyee"] and facture.get("lignes"):
        for ligne in facture["lignes"]:
            produit = await db.produits.find_one({"id": ligne["produit_id"]})
            if produit and produit.get("gestion_stock", False):
                nouveau_stock = produit.get("stock_actuel", 0) + int(ligne["quantite"])
                await db.produits.update_one(
                    {"id": ligne["produit_id"]},
                    {"$set": {"stock_actuel": nouveau_stock}}
                )
                
                # Enregistrer le mouvement de stock
                mouvement = {
                    "id": str(uuid.uuid4()),
                    "produit_id": ligne["produit_id"],
                    "type_mouvement": "entree",
                    "quantite": int(ligne["quantite"]),
                    "stock_avant": produit.get("stock_actuel", 0),
                    "stock_après": nouveau_stock,
                    "motif": f"Annulation facture {facture.get('numero', 'N/A')} - {motif}",
                    "date_mouvement": datetime.now()
                }
                await db.mouvements_stock.insert_one(mouvement)
    
    # Mettre à jour le statut de la facture
    update_data = {
        "statut": "annulee",
        "date_annulation": datetime.now(),
        "motif_annulation": motif,
        "utilisateur_annulation": current_user.get("email", "")
    }
    
    if "_id" in facture and not facture.get("id"):
        result = await db.factures.update_one(
            {"_id": facture["_id"]},
            {"$set": update_data}
        )
    else:
        result = await db.factures.update_one(
            {"id": facture["id"]},
            {"$set": update_data}
        )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Erreur lors de l'annulation de la facture")
    
    print(f"✅ ANNULATION FACTURE - Facture {facture.get('numero', 'N/A')} annulée avec succès")
    
    return {"message": "Facture annulée avec succès"}

@app.delete("/api/factures/{facture_id}")
async def supprimer_facture(facture_id: str, motif: str = Query(..., description="Motif de la suppression"), current_user: dict = Depends(comptable_manager_admin())):
    """Supprimer une facture - Comptable, Manager et Admin"""
    print(f"🗑️ SUPPRESSION FACTURE - Tentative de suppression pour ID: {facture_id}, Motif: {motif}")
    
    # Vérifier si la facture existe
    facture = await db.factures.find_one({"$or": [{"id": facture_id}, {"_id": facture_id}]})
    
    if not facture:
        try:
            from bson import ObjectId
            facture = await db.factures.find_one({"_id": ObjectId(facture_id)})
        except:
            pass
    
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    # Vérifier que la facture peut être supprimée
    if facture.get("statut") == "payee":
        raise HTTPException(status_code=400, detail="Impossible de supprimer une facture payée")
    
    # Restaurer les stocks si nécessaire
    if facture.get("statut") in ["brouillon", "envoyee", "annulee"] and facture.get("lignes"):
        for ligne in facture["lignes"]:
            produit = await db.produits.find_one({"id": ligne["produit_id"]})
            if produit and produit.get("gestion_stock", False):
                # Seulement restaurer si la facture n'était pas encore annulée
                if facture.get("statut") != "annulee":
                    nouveau_stock = produit.get("stock_actuel", 0) + int(ligne["quantite"])
                    await db.produits.update_one(
                        {"id": ligne["produit_id"]},
                        {"$set": {"stock_actuel": nouveau_stock}}
                    )
                    
                    # Enregistrer le mouvement de stock
                    mouvement = {
                        "id": str(uuid.uuid4()),
                        "produit_id": ligne["produit_id"],
                        "type_mouvement": "entree",
                        "quantite": int(ligne["quantite"]),
                        "stock_avant": produit.get("stock_actuel", 0),
                        "stock_après": nouveau_stock,
                        "motif": f"Suppression facture {facture.get('numero', 'N/A')} - {motif}",
                        "date_mouvement": datetime.now()
                    }
                    await db.mouvements_stock.insert_one(mouvement)
    
    # Sauvegarder la facture dans un historique de suppression
    facture_archive = {
        "id": str(uuid.uuid4()),
        "facture_originale": facture,
        "motif_suppression": motif,
        "utilisateur_suppression": current_user.get("email", ""),
        "date_suppression": datetime.now()
    }
    await db.factures_supprimees.insert_one(facture_archive)
    
    # Supprimer les paiements associés
    await db.paiements.delete_many({"facture_id": facture.get("id") or str(facture.get("_id"))})
    
    # Supprimer la facture
    if "_id" in facture and not facture.get("id"):
        result = await db.factures.delete_one({"_id": facture["_id"]})
    else:
        result = await db.factures.delete_one({"id": facture["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Erreur lors de la suppression de la facture")
    
    print(f"✅ SUPPRESSION FACTURE - Facture {facture.get('numero', 'N/A')} supprimée avec succès")
    
    return {"message": "Facture supprimée avec succès"}


@app.get("/api/devis", response_model=List[Devis])
async def get_devis(current_user: dict = Depends(manager_and_admin())):
    """Récupérer tous les devis - Manager et Admin"""
    devis = []
    async for d in db.devis.find().sort("date_creation", -1):
        d["id"] = str(d["_id"]) if "_id" in d else d.get("id")
        if "_id" in d:
            del d["_id"]
        devis.append(Devis(**d))
    return devis

@app.get("/api/devis/{devis_id}", response_model=Devis)
async def get_devis_by_id(devis_id: str, current_user: dict = Depends(manager_and_admin())):
    """Récupérer un devis spécifique - Manager et Admin"""
    devis = await db.devis.find_one({"$or": [{"id": devis_id}, {"_id": devis_id}]})
    
    if not devis:
        try:
            from bson import ObjectId
            devis = await db.devis.find_one({"_id": ObjectId(devis_id)})
        except:
            pass
    
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    devis["id"] = str(devis["_id"]) if "_id" in devis else devis.get("id")
    if "_id" in devis:
        del devis["_id"]
    return Devis(**devis)

@app.post("/api/devis", response_model=Devis)
async def create_devis(devis: Devis, current_user: dict = Depends(manager_and_admin())):
    """Créer un nouveau devis - Manager et Admin"""
    devis.id = str(uuid.uuid4())
    devis.numero = generate_devis_number()
    devis.date_creation = datetime.now()
    devis.date_expiration = calculer_date_expiration(devis.validite_jours)
    
    devis_dict = devis.dict()
    result = await db.devis.insert_one(devis_dict)
    
    return devis

@app.put("/api/devis/{devis_id}")
async def update_devis_status(devis_id: str, statut: str, current_user: dict = Depends(manager_and_admin())):
    """Mettre à jour le statut d'un devis - Manager et Admin"""
    result = await db.devis.update_one(
        {"$or": [{"id": devis_id}, {"_id": devis_id}]},
        {"$set": {"statut": statut, "date_acceptation": datetime.now() if statut == "accepte" else None}}
    )
    
    if result.matched_count == 0:
        try:
            await db.devis.update_one(
                {"_id": ObjectId(devis_id)},
                {"$set": {"statut": statut, "date_acceptation": datetime.now() if statut == "accepte" else None}}
            )
        except:
            pass
    
    return {"message": f"Devis mis à jour avec le statut: {statut}"}

@app.post("/api/devis/{devis_id}/convertir-facture")
async def convertir_devis_facture(devis_id: str, current_user: dict = Depends(manager_and_admin())):
    """Convertir un devis en facture - Manager et Admin"""
    devis = await db.devis.find_one({"$or": [{"id": devis_id}, {"_id": devis_id}]})
    
    if not devis:
        try:
            devis = await db.devis.find_one({"_id": ObjectId(devis_id)})
        except:
            pass
    
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    if devis["statut"] != "accepte":
        raise HTTPException(status_code=400, detail="Seuls les devis acceptés peuvent être convertis en facture")
    
    # Créer une facture à partir du devis
    facture = Facture(
        id=str(uuid.uuid4()),
        numero=generate_invoice_number(),
        client_id=devis["client_id"],
        client_nom=devis["client_nom"],
        client_email=devis["client_email"],
        client_adresse=devis.get("client_adresse"),
        devise=devis["devise"],
        lignes=[LigneFacture(**ligne) for ligne in devis["lignes"]],
        total_ht_usd=devis["total_ht_usd"],
        total_ht_fc=devis["total_ht_fc"],
        total_tva_usd=devis["total_tva_usd"],
        total_tva_fc=devis["total_tva_fc"],
        total_ttc_usd=devis["total_ttc_usd"],
        total_ttc_fc=devis["total_ttc_fc"],
        date_creation=datetime.now(),
        notes=devis.get("notes", "Facture générée à partir du devis " + devis["numero"])
    )
    
    facture_dict = facture.dict()
    await db.factures.insert_one(facture_dict)
    
    # Mettre à jour le devis avec l'ID de la facture
    await db.devis.update_one(
        {"$or": [{"id": devis_id}, {"_id": devis_id}]},
        {"$set": {"facture_id": facture.id}}
    )
    
    return {"message": "Devis converti en facture", "facture_id": facture.id, "facture_numero": facture.numero}

@app.delete("/api/devis/{devis_id}")
async def supprimer_devis(devis_id: str, motif: str = Query(..., description="Motif de la suppression"), current_user: dict = Depends(manager_and_admin())):
    """Supprimer un devis - Manager et Admin"""
    print(f"🗑️ SUPPRESSION DEVIS - Tentative de suppression pour ID: {devis_id}, Motif: {motif}")
    
    # Vérifier si le devis existe
    devis = await db.devis.find_one({"$or": [{"id": devis_id}, {"_id": devis_id}]})
    
    if not devis:
        try:
            from bson import ObjectId
            devis = await db.devis.find_one({"_id": ObjectId(devis_id)})
        except:
            pass
    
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    # Vérifier que le devis peut être supprimé
    if devis.get("statut") == "accepte" and devis.get("facture_id"):
        raise HTTPException(status_code=400, detail="Impossible de supprimer un devis déjà converti en facture")
    
    # Sauvegarder le devis dans un historique de suppression
    devis_archive = {
        "id": str(uuid.uuid4()),
        "devis_original": devis,
        "motif_suppression": motif,
        "utilisateur_suppression": current_user.get("email", ""),
        "date_suppression": datetime.now()
    }
    await db.devis_supprimes.insert_one(devis_archive)
    
    # Supprimer le devis
    if "_id" in devis and not devis.get("id"):
        result = await db.devis.delete_one({"_id": devis["_id"]})
    else:
        result = await db.devis.delete_one({"id": devis["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Erreur lors de la suppression du devis")
    
    print(f"✅ SUPPRESSION DEVIS - Devis {devis.get('numero', 'N/A')} supprimé avec succès")
    
    return {"message": "Devis supprimé avec succès"}

# OPPORTUNITÉS Routes
@app.get("/api/opportunites")
async def get_opportunites(
    client_id: str = Query(None, description="Filtrer par client"),
    etape: str = Query(None, description="Filtrer par étape"),
    priorite: str = Query(None, description="Filtrer par priorité"),
    commercial_id: str = Query(None, description="Filtrer par commercial"),
    search: str = Query(None, description="Recherche dans titre et description"),
    current_user: dict = Depends(manager_and_admin())
):
    """Récupérer toutes les opportunités avec filtres optionnels - Manager et Admin"""
    
    # Construire la query MongoDB
    query = {}
    
    if client_id:
        query["client_id"] = client_id
    
    if etape:
        query["etape"] = etape
    
    if priorite:
        query["priorite"] = priorite
    
    if commercial_id:
        query["commercial_id"] = commercial_id
    
    if search:
        query["$or"] = [
            {"titre": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    opportunites = []
    async for opp in db.opportunites.find(query).sort("date_creation", -1):
        opp["id"] = str(opp["_id"]) if "_id" in opp else opp.get("id")
        if "_id" in opp:
            del opp["_id"]
        opportunites.append(opp)
    
    return opportunites

@app.get("/api/opportunites/filtres")
async def get_opportunites_filtres(current_user: dict = Depends(manager_and_admin())):
    """Récupérer les options de filtrage pour les opportunités"""
    
    # Récupérer les étapes distinctes
    etapes = await db.opportunites.distinct("etape")
    
    # Récupérer les priorités distinctes
    priorites = await db.opportunites.distinct("priorite")
    
    # Récupérer les commerciaux distinctes
    commerciaux = await db.opportunites.distinct("commercial_id")
    
    # Récupérer les clients qui ont des opportunités
    clients_avec_opportunites = await db.opportunites.distinct("client_id")
    clients_info = []
    for client_id in clients_avec_opportunites:
        client = await db.clients.find_one({"id": client_id})
        if client:
            clients_info.append({
                "id": client_id,
                "nom": client.get("nom", "Client inconnu")
            })
    
    return {
        "etapes": etapes,
        "priorites": priorites,
        "commerciaux": commerciaux,
        "clients": clients_info
    }

@app.post("/api/opportunites", response_model=Opportunite)
async def create_opportunite(opportunite: Opportunite, current_user: dict = Depends(manager_and_admin())):
    """Créer une nouvelle opportunité - Manager et Admin"""
    opportunite.id = str(uuid.uuid4())
    opportunite.date_creation = datetime.now()
    opportunite.commercial_id = current_user["id"]
    
    # Ajuster la probabilité selon l'étape
    if not opportunite.probabilite or opportunite.probabilite == 50:
        opportunite.probabilite = calculer_etape_probabilite(opportunite.etape)
    
    opportunite_dict = opportunite.dict()
    result = await db.opportunites.insert_one(opportunite_dict)
    
    return opportunite

@app.put("/api/opportunites/{opportunite_id}")
async def update_opportunite(opportunite_id: str, opportunite_update: dict, current_user: dict = Depends(manager_and_admin())):
    """Mettre à jour une opportunité - Manager et Admin"""
    
    # Ajuster la probabilité selon l'étape
    if "etape" in opportunite_update:
        opportunite_update["probabilite"] = calculer_etape_probabilite(opportunite_update["etape"])
        if opportunite_update["etape"] in ["ferme_gagne", "ferme_perdu"]:
            opportunite_update["date_cloture_reelle"] = datetime.now()
    
    result = await db.opportunites.update_one(
        {"$or": [{"id": opportunite_id}, {"_id": opportunite_id}]},
        {"$set": opportunite_update}
    )
    
    if result.matched_count == 0:
        try:
            await db.opportunites.update_one(
                {"_id": ObjectId(opportunite_id)},
                {"$set": opportunite_update}
            )
        except:
            pass
    
@app.post("/api/opportunites/{opportunite_id}/lier-client")
async def lier_opportunite_client(opportunite_id: str, request: dict, current_user: dict = Depends(manager_and_admin())):
    """Lier une opportunité à un client supplémentaire - Manager et Admin"""
    nouveau_client_id = request.get("client_id")
    
    if not nouveau_client_id:
        raise HTTPException(status_code=400, detail="client_id requis")
    
    # Vérifier que le client existe
    client = await db.clients.find_one({"$or": [{"id": nouveau_client_id}, {"_id": nouveau_client_id}]})
    if not client:
        try:
            from bson import ObjectId
            client = await db.clients.find_one({"_id": ObjectId(nouveau_client_id)})
        except:
            pass
    
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Vérifier que l'opportunité existe
    opportunite = await db.opportunites.find_one({"$or": [{"id": opportunite_id}, {"_id": opportunite_id}]})
    if not opportunite:
        try:
            from bson import ObjectId
            opportunite = await db.opportunites.find_one({"_id": ObjectId(opportunite_id)})
        except:
            pass
    
    if not opportunite:
        raise HTTPException(status_code=404, detail="Opportunité non trouvée")
    
    # Créer une nouvelle opportunité liée au nouveau client
    nouvelle_opportunite = Opportunite(
        id=str(uuid.uuid4()),
        titre=f"{opportunite['titre']} - {client['nom']}",
        description=f"Opportunité liée - {opportunite.get('description', '')}",
        client_id=nouveau_client_id,
        client_nom=client["nom"],
        valeur_estimee_usd=opportunite["valeur_estimee_usd"],
        valeur_estimee_fc=opportunite["valeur_estimee_fc"],
        devise=opportunite["devise"],
        probabilite=opportunite["probabilite"],
        etape=opportunite["etape"],
        priorite=opportunite["priorite"],
        date_creation=datetime.now(),
        date_cloture_prevue=opportunite.get("date_cloture_prevue"),
        notes=f"Opportunité liée à {opportunite.get('titre', '')} (ID: {opportunite_id})",
        commercial_id=current_user["id"]
    )
    
    # Insérer la nouvelle opportunité
    nouvelle_opportunite_dict = nouvelle_opportunite.dict()
    await db.opportunites.insert_one(nouvelle_opportunite_dict)
    
    # Mettre à jour l'opportunité originale pour ajouter une référence
    await db.opportunites.update_one(
        {"$or": [{"id": opportunite_id}, {"_id": opportunite_id}]},
        {"$addToSet": {"opportunites_liees": nouvelle_opportunite.id}}
    )
    
    # Mettre à jour la nouvelle opportunité pour ajouter une référence à l'originale
    await db.opportunites.update_one(
        {"id": nouvelle_opportunite.id},
        {"$set": {"opportunite_source": opportunite_id, "opportunites_liees": [opportunite_id]}}
    )
    
    return {
        "message": "Opportunité liée avec succès",
        "nouvelle_opportunite_id": nouvelle_opportunite.id,
        "client_nom": client["nom"]
    }

@app.get("/api/opportunites/{opportunite_id}/liees")
async def get_opportunites_liees(opportunite_id: str, current_user: dict = Depends(manager_and_admin())):
    """Récupérer les opportunités liées à une opportunité - Manager et Admin"""
    
    # Chercher les opportunités liées (celles qui ont cette opportunité comme source)
    opportunites_liees = []
    async for opp in db.opportunites.find({"opportunite_source": opportunite_id}):
        opp["id"] = str(opp["_id"]) if "_id" in opp else opp.get("id")
        if "_id" in opp:
            del opp["_id"]
        opportunites_liees.append(opp)
    
    # Chercher aussi les opportunités qui ont cette opportunité dans leurs opportunites_liees
    async for opp in db.opportunites.find({"opportunites_liees": opportunite_id}):
        opp["id"] = str(opp["_id"]) if "_id" in opp else opp.get("id")
        if "_id" in opp:
            del opp["_id"]
        if opp not in opportunites_liees:
            opportunites_liees.append(opp)
    
    return opportunites_liees

# COMMANDES Routes
@app.get("/api/commandes", response_model=List[Commande])
async def get_commandes(current_user: dict = Depends(manager_and_admin())):
    """Récupérer toutes les commandes - Manager et Admin"""
    commandes = []
    async for cmd in db.commandes.find().sort("date_creation", -1):
        cmd["id"] = str(cmd["_id"]) if "_id" in cmd else cmd.get("id")
        if "_id" in cmd:
            del cmd["_id"]
        commandes.append(cmd)
    return commandes

@app.post("/api/commandes", response_model=Commande)
async def create_commande(commande: Commande, current_user: dict = Depends(manager_and_admin())):
    """Créer une nouvelle commande - Manager et Admin"""
    commande.id = str(uuid.uuid4())
    commande.numero = generate_commande_number()
    commande.date_creation = datetime.now()
    
    commande_dict = commande.dict()
    result = await db.commandes.insert_one(commande_dict)
    
    return commande

@app.put("/api/commandes/{commande_id}/statut")
async def update_commande_statut(commande_id: str, statut: str, current_user: dict = Depends(manager_and_admin())):
    """Mettre à jour le statut d'une commande - Manager et Admin"""
    update_data = {"statut": statut}
    
    if statut == "confirmee":
        update_data["date_confirmation"] = datetime.now()
    elif statut == "livree":
        update_data["date_livraison_reelle"] = datetime.now()
    
    result = await db.commandes.update_one(
        {"$or": [{"id": commande_id}, {"_id": commande_id}]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        try:
            await db.commandes.update_one(
                {"_id": ObjectId(commande_id)},
                {"$set": update_data}
            )
        except:
            pass
    
    return {"message": f"Commande mise à jour avec le statut: {statut}"}

# STATISTIQUES VENTE
@app.get("/api/vente/stats", response_model=VenteStats)
async def get_vente_stats(current_user: dict = Depends(manager_and_admin())):
    """Récupérer les statistiques de vente - Manager et Admin"""
    
    # Statistiques générales
    total_devis = await db.devis.count_documents({})
    total_devis_acceptes = await db.devis.count_documents({"statut": "accepte"})
    taux_conversion_devis = (total_devis_acceptes / total_devis * 100) if total_devis > 0 else 0
    
    total_opportunites = await db.opportunites.count_documents({})
    opportunites_en_cours = await db.opportunites.count_documents({"etape": {"$nin": ["ferme_gagne", "ferme_perdu"]}})
    
    total_commandes = await db.commandes.count_documents({})
    commandes_en_cours = await db.commandes.count_documents({"statut": {"$nin": ["livree", "annulee"]}})
    
    # Valeur du pipeline
    pipeline_cursor = db.opportunites.find({"etape": {"$nin": ["ferme_gagne", "ferme_perdu"]}})
    valeur_pipeline_usd = 0
    valeur_pipeline_fc = 0
    
    async for opp in pipeline_cursor:
        valeur_pipeline_usd += opp.get("valeur_estimee_usd", 0) * (opp.get("probabilite", 0) / 100)
        valeur_pipeline_fc += opp.get("valeur_estimee_fc", 0) * (opp.get("probabilite", 0) / 100)
    
    # CA mensuel devis et commandes
    now = datetime.now()
    debut_mois = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    devis_mois = db.devis.find({"statut": "accepte", "date_acceptation": {"$gte": debut_mois}})
    ca_devis_mois_usd = 0
    ca_devis_mois_fc = 0
    
    async for devis in devis_mois:
        ca_devis_mois_usd += devis.get("total_ttc_usd", 0)
        ca_devis_mois_fc += devis.get("total_ttc_fc", 0)
    
    commandes_mois = db.commandes.find({"statut": "livree", "date_livraison_reelle": {"$gte": debut_mois}})
    ca_commandes_mois_usd = 0
    ca_commandes_mois_fc = 0
    
    async for cmd in commandes_mois:
        ca_commandes_mois_usd += cmd.get("total_usd", 0)
        ca_commandes_mois_fc += cmd.get("total_fc", 0)
    
    # Top clients et produits (simplifié pour l'instant)
    top_clients = []
    top_produits = []
    
    return VenteStats(
        total_devis=total_devis,
        total_devis_acceptes=total_devis_acceptes,
        taux_conversion_devis=round(taux_conversion_devis, 2),
        total_opportunites=total_opportunites,
        opportunites_en_cours=opportunites_en_cours,
        valeur_pipeline_usd=round(valeur_pipeline_usd, 2),
        valeur_pipeline_fc=round(valeur_pipeline_fc, 2),
        total_commandes=total_commandes,
        commandes_en_cours=commandes_en_cours,
        ca_devis_mois_usd=round(ca_devis_mois_usd, 2),
        ca_devis_mois_fc=round(ca_devis_mois_fc, 2),
        ca_commandes_mois_usd=round(ca_commandes_mois_usd, 2),
        ca_commandes_mois_fc=round(ca_commandes_mois_fc, 2),
        top_clients=top_clients,
        top_produits=top_produits
    )

@app.get("/api/paiements")
async def get_paiements(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100), current_user: dict = Depends(comptable_manager_admin())):
    """Récupérer tous les paiements avec pagination - Comptable, Manager et Admin"""
    skip = (page - 1) * limit
    
    # Compter le total des paiements
    total_paiements = await db.paiements.count_documents({})
    
    # Récupérer les paiements avec pagination
    paiements = []
    async for paiement in db.paiements.find().sort("date_paiement", -1).skip(skip).limit(limit):
        paiement["id"] = str(paiement["_id"]) if "_id" in paiement else paiement.get("id")
        if "_id" in paiement:
            del paiement["_id"]
        paiements.append(paiement)
    
    # Calculer les métadonnées de pagination
    total_pages = (total_paiements + limit - 1) // limit
    has_next = page < total_pages
    has_prev = page > 1
    
    return {
        "paiements": paiements,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_paiements,
            "total_pages": total_pages,
            "has_next": has_next,
            "has_prev": has_prev
        }
    }

@app.delete("/api/paiements/{paiement_id}")
async def supprimer_paiement(paiement_id: str, motif: str = Query(..., description="Motif de la suppression"), current_user: dict = Depends(comptable_manager_admin())):
    """Supprimer un paiement - Comptable, Manager et Admin"""
    print(f"🗑️ SUPPRESSION PAIEMENT - Tentative de suppression pour ID: {paiement_id}, Motif: {motif}")
    
    # Vérifier si le paiement existe
    paiement = await db.paiements.find_one({"$or": [{"id": paiement_id}, {"_id": paiement_id}]})
    
    if not paiement:
        try:
            from bson import ObjectId
            paiement = await db.paiements.find_one({"_id": ObjectId(paiement_id)})
        except:
            pass
    
    if not paiement:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    # Vérifier le statut du paiement
    if paiement.get("statut") == "valide":
        raise HTTPException(status_code=400, detail="Impossible de supprimer un paiement validé")
    
    # Sauvegarder le paiement dans un historique de suppression
    paiement_archive = {
        "id": str(uuid.uuid4()),
        "paiement_original": paiement,
        "motif_suppression": motif,
        "utilisateur_suppression": current_user.get("email", ""),
        "date_suppression": datetime.now()
    }
    await db.paiements_supprimes.insert_one(paiement_archive)
    
    # Remettre la facture associée en état "envoyee" si elle était marquée comme payée
    if paiement.get("facture_id"):
        facture = await db.factures.find_one({"$or": [{"id": paiement["facture_id"]}, {"_id": paiement["facture_id"]}]})
        if facture and facture.get("statut") == "payee":
            await db.factures.update_one(
                {"$or": [{"id": paiement["facture_id"]}, {"_id": paiement["facture_id"]}]},
                {
                    "$set": {
                        "statut": "envoyee",
                        "date_paiement": None
                    },
                    "$unset": {
                        "methode_paiement": "",
                        "reference_paiement": ""
                    }
                }
            )
    
    # Supprimer le paiement
    if "_id" in paiement and not paiement.get("id"):
        result = await db.paiements.delete_one({"_id": paiement["_id"]})
    else:
        result = await db.paiements.delete_one({"id": paiement["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Erreur lors de la suppression du paiement")
    
    print(f"✅ SUPPRESSION PAIEMENT - Paiement {paiement.get('reference_paiement', 'N/A')} supprimé avec succès")
    
    return {"message": "Paiement supprimé avec succès"}

# Simulation des intégrations
async def simulate_email_send(email: str, numero_facture: str):
    """Simule l'envoi d'email"""
    print(f"📧 EMAIL SIMULÉ - Envoi de la facture {numero_facture} à {email}")

# Route Statistics
@app.get("/api/stats", response_model=StatsResponse)
async def get_stats(current_user: dict = Depends(all_authenticated())):
    """Récupérer les statistiques - Tous les utilisateurs authentifiés"""
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
async def valider_paiement(paiement_id: str, current_user: dict = Depends(comptable_manager_admin())):
    """Valider un paiement - Comptable, Manager et Admin"""
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

# ===== CONFIGURATION ROUTES =====

@app.post("/api/config/logo")
async def upload_logo(request: dict, current_user: dict = Depends(support_only())):
    """Téléverser un nouveau logo - Support seulement"""
    try:
        logo_data = request.get("logo")
        filename = request.get("filename", "logo.png")
        
        if not logo_data:
            raise HTTPException(status_code=400, detail="Aucune image fournie")
        
        # Sauvegarder dans la base de données (ou fichier selon votre préférence)
        config_update = {
            "logo_url": logo_data,
            "logo_filename": filename,
            "updated_at": datetime.now(),
            "updated_by": current_user["id"]
        }
        
        # Mettre à jour ou créer la configuration
        await db.app_config.update_one(
            {"type": "logo"},
            {"$set": config_update},
            upsert=True
        )
        
        return {"message": "Logo mis à jour avec succès", "logo_url": logo_data}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour du logo: {str(e)}")

@app.put("/api/config/app")
async def update_app_config(config: dict, current_user: dict = Depends(support_only())):
    """Mettre à jour la configuration de l'application - Support seulement"""
    try:
        config_update = {
            **config,
            "updated_at": datetime.now(),
            "updated_by": current_user["id"]
        }
        
        # Mettre à jour la configuration générale
        await db.app_config.update_one(
            {"type": "general"},
            {"$set": config_update},
            upsert=True
        )
        
        return {"message": "Configuration mise à jour avec succès"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour de la configuration: {str(e)}")

@app.get("/api/config")
async def get_app_config(current_user: dict = Depends(support_only())):
    """Récupérer la configuration de l'application - Support seulement"""
    try:
        # Récupérer la configuration générale
        general_config = await db.app_config.find_one({"type": "general"}) or {}
        logo_config = await db.app_config.find_one({"type": "logo"}) or {}
        
        config = {
            "appName": general_config.get("appName", "FacturApp"),
            "theme": general_config.get("theme", "light"),
            "language": general_config.get("language", "fr"),
            "logoUrl": logo_config.get("logo_url", "/logo.png")
        }
        
        return config
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de la configuration: {str(e)}")

@app.put("/api/users/{user_id}/status")
async def toggle_user_status(user_id: str, status_data: dict, current_user: dict = Depends(admin_support())):
    """Activer/désactiver un utilisateur - Admin et Support seulement"""
    try:
        is_active = status_data.get("is_active", True)
        
        result = await db.users.update_one(
            {"$or": [{"id": user_id}, {"_id": user_id}]},
            {"$set": {"is_active": is_active, "updated_at": datetime.now()}}
        )
        
        if result.matched_count == 0:
            try:
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": {"is_active": is_active, "updated_at": datetime.now()}}
                )
            except:
                pass
        
        return {"message": f"Utilisateur {'activé' if is_active else 'désactivé'} avec succès"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du changement de statut: {str(e)}")

@app.put("/api/users/{user_id}/role")
async def change_user_role(user_id: str, role_data: dict, current_user: dict = Depends(admin_support())):
    """Changer le rôle d'un utilisateur - Admin et Support seulement"""
    try:
        new_role = role_data.get("role")
        valid_roles = ["admin", "manager", "comptable", "utilisateur", "support", "technicien"]
        
        if new_role not in valid_roles:
            raise HTTPException(status_code=400, detail="Rôle invalide")
        
        result = await db.users.update_one(
            {"$or": [{"id": user_id}, {"_id": user_id}]},
            {"$set": {"role": new_role, "updated_at": datetime.now()}}
        )
        
        if result.matched_count == 0:
            try:
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": {"role": new_role, "updated_at": datetime.now()}}
                )
            except:
                pass
        
        return {"message": f"Rôle utilisateur mis à jour vers {new_role}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour du rôle: {str(e)}")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Application de facturation opérationnelle"}

# ===== ENDPOINTS SÉPARÉS POUR GESTION UTILISATEURS ET PARAMÈTRES =====

# Les endpoints /api/users sont maintenant gérés avec les permissions admin_support() ci-dessus
@app.get("/api/parametres")
async def get_parametres(current_user: dict = Depends(support_only())):
    """Obtenir les paramètres système - Support seulement"""
    try:
        # Statistiques système
        stats = {
            "total_users": await db.users.count_documents({}),
            "total_clients": await db.clients.count_documents({}),
            "total_produits": await db.produits.count_documents({}),
            "total_factures": await db.factures.count_documents({}),
            "total_devis": await db.devis.count_documents({}),
            "factures_payees": await db.factures.count_documents({"statut": "payee"}),
            "factures_en_attente": await db.factures.count_documents({"statut": {"$in": ["brouillon", "envoyee"]}})
        }
        
        # Taux de change actuel
        taux_change = {
            "taux_change_actuel": TAUX_CHANGE["USD_TO_FC"],
            "derniere_modification": datetime.utcnow()
        }
        
        return {
            "stats": stats,
            "taux_change": taux_change,
            "version": {
                "app": "FacturApp",
                "version": "1.0.0",
                "backend": "FastAPI"
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des paramètres: {str(e)}")

@app.post("/api/parametres/taux-change")
async def update_taux_change(taux_data: dict, current_user: dict = Depends(support_only())):
    """Mettre à jour le taux de change - Support seulement"""
    try:
        nouveau_taux = taux_data.get("taux")
        if not nouveau_taux or nouveau_taux <= 0:
            raise HTTPException(status_code=400, detail="Taux de change invalide")
        
        # Mettre à jour le taux global
        TAUX_CHANGE["USD_TO_FC"] = float(nouveau_taux)
        TAUX_CHANGE["FC_TO_USD"] = 1.0 / float(nouveau_taux)
        
        # Enregistrer l'historique (optionnel)
        await db.taux_change_history.insert_one({
            "taux": float(nouveau_taux),
            "date_modification": datetime.utcnow(),
            "modifie_par": current_user.get("email")
        })
        
        return {
            "message": "Taux de change mis à jour avec succès",
            "nouveau_taux": float(nouveau_taux),
            "date_modification": datetime.utcnow()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour du taux: {str(e)}")

@app.get("/api/parametres/health")
async def system_health(current_user: dict = Depends(support_only())):
    """Vérifier la santé du système - Support seulement"""
    try:
        # Vérifier la connexion MongoDB
        try:
            await db.users.count_documents({})
            db_status = "operational"
        except:
            db_status = "error"
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow(),
            "services": {
                "database": db_status,
                "api": "operational",
                "auth": "operational"
            },
            "version": "1.0.0"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la vérification de santé: {str(e)}")

@app.post("/api/parametres/backup")
async def create_backup(current_user: dict = Depends(support_only())):
    """Créer une sauvegarde du système - Support seulement"""
    try:
        # Simulation de sauvegarde
        backup_info = {
            "filename": f"facturapp_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json",
            "timestamp": datetime.utcnow(),
            "created_by": current_user.get("email"),
            "size": "estimated 2.5 MB",
            "status": "success"
        }
        
        return {
            "message": "Sauvegarde créée avec succès",
            "backup": backup_info
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de la sauvegarde: {str(e)}")

@app.get("/api/parametres/logs")
async def get_system_logs(current_user: dict = Depends(support_only())):
    """Obtenir les logs système - Support seulement"""
    try:
        # Simulation des logs système
        logs = [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "level": "INFO",
                "message": f"Authentification réussie pour {current_user.get('email')}",
                "module": "AUTH"
            },
            {
                "timestamp": (datetime.utcnow() - timedelta(minutes=5)).isoformat(),
                "level": "INFO",
                "message": "Nouvelle facture créée",
                "module": "FACTURE"
            },
            {
                "timestamp": (datetime.utcnow() - timedelta(minutes=10)).isoformat(),
                "level": "INFO",
                "message": "Mise à jour du taux de change",
                "module": "PARAMETRES"
            }
        ]
        
        return {"logs": logs}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des logs: {str(e)}")

# ===== ROUTES GESTION D'OUTILS =====

@app.get("/api/outils", response_model=List[Outil])
async def get_outils(current_user: dict = Depends(technicien_manager_admin())):
    """Récupérer tous les outils - Technicien, Manager et Admin"""
    try:
        outils = []
        cursor = db.outils.find({})
        async for outil in cursor:
            outil["id"] = str(outil["_id"]) if "_id" in outil else outil.get("id")
            if "_id" in outil:
                del outil["_id"]
            outils.append(Outil(**outil))
        return outils
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des outils: {str(e)}")

@app.post("/api/outils", response_model=Outil)
async def create_outil(outil: OutilCreate, current_user: dict = Depends(manager_admin())):
    """Créer un nouvel outil - Manager et Admin uniquement"""
    try:
        nouveau_outil = outil.dict()
        
        # Récupérer le nom de l'entrepôt si un entrepôt est spécifié
        entrepot_nom = None
        if nouveau_outil.get("entrepot_id"):
            entrepot = await db.entrepots.find_one({"$or": [{"id": nouveau_outil["entrepot_id"]}, {"_id": nouveau_outil["entrepot_id"]}]})
            if entrepot:
                entrepot_nom = entrepot["nom"]
        
        nouveau_outil.update({
            "id": str(uuid.uuid4()),
            "entrepot_nom": entrepot_nom,
            "quantite_disponible": nouveau_outil["quantite_stock"],
            "date_creation": datetime.now(),
            "date_modification": datetime.now()
        })
        
        await db.outils.insert_one(nouveau_outil)
        
        # Enregistrer un mouvement de stock initial si quantité > 0
        if nouveau_outil["quantite_stock"] > 0:
            mouvement = {
                "id": str(uuid.uuid4()),
                "outil_id": nouveau_outil["id"],
                "type_mouvement": "approvisionnement",
                "quantite": nouveau_outil["quantite_stock"],
                "stock_avant": 0,
                "stock_apres": nouveau_outil["quantite_stock"],
                "motif": "Stock initial",
                "date_mouvement": datetime.now(),
                "fait_par": current_user["email"]
            }
            await db.mouvements_outils.insert_one(mouvement)
        
        nouveau_outil["id"] = str(nouveau_outil["_id"]) if "_id" in nouveau_outil else nouveau_outil.get("id")
        if "_id" in nouveau_outil:
            del nouveau_outil["_id"]
        return Outil(**nouveau_outil)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de l'outil: {str(e)}")

@app.get("/api/outils/{outil_id}", response_model=Outil)
async def get_outil(outil_id: str, current_user: dict = Depends(technicien_manager_admin())):
    """Récupérer un outil spécifique"""
    try:
        outil = await db.outils.find_one({"$or": [{"id": outil_id}, {"_id": outil_id}]})
        if not outil:
            try:
                outil = await db.outils.find_one({"_id": ObjectId(outil_id)})
            except:
                pass
                
        if not outil:
            raise HTTPException(status_code=404, detail="Outil non trouvé")
        
        outil["id"] = str(outil["_id"]) if "_id" in outil else outil.get("id")
        if "_id" in outil:
            del outil["_id"]
        return Outil(**outil)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de l'outil: {str(e)}")

@app.put("/api/outils/{outil_id}", response_model=Outil)
async def update_outil(outil_id: str, outil_data: OutilCreate, current_user: dict = Depends(manager_admin())):
    """Mettre à jour un outil - Manager et Admin uniquement"""
    try:
        outil_update = outil_data.dict()
        outil_update["date_modification"] = datetime.now()
        
        # Vérifier que l'outil existe
        outil_existant = await db.outils.find_one({"$or": [{"id": outil_id}, {"_id": outil_id}]})
        if not outil_existant:
            try:
                outil_existant = await db.outils.find_one({"_id": ObjectId(outil_id)})
            except:
                pass
                
        if not outil_existant:
            raise HTTPException(status_code=404, detail="Outil non trouvé")
        
        # Mettre à jour la quantité disponible si le stock total change
        if outil_update["quantite_stock"] != outil_existant.get("quantite_stock", 0):
            difference = outil_update["quantite_stock"] - outil_existant.get("quantite_stock", 0)
            nouvelle_dispo = outil_existant.get("quantite_disponible", 0) + difference
            outil_update["quantite_disponible"] = max(0, nouvelle_dispo)
        
        result = await db.outils.update_one(
            {"$or": [{"id": outil_id}, {"_id": outil_id}]},
            {"$set": outil_update}
        )
        
        if result.matched_count == 0:
            try:
                await db.outils.update_one(
                    {"_id": ObjectId(outil_id)},
                    {"$set": outil_update}
                )
            except:
                pass
        
        # Récupérer l'outil mis à jour
        outil_maj = await db.outils.find_one({"$or": [{"id": outil_id}, {"_id": outil_id}]})
        if not outil_maj:
            try:
                outil_maj = await db.outils.find_one({"_id": ObjectId(outil_id)})
            except:
                pass
        
        outil_maj["id"] = str(outil_maj["_id"]) if "_id" in outil_maj else outil_maj.get("id")
        if "_id" in outil_maj:
            del outil_maj["_id"]
        return Outil(**outil_maj)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour de l'outil: {str(e)}")

@app.delete("/api/outils/{outil_id}")
async def delete_outil(outil_id: str, current_user: dict = Depends(manager_admin())):
    """Supprimer un outil - Manager et Admin uniquement"""
    try:
        # Vérifier s'il y a des affectations actives
        affectations_actives = await db.affectations_outils.count_documents({
            "outil_id": outil_id,
            "statut": "affecte"
        })
        
        if affectations_actives > 0:
            raise HTTPException(
                status_code=400, 
                detail="Impossible de supprimer l'outil : des affectations sont encore actives"
            )
        
        result = await db.outils.delete_one({"$or": [{"id": outil_id}, {"_id": outil_id}]})
        
        if result.deleted_count == 0:
            try:
                result = await db.outils.delete_one({"_id": ObjectId(outil_id)})
            except:
                pass
                
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Outil non trouvé")
        
        return {"message": "Outil supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression de l'outil: {str(e)}")

@app.post("/api/outils/{outil_id}/approvisionner")
async def approvisionner_outil(outil_id: str, approvisionnement: ApprovisionnementOutil, current_user: dict = Depends(manager_admin())):
    """Approvisionner un outil - Manager et Admin uniquement"""
    try:
        # Récupérer l'outil
        outil = await db.outils.find_one({"$or": [{"id": outil_id}, {"_id": outil_id}]})
        if not outil:
            try:
                outil = await db.outils.find_one({"_id": ObjectId(outil_id)})
            except:
                pass
                
        if not outil:
            raise HTTPException(status_code=404, detail="Outil non trouvé")
        
        # Mettre à jour les quantités
        ancien_stock = outil.get("quantite_stock", 0)
        ancienne_dispo = outil.get("quantite_disponible", 0)
        
        nouveau_stock = ancien_stock + approvisionnement.quantite_ajoutee
        nouvelle_dispo = ancienne_dispo + approvisionnement.quantite_ajoutee
        
        # Mettre à jour l'outil
        update_data = {
            "quantite_stock": nouveau_stock,
            "quantite_disponible": nouvelle_dispo,
            "date_modification": datetime.now()
        }
        
        if approvisionnement.prix_unitaire_usd:
            update_data["prix_unitaire_usd"] = approvisionnement.prix_unitaire_usd
        if approvisionnement.fournisseur:
            update_data["fournisseur"] = approvisionnement.fournisseur
        if approvisionnement.date_achat:
            update_data["date_achat"] = approvisionnement.date_achat
        
        result = await db.outils.update_one(
            {"$or": [{"id": outil_id}, {"_id": outil_id}]},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            try:
                result = await db.outils.update_one(
                    {"_id": ObjectId(outil_id)},
                    {"$set": update_data}
                )
            except:
                pass
                
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Outil non trouvé pour mise à jour")
        
        # Enregistrer le mouvement
        mouvement = {
            "id": str(uuid.uuid4()),
            "outil_id": outil_id,
            "type_mouvement": "approvisionnement",
            "quantite": approvisionnement.quantite_ajoutee,
            "stock_avant": ancien_stock,
            "stock_apres": nouveau_stock,
            "motif": approvisionnement.notes or "Approvisionnement",
            "date_mouvement": datetime.now(),
            "fait_par": current_user["email"]
        }
        await db.mouvements_outils.insert_one(mouvement)
        
        return {
            "message": "Outil approvisionné avec succès",
            "quantite_ajoutee": approvisionnement.quantite_ajoutee,
            "nouveau_stock": nouveau_stock,
            "nouvelle_disponibilite": nouvelle_dispo
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'approvisionnement: {str(e)}")

# Routes Affectations d'outils
@app.get("/api/affectations", response_model=List[AffectationOutil])
async def get_affectations(current_user: dict = Depends(technicien_manager_admin())):
    """Récupérer les affectations d'outils"""
    try:
        # Si c'est un technicien, ne montrer que ses propres affectations
        if current_user.get("role") == "technicien":
            filter_query = {"technicien_id": current_user["id"]}
        else:
            filter_query = {}
        
        affectations = []
        cursor = db.affectations_outils.find(filter_query).sort("date_affectation", -1)
        async for affectation in cursor:
            affectation["id"] = str(affectation["_id"]) if "_id" in affectation else affectation.get("id")
            if "_id" in affectation:
                del affectation["_id"]
            affectations.append(AffectationOutil(**affectation))
        return affectations
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des affectations: {str(e)}")

@app.post("/api/outils/{outil_id}/affecter", response_model=AffectationOutil)
async def affecter_outil(outil_id: str, affectation: AffectationOutilCreate, current_user: dict = Depends(manager_admin())):
    """Affecter un outil à un technicien - Manager et Admin uniquement"""
    try:
        # Vérifier que l'outil existe
        outil = await db.outils.find_one({"$or": [{"id": outil_id}, {"_id": outil_id}]})
        if not outil:
            try:
                outil = await db.outils.find_one({"_id": ObjectId(outil_id)})
            except:
                pass
                
        if not outil:
            raise HTTPException(status_code=404, detail="Outil non trouvé")
        
        # Vérifier la disponibilité
        if outil.get("quantite_disponible", 0) < affectation.quantite_affectee:
            raise HTTPException(
                status_code=400, 
                detail=f"Quantité non disponible. Disponible: {outil.get('quantite_disponible', 0)}"
            )
        
        # Vérifier que le technicien existe
        technicien = await db.users.find_one({
            "$or": [{"id": affectation.technicien_id}, {"_id": affectation.technicien_id}],
            "role": "technicien"
        })
        if not technicien:
            try:
                technicien = await db.users.find_one({
                    "_id": ObjectId(affectation.technicien_id),
                    "role": "technicien"
                })
            except:
                pass
                
        if not technicien:
            raise HTTPException(status_code=404, detail="Technicien non trouvé")
        
        # Créer l'affectation
        nouvelle_affectation = {
            "id": str(uuid.uuid4()),
            "outil_id": outil_id,
            "outil_nom": outil["nom"],
            "technicien_id": affectation.technicien_id,
            "technicien_nom": f"{technicien['prenom']} {technicien['nom']}",
            "quantite_affectee": affectation.quantite_affectee,
            "date_affectation": datetime.now(),
            "date_retour_prevue": affectation.date_retour_prevue,
            "statut": "affecte",
            "notes_affectation": affectation.notes_affectation,
            "affecte_par": current_user["email"]
        }
        
        await db.affectations_outils.insert_one(nouvelle_affectation)
        
        # Mettre à jour la disponibilité de l'outil
        nouvelle_dispo = outil.get("quantite_disponible", 0) - affectation.quantite_affectee
        await db.outils.update_one(
            {"$or": [{"id": outil_id}, {"_id": outil_id}]},
            {"$set": {"quantite_disponible": nouvelle_dispo}}
        )
        
        # Enregistrer le mouvement
        mouvement = {
            "id": str(uuid.uuid4()),
            "outil_id": outil_id,
            "type_mouvement": "affectation",
            "quantite": affectation.quantite_affectee,
            "stock_avant": outil.get("quantite_disponible", 0),
            "stock_apres": nouvelle_dispo,
            "motif": f"Affectation à {technicien['prenom']} {technicien['nom']}",
            "date_mouvement": datetime.now(),
            "fait_par": current_user["email"]
        }
        await db.mouvements_outils.insert_one(mouvement)
        
        nouvelle_affectation["id"] = str(nouvelle_affectation["_id"]) if "_id" in nouvelle_affectation else nouvelle_affectation.get("id")
        if "_id" in nouvelle_affectation:
            del nouvelle_affectation["_id"]
        return AffectationOutil(**nouvelle_affectation)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'affectation: {str(e)}")

@app.put("/api/affectations/{affectation_id}/retourner")
async def retourner_outil(affectation_id: str, retour: RetourOutil, current_user: dict = Depends(technicien_manager_admin())):
    """Retourner un outil - Technicien, Manager et Admin"""
    try:
        # Récupérer l'affectation
        affectation = await db.affectations_outils.find_one({
            "$or": [{"id": affectation_id}, {"_id": affectation_id}],
            "statut": "affecte"
        })
        if not affectation:
            try:
                affectation = await db.affectations_outils.find_one({
                    "_id": ObjectId(affectation_id),
                    "statut": "affecte"
                })
            except:
                pass
                
        if not affectation:
            raise HTTPException(status_code=404, detail="Affectation non trouvée ou déjà retournée")
        
        # Vérifier que c'est le technicien concerné ou un manager/admin
        if (current_user.get("role") == "technicien" and 
            current_user["id"] != affectation["technicien_id"]):
            raise HTTPException(status_code=403, detail="Vous ne pouvez retourner que vos propres outils")
        
        # Vérifier la quantité
        if retour.quantite_retournee > affectation["quantite_affectee"]:
            raise HTTPException(
                status_code=400,
                detail="Quantité retournée supérieure à la quantité affectée"
            )
        
        # Mettre à jour l'affectation
        nouveau_statut = "retourne" if retour.etat_retour == "bon" else retour.etat_retour
        
        await db.affectations_outils.update_one(
            {"$or": [{"id": affectation_id}, {"_id": affectation_id}]},
            {"$set": {
                "statut": nouveau_statut,
                "date_retour_effective": datetime.now(),
                "notes_retour": retour.notes_retour
            }}
        )
        
        # Mettre à jour la disponibilité de l'outil seulement si en bon état
        if retour.etat_retour == "bon":
            outil = await db.outils.find_one({"$or": [{"id": affectation["outil_id"]}, {"_id": affectation["outil_id"]}]})
            if outil:
                nouvelle_dispo = outil.get("quantite_disponible", 0) + retour.quantite_retournee
                await db.outils.update_one(
                    {"$or": [{"id": affectation["outil_id"]}, {"_id": affectation["outil_id"]}]},
                    {"$set": {"quantite_disponible": nouvelle_dispo}}
                )
        
        # Enregistrer le mouvement
        mouvement = {
            "id": str(uuid.uuid4()),
            "outil_id": affectation["outil_id"],
            "type_mouvement": "retour",
            "quantite": retour.quantite_retournee,
            "stock_avant": "N/A",
            "stock_apres": "N/A",
            "motif": f"Retour {retour.etat_retour} - {retour.notes_retour or 'Aucune note'}",
            "date_mouvement": datetime.now(),
            "fait_par": current_user["email"]
        }
        await db.mouvements_outils.insert_one(mouvement)
        
        return {
            "message": "Outil retourné avec succès",
            "quantite_retournee": retour.quantite_retournee,
            "etat": retour.etat_retour
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du retour: {str(e)}")

@app.get("/api/outils/{outil_id}/mouvements")
async def get_mouvements_outil(outil_id: str, current_user: dict = Depends(technicien_manager_admin())):
    """Récupérer l'historique des mouvements d'un outil"""
    try:
        mouvements = []
        cursor = db.mouvements_outils.find({"outil_id": outil_id}).sort("date_mouvement", -1)
        async for mouvement in cursor:
            mouvement["id"] = str(mouvement["_id"]) if "_id" in mouvement else mouvement.get("id")
            if "_id" in mouvement:
                del mouvement["_id"]
            mouvements.append(mouvement)
        
        return {"mouvements": mouvements}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des mouvements: {str(e)}")

# ===== ROUTES GESTION D'ENTREPÔTS =====

@app.get("/api/entrepots", response_model=List[Entrepot])
async def get_entrepots(current_user: dict = Depends(technicien_manager_admin())):
    """Récupérer tous les entrepôts - Technicien, Manager et Admin"""
    try:
        entrepots = []
        cursor = db.entrepots.find({})
        async for entrepot in cursor:
            entrepot["id"] = str(entrepot["_id"]) if "_id" in entrepot else entrepot.get("id")
            if "_id" in entrepot:
                del entrepot["_id"]
            entrepots.append(Entrepot(**entrepot))
        return entrepots
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des entrepôts: {str(e)}")

@app.post("/api/entrepots", response_model=Entrepot)
async def create_entrepot(entrepot: EntrepotCreate, current_user: dict = Depends(manager_admin())):
    """Créer un nouvel entrepôt - Manager et Admin uniquement"""
    try:
        nouvel_entrepot = entrepot.dict()
        nouvel_entrepot.update({
            "id": str(uuid.uuid4()),
            "date_creation": datetime.now(),
            "date_modification": datetime.now()
        })
        
        await db.entrepots.insert_one(nouvel_entrepot)
        
        nouvel_entrepot["id"] = str(nouvel_entrepot["_id"]) if "_id" in nouvel_entrepot else nouvel_entrepot.get("id")
        if "_id" in nouvel_entrepot:
            del nouvel_entrepot["_id"]
        return Entrepot(**nouvel_entrepot)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création de l'entrepôt: {str(e)}")

@app.get("/api/entrepots/{entrepot_id}", response_model=Entrepot)
async def get_entrepot(entrepot_id: str, current_user: dict = Depends(technicien_manager_admin())):
    """Récupérer un entrepôt spécifique"""
    try:
        entrepot = await db.entrepots.find_one({"$or": [{"id": entrepot_id}, {"_id": entrepot_id}]})
        if not entrepot:
            try:
                entrepot = await db.entrepots.find_one({"_id": ObjectId(entrepot_id)})
            except:
                pass
                
        if not entrepot:
            raise HTTPException(status_code=404, detail="Entrepôt non trouvé")
        
        entrepot["id"] = str(entrepot["_id"]) if "_id" in entrepot else entrepot.get("id")
        if "_id" in entrepot:
            del entrepot["_id"]
        return Entrepot(**entrepot)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération de l'entrepôt: {str(e)}")

@app.put("/api/entrepots/{entrepot_id}", response_model=Entrepot)
async def update_entrepot(entrepot_id: str, entrepot_data: EntrepotCreate, current_user: dict = Depends(manager_admin())):
    """Mettre à jour un entrepôt - Manager et Admin uniquement"""
    try:
        entrepot_update = entrepot_data.dict()
        entrepot_update["date_modification"] = datetime.now()
        
        result = await db.entrepots.update_one(
            {"$or": [{"id": entrepot_id}, {"_id": entrepot_id}]},
            {"$set": entrepot_update}
        )
        
        if result.matched_count == 0:
            try:
                result = await db.entrepots.update_one(
                    {"_id": ObjectId(entrepot_id)},
                    {"$set": entrepot_update}
                )
            except:
                pass
                
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Entrepôt non trouvé")
        
        # Récupérer l'entrepôt mis à jour
        entrepot_maj = await db.entrepots.find_one({"$or": [{"id": entrepot_id}, {"_id": entrepot_id}]})
        if not entrepot_maj:
            try:
                entrepot_maj = await db.entrepots.find_one({"_id": ObjectId(entrepot_id)})
            except:
                pass
        
        entrepot_maj["id"] = str(entrepot_maj["_id"]) if "_id" in entrepot_maj else entrepot_maj.get("id")
        if "_id" in entrepot_maj:
            del entrepot_maj["_id"]
        return Entrepot(**entrepot_maj)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour de l'entrepôt: {str(e)}")

@app.delete("/api/entrepots/{entrepot_id}")
async def delete_entrepot(entrepot_id: str, current_user: dict = Depends(manager_admin())):
    """Supprimer un entrepôt - Manager et Admin uniquement"""
    try:
        # Vérifier s'il y a des outils dans cet entrepôt
        outils_count = await db.outils.count_documents({"entrepot_id": entrepot_id})
        
        if outils_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de supprimer l'entrepôt : {outils_count} outil(s) sont encore stocké(s) dans cet entrepôt"
            )
        
        result = await db.entrepots.delete_one({"$or": [{"id": entrepot_id}, {"_id": entrepot_id}]})
        
        if result.deleted_count == 0:
            try:
                result = await db.entrepots.delete_one({"_id": ObjectId(entrepot_id)})
            except:
                pass
                
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Entrepôt non trouvé")
        
        return {"message": "Entrepôt supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression de l'entrepôt: {str(e)}")

# ===== ROUTES RAPPORTS OUTILS =====

@app.get("/api/outils/rapports/mouvements")
async def get_rapport_mouvements_outils(
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    entrepot_id: Optional[str] = None,
    type_mouvement: Optional[str] = None,
    current_user: dict = Depends(technicien_manager_admin())
):
    """Rapport complet des mouvements d'outils avec filtres"""
    try:
        # Construire les filtres
        filters = {}
        
        # Filtre par dates
        if date_debut and date_fin:
            try:
                debut = datetime.strptime(date_debut, "%Y-%m-%d")
                fin = datetime.strptime(date_fin, "%Y-%m-%d")
                filters["date_mouvement"] = {
                    "$gte": debut,
                    "$lte": fin.replace(hour=23, minute=59, second=59)
                }
            except ValueError:
                raise HTTPException(status_code=400, detail="Format de date invalide. Utilisez YYYY-MM-DD")
        
        # Filtre par entrepôt (via jointure avec les outils)
        entrepot_filter = {}
        if entrepot_id:
            entrepot_filter = {"entrepot_id": entrepot_id}
        
        # Filtre par type de mouvement
        if type_mouvement:
            filters["type_mouvement"] = type_mouvement
        
        # Pipeline d'agrégation pour joindre avec les outils et entrepôts
        pipeline = [
            {"$match": filters},
            {
                "$lookup": {
                    "from": "outils",
                    "localField": "outil_id",
                    "foreignField": "id",
                    "as": "outil_info"
                }
            },
            {"$unwind": {"path": "$outil_info", "preserveNullAndEmptyArrays": True}},
            {
                "$lookup": {
                    "from": "entrepots", 
                    "localField": "outil_info.entrepot_id",
                    "foreignField": "id",
                    "as": "entrepot_info"
                }
            },
            {"$unwind": {"path": "$entrepot_info", "preserveNullAndEmptyArrays": True}},
            {"$sort": {"date_mouvement": -1}}
        ]
        
        # Appliquer le filtre d'entrepôt si spécifié
        if entrepot_id:
            pipeline.insert(2, {"$match": {"outil_info.entrepot_id": entrepot_id}})
        
        mouvements = []
        cursor = db.mouvements_outils.aggregate(pipeline)
        
        async for mouvement in cursor:
            mouvement_data = {
                "id": str(mouvement["_id"]) if "_id" in mouvement else mouvement.get("id"),
                "outil_id": mouvement.get("outil_id"),
                "outil_nom": mouvement.get("outil_info", {}).get("nom", "N/A"),
                "outil_reference": mouvement.get("outil_info", {}).get("reference", "N/A"),
                "entrepot_nom": mouvement.get("entrepot_info", {}).get("nom", "N/A"),
                "type_mouvement": mouvement.get("type_mouvement"),
                "quantite": mouvement.get("quantite"),
                "stock_avant": mouvement.get("stock_avant"),
                "stock_apres": mouvement.get("stock_apres"),
                "motif": mouvement.get("motif"),
                "date_mouvement": mouvement.get("date_mouvement"),
                "fait_par": mouvement.get("fait_par")
            }
            mouvements.append(mouvement_data)
        
        # Statistiques du rapport
        stats = {
            "total_mouvements": len(mouvements),
            "approvisionnements": len([m for m in mouvements if m["type_mouvement"] == "approvisionnement"]),
            "affectations": len([m for m in mouvements if m["type_mouvement"] == "affectation"]),
            "retours": len([m for m in mouvements if m["type_mouvement"] == "retour"]),
            "periode": {
                "debut": date_debut or "Début",
                "fin": date_fin or "Aujourd'hui"
            }
        }
        
        return {
            "mouvements": mouvements,
            "statistiques": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du rapport: {str(e)}")

@app.get("/api/outils/rapports/stock-par-entrepot")
async def get_rapport_stock_entrepots(current_user: dict = Depends(technicien_manager_admin())):
    """Rapport des stocks par entrepôt"""
    try:
        # Pipeline d'agrégation pour grouper les outils par entrepôt
        pipeline = [
            {
                "$group": {
                    "_id": "$entrepot_id",
                    "total_outils": {"$sum": 1},
                    "stock_total": {"$sum": "$quantite_stock"},
                    "stock_disponible": {"$sum": "$quantite_disponible"},
                    "valeur_totale_usd": {"$sum": {"$multiply": ["$quantite_stock", "$prix_unitaire_usd"]}},
                    "outils": {
                        "$push": {
                            "nom": "$nom",
                            "reference": "$reference", 
                            "quantite_stock": "$quantite_stock",
                            "quantite_disponible": "$quantite_disponible",
                            "prix_unitaire_usd": "$prix_unitaire_usd"
                        }
                    }
                }
            },
            {
                "$lookup": {
                    "from": "entrepots",
                    "localField": "_id", 
                    "foreignField": "id",
                    "as": "entrepot_info"
                }
            },
            {"$unwind": {"path": "$entrepot_info", "preserveNullAndEmptyArrays": True}}
        ]
        
        stocks_par_entrepot = []
        cursor = db.outils.aggregate(pipeline)
        
        async for stock in cursor:
            stock_data = {
                "entrepot_id": stock.get("_id"),
                "entrepot_nom": stock.get("entrepot_info", {}).get("nom", "Sans entrepôt"),
                "entrepot_adresse": stock.get("entrepot_info", {}).get("adresse", "N/A"),
                "total_outils": stock.get("total_outils", 0),
                "stock_total": stock.get("stock_total", 0),
                "stock_disponible": stock.get("stock_disponible", 0),
                "stock_affecte": stock.get("stock_total", 0) - stock.get("stock_disponible", 0),
                "valeur_totale_usd": round(stock.get("valeur_totale_usd", 0), 2),
                "outils": stock.get("outils", [])
            }
            stocks_par_entrepot.append(stock_data)
        
        # Statistiques globales
        stats = {
            "nombre_entrepots": len(stocks_par_entrepot),
            "stock_total_global": sum([s["stock_total"] for s in stocks_par_entrepot]),
            "stock_disponible_global": sum([s["stock_disponible"] for s in stocks_par_entrepot]),
            "valeur_totale_globale_usd": round(sum([s["valeur_totale_usd"] for s in stocks_par_entrepot]), 2)
        }
        
        return {
            "stocks_par_entrepot": stocks_par_entrepot,
            "statistiques_globales": stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération du rapport de stock: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)