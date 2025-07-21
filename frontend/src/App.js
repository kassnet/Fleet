import React, { useState, useEffect } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import ThemeToggle from './components/ThemeToggle';
import LanguageSelector from './components/LanguageSelector';
import axios from 'axios';

const AppContent = () => {
  const { user, logout, accessToken, canManageClients, canManageProducts, canManageInvoices, canManagePayments, canManageUsers, canViewOnly } = useAuth();
  const { t } = useLanguage();
  
  // States existants
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [produits, setProduits] = useState([]);
  const [factures, setFactures] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [stats, setStats] = useState({});
  const [tauxChange, setTauxChange] = useState({ taux_change_actuel: 2800 });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Sales states
  const [devis, setDevis] = useState([]);
  const [opportunites, setOpportunites] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [venteStats, setVenteStats] = useState({});
  const [activeSalesTab, setActiveSalesTab] = useState('dashboard');
  const [users, setUsers] = useState([]);

  // Tool management states
  const [outils, setOutils] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [entrepots, setEntrepots] = useState([]);
  const [showOutilModal, setShowOutilModal] = useState(false);
  const [showApprovisionnementModal, setShowApprovisionnementModal] = useState(false);
  const [showAffectationModal, setShowAffectationModal] = useState(false);
  const [showRetourModal, setShowRetourModal] = useState(false);
  const [showMouvementsOutilModal, setShowMouvementsOutilModal] = useState(false);
  const [showEntrepotModal, setShowEntrepotModal] = useState(false);
  const [showRapportModal, setShowRapportModal] = useState(false);
  const [selectedOutil, setSelectedOutil] = useState(null);
  const [selectedAffectation, setSelectedAffectation] = useState(null);
  const [selectedEntrepot, setSelectedEntrepot] = useState(null);
  const [mouvementsOutil, setMouvementsOutil] = useState([]);
  const [rapportMouvements, setRapportMouvements] = useState(null);
  const [rapportStocks, setRapportStocks] = useState(null);
  const [editingOutil, setEditingOutil] = useState(null);
  const [editingEntrepot, setEditingEntrepot] = useState(null);

  // Modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProduitModal, setShowProduitModal] = useState(false);
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showMouvementsModal, setShowMouvementsModal] = useState(false);
  const [showTauxModal, setShowTauxModal] = useState(false);
  
  // Sales modal states
  const [showDevisModal, setShowDevisModal] = useState(false);
  const [showOpportuniteModal, setShowOpportuniteModal] = useState(false);
  const [showCommandeModal, setShowCommandeModal] = useState(false);
  const [showActiviteModal, setShowActiviteModal] = useState(false);
  const [showAnnulerFactureModal, setShowAnnulerFactureModal] = useState(false);
  const [showSupprimerFactureModal, setShowSupprimerFactureModal] = useState(false);
  const [showSupprimerPaiementModal, setShowSupprimerPaiementModal] = useState(false);
  const [showSupprimerDevisModal, setShowSupprimerDevisModal] = useState(false);
  const [factureToCancel, setFactureToCancel] = useState(null);
  const [factureToDelete, setFactureToDelete] = useState(null);
  const [paiementToDelete, setPaiementToDelete] = useState(null);
  const [devisToDelete, setDevisToDelete] = useState(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [motifSuppression, setMotifSuppression] = useState('');
  const [motifSuppressionPaiement, setMotifSuppressionPaiement] = useState('');
  const [motifSuppressionDevis, setMotifSuppressionDevis] = useState('');
  const [paginationPaiements, setPaginationPaiements] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });

  // Configuration states
  const [appConfig, setAppConfig] = useState({
    appName: 'FacturApp',
    logoUrl: '/logo.png',
    theme: 'light',
    language: 'fr'
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Form states
  const [clientForm, setClientForm] = useState({ nom: '', email: '', telephone: '', adresse: '' });
  const [produitForm, setProduitForm] = useState({ nom: '', description: '', prix_usd: '', prix_fc: '', stock_actuel: '', stock_minimum: '', gestion_stock: true });
  const [factureForm, setFactureForm] = useState({ client_id: '', items: [], devise: 'USD', notes: '', numero: '' });
  const [stockForm, setStockForm] = useState({ produit_id: '', operation: 'ajouter', quantite: '', motif: '' });
  const [nouveauTaux, setNouveauTaux] = useState(2800);

  // Sales form states
  const [devisForm, setDevisForm] = useState({ client_id: '', items: [], devise: 'USD', notes: '', validite_jours: 30 });
  const [opportuniteForm, setOpportuniteForm] = useState({ 
    titre: '', description: '', client_id: '', valeur_estimee_usd: '', devise: 'USD', 
    probabilite: 50, etape: 'prospect', priorite: 'moyenne', notes: '' 
  });
  const [commandeForm, setCommandeForm] = useState({ 
    client_id: '', opportunite_id: '', items: [], devise: 'USD', 
    adresse_livraison: '', notes: '' 
  });
  const [activiteForm, setActiviteForm] = useState({
    type_activite: 'appel', titre: '', description: '', date_activite: '', 
    duree_minutes: '', resultat: '', prochaine_action: '', date_prochaine_action: ''
  });

  // Tool forms
  const [outilForm, setOutilForm] = useState({
    nom: '', description: '', reference: '', entrepot_id: '', quantite_stock: 0, prix_unitaire_usd: '',
    fournisseur: '', date_achat: '', etat: 'neuf', localisation: '', numero_serie: ''
  });
  const [entrepotForm, setEntrepotForm] = useState({
    nom: '', description: '', adresse: '', responsable: '', capacite_max: '', statut: 'actif'
  });
  const [rapportForm, setRapportForm] = useState({
    date_debut: '', date_fin: '', entrepot_id: '', type_mouvement: ''
  });
  const [approvisionnementForm, setApprovisionnementForm] = useState({
    quantite_ajoutee: 0, prix_unitaire_usd: '', fournisseur: '', date_achat: '', notes: ''
  });
  const [affectationForm, setAffectationForm] = useState({
    technicien_id: '', quantite_affectee: 1, date_retour_prevue: '', notes_affectation: ''
  });
  const [retourForm, setRetourForm] = useState({
    quantite_retournee: 1, etat_retour: 'bon', notes_retour: ''
  });

  // Edition states
  const [editingClient, setEditingClient] = useState(null);
  const [editingProduit, setEditingProduit] = useState(null);
  const [editingFacture, setEditingFacture] = useState(null);
  const [mouvementsStock, setMouvementsStock] = useState([]);
  
  // Sales edition states
  const [editingDevis, setEditingDevis] = useState(null);
  const [editingOpportunite, setEditingOpportunite] = useState(null);
  const [showLierOpportuniteModal, setShowLierOpportuniteModal] = useState(false);
  const [opportuniteToLink, setOpportuniteToLink] = useState(null);
  const [filtresOpportunites, setFiltresOpportunites] = useState({
    client_id: '',
    etape: '',
    priorite: '',
    commercial_id: '',
    search: ''
  });
  const [optionsFiltres, setOptionsFiltres] = useState({
    etapes: [],
    priorites: [],
    commerciaux: [],
    clients: []
  });
  const [editingCommande, setEditingCommande] = useState(null);
  const [selectedOpportunite, setSelectedOpportunite] = useState(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Permissions pour les ventes (Admin et Manager uniquement)
  const canManageSales = () => {
    return user && ['admin', 'manager'].includes(user.role);
  };

  // Permission pour accéder aux paramètres (Support uniquement)
  const canAccessSettings = () => {
    return user && user.role === 'support';
  };

  // Permission pour gérer les utilisateurs (Admin et Support)
  const canManageUsersExtended = () => {
    return user && ['admin', 'support'].includes(user.role);
  };

  // Permission pour accéder aux outils (Technicien, Manager et Admin)
  const canAccessTools = () => {
    return user && ['technicien', 'manager', 'admin'].includes(user.role);
  };

  // Permission pour gérer les outils - création, modification, suppression (Manager et Admin)
  const canManageTools = () => {
    return user && ['manager', 'admin'].includes(user.role);
  };

  // Helper pour les requêtes authentifiées
  const apiCall = (method, url, data = null) => {
    // Bloquer l'accès aux données restreintes pour les utilisateurs "utilisateur"
    if (user?.role === 'utilisateur' && (url.includes('/factures') || url.includes('/paiements'))) {
      console.log('🚫 Requête bloquée pour utilisateur:', method, url);
      return Promise.reject(new Error('Accès refusé pour ce rôle'));
    }

    const config = {
      method,
      url: `${API_URL}${url}`,
      headers: {}
    };

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    console.log('🔑 API Call:', method, url, 'Token présent:', !!accessToken, 'Rôle:', user?.role);
    return axios(config);
  };

  // Données de devises
  const devises = [
    { code: 'USD', nom: 'Dollar Américain', symbole: '$' },
    { code: 'FC', nom: 'Franc Congolais', symbole: 'FC' }
  ];

  // Fonctions utilitaires
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const showConfirm = (message, onConfirm, onCancel = null) => {
    setConfirmDialog({
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setConfirmDialog(null);
      }
    });
  };

  const formatMontant = (montant, devise) => {
    const symbole = devise === 'USD' ? '$' : 'FC';
    return `${symbole} ${parseFloat(montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`;
  };

  const convertirMontant = (montant, deviseSource, deviseCible) => {
    if (deviseSource === deviseCible) return montant;
    
    const taux = tauxChange?.taux_change_actuel || 2800; // Valeur par défaut
    
    if (deviseSource === 'USD' && deviseCible === 'FC') {
      return montant * taux;
    } else if (deviseSource === 'FC' && deviseCible === 'USD') {
      return montant / taux;
    }
    return montant;
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
      manager: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
      comptable: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
      utilisateur: 'bg-gradient-to-r from-gray-500 to-slate-500 text-white',
      support: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
    };
    return styles[role] || styles.utilisateur;
  };

  const getRoleEmoji = (role) => {
    const emojis = {
      admin: '👑',
      manager: '👔',
      comptable: '💰',
      utilisateur: '👤',
      support: '🔧'
    };
    return emojis[role] || '👤';
  };

  const loadData = async () => {
    if (!user || !accessToken) {
      console.log('❌ Pas d\'utilisateur ou de token, abandon du chargement');
      return;
    }

    // Éviter les appels multiples simultanés
    if (loading) {
      console.log('⚠️ Chargement déjà en cours, skip loadData');
      return;
    }
    
    setLoading(true);
    try {
      console.log('🔄 Début chargement des données avec token pour rôle:', user.role);
      
      // Données accessibles à tous les utilisateurs authentifiés
      console.log('📊 Chargement des données de base...');
      const [clientsRes, produitsRes, statsRes, tauxRes] = await Promise.all([
        apiCall('GET', '/api/clients'),
        apiCall('GET', '/api/produits'),
        apiCall('GET', '/api/stats'),
        apiCall('GET', '/api/taux-change')
      ]);

      setClients(clientsRes.data || []);
      setProduits(produitsRes.data || []);
      setStats(statsRes.data || {});
      // Adapter la structure de données du backend (taux) vers le format attendu par le frontend (taux_change_actuel)
      const newTauxData = tauxRes.data ? { taux_change_actuel: tauxRes.data.taux } : { taux_change_actuel: 2800 };
      console.log('💱 Structure adaptée pour le frontend:', newTauxData);
      setTauxChange(newTauxData);

      // Données restreintes seulement pour certains rôles
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'comptable') {
        console.log('💼 Chargement des données restreintes pour rôle:', user.role);
        try {
          const [facturesRes, paiementsRes] = await Promise.all([
            apiCall('GET', '/api/factures'),
            apiCall('GET', `/api/paiements?page=${paginationPaiements.page}&limit=${paginationPaiements.limit}`)
          ]);
          
          setFactures(facturesRes.data || []);
          if (paiementsRes.data) {
            setPaiements(paiementsRes.data.paiements || []);
            setPaginationPaiements(paiementsRes.data.pagination || paginationPaiements);
          }
          console.log('💰 Données financières chargées - Factures:', facturesRes.data.length, 'Paiements:', paiementsRes.data?.paiements?.length || 0);
        } catch (restrictedError) {
          console.warn('⚠️ Erreur chargement données restreintes:', restrictedError.response?.status);
          setFactures([]);
          setPaiements([]);
        }
      } else {
        // Utilisateur simple - pas d'accès aux factures et paiements
        setFactures([]);
        setPaiements([]);
        console.log('👤 Utilisateur simple - PAS de requête aux factures/paiements');
      }

      // Données de vente pour Admin et Manager uniquement
      if (user.role === 'admin' || user.role === 'manager') {
        console.log('💼 Chargement des données de vente pour rôle:', user.role);
        try {
          // Construire les paramètres de filtre pour les opportunités
          const filtresParams = new URLSearchParams();
          Object.entries(filtresOpportunites).forEach(([key, value]) => {
            if (value) {
              filtresParams.append(key, value);
            }
          });
          
          const [devisRes, opportunitesRes, commandesRes, venteStatsRes, filtresRes] = await Promise.all([
            apiCall('GET', '/api/devis'),
            apiCall('GET', `/api/opportunites?${filtresParams.toString()}`),
            apiCall('GET', '/api/commandes'),
            apiCall('GET', '/api/vente/stats'),
            apiCall('GET', '/api/opportunites/filtres')
          ]);
          
          setDevis(devisRes.data || []);
          setOpportunites(opportunitesRes.data || []);
          setCommandes(commandesRes.data || []);
          setVenteStats(venteStatsRes.data || {});
          setOptionsFiltres(filtresRes.data || {});
          console.log('💼 Données de vente chargées - Devis:', devisRes.data.length, 'Opportunités:', opportunitesRes.data.length, 'Commandes:', commandesRes.data.length);
        } catch (salesError) {
          console.warn('⚠️ Erreur chargement données de vente:', salesError.response?.status);
          setDevis([]);
          setOpportunites([]);
          setCommandes([]);
          setVenteStats({});
        }
      } else {
        // Pas d'accès aux données de vente
        setDevis([]);
        setOpportunites([]);
        setCommandes([]);
        setVenteStats({});
      }

      // Données utilisateurs pour Admin et Support uniquement
      if (user.role === 'admin' || user.role === 'support') {
        console.log('👤 Chargement des données utilisateurs pour Admin/Support');
        try {
          const usersRes = await apiCall('GET', '/api/users');
          setUsers(usersRes.data || []);
          console.log('👤 Utilisateurs chargés:', usersRes.data?.length || 0);
        } catch (error) {
          console.error('❌ Erreur chargement utilisateurs:', error.response?.status, error.response?.data || error.message);
        }
      }

      // Données d'outils pour Technicien, Manager et Admin
      if (user.role === 'technicien' || user.role === 'manager' || user.role === 'admin') {
        console.log('🔧 Chargement des données d\'outils pour rôle:', user.role);
        try {
          const [outilsRes, affectationsRes, entrepotsRes] = await Promise.all([
            apiCall('GET', '/api/outils'),
            apiCall('GET', '/api/affectations'),
            apiCall('GET', '/api/entrepots')
          ]);
          
          setOutils(outilsRes.data || []);
          setAffectations(affectationsRes.data || []);
          setEntrepots(entrepotsRes.data || []);
          console.log('🔧 Données d\'outils chargées - Outils:', outilsRes.data?.length || 0, 'Affectations:', affectationsRes.data?.length || 0, 'Entrepôts:', entrepotsRes.data?.length || 0);
        } catch (toolsError) {
          console.warn('⚠️ Erreur chargement données d\'outils:', toolsError.response?.status);
          setOutils([]);
          setAffectations([]);
          setEntrepots([]);
        }
      } else {
        // Pas d'accès aux outils
        setOutils([]);
        setAffectations([]);
        setEntrepots([]);
      }

      // Données de configuration pour Support uniquement
      if (user.role === 'support') {
        console.log('⚙️ Chargement des paramètres système pour Support');
        try {
          const configRes = await apiCall('GET', '/api/parametres');
          setAppConfig(prev => ({ ...prev, ...configRes.data }));
          console.log('⚙️ Configuration chargée:', configRes.data);
        } catch (error) {
          console.error('❌ Erreur chargement configuration:', error.response?.status, error.response?.data || error.message);
        }
      }

      // Initialisation par défaut pour les autres rôles
      if (user.role !== 'admin' && user.role !== 'support') {
        setUsers([]);
        setAppConfig({
          appName: 'FacturApp',
          logoUrl: '/logo.png',
          theme: 'light',
          language: 'fr'
        });
      }
      
      console.log('✅ Toutes les données chargées avec succès pour rôle:', user.role);
    } catch (error) {
      console.error('❌ Erreur chargement données de base:', error.response?.status, error.response?.data || error.message);
      showNotification('Erreur lors du chargement des données', 'error');
      // Initialiser avec des valeurs par défaut en cas d'erreur
      setClients([]);
      setProduits([]);
      setFactures([]);
      setStats({});
      setPaiements([]);
      setTauxChange({ taux_change_actuel: 2800 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && accessToken) {
      console.log('👤 Utilisateur connecté, chargement des données...');
      loadData();
    }
  }, [user?.id, accessToken]); // Utiliser user.id au lieu de user complet

  // Effect séparé pour recharger quand les filtres changent
  useEffect(() => {
    if (user && accessToken && activeTab === 'ventes' && activeSalesTab === 'opportunites') {
      // Débounce pour éviter trop d'appels API
      const timer = setTimeout(() => {
        loadData();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [filtresOpportunites, user?.id, accessToken, activeTab, activeSalesTab]);

  // Charger les mouvements d'outils quand le modal s'ouvre
  useEffect(() => {
    if (showMouvementsOutilModal && selectedOutil) {
      loadMouvementsOutil(selectedOutil.id);
    }
  }, [showMouvementsOutilModal, selectedOutil]);

  // Fonctions CRUD Clients
  const saveClient = async () => {
    try {
      if (editingClient) {
        await apiCall('PUT', `/api/clients/${editingClient.id}`, clientForm);
      } else {
        await apiCall('POST', '/api/clients', clientForm);
      }

      loadData();
      setShowClientModal(false);
      setClientForm({ nom: '', email: '', telephone: '', adresse: '' });
      setEditingClient(null);
      showNotification(editingClient ? 'Client modifié avec succès' : 'Client créé avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde client:', error);
      showNotification('Erreur lors de la sauvegarde du client', 'error');
    }
  };

  const editClient = (client) => {
    setEditingClient(client);
    setClientForm(client);
    setShowClientModal(true);
  };

  const deleteClient = async (clientId) => {
    showConfirm(
      'Êtes-vous sûr de vouloir supprimer ce client ?',
      async () => {
        try {
          await apiCall('DELETE', `/api/clients/${clientId}`);
          loadData();
          showNotification('Client supprimé avec succès');
        } catch (error) {
          console.error('Erreur suppression client:', error);
          showNotification('Erreur lors de la suppression du client', 'error');
        }
      }
    );
  };

  // Fonctions CRUD Produits
  const saveProduit = async () => {
    try {
      const produitData = {
        ...produitForm,
        prix_usd: parseFloat(produitForm.prix_usd),
        prix_fc: parseFloat(produitForm.prix_fc),
        stock_actuel: parseInt(produitForm.stock_actuel) || 0,
        stock_minimum: parseInt(produitForm.stock_minimum) || 0
      };

      if (editingProduit) {
        await apiCall('PUT', `/api/produits/${editingProduit.id}`, produitData);
      } else {
        await apiCall('POST', '/api/produits', produitData);
      }

      loadData();
      setShowProduitModal(false);
      setProduitForm({ nom: '', description: '', prix_usd: '', prix_fc: '', stock_actuel: '', stock_minimum: '', gestion_stock: true });
      setEditingProduit(null);
      showNotification(editingProduit ? 'Produit modifié avec succès' : 'Produit créé avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde produit:', error);
      showNotification('Erreur lors de la sauvegarde du produit', 'error');
    }
  };

  const editProduit = (produit) => {
    setEditingProduit(produit);
    setProduitForm(produit);
    setShowProduitModal(true);
  };

  const deleteProduit = async (produitId) => {
    showConfirm(
      'Êtes-vous sûr de vouloir supprimer ce produit ?',
      async () => {
        try {
          await apiCall('DELETE', `/api/produits/${produitId}`);
          loadData();
          showNotification('Produit supprimé avec succès');
        } catch (error) {
          console.error('Erreur suppression produit:', error);
          showNotification('Erreur lors de la suppression du produit', 'error');
        }
      }
    );
  };

  // Fonctions Factures
  const generateNumeroFacture = () => {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FACT-${dateStr}-${randomStr}`;
  };

  const addItemToFacture = () => {
    setFactureForm(prev => ({
      ...prev,
      items: [...prev.items, { produit_id: '', quantite: 1, prix_unitaire_usd: 0, prix_unitaire_fc: 0 }]
    }));
  };

  const removeItemFromFacture = (index) => {
    setFactureForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemFacture = (index, field, value) => {
    setFactureForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      if (field === 'produit_id' && value) {
        const produit = produits.find(p => p.id === value);
        if (produit) {
          newItems[index].prix_unitaire_usd = produit.prix_usd;
          newItems[index].prix_unitaire_fc = produit.prix_fc;
        }
      }
      
      return { ...prev, items: newItems };
    });
  };

  const calculateFactureTotals = () => {
    const sousTotal = factureForm.items.reduce((acc, item) => {
      const prix = factureForm.devise === 'USD' ? item.prix_unitaire_usd : item.prix_unitaire_fc;
      return acc + (prix * item.quantite);
    }, 0);
    
    const tva = sousTotal * 0.16;
    const total = sousTotal + tva;
    
    return {
      sousTotal,
      tva,
      total,
      totalUSD: factureForm.devise === 'USD' ? total : convertirMontant(total, 'FC', 'USD'),
      totalFC: factureForm.devise === 'FC' ? total : convertirMontant(total, 'USD', 'FC')
    };
  };

  // Fonction générique pour calculer les totaux
  const calculateTotals = (items, devise) => {
    const sousTotal = items.reduce((acc, item) => {
      const prix = devise === 'USD' ? item.prix_unitaire_usd : item.prix_unitaire_fc;
      return acc + (prix * item.quantite);
    }, 0);
    
    const tva = sousTotal * 0.16;
    const total = sousTotal + tva;
    
    return {
      sousTotal,
      tva,
      total,
      totalUSD: devise === 'USD' ? total : convertirMontant(total, 'FC', 'USD'),
      totalFC: devise === 'FC' ? total : convertirMontant(total, 'USD', 'FC')
    };
  };

  const saveFacture = async () => {
    try {
      if (!factureForm.client_id) {
        showNotification('Veuillez sélectionner un client', 'error');
        return;
      }
      
      if (factureForm.items.length === 0) {
        showNotification('Veuillez ajouter au moins un produit', 'error');
        return;
      }

      console.log('🧾 Début création facture...');
      
      const totals = calculateFactureTotals();
      const client = clients.find(c => c.id === factureForm.client_id);
      
      // Transformer les items en lignes selon le format attendu par le backend
      const lignes = factureForm.items.map(item => {
        const produit = produits.find(p => p.id === item.produit_id);
        const quantite = parseFloat(item.quantite);
        const prixUnitaireUSD = parseFloat(item.prix_unitaire_usd);
        const prixUnitaireFC = parseFloat(item.prix_unitaire_fc);
        
        // Calculs pour cette ligne
        const totalHtUSD = quantite * prixUnitaireUSD;
        const totalHtFC = quantite * prixUnitaireFC;
        const tva = 0.16; // 16% TVA
        const totalTtcUSD = totalHtUSD * (1 + tva);
        const totalTtcFC = totalHtFC * (1 + tva);
        
        return {
          produit_id: item.produit_id,
          nom_produit: produit?.nom || 'Produit inconnu',
          quantite: quantite,
          prix_unitaire_usd: prixUnitaireUSD,
          prix_unitaire_fc: prixUnitaireFC,
          devise: factureForm.devise,
          tva: tva,
          total_ht_usd: totalHtUSD,
          total_ht_fc: totalHtFC,
          total_ttc_usd: totalTtcUSD,
          total_ttc_fc: totalTtcFC
        };
      });
      
      const factureData = {
        numero: factureForm.numero || generateNumeroFacture(),
        client_id: factureForm.client_id,
        client_nom: client?.nom,
        client_email: client?.email,
        client_adresse: client?.adresse || '',
        devise: factureForm.devise,
        lignes: lignes,
        total_ht_usd: totals.sousTotal,
        total_ht_fc: factureForm.devise === 'FC' ? totals.sousTotal : convertirMontant(totals.sousTotal, 'USD', 'FC'),
        total_tva_usd: factureForm.devise === 'USD' ? totals.tva : convertirMontant(totals.tva, 'FC', 'USD'),
        total_tva_fc: factureForm.devise === 'FC' ? totals.tva : convertirMontant(totals.tva, 'USD', 'FC'),
        total_ttc_usd: totals.totalUSD,
        total_ttc_fc: totals.totalFC,
        notes: factureForm.notes || ''
      };

      console.log('📤 Données formatées pour backend:', factureData);

      const response = await apiCall('POST', '/api/factures', factureData);
      console.log('✅ Facture sauvegardée:', response.data);

      loadData();
      setShowFactureModal(false);
      setFactureForm({ client_id: '', items: [], devise: 'USD', notes: '', numero: '' });
      showNotification('Facture créée avec succès');
    } catch (error) {
      console.error('❌ Erreur détaillée sauvegarde facture:', error);
      console.error('❌ Response data:', error.response?.data);
      showNotification(`Erreur lors de la création de la facture: ${error.response?.data?.detail || error.message}`, 'error');
    }
  };

  const simulerPaiement = async (facture) => {
    try {
      const montant = facture.devise === 'USD' ? facture.total_ttc_usd : facture.total_ttc_fc;
      const devise = facture.devise;
      
      const response = await apiCall('POST', '/api/paiements/simulate', {
        facture_id: facture.id,
        montant: montant,
        devise: devise
      });

      const data = response.data;
      const montantFormatte = formatMontant(montant, devise);

      const confirmMessage = `Simuler le paiement Stripe ?

Facture: ${facture.numero}
Montant: ${montantFormatte}
Devise: ${devise}
Transaction ID: ${data.transaction_id}

✅ Confirmer le paiement ?`;

      showConfirm(
        confirmMessage,
        async () => {
          // Marquer comme payée en simulation
          await apiCall('POST', `/api/factures/${facture.id}/payer`, { 
            paiement_id: data.paiement_id 
          });

          showNotification(`💳 Paiement simulé avec succès ! Facture ${facture.numero} marquée comme payée`, 'success');
          loadData();
        }
      );
    } catch (error) {
      console.error('Erreur simulation paiement:', error);
      showNotification(`❌ Erreur lors de la simulation: ${error.response?.data?.detail || error.message}`, 'error');
    }
  };

  const marquerCommePayee = async (facture) => {
    const confirmMessage = `Marquer la facture ${facture.numero} comme payée ?

Montant: ${formatMontant(facture.total_ttc_usd, 'USD')} / ${formatMontant(facture.total_ttc_fc, 'FC')}`;

    showConfirm(
      confirmMessage,
      async () => {
        try {
          await apiCall('POST', `/api/factures/${facture.id}/payer`, {});

          showNotification(`✅ Facture ${facture.numero} marquée comme payée !`, 'success');
          loadData();
        } catch (error) {
          console.error('Erreur marquage facture:', error);
          showNotification(`❌ Erreur lors du marquage de la facture: ${error.response?.data?.detail || error.message}`, 'error');
        }
      }
    );
  };

  const validerPaiement = async (paiementId) => {
    console.log('🔍 Validation paiement - ID:', paiementId);
    
    showConfirm(
      'Valider ce paiement comme terminé ?',
      async () => {
        try {
          console.log('📤 Envoi requête validation pour ID:', paiementId);
          const response = await apiCall('POST', `/api/paiements/${paiementId}/valider`);
          
          console.log('✅ Succès validation:', response.data);
          
          showNotification('✅ Paiement validé avec succès !', 'success');
          
          // Recharger les données avec un petit délai pour s'assurer que la DB est mise à jour
          console.log('🔄 Rechargement des données...');
          setTimeout(async () => {
            await loadData();
            console.log('✅ Données rechargées');
          }, 500);
          
        } catch (error) {
          console.error('❌ Erreur validation paiement:', error);
          showNotification(`❌ Erreur lors de la validation du paiement: ${error.response?.data?.detail || error.message}`, 'error');
        }
      }
    );
  };

  // Fonctions pour annuler et supprimer des factures
  const annulerFacture = (facture) => {
    setFactureToCancel(facture);
    setMotifAnnulation('');
    setShowAnnulerFactureModal(true);
  };

  const supprimerFacture = (facture) => {
    setFactureToDelete(facture);
    setMotifSuppression('');
    setShowSupprimerFactureModal(true);
  };

  const confirmerAnnulationFacture = async () => {
    try {
      if (!motifAnnulation.trim()) {
        showNotification('Veuillez indiquer un motif d\'annulation', 'error');
        return;
      }

      await apiCall('POST', `/api/factures/${factureToCancel.id}/annuler?motif=${encodeURIComponent(motifAnnulation)}`);

      showNotification(`🚫 Facture ${factureToCancel.numero} annulée avec succès`, 'success');
      setShowAnnulerFactureModal(false);
      setFactureToCancel(null);
      setMotifAnnulation('');
      loadData();
    } catch (error) {
      console.error('Erreur annulation facture:', error);
      showNotification(`❌ Erreur lors de l'annulation: ${error.response?.data?.detail || error.message}`, 'error');
    }
  };

  const confirmerSuppressionFacture = async () => {
    try {
      if (!motifSuppression.trim()) {
        showNotification('Veuillez indiquer un motif de suppression', 'error');
        return;
      }

      await apiCall('DELETE', `/api/factures/${factureToDelete.id}?motif=${encodeURIComponent(motifSuppression)}`);

      showNotification(`🗑️ Facture ${factureToDelete.numero} supprimée avec succès`, 'success');
      setShowSupprimerFactureModal(false);
      setFactureToDelete(null);
      setMotifSuppression('');
      loadData();
    } catch (error) {
      console.error('Erreur suppression facture:', error);
      showNotification(`❌ Erreur lors de la suppression: ${error.response?.data?.detail || error.message}`, 'error');
    }
  };

  // Gestion des stocks
  const updateStock = async () => {
    try {
      if (!stockForm.produit_id || !stockForm.operation || !stockForm.quantite || !stockForm.motif) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
      }

      const quantite = parseInt(stockForm.quantite);
      if (isNaN(quantite) || quantite <= 0) {
        showNotification('La quantité doit être un nombre positif', 'error');
        return;
      }

      const response = await apiCall('PUT', `/api/produits/${stockForm.produit_id}/stock`, {
        operation: stockForm.operation,
        quantite: quantite,
        motif: stockForm.motif
      });

      // Vérifier s'il y a un avertissement
      if (response.data.warning) {
        showNotification(`⚠️ ${response.data.warning}`, 'warning');
      }

      loadData();
      setShowStockModal(false);
      setStockForm({ produit_id: '', operation: 'ajouter', quantite: '', motif: '' });
      showNotification(`✅ ${response.data.message}`, 'success');
    } catch (error) {
      console.error('Erreur mise à jour stock:', error);
      showNotification(`❌ ${error.response?.data?.detail || 'Erreur lors de la mise à jour du stock'}`, 'error');
    }
  };

  const voirMouvementsStock = async (produitId) => {
    try {
      const response = await apiCall('GET', `/api/produits/${produitId}/mouvements`);
      setMouvementsStock(response.data);
      setShowMouvementsModal(true);
    } catch (error) {
      console.error('Erreur récupération mouvements:', error);
      showNotification('Erreur lors de la récupération des mouvements de stock', 'error');
    }
  };

  // Gestion du taux de change
  const updateTauxChange = async () => {
    try {
      console.log('💱 Mise à jour du taux de change vers:', nouveauTaux);
      
      const response = await apiCall('PUT', `/api/taux-change?nouveau_taux=${nouveauTaux}`);
      console.log('💱 Réponse API taux de change:', response.data);
      
      // Attendre un moment pour s'assurer que la base de données est mise à jour
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recharger spécifiquement le taux de change
      const tauxRes = await apiCall('GET', '/api/taux-change');
      console.log('💱 Nouveau taux récupéré:', tauxRes.data);
      
      // Adapter la structure de données du backend (taux) vers le format attendu par le frontend (taux_change_actuel)
      const newTauxData = tauxRes.data ? { taux_change_actuel: tauxRes.data.taux } : { taux_change_actuel: 2800 };
      console.log('💱 Structure mise à jour adaptée pour le frontend:', newTauxData);
      setTauxChange(newTauxData);
      
      setShowTauxModal(false);
      showNotification('Taux de change mis à jour', 'success');
    } catch (error) {
      console.error('Erreur mise à jour taux:', error);
      showNotification('Erreur lors de la mise à jour du taux de change', 'error');
    }
  };

  // ===== FONCTIONS VENTES =====
  
  // Fonctions pour supprimer des paiements et devis
  const supprimerPaiement = (paiement) => {
    setPaiementToDelete(paiement);
    setMotifSuppressionPaiement('');
    setShowSupprimerPaiementModal(true);
  };

  const supprimerDevis = (devis) => {
    setDevisToDelete(devis);
    setMotifSuppressionDevis('');
    setShowSupprimerDevisModal(true);
  };

  const confirmerSuppressionPaiement = async () => {
    try {
      if (!motifSuppressionPaiement.trim()) {
        showNotification('Veuillez indiquer un motif de suppression', 'error');
        return;
      }

      await apiCall('DELETE', `/api/paiements/${paiementToDelete.id}?motif=${encodeURIComponent(motifSuppressionPaiement)}`);

      showNotification(`🗑️ Paiement supprimé avec succès`, 'success');
      setShowSupprimerPaiementModal(false);
      setPaiementToDelete(null);
      setMotifSuppressionPaiement('');
      loadData();
    } catch (error) {
      console.error('Erreur suppression paiement:', error);
      showNotification(`❌ Erreur lors de la suppression: ${error.response?.data?.detail || error.message}`, 'error');
    }
  };

  const confirmerSuppressionDevis = async () => {
    try {
      if (!motifSuppressionDevis.trim()) {
        showNotification('Veuillez indiquer un motif de suppression', 'error');
        return;
      }

      await apiCall('DELETE', `/api/devis/${devisToDelete.id}?motif=${encodeURIComponent(motifSuppressionDevis)}`);

      showNotification(`🗑️ Devis ${devisToDelete.numero} supprimé avec succès`, 'success');
      setShowSupprimerDevisModal(false);
      setDevisToDelete(null);
      setMotifSuppressionDevis('');
      loadData();
    } catch (error) {
      console.error('Erreur suppression devis:', error);
      showNotification(`❌ Erreur lors de la suppression: ${error.response?.data?.detail || error.message}`, 'error');
    }
  };

  // Fonction pour changer de page dans les paiements
  const changerPagePaiements = (nouvellePage) => {
    setPaginationPaiements(prev => ({ ...prev, page: nouvellePage }));
  };

  // Fonction pour convertir un devis en facture
  const convertirDevisEnFacture = async (devisId) => {
    try {
      setLoading(true);
      const response = await apiCall('POST', `/api/devis/${devisId}/convertir-facture`);
      
      showNotification(
        `Devis converti en facture ${response.data.facture_numero}`, 
        'success'
      );
      
      // Recharger les données
      loadData();
    } catch (error) {
      console.error('Erreur conversion devis:', error);
      showNotification('Erreur lors de la conversion du devis en facture', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour créer un devis
  const saveDevis = async () => {
    try {
      if (!devisForm.client_id || devisForm.items.length === 0) {
        showNotification('Veuillez sélectionner un client et ajouter au moins un produit', 'error');
        return;
      }

      // Trouver les infos du client
      const client = clients.find(c => c.id === devisForm.client_id);
      if (!client) {
        showNotification('Client non trouvé', 'error');
        return;
      }

      // Calculer les totaux avec la fonction générique
      const totaux = calculateTotals(devisForm.items, devisForm.devise);

      const devisData = {
        ...devisForm,
        client_nom: client.nom,
        client_email: client.email,
        client_adresse: client.adresse,
        lignes: devisForm.items.map(item => {
          const produit = produits.find(p => p.id === item.produit_id);
          return {
            produit_id: item.produit_id,
            nom_produit: produit ? produit.nom : 'Produit inconnu',
            quantite: item.quantite,
            prix_unitaire_usd: item.prix_unitaire_usd || 0,
            prix_unitaire_fc: item.prix_unitaire_fc || 0,
            devise: devisForm.devise,
            tva: 0.16,
            total_ht_usd: (item.prix_unitaire_usd || 0) * item.quantite,
            total_ht_fc: (item.prix_unitaire_fc || 0) * item.quantite,
            total_ttc_usd: (item.prix_unitaire_usd || 0) * item.quantite * 1.16,
            total_ttc_fc: (item.prix_unitaire_fc || 0) * item.quantite * 1.16
          };
        }),
        total_ht_usd: totaux.totalUSD / 1.16,
        total_ht_fc: totaux.totalFC / 1.16,
        total_tva_usd: totaux.totalUSD - (totaux.totalUSD / 1.16),
        total_tva_fc: totaux.totalFC - (totaux.totalFC / 1.16),
        total_ttc_usd: totaux.totalUSD,
        total_ttc_fc: totaux.totalFC,
        // Supprimer le champ validite_jours de l'interface utilisateur
        // mais le conserver pour la compatibilité backend
        validite_jours: 30
      };

      await apiCall('POST', '/api/devis', devisData);
      
      showNotification('Devis créé avec succès', 'success');
      setShowDevisModal(false);
      setDevisForm({ client_id: '', items: [], devise: 'USD', notes: '', validite_jours: 30 });
      loadData();
    } catch (error) {
      console.error('Erreur création devis:', error);
      showNotification('Erreur lors de la création du devis', 'error');
    }
  };

  // Fonctions pour les opportunités
  const lierOpportuniteClient = (opportunite) => {
    setOpportuniteToLink(opportunite);
    setShowLierOpportuniteModal(true);
  };

  const confirmerLiaisonOpportunite = async () => {
    try {
      if (!opportuniteForm.client_id) {
        showNotification('Veuillez sélectionner un client', 'error');
        return;
      }

      const response = await apiCall('POST', `/api/opportunites/${opportuniteToLink.id}/lier-client`, {
        client_id: opportuniteForm.client_id
      });

      showNotification(
        `🔗 Opportunité liée au client ${response.data.client_nom} avec succès`,
        'success'
      );
      
      setShowLierOpportuniteModal(false);
      setOpportuniteToLink(null);
      setOpportuniteForm({ 
        titre: '', description: '', client_id: '', valeur_estimee_usd: '', devise: 'USD', 
        probabilite: 50, etape: 'prospect', priorite: 'moyenne', notes: '' 
      });
      loadData();
    } catch (error) {
      console.error('Erreur liaison opportunité:', error);
      showNotification(`❌ Erreur lors de la liaison: ${error.response?.data?.detail || error.message}`, 'error');
    }
  };

  const appliquerFiltresOpportunites = () => {
    // Pas besoin d'appeler loadData() ici, c'est géré par useEffect
    console.log('🔍 Filtres appliqués:', filtresOpportunites);
  };

  const reinitialiserFiltresOpportunites = () => {
    setFiltresOpportunites({
      client_id: '',
      etape: '',
      priorite: '',
      commercial_id: '',
      search: ''
    });
    // loadData() sera appelé automatiquement par useEffect
  };

  // Fonction pour créer une opportunité
  const saveOpportunite = async () => {
    try {
      if (!opportuniteForm.titre || !opportuniteForm.client_id) {
        showNotification('Veuillez remplir les champs obligatoires', 'error');
        return;
      }

      // Trouver les infos du client
      const client = clients.find(c => c.id === opportuniteForm.client_id);
      if (!client) {
        showNotification('Client non trouvé', 'error');
        return;
      }

      const opportuniteData = {
        ...opportuniteForm,
        client_nom: client.nom,
        valeur_estimee_fc: convertirMontant(
          parseFloat(opportuniteForm.valeur_estimee_usd) || 0, 
          opportuniteForm.devise, 
          'FC'
        )
      };

      await apiCall('POST', '/api/opportunites', opportuniteData);
      
      showNotification('Opportunité créée avec succès', 'success');
      setShowOpportuniteModal(false);
      setOpportuniteForm({ 
        titre: '', description: '', client_id: '', valeur_estimee_usd: '', devise: 'USD', 
        probabilite: 50, etape: 'prospect', priorite: 'moyenne', notes: '' 
      });
      loadData();
    } catch (error) {
      console.error('Erreur création opportunité:', error);
      showNotification('Erreur lors de la création de l\'opportunité', 'error');
    }
  };

  // Fonction pour créer une commande
  const saveCommande = async () => {
    try {
      if (!commandeForm.client_id) {
        showNotification('Veuillez sélectionner un client', 'error');
        return;
      }

      // Trouver les infos du client
      const client = clients.find(c => c.id === commandeForm.client_id);
      if (!client) {
        showNotification('Client non trouvé', 'error');
        return;
      }

      const commandeData = {
        ...commandeForm,
        client_nom: client.nom,
        client_email: client.email,
        client_adresse: client.adresse,
        lignes: [], // Pour l'instant, commande sans produits (peut être étendu plus tard)
        total_usd: 0,
        total_fc: 0
      };

      await apiCall('POST', '/api/commandes', commandeData);
      
      showNotification('Commande créée avec succès', 'success');
      setShowCommandeModal(false);
      setCommandeForm({ 
        client_id: '', opportunite_id: '', items: [], devise: 'USD', 
        adresse_livraison: '', notes: '' 
      });
      loadData();
    } catch (error) {
      console.error('Erreur création commande:', error);
      showNotification('Erreur lors de la création de la commande', 'error');
    }
  };

  // ===== FONCTIONS PARAMÈTRES SYSTÈME =====
  
  // Fonctions pour la gestion des paramètres
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadLogo(file);
  };

  const updateLogo = async () => {
    // Cette fonction est appelée automatiquement par uploadLogo
    showNotification('Logo mis à jour avec succès', 'success');
  };

  const updateConfig = async () => {
    try {
      await saveAppConfig(appConfig);
    } catch (error) {
      console.error('Erreur mise à jour config:', error);
      showNotification('Erreur lors de la mise à jour', 'error');
    }
  };

  const updateTaux = async () => {
    try {
      await handleUpdateTauxChange();
    } catch (error) {
      console.error('Erreur mise à jour taux:', error);
      showNotification('Erreur lors de la mise à jour du taux', 'error');
    }
  };
  
  // Fonction pour mettre à jour le taux de change
  const handleUpdateTauxChange = async () => {
    try {
      console.log('💱 Mise à jour du taux via paramètres vers:', nouveauTaux);
      
      const response = await apiCall('PUT', `/api/taux-change?nouveau_taux=${nouveauTaux}`);
      console.log('💱 Réponse API taux de change:', response.data);
      
      // Attendre un moment pour s'assurer que la base de données est mise à jour
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recharger spécifiquement le taux de change
      const tauxRes = await apiCall('GET', '/api/taux-change');
      console.log('💱 Nouveau taux récupéré:', tauxRes.data);
      
      // Adapter la structure de données du backend (taux) vers le format attendu par le frontend (taux_change_actuel)
      const newTauxData = tauxRes.data ? { taux_change_actuel: tauxRes.data.taux } : { taux_change_actuel: 2800 };
      console.log('💱 Structure mise à jour adaptée pour le frontend:', newTauxData);
      setTauxChange(newTauxData);
      
      showNotification('Taux de change mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Erreur mise à jour taux:', error);
      showNotification('Erreur lors de la mise à jour du taux', 'error');
    }
  };

  // Fonction pour les actions système
  const handleSystemAction = async (action) => {
    try {
      setLoading(true);
      let response;
      
      switch (action) {
        case 'backup':
          response = await apiCall('POST', '/api/parametres/backup');
          showNotification(`Sauvegarde créée: ${response.data.backup.filename}`, 'success');
          break;
        case 'logs':
          response = await apiCall('GET', '/api/parametres/logs');
          console.log('Logs système:', response.data.logs);
          showNotification('Logs système affichés dans la console', 'info');
          break;
        case 'health':
          response = await apiCall('GET', '/api/parametres/health');
          console.log('Santé système:', response.data.health);
          showNotification(`Système: ${response.data.health.status}`, 'success');
          break;
        default:
          showNotification('Action non reconnue', 'error');
      }
    } catch (error) {
      console.error(`Erreur action système ${action}:`, error);
      showNotification(`Erreur lors de l'action ${action}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ===== FONCTIONS DE CONFIGURATION =====
  
  // Fonction pour téléverser un nouveau logo
  const uploadLogo = async (file) => {
    try {
      setUploadingLogo(true);
      
      // Validation du fichier
      if (!file.type.startsWith('image/')) {
        showNotification('Veuillez sélectionner un fichier image', 'error');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB
        showNotification('Le fichier est trop volumineux (max 5MB)', 'error');
        return;
      }

      // Convertir en base64 pour l'envoi
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const formData = {
            logo: e.target.result,
            filename: file.name
          };

          await apiCall('POST', '/api/config/logo', formData);
          
          // Mettre à jour le logo localement
          setAppConfig(prev => {
            const newConfig = {
              ...prev,
              logoUrl: e.target.result
            };
            console.log('🖼️ Logo mis à jour dans appConfig:', newConfig);
            return newConfig;
          });
          
          showNotification('Logo mis à jour avec succès', 'success');
          
          // Forcer un re-render de l'interface
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 100);
        } catch (error) {
          console.error('Erreur upload logo:', error);
          showNotification('Erreur lors de la mise à jour du logo', 'error');
        } finally {
          setUploadingLogo(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erreur upload:', error);
      showNotification('Erreur lors du téléversement', 'error');
      setUploadingLogo(false);
    }
  };

  // Fonction pour activer/désactiver un utilisateur
  const toggleUserStatus = async (userId, isActive) => {
    try {
      await apiCall('PUT', `/api/users/${userId}/status`, { is_active: !isActive });
      
      showNotification(
        `Utilisateur ${!isActive ? 'activé' : 'désactivé'} avec succès`, 
        'success'
      );
      
      // Recharger les données utilisateurs
      loadData();
    } catch (error) {
      console.error('Erreur changement statut utilisateur:', error);
      showNotification('Erreur lors du changement de statut', 'error');
    }
  };

  // Fonction pour changer le rôle d'un utilisateur
  const changeUserRole = async (userId, newRole) => {
    try {
      await apiCall('PUT', `/api/users/${userId}/role`, { role: newRole });
      
      showNotification('Rôle utilisateur mis à jour avec succès', 'success');
      
      // Recharger les données utilisateurs
      loadData();
    } catch (error) {
      console.error('Erreur changement rôle utilisateur:', error);
      showNotification('Erreur lors du changement de rôle', 'error');
    }
  };

  // Fonction pour sauvegarder la configuration de l'application
  const saveAppConfig = async (configData) => {
    try {
      setConfigLoading(true);
      
      await apiCall('PUT', '/api/config/app', configData);
      
      setAppConfig(prev => ({
        ...prev,
        ...configData
      }));
      
      showNotification('Configuration sauvegardée avec succès', 'success');
    } catch (error) {
      console.error('Erreur sauvegarde config:', error);
      showNotification('Erreur lors de la sauvegarde', 'error');
    } finally {
      setConfigLoading(false);
    }
  };

  // ==== FONCTIONS GESTION D'OUTILS ====

  const saveOutil = async () => {
    try {
      setLoading(true);
      const data = {
        ...outilForm,
        quantite_stock: parseInt(outilForm.quantite_stock) || 0,
        prix_unitaire_usd: outilForm.prix_unitaire_usd ? parseFloat(outilForm.prix_unitaire_usd) : null,
        date_achat: outilForm.date_achat || null
      };

      if (editingOutil) {
        await apiCall('PUT', `/api/outils/${editingOutil.id}`, data);
        showNotification('Outil modifié avec succès', 'success');
      } else {
        await apiCall('POST', '/api/outils', data);
        showNotification('Outil créé avec succès', 'success');
      }

      setShowOutilModal(false);
      setEditingOutil(null);
      setOutilForm({
        nom: '', description: '', reference: '', quantite_stock: 0, prix_unitaire_usd: '',
        fournisseur: '', date_achat: '', etat: 'neuf', localisation: '', numero_serie: ''
      });
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde outil:', error);
      showNotification(`Erreur lors de la ${editingOutil ? 'modification' : 'création'} de l'outil`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const approvisionnerOutil = async () => {
    try {
      setLoading(true);
      const data = {
        ...approvisionnementForm,
        quantite_ajoutee: parseInt(approvisionnementForm.quantite_ajoutee) || 0,
        prix_unitaire_usd: approvisionnementForm.prix_unitaire_usd ? parseFloat(approvisionnementForm.prix_unitaire_usd) : null,
        date_achat: approvisionnementForm.date_achat || null
      };

      await apiCall('POST', `/api/outils/${selectedOutil.id}/approvisionner`, data);
      showNotification(`Outil approvisionné avec succès (+${data.quantite_ajoutee} unités)`, 'success');

      setShowApprovisionnementModal(false);
      setApprovisionnementForm({
        quantite_ajoutee: 0, prix_unitaire_usd: '', fournisseur: '', date_achat: '', notes: ''
      });
      setSelectedOutil(null);
      loadData();
    } catch (error) {
      console.error('Erreur approvisionnement:', error);
      showNotification('Erreur lors de l\'approvisionnement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const affecterOutil = async () => {
    try {
      setLoading(true);
      const data = {
        outil_id: selectedOutil.id,  // ✅ AJOUT DU CHAMP MANQUANT
        ...affectationForm,
        quantite_affectee: parseInt(affectationForm.quantite_affectee) || 1,
        date_retour_prevue: affectationForm.date_retour_prevue || null
      };

      await apiCall('POST', `/api/outils/${selectedOutil.id}/affecter`, data);
      showNotification('Outil affecté avec succès', 'success');

      setShowAffectationModal(false);
      setAffectationForm({
        technicien_id: '', quantite_affectee: 1, date_retour_prevue: '', notes_affectation: ''
      });
      setSelectedOutil(null);
      loadData();
    } catch (error) {
      console.error('Erreur affectation:', error);
      showNotification('Erreur lors de l\'affectation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const retournerOutil = async () => {
    try {
      setLoading(true);
      const data = {
        ...retourForm,
        quantite_retournee: parseInt(retourForm.quantite_retournee) || 1
      };

      await apiCall('PUT', `/api/affectations/${selectedAffectation.id}/retourner`, data);
      showNotification('Outil retourné avec succès', 'success');

      setShowRetourModal(false);
      setRetourForm({
        quantite_retournee: 1, etat_retour: 'bon', notes_retour: ''
      });
      setSelectedAffectation(null);
      loadData();
    } catch (error) {
      console.error('Erreur retour:', error);
      showNotification('Erreur lors du retour', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMouvementsOutil = async (outilId) => {
    try {
      const response = await apiCall('GET', `/api/outils/${outilId}/mouvements`);
      setMouvementsOutil(response.data?.mouvements || []);
    } catch (error) {
      console.error('Erreur chargement mouvements:', error);
      setMouvementsOutil([]);
    }
  };

  const getTechniciens = () => {
    return users.filter(user => user.role === 'technicien');
  };

  // ==== FONCTIONS ENTREPÔTS ====

  const saveEntrepot = async () => {
    try {
      setLoading(true);
      const data = {
        ...entrepotForm,
        capacite_max: entrepotForm.capacite_max ? parseInt(entrepotForm.capacite_max) : null
      };

      if (editingEntrepot) {
        await apiCall('PUT', `/api/entrepots/${editingEntrepot.id}`, data);
        showNotification('Entrepôt modifié avec succès', 'success');
      } else {
        await apiCall('POST', '/api/entrepots', data);
        showNotification('Entrepôt créé avec succès', 'success');
      }

      setShowEntrepotModal(false);
      setEditingEntrepot(null);
      setEntrepotForm({
        nom: '', description: '', adresse: '', responsable: '', capacite_max: '', statut: 'actif'
      });
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde entrepôt:', error);
      showNotification(`Erreur lors de la ${editingEntrepot ? 'modification' : 'création'} de l'entrepôt`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteEntrepot = async (entrepot) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'entrepôt "${entrepot.nom}" ?`)) {
      return;
    }

    try {
      setLoading(true);
      await apiCall('DELETE', `/api/entrepots/${entrepot.id}`);
      showNotification('Entrepôt supprimé avec succès', 'success');
      loadData();
    } catch (error) {
      console.error('Erreur suppression entrepôt:', error);
      if (error.response?.status === 400) {
        showNotification(error.response.data?.detail || 'Impossible de supprimer cet entrepôt', 'error');
      } else {
        showNotification('Erreur lors de la suppression de l\'entrepôt', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==== FONCTIONS RAPPORTS ====

  const genererRapportMouvements = async () => {
    try {
      setLoading(true);
      let url = '/api/outils/rapports/mouvements';
      const params = [];

      if (rapportForm.date_debut) params.push(`date_debut=${rapportForm.date_debut}`);
      if (rapportForm.date_fin) params.push(`date_fin=${rapportForm.date_fin}`);
      if (rapportForm.entrepot_id) params.push(`entrepot_id=${rapportForm.entrepot_id}`);
      if (rapportForm.type_mouvement) params.push(`type_mouvement=${rapportForm.type_mouvement}`);

      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const response = await apiCall('GET', url);
      setRapportMouvements(response.data);
      showNotification('Rapport généré avec succès', 'success');
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      showNotification('Erreur lors de la génération du rapport', 'error');
    } finally {
      setLoading(false);
    }
  };

  const genererRapportStocks = async () => {
    try {
      setLoading(true);
      const response = await apiCall('GET', '/api/outils/rapports/stock-par-entrepot');
      setRapportStocks(response.data);
      showNotification('Rapport de stock généré avec succès', 'success');
    } catch (error) {
      console.error('Erreur génération rapport stock:', error);
      showNotification('Erreur lors de la génération du rapport de stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour déterminer quels onglets afficher selon le rôle
  const getAvailableTabs = () => {
    const tabs = [
      { id: 'dashboard', label: t('nav.dashboard'), icon: '📊', roles: ['admin', 'manager', 'comptable', 'utilisateur'] }
    ];

    if (canManageClients()) {
      tabs.push({ id: 'clients', label: t('nav.clients'), icon: '👥', roles: ['admin', 'manager'] });
    }

    if (canManageProducts()) {
      tabs.push({ id: 'produits', label: t('nav.products'), icon: '📦', roles: ['admin', 'manager'] });
    }

    if (canManageInvoices()) {
      tabs.push({ id: 'factures', label: t('nav.invoices'), icon: '🧾', roles: ['admin', 'manager', 'comptable'] });
    }

    if (canManagePayments()) {
      tabs.push({ id: 'paiements', label: t('nav.payments'), icon: '💳', roles: ['admin', 'manager', 'comptable'] });
    }

    if (canManageSales()) {
      tabs.push({ id: 'ventes', label: t('nav.sales'), icon: '💼', roles: ['admin', 'manager'] });
    }

    if (canAccessTools()) {
      tabs.push({ id: 'outils', label: 'Outils', icon: '🔧', roles: ['technicien', 'manager', 'admin'] });
    }

    if (canManageUsersExtended()) {
      tabs.push({ id: 'users', label: t('nav.users'), icon: '👤', roles: ['admin', 'support'] });
    }

    if (canAccessSettings()) {
      tabs.push({ id: 'parametres', label: t('nav.settings'), icon: '⚙️', roles: ['support'] });
    }

    return tabs;
  };

  const getStatutBadge = (statut) => {
    const styles = {
      'brouillon': 'bg-gradient-to-r from-gray-500 to-slate-500 text-white',
      'envoyee': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
      'payee': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
      'overdue': 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
      'annulee': 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
      'accepte': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
      'refuse': 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
      'expire': 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white',
      'prospect': 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
      'qualification': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
      'proposition': 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
      'negociation': 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
      'gagne': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
      'perdue': 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
    };

    const labels = {
      'brouillon': '📝 Brouillon',
      'envoyee': '📤 Envoyée',
      'payee': '💰 Payée',
      'overdue': '⏰ En retard',
      'annulee': '❌ Annulée',
      'accepte': '✅ Accepté',
      'refuse': '❌ Refusé',
      'expire': '⏱️ Expiré',
      'prospect': '👀 Prospect',
      'qualification': '🎯 Qualification',
      'proposition': '💡 Proposition',
      'negociation': '🤝 Négociation',
      'gagne': '🏆 Gagné',
      'perdue': '😞 Perdue'
    };

    return styles[statut] || styles.brouillon;
  };

  if (!user) {
    return <Login logoUrl={appConfig.logoUrl} appName={appConfig.appName} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
      {/* Header avec authentification */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm overflow-hidden p-1">
                  <img 
                    src={appConfig.logoUrl || '/logo.png'} 
                    alt="FacturApp Logo" 
                    className="h-8 w-8 object-cover rounded"
                    onError={(e) => {
                      e.target.src = '/logo.png'; // Fallback si l'image ne charge pas
                    }}
                  />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{appConfig.appName || t('app.title')}</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Contrôles de thème et langue */}
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <LanguageSelector />
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">{user.prenom} {user.nom}</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs rounded">
                  {user.role === 'admin' ? `👑 ${t('user.role.admin')}` : 
                   user.role === 'manager' ? `👔 ${t('user.role.manager')}` :
                   user.role === 'comptable' ? `💰 ${t('user.role.comptable')}` : 
                   user.role === 'support' ? `🔧 ${t('user.role.support')}` : `👤 ${t('user.role.utilisateur')}`}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                🚪 {t('user.logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {getAvailableTabs().map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h2>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.stats.totalClients')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_clients || 0}</p>
                  </div>
                  <span className="text-3xl">👥</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.stats.totalProducts')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_produits || 0}</p>
                  </div>
                  <span className="text-3xl">📦</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.stats.totalInvoices')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_factures || 0}</p>
                  </div>
                  <span className="text-3xl">🧾</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.stats.totalRevenue')} (USD)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">${(stats.ca_mensuel_usd || 0).toLocaleString()}</p>
                  </div>
                  <span className="text-3xl">💰</span>
                </div>
              </div>

              <div 
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer"
                onClick={() => canManageProducts() && setShowTauxModal(true)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Taux USD/FC</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{(tauxChange.taux_change_actuel || 2800).toLocaleString()} FC</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl">💱</span>
                    {canManageProducts() && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Cliquer pour modifier</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">{t('common.quickActions')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {canManageClients() && (
                  <button
                    onClick={() => setShowClientModal(true)}
                    className="flex items-center justify-center space-x-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-2xl">👥</span>
                    <span>{t('clients.add')}</span>
                  </button>
                )}
                
                {canManageProducts() && (
                  <button
                    onClick={() => setShowProduitModal(true)}
                    className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <span className="text-2xl">📦</span>
                    <span>{t('products.add')}</span>
                  </button>
                )}
                
                {canManageInvoices() && (
                  <button
                    onClick={() => setShowFactureModal(true)}
                    className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <span className="text-2xl">🧾</span>
                    <span>Nouvelle facture</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section Clients */}
        {activeTab === 'clients' && (
          <ProtectedRoute requiredRoles={['admin', 'manager']}>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('clients.title')}</h2>
                <button
                  onClick={() => setShowClientModal(true)}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
                >
                  + {t('clients.add')}
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adresse</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(clients || []).map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{client.nom}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{client.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{client.telephone}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{client.adresse}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                              <button
                                onClick={() => editClient(client)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => deleteClient(client.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </ProtectedRoute>
        )}

        {/* Section Produits */}
        {activeTab === 'produits' && (
          <ProtectedRoute requiredRoles={['admin', 'manager']}>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('products.title')}</h2>
                <div className="space-x-3">
                  <button
                    onClick={() => setShowStockModal(true)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
                  >
                    📦 Gérer stock
                  </button>
                  <button
                    onClick={() => setShowProduitModal(true)}
                    className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
                  >
                    + {t('products.add')}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix USD</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix FC</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(produits || []).map((produit) => (
                          <tr key={produit.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-gray-900">{produit.nom}</div>
                                <div className="text-sm text-gray-600">{produit.description}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                              {formatMontant(produit.prix_usd, 'USD')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                              {formatMontant(produit.prix_fc, 'FC')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {produit.gestion_stock ? (
                                <div>
                                  <span className={`font-medium ${
                                    produit.stock_actuel <= produit.stock_minimum ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {produit.stock_actuel}
                                  </span>
                                  <span className="text-gray-500 text-sm"> / {produit.stock_minimum} min</span>
                                  {produit.stock_actuel <= produit.stock_minimum && (
                                    <div className="text-xs text-red-600">⚠️ Stock faible</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                              <button
                                onClick={() => editProduit(produit)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Modifier
                              </button>
                              {produit.gestion_stock && (
                                <button
                                  onClick={() => voirMouvementsStock(produit.id)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  Mouvements
                                </button>
                              )}
                              <button
                                onClick={() => deleteProduit(produit.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Supprimer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </ProtectedRoute>
        )}

        {/* Section Factures */}
        {activeTab === 'factures' && (
          <ProtectedRoute requiredRoles={['admin', 'manager', 'comptable']}>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('invoices.title')}</h2>
                {!canViewOnly() && (
                  <button
                    onClick={() => setShowFactureModal(true)}
                    className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
                  >
                    + Nouvelle facture
                  </button>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          {!canViewOnly() && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(factures || []).map((facture) => (
                          <tr key={facture.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                              {facture.numero}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                              {facture.client_nom}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">
                                <div className="font-medium">{formatMontant(facture.total_ttc_usd, 'USD')}</div>
                                <div className="text-gray-500">{formatMontant(facture.total_ttc_fc, 'FC')}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatutBadge(facture.statut)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(facture.date_creation).toLocaleDateString('fr-FR')}
                            </td>
                            {!canViewOnly() && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                {facture.statut === 'brouillon' && (
                                  <button
                                    onClick={() => simulerPaiement(facture)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    💳 Simuler paiement
                                  </button>
                                )}
                                {(facture.statut === 'brouillon' || facture.statut === 'envoyee') && (
                                  <button
                                    onClick={() => marquerCommePayee(facture)}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    ✅ Marquer payée
                                  </button>
                                )}
                                {(facture.statut === 'brouillon' || facture.statut === 'envoyee') && (
                                  <button
                                    onClick={() => annulerFacture(facture)}
                                    className="text-orange-600 hover:text-orange-800"
                                  >
                                    🚫 Annuler
                                  </button>
                                )}
                                {(facture.statut === 'brouillon' || facture.statut === 'envoyee' || facture.statut === 'annulee') && (
                                  <button
                                    onClick={() => supprimerFacture(facture)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    🗑️ Supprimer
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </ProtectedRoute>
        )}

        {/* Section Paiements */}
        {activeTab === 'paiements' && (
          <ProtectedRoute requiredRoles={['admin', 'manager', 'comptable']}>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Historique des paiements</h2>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facture</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          {!canViewOnly() && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(paiements || []).map((paiement) => (
                          <tr key={paiement.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                              {paiement.facture_numero}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">
                                <div className="font-medium">
                                  {formatMontant(paiement.montant_usd, 'USD')}
                                </div>
                                <div className="text-gray-500">
                                  {formatMontant(paiement.montant_fc, 'FC')}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                {paiement.methode_paiement}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {paiement.statut === 'completed' ? (
                                <span className="text-green-500 mr-1">✅</span>
                              ) : (
                                <span className="text-orange-500 mr-1">⏳</span>
                              )}
                              {paiement.statut === 'completed' ? 'Validé' : 'En attente'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(paiement.date_paiement).toLocaleDateString('fr-FR')}
                            </td>
                            {!canViewOnly() && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                {paiement.statut === 'pending' && (
                                  <button
                                    onClick={() => validerPaiement(paiement.id)}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    ✅ Valider
                                  </button>
                                )}
                                {paiement.statut !== 'valide' && (
                                  <button
                                    onClick={() => supprimerPaiement(paiement)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    🗑️ Supprimer
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Pagination pour les paiements */}
                {paginationPaiements.total_pages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                      <span>
                        Page {paginationPaiements.page} sur {paginationPaiements.total_pages}
                      </span>
                      <span className="ml-2">
                        ({paginationPaiements.total} paiements au total)
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {paginationPaiements.has_prev && (
                        <button
                          onClick={() => changerPagePaiements(paginationPaiements.page - 1)}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          ← Précédent
                        </button>
                      )}
                      {paginationPaiements.has_next && (
                        <button
                          onClick={() => changerPagePaiements(paginationPaiements.page + 1)}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          Suivant →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ProtectedRoute>
        )}

        {/* Section Ventes */}
        {activeTab === 'ventes' && (
          <ProtectedRoute requiredRoles={['admin', 'manager']}>
            <div className="space-y-6">
              {/* En-tête avec sous-navigation */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('sales.title')}</h2>
                
                {/* Sous-navigation des ventes */}
                <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-600">
                  {[
                    { id: 'dashboard', label: t('sales.dashboard'), icon: '📊' },
                    { id: 'devis', label: t('sales.quotes'), icon: '📋' },
                    { id: 'opportunites', label: t('sales.opportunities'), icon: '🎯' },
                    { id: 'commandes', label: t('sales.orders'), icon: '🛒' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSalesTab(tab.id)}
                      className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                        activeSalesTab === tab.id
                          ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dashboard des ventes */}
              {activeSalesTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Statistiques de vente */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Devis total</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{venteStats.total_devis || 0}</p>
                        </div>
                        <span className="text-3xl">📋</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Taux conversion</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{venteStats.taux_conversion_devis || 0}%</p>
                        </div>
                        <span className="text-3xl">📈</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Opportunités actives</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{venteStats.opportunites_en_cours || 0}</p>
                        </div>
                        <span className="text-3xl">🎯</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Pipeline (USD)</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">${(venteStats.valeur_pipeline_usd || 0).toLocaleString()}</p>
                        </div>
                        <span className="text-3xl">💰</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions rapides ventes */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">{t('common.quickActions')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => setShowDevisModal(true)}
                        className="flex items-center justify-center space-x-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-2xl">📋</span>
                        <span>{t('quotes.add')}</span>
                      </button>
                      
                      <button
                        onClick={() => setShowOpportuniteModal(true)}
                        className="flex items-center justify-center space-x-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-2xl">🎯</span>
                        <span>{t('opportunities.add')}</span>
                      </button>
                      
                      <button
                        onClick={() => setShowCommandeModal(true)}
                        className="flex items-center justify-center space-x-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-2xl">🛒</span>
                        <span>{t('orders.add')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Section Devis */}
              {activeSalesTab === 'devis' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('quotes.title')}</h3>
                    <button
                      onClick={() => setShowDevisModal(true)}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
                    >
                      + {t('quotes.add')}
                    </button>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
                    {loading ? (
                      <div className="p-8 text-center">
                        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                      </div>
                    ) : (devis || []).length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Aucun devis trouvé. Créez votre premier devis !
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('quotes.number')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('quotes.client')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('quotes.amount')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('quotes.status')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('quotes.validity')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('quotes.actions')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {(devis || []).map((d) => (
                              <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{d.numero}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{d.client_nom}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                  {formatMontant(d.total_ttc_usd, 'USD')} / {formatMontant(d.total_ttc_fc, 'FC')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs rounded-full ${getStatutBadge(d.statut)}`}>
                                    {d.statut}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                  {d.validite_jours} jours
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                  {d.statut === 'accepte' && (
                                    <button
                                      onClick={() => convertirDevisEnFacture(d.id)}
                                      className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                                    >
                                      {t('quotes.convert')}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => supprimerDevis(d)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                  >
                                    🗑️ Supprimer
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section Opportunités */}
              {activeSalesTab === 'opportunites' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('opportunities.title')}</h3>
                    <button
                      onClick={() => setShowOpportuniteModal(true)}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
                    >
                      + {t('opportunities.add')}
                    </button>
                  </div>

                  {/* Filtres pour les opportunités */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">🔍 Filtres</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
                        <select
                          value={filtresOpportunites.client_id}
                          onChange={(e) => setFiltresOpportunites(prev => ({ ...prev, client_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Tous les clients</option>
                          {(optionsFiltres.clients || []).map(client => (
                            <option key={client.id} value={client.id}>{client.nom}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Étape</label>
                        <select
                          value={filtresOpportunites.etape}
                          onChange={(e) => setFiltresOpportunites(prev => ({ ...prev, etape: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Toutes les étapes</option>
                          {(optionsFiltres.etapes || []).map((etape, index) => (
                            <option key={`etape-${index}`} value={etape}>{etape}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorité</label>
                        <select
                          value={filtresOpportunites.priorite}
                          onChange={(e) => setFiltresOpportunites(prev => ({ ...prev, priorite: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Toutes les priorités</option>
                          {(optionsFiltres.priorites || []).map((priorite, index) => (
                            <option key={`priorite-${index}`} value={priorite}>{priorite}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recherche</label>
                        <input
                          type="text"
                          value={filtresOpportunites.search}
                          onChange={(e) => setFiltresOpportunites(prev => ({ ...prev, search: e.target.value }))}
                          placeholder="Titre, description..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div className="flex items-end space-x-2">
                        <button
                          onClick={appliquerFiltresOpportunites}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                        >
                          🔍 Filtrer
                        </button>
                        <button
                          onClick={reinitialiserFiltresOpportunites}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                        >
                          🔄 Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
                    {loading ? (
                      <div className="p-8 text-center">
                        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                      </div>
                    ) : (opportunites || []).length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Aucune opportunité trouvée. Créez votre première opportunité !
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('opportunities.name')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('opportunities.client')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('opportunities.value')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('opportunities.probability')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('opportunities.stage')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('opportunities.priority')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {(opportunites || []).map((opp) => (
                              <tr key={opp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{opp.titre}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{opp.client_nom}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                  {formatMontant(opp.valeur_estimee_usd, 'USD')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{opp.probabilite}%</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs rounded-full ${getStatutBadge(opp.etape)}`}>
                                    {opp.etape}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{opp.priorite}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                  <button
                                    onClick={() => lierOpportuniteClient(opp)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                  >
                                    🔗 Lier au client
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section Commandes */}
              {activeSalesTab === 'commandes' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('orders.title')}</h3>
                    <button
                      onClick={() => setShowCommandeModal(true)}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
                    >
                      + {t('orders.add')}
                    </button>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
                    {loading ? (
                      <div className="p-8 text-center">
                        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                      </div>
                    ) : (commandes || []).length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Aucune commande trouvée. Créez votre première commande !
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('orders.number')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('orders.client')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('orders.amount')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('orders.status')}</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('orders.delivery')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {(commandes || []).map((cmd) => (
                              <tr key={cmd.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{cmd.numero}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{cmd.client_nom}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                  {formatMontant(cmd.total_usd, 'USD')} / {formatMontant(cmd.total_fc, 'FC')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs rounded-full ${getStatutBadge(cmd.statut)}`}>
                                    {cmd.statut}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                  {cmd.date_livraison_prevue ? new Date(cmd.date_livraison_prevue).toLocaleDateString() : 'Non définie'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ProtectedRoute>
        )}

        {/* Section Paramètres système (Support uniquement) */}
        {activeTab === 'parametres' && (
          <ProtectedRoute requiredRoles={['support']}>
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('config.title')}</h2>
              
              {/* Configuration - Style identique au dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Logo */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('config.logo')}</h3>
                    <span className="text-2xl">🖼️</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden mx-auto">
                      <img 
                        src={appConfig.logoUrl} 
                        alt="Logo" 
                        className="h-14 w-14 object-cover rounded-md"
                      />
                    </div>
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700"
                    />
                    
                    <button
                      onClick={updateLogo}
                      className="w-full bg-blue-500 text-white py-1 px-2 rounded text-xs hover:bg-blue-600"
                    >
                      {t('config.logo.change')}
                    </button>
                  </div>
                </div>
                
                {/* Configuration App */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('config.app')}</h3>
                    <span className="text-2xl">⚙️</span>
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={appConfig.appName}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, appName: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Nom de l'app"
                    />
                    
                    <select
                      value={appConfig.theme}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, theme: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="light">🌞 Clair</option>
                      <option value="dark">🌙 Sombre</option>
                    </select>
                    
                    <select
                      value={appConfig.language}
                      onChange={(e) => setAppConfig(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="fr">🇫🇷 Français</option>
                      <option value="en">🇺🇸 English</option>
                    </select>
                    
                    <button
                      onClick={updateConfig}
                      className="w-full bg-blue-500 text-white py-1 px-2 rounded text-xs hover:bg-blue-600"
                    >
                      💾 {t('config.save')}
                    </button>
                  </div>
                </div>

                {/* Taux de change */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('config.exchange')}</h3>
                    <span className="text-2xl">💱</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">USD → FC</p>
                      <input
                        type="number"
                        value={nouveauTaux}
                        onChange={(e) => setNouveauTaux(e.target.value)}
                        className="w-full px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700 dark:text-white"
                        placeholder="2800"
                      />
                    </div>
                    
                    <button
                      onClick={updateTaux}
                      className="w-full bg-yellow-500 text-white py-1 px-2 rounded text-xs hover:bg-yellow-600"
                    >
                      💱 {t('config.exchange.update')}
                    </button>
                    
                    <div className="text-center">
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        Actuel: {tauxChange.taux_change_actuel || 2800} FC
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ProtectedRoute>
        )}

        {/* Section Gestion des Outils */}
        {activeTab === 'outils' && (
          <ProtectedRoute requiredRoles={['technicien', 'manager', 'admin']}>
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🔧 Gestion des Outils</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setRapportForm({
                        date_debut: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
                        date_fin: new Date().toISOString().split('T')[0],
                        entrepot_id: '', type_mouvement: ''
                      });
                      setShowRapportModal(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <span>📊</span> Rapports
                  </button>
                  {canManageTools() && (
                    <>
                      <button
                        onClick={() => setShowEntrepotModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <span>🏭</span> Nouvel Entrepôt
                      </button>
                      <button
                        onClick={() => setShowOutilModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <span>➕</span> Nouvel Outil
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Statistiques des outils */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Outils</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{outils.length}</p>
                    </div>
                    <span className="text-3xl">🔧</span>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Disponibles</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {outils.reduce((sum, outil) => sum + (outil.quantite_disponible || 0), 0)}
                      </p>
                    </div>
                    <span className="text-3xl">✅</span>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Affectés</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {affectations.filter(a => a.statut === 'affecte').length}
                      </p>
                    </div>
                    <span className="text-3xl">👨‍🔧</span>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Stock Total</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {outils.reduce((sum, outil) => sum + (outil.quantite_stock || 0), 0)}
                      </p>
                    </div>
                    <span className="text-3xl">📦</span>
                  </div>
                </div>
              </div>

              {/* Section Entrepôts */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">🏭 Entrepôts</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Nom
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Adresse
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Responsable
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Capacité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Outils
                        </th>
                        {canManageTools() && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {entrepots.map((entrepot) => {
                        const outilsEntrepot = outils.filter(o => o.entrepot_id === entrepot.id);
                        return (
                          <tr key={entrepot.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {entrepot.nom}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {entrepot.description}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {entrepot.adresse || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {entrepot.responsable || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {entrepot.capacite_max || 'Illimitée'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                entrepot.statut === 'actif' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : entrepot.statut === 'maintenance'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {entrepot.statut}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              <div className="text-center">
                                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                  {outilsEntrepot.length}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  outils
                                </div>
                              </div>
                            </td>
                            {canManageTools() && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingEntrepot(entrepot);
                                    setEntrepotForm({
                                      nom: entrepot.nom,
                                      description: entrepot.description || '',
                                      adresse: entrepot.adresse || '',
                                      responsable: entrepot.responsable || '',
                                      capacite_max: entrepot.capacite_max || '',
                                      statut: entrepot.statut
                                    });
                                    setShowEntrepotModal(true);
                                  }}
                                  className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                                >
                                  ✏️ Modifier
                                </button>
                                <button
                                  onClick={() => deleteEntrepot(entrepot)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  disabled={outilsEntrepot.length > 0}
                                  title={outilsEntrepot.length > 0 ? 'Impossible de supprimer: contient des outils' : 'Supprimer l\'entrepôt'}
                                >
                                  🗑️ Supprimer
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {entrepots.length === 0 && (
                        <tr>
                          <td colSpan={canManageTools() ? "7" : "6"} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            Aucun entrepôt enregistré
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tableau des outils */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Liste des Outils</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Outil
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Référence
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Entrepôt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Stock / Dispo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Prix USD
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {outils.map((outil) => (
                        <tr key={outil.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {outil.nom}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {outil.description}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {outil.reference || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="text-gray-900 dark:text-white">
                              <span className="font-medium">{outil.quantite_stock || 0}</span> / 
                              <span className="text-green-600 dark:text-green-400 ml-1">
                                {outil.quantite_disponible || 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {outil.prix_unitaire_usd ? `$${outil.prix_unitaire_usd}` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {outil.localisation || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => {
                                setSelectedOutil(outil);
                                setShowMouvementsOutilModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              📈 Historique
                            </button>
                            {canManageTools() && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedOutil(outil);
                                    setApprovisionnementForm({ ...approvisionnementForm, quantite_ajoutee: 1 });
                                    setShowApprovisionnementModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                >
                                  📦 Approvisionner
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedOutil(outil);
                                    setAffectationForm({ 
                                      ...affectationForm, 
                                      quantite_affectee: Math.min(1, outil.quantite_disponible || 0) 
                                    });
                                    setShowAffectationModal(true);
                                  }}
                                  className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                                  disabled={!outil.quantite_disponible}
                                >
                                  👨‍🔧 Affecter
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingOutil(outil);
                                    setOutilForm({
                                      nom: outil.nom,
                                      description: outil.description || '',
                                      reference: outil.reference || '',
                                      quantite_stock: outil.quantite_stock,
                                      prix_unitaire_usd: outil.prix_unitaire_usd || '',
                                      fournisseur: outil.fournisseur || '',
                                      date_achat: outil.date_achat ? new Date(outil.date_achat).toISOString().split('T')[0] : '',
                                      etat: outil.etat || 'neuf',
                                      localisation: outil.localisation || '',
                                      numero_serie: outil.numero_serie || ''
                                    });
                                    setShowOutilModal(true);
                                  }}
                                  className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                                >
                                  ✏️ Modifier
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {outils.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            Aucun outil enregistré
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tableau des affectations */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {user.role === 'technicien' ? 'Mes Affectations' : 'Affectations d\'Outils'}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Outil
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Technicien
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Quantité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date Affectation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {affectations.map((affectation) => (
                        <tr key={affectation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {affectation.outil_nom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {affectation.technicien_nom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {affectation.quantite_affectee}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(affectation.date_affectation).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              affectation.statut === 'affecte' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : affectation.statut === 'retourne'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {affectation.statut === 'affecte' ? 'Affecté' : 
                               affectation.statut === 'retourne' ? 'Retourné' : 
                               affectation.statut}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {affectation.statut === 'affecte' && 
                             (user.role !== 'technicien' || affectation.technicien_id === user.id) && (
                              <button
                                onClick={() => {
                                  setSelectedAffectation(affectation);
                                  setRetourForm({
                                    quantite_retournee: affectation.quantite_affectee,
                                    etat_retour: 'bon',
                                    notes_retour: ''
                                  });
                                  setShowRetourModal(true);
                                }}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              >
                                ↩️ Retourner
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {affectations.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            Aucune affectation
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </ProtectedRoute>
        )}

        {/* Section Gestion des utilisateurs */}
        {activeTab === 'users' && (
          <ProtectedRoute requiredRoles={['admin', 'support']}>
            <UserManagement />
          </ProtectedRoute>
        )}
      </main>

      {/* Footer fixe */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>💼 <strong>{t('app.title')}</strong> - {t('app.description')}</p>
            <p className="mt-1">📦 Stocks • 💱 Multi-devises • 💳 Paiements • 🔐 Authentification sécurisée</p>
          </div>
        </div>
      </footer>

      {/* Modals et autres composants... (garder tous les modals existants) */}

      {/* Modal de suppression de paiement */}
      {showSupprimerPaiementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              🗑️ Supprimer le paiement
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Êtes-vous sûr de vouloir supprimer ce paiement ?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                ⚠️ Cette action remettra la facture associée en état "envoyée".
              </p>
              
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Motif de suppression *
              </label>
              <textarea
                value={motifSuppressionPaiement}
                onChange={(e) => setMotifSuppressionPaiement(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                placeholder="Expliquez pourquoi vous supprimez ce paiement..."
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSupprimerPaiementModal(false);
                  setPaiementToDelete(null);
                  setMotifSuppressionPaiement('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={confirmerSuppressionPaiement}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                🗑️ Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression de devis */}
      {showSupprimerDevisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              🗑️ Supprimer le devis
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Êtes-vous sûr de vouloir supprimer le devis <strong>{devisToDelete?.numero}</strong> ?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                ⚠️ Cette action est irréversible ! Le devis sera archivé et ne pourra plus être consulté.
              </p>
              
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Motif de suppression *
              </label>
              <textarea
                value={motifSuppressionDevis}
                onChange={(e) => setMotifSuppressionDevis(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                placeholder="Expliquez pourquoi vous supprimez ce devis..."
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSupprimerDevisModal(false);
                  setDevisToDelete(null);
                  setMotifSuppressionDevis('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={confirmerSuppressionDevis}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                🗑️ Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de liaison opportunité à client */}
      {showLierOpportuniteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              🔗 Lier l'opportunité à un client
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Créer une opportunité similaire pour un autre client :
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <strong>{opportuniteToLink?.titre}</strong>
              </p>
              
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sélectionner le client *
              </label>
              <select
                value={opportuniteForm.client_id}
                onChange={(e) => setOpportuniteForm(prev => ({ ...prev, client_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Sélectionner un client</option>
                {(clients || []).map(client => (
                  <option key={client.id} value={client.id}>{client.nom}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowLierOpportuniteModal(false);
                  setOpportuniteToLink(null);
                  setOpportuniteForm({ 
                    titre: '', description: '', client_id: '', valeur_estimee_usd: '', devise: 'USD', 
                    probabilite: 50, etape: 'prospect', priorite: 'moyenne', notes: '' 
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={confirmerLiaisonOpportunite}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                🔗 Lier au client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 text-white hover:opacity-75"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmation */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirmation</h3>
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{confirmDialog.message}</p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
              >
                Annuler
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tous les autres modals existants... */}
      {/* Pour économiser l'espace, je vais ajouter seulement quelques modals critiques */}
      
      {/* Modal Client */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {editingClient ? 'Modifier le client' : 'Nouveau client'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  value={clientForm.nom}
                  onChange={(e) => setClientForm(prev => ({...prev, nom: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={clientForm.email}
                  onChange={(e) => setClientForm(prev => ({...prev, email: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={clientForm.telephone}
                  onChange={(e) => setClientForm(prev => ({...prev, telephone: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <textarea
                  value={clientForm.adresse}
                  onChange={(e) => setClientForm(prev => ({...prev, adresse: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowClientModal(false);
                  setClientForm({ nom: '', email: '', telephone: '', adresse: '' });
                  setEditingClient(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={saveClient}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                {editingClient ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Produit */}
      {showProduitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium mb-4">
              {editingProduit ? 'Modifier le produit' : 'Nouveau produit'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  value={produitForm.nom}
                  onChange={(e) => setProduitForm(prev => ({...prev, nom: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={produitForm.description}
                  onChange={(e) => setProduitForm(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix USD *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={produitForm.prix_usd}
                    onChange={(e) => setProduitForm(prev => ({...prev, prix_usd: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix FC *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={produitForm.prix_fc}
                    onChange={(e) => setProduitForm(prev => ({...prev, prix_fc: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={produitForm.gestion_stock}
                    onChange={(e) => setProduitForm(prev => ({...prev, gestion_stock: e.target.checked}))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Gestion de stock</span>
                </label>
              </div>

              {produitForm.gestion_stock && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock actuel</label>
                    <input
                      type="number"
                      value={produitForm.stock_actuel}
                      onChange={(e) => setProduitForm(prev => ({...prev, stock_actuel: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock minimum</label>
                    <input
                      type="number"
                      value={produitForm.stock_minimum}
                      onChange={(e) => setProduitForm(prev => ({...prev, stock_minimum: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowProduitModal(false);
                  setProduitForm({ nom: '', description: '', prix_usd: '', prix_fc: '', stock_actuel: '', stock_minimum: '', gestion_stock: true });
                  setEditingProduit(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={saveProduit}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                {editingProduit ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Facture */}
      {showFactureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Nouvelle facture</h3>
            
            <div className="space-y-6">
              {/* Client et devise */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <select
                    value={factureForm.client_id}
                    onChange={(e) => setFactureForm(prev => ({...prev, client_id: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Sélectionner un client</option>
                    {(clients || []).map(client => (
                      <option key={client.id} value={client.id}>{client.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Devise *</label>
                  <select
                    value={factureForm.devise}
                    onChange={(e) => setFactureForm(prev => ({...prev, devise: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {devises.map(devise => (
                      <option key={devise.code} value={devise.code}>{devise.nom} ({devise.symbole})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Numéro de facture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de facture</label>
                <input
                  type="text"
                  value={factureForm.numero}
                  onChange={(e) => setFactureForm(prev => ({...prev, numero: e.target.value}))}
                  placeholder="Laissez vide pour génération automatique"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Produits */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Produits/Services *</label>
                  <button
                    type="button"
                    onClick={addItemToFacture}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                  >
                    + Ajouter
                  </button>
                </div>
                
                <div className="space-y-2">
                  {factureForm.items.map((item, index) => (
                    <div key={`facture-item-${index}`} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded">
                      <div className="col-span-4">
                        <select
                          value={item.produit_id}
                          onChange={(e) => updateItemFacture(index, 'produit_id', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                          required
                        >
                          <option value="">Sélectionner un produit</option>
                          {(produits || []).map(produit => (
                            <option key={produit.id} value={produit.id}>{produit.nom}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantite}
                          onChange={(e) => updateItemFacture(index, 'quantite', parseInt(e.target.value))}
                          placeholder="Qté"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={factureForm.devise === 'USD' ? item.prix_unitaire_usd : item.prix_unitaire_fc}
                          onChange={(e) => updateItemFacture(index, factureForm.devise === 'USD' ? 'prix_unitaire_usd' : 'prix_unitaire_fc', parseFloat(e.target.value))}
                          placeholder="Prix"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                          required
                        />
                      </div>
                      <div className="col-span-3 text-sm text-gray-600">
                        Total: {formatMontant((factureForm.devise === 'USD' ? item.prix_unitaire_usd : item.prix_unitaire_fc) * item.quantite, factureForm.devise)}
                      </div>
                      <div className="col-span-1">
                        <button
                          type="button"
                          onClick={() => removeItemFromFacture(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totaux */}
              {factureForm.items.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Sous-total:</span>
                      <span>{formatMontant(calculateFactureTotals().sousTotal, factureForm.devise)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TVA (16%):</span>
                      <span>{formatMontant(calculateFactureTotals().tva, factureForm.devise)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-lg border-t pt-2">
                      <span>Total TTC:</span>
                      <span>{formatMontant(calculateFactureTotals().total, factureForm.devise)}</span>
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-2">
                      USD: {formatMontant(calculateFactureTotals().totalUSD, 'USD')} | 
                      FC: {formatMontant(calculateFactureTotals().totalFC, 'FC')}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={factureForm.notes}
                  onChange={(e) => setFactureForm(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Notes additionnelles..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowFactureModal(false);
                  setFactureForm({ client_id: '', items: [], devise: 'USD', notes: '', numero: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={saveFacture}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Créer la facture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Stock */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">📦 Gestion du stock</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produit *</label>
                <select
                  value={stockForm.produit_id}
                  onChange={(e) => setStockForm(prev => ({...prev, produit_id: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Sélectionner un produit</option>
                  {(produits || []).filter(p => p.gestion_stock).map(produit => (
                    <option key={produit.id} value={produit.id}>
                      {produit.nom} (Stock actuel: {produit.stock_actuel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opération *</label>
                <select
                  value={stockForm.operation}
                  onChange={(e) => setStockForm(prev => ({...prev, operation: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="ajouter">➕ Ajouter au stock</option>
                  <option value="soustraire">➖ Soustraire du stock</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantité *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockForm.quantite}
                  onChange={(e) => setStockForm(prev => ({...prev, quantite: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: 50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motif *</label>
                <textarea
                  value={stockForm.motif}
                  onChange={(e) => setStockForm(prev => ({...prev, motif: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Expliquez la raison de cette modification de stock..."
                  required
                />
              </div>

              {/* Suggestions de motifs */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium mb-1">Suggestions de motifs :</p>
                <div className="flex flex-wrap gap-1">
                  {['Achat/Réapprovisionnement', 'Ajustement inventaire', 'Perte/Casse', 'Retour client', 'Correction erreur'].map(motif => (
                    <button
                      key={motif}
                      type="button"
                      onClick={() => setStockForm(prev => ({...prev, motif}))}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-500"
                    >
                      {motif}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setStockForm({ produit_id: '', operation: 'ajouter', quantite: '', motif: '' });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={updateStock}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                📦 Mettre à jour le stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Taux de change */}
      {showTauxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Modifier le taux de change</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau taux (1 USD = ? FC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={nouveauTaux}
                  onChange={(e) => setNouveauTaux(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Taux actuel: 1 USD = {tauxChange.taux_change_actuel?.toLocaleString()} FC</p>
                <p>Nouveau taux: 1 USD = {nouveauTaux?.toLocaleString()} FC</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTauxModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={updateTauxChange}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Mettre à jour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mouvements Stock */}
      {showMouvementsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">📊 Mouvements de stock</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Opération</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quantité</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Stock après</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Motif</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Utilisateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {(mouvementsStock || []).map((mouvement, index) => (
                    <tr key={`mouvement-${mouvement.id || index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(mouvement.date_mouvement).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          mouvement.type_mouvement === 'entree' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 
                          mouvement.type_mouvement === 'sortie' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {mouvement.operation ? (
                            mouvement.operation === 'ajouter' ? '➕ Ajout' : '➖ Retrait'
                          ) : (
                            mouvement.type_mouvement === 'entree' ? 'Entrée' : 
                            mouvement.type_mouvement === 'sortie' ? 'Sortie' : 'Correction'
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className={`font-medium ${
                          mouvement.quantite > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {mouvement.quantite > 0 ? '+' : ''}{mouvement.quantite}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {mouvement.stock_après}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {mouvement.motif}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {mouvement.utilisateur || 'Système'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowMouvementsModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODALS DE VENTE ===== */}
      
      {/* Modal Devis */}
      {showDevisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">{t('quotes.add')}</h3>
            
            <div className="space-y-6">
              {/* Informations de base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                  <select
                    value={devisForm.client_id}
                    onChange={(e) => setDevisForm(prev => ({...prev, client_id: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Sélectionner un client</option>
                    {(clients || []).map(client => (
                      <option key={client.id} value={client.id}>{client.nom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Devise</label>
                  <select
                    value={devisForm.devise}
                    onChange={(e) => setDevisForm(prev => ({...prev, devise: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="USD">USD</option>
                    <option value="FC">FC</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Validité (jours)</label>
                <input
                  type="number"
                  value={devisForm.validite_jours}
                  onChange={(e) => setDevisForm(prev => ({...prev, validite_jours: parseInt(e.target.value)}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  min="1"
                  max="365"
                />
              </div>

              {/* Section Produits */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">Produits/Services *</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newItem = {
                        produit_id: '',
                        nom_produit: '',
                        quantite: 1,
                        prix_unitaire_usd: 0,
                        prix_unitaire_fc: 0
                      };
                      setDevisForm(prev => ({
                        ...prev,
                        items: [...prev.items, newItem]
                      }));
                    }}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    + Ajouter un produit
                  </button>
                </div>

                {devisForm.items.map((item, index) => (
                  <div key={`devis-item-${index}`} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produit</label>
                        <select
                          value={item.produit_id}
                          onChange={(e) => {
                            const produit = produits.find(p => p.id === e.target.value);
                            const updatedItems = [...devisForm.items];
                            updatedItems[index] = {
                              ...item,
                              produit_id: e.target.value,
                              nom_produit: produit ? produit.nom : '',
                              prix_unitaire_usd: produit ? produit.prix_usd : 0,
                              prix_unitaire_fc: produit ? produit.prix_fc : 0
                            };
                            setDevisForm(prev => ({...prev, items: updatedItems}));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Sélectionner un produit</option>
                          {(produits || []).map(produit => (
                            <option key={produit.id} value={produit.id}>
                              {produit.nom} - {formatMontant(produit.prix_usd, 'USD')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantité</label>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={item.quantite}
                          onChange={(e) => {
                            const updatedItems = [...devisForm.items];
                            updatedItems[index] = {...item, quantite: parseFloat(e.target.value) || 1};
                            setDevisForm(prev => ({...prev, items: updatedItems}));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => {
                            const updatedItems = devisForm.items.filter((_, i) => i !== index);
                            setDevisForm(prev => ({...prev, items: updatedItems}));
                          }}
                          className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>

                    {/* Affichage du sous-total de la ligne */}
                    {item.produit_id && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Sous-total: {formatMontant((item.prix_unitaire_usd || 0) * (item.quantite || 1), 'USD')} / 
                        {formatMontant((item.prix_unitaire_fc || 0) * (item.quantite || 1), 'FC')}
                      </div>
                    )}
                  </div>
                ))}

                {devisForm.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    Aucun produit ajouté. Cliquez sur "Ajouter un produit" pour commencer.
                  </div>
                )}
              </div>

              {/* Totaux */}
              {devisForm.items.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Sous-total:</span>
                      <span>{formatMontant(calculateTotals(devisForm.items, devisForm.devise).sousTotal, devisForm.devise)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TVA (16%):</span>
                      <span>{formatMontant(calculateTotals(devisForm.items, devisForm.devise).tva, devisForm.devise)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-lg border-t pt-2">
                      <span>Total TTC:</span>
                      <span>{formatMontant(calculateTotals(devisForm.items, devisForm.devise).total, devisForm.devise)}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      USD: {formatMontant(calculateTotals(devisForm.items, devisForm.devise).totalUSD, 'USD')} | 
                      FC: {formatMontant(calculateTotals(devisForm.items, devisForm.devise).totalFC, 'FC')}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={devisForm.notes}
                  onChange={(e) => setDevisForm(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Notes du devis..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDevisModal(false);
                  setDevisForm({ client_id: '', items: [], devise: 'USD', notes: '', validite_jours: 30 });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={saveDevis}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Créer le devis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Opportunité */}
      {showOpportuniteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">{t('opportunities.add')}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('opportunities.name')} *</label>
                <input
                  type="text"
                  value={opportuniteForm.titre}
                  onChange={(e) => setOpportuniteForm(prev => ({...prev, titre: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Nom de l'opportunité"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('opportunities.client')} *</label>
                <select
                  value={opportuniteForm.client_id}
                  onChange={(e) => setOpportuniteForm(prev => ({...prev, client_id: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {(clients || []).map(client => (
                    <option key={client.id} value={client.id}>{client.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('opportunities.value')} (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={opportuniteForm.valeur_estimee_usd}
                  onChange={(e) => setOpportuniteForm(prev => ({...prev, valeur_estimee_usd: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('opportunities.stage')}</label>
                  <select
                    value={opportuniteForm.etape}
                    onChange={(e) => setOpportuniteForm(prev => ({...prev, etape: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="qualification">Qualification</option>
                    <option value="proposition">Proposition</option>
                    <option value="negociation">Négociation</option>
                    <option value="ferme_gagne">Fermé - Gagné</option>
                    <option value="ferme_perdu">Fermé - Perdu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('opportunities.priority')}</label>
                  <select
                    value={opportuniteForm.priorite}
                    onChange={(e) => setOpportuniteForm(prev => ({...prev, priorite: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="basse">Basse</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="haute">Haute</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('form.description')}</label>
                <textarea
                  value={opportuniteForm.description}
                  onChange={(e) => setOpportuniteForm(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Description de l'opportunité..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowOpportuniteModal(false);
                  setOpportuniteForm({ 
                    titre: '', description: '', client_id: '', valeur_estimee_usd: '', devise: 'USD', 
                    probabilite: 50, etape: 'prospect', priorite: 'moyenne', notes: '' 
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                {t('btn.cancel')}
              </button>
              <button
                onClick={saveOpportunite}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                {t('btn.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Commande */}
      {showCommandeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">{t('orders.add')}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('orders.client')} *</label>
                <select
                  value={commandeForm.client_id}
                  onChange={(e) => setCommandeForm(prev => ({...prev, client_id: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {(clients || []).map(client => (
                    <option key={client.id} value={client.id}>{client.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opportunité liée (optionnel)</label>
                <select
                  value={commandeForm.opportunite_id}
                  onChange={(e) => setCommandeForm(prev => ({...prev, opportunite_id: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Aucune opportunité liée</option>
                  {(opportunites || []).map(opp => (
                    <option key={opp.id} value={opp.id}>{opp.titre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse de livraison</label>
                <textarea
                  value={commandeForm.adresse_livraison}
                  onChange={(e) => setCommandeForm(prev => ({...prev, adresse_livraison: e.target.value}))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Adresse de livraison..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('form.notes')}</label>
                <textarea
                  value={commandeForm.notes}
                  onChange={(e) => setCommandeForm(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Notes de la commande..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCommandeModal(false);
                  setCommandeForm({ 
                    client_id: '', opportunite_id: '', items: [], devise: 'USD', 
                    adresse_livraison: '', notes: '' 
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                {t('btn.cancel')}
              </button>
              <button
                onClick={saveCommande}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                {t('btn.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'annulation de facture */}
      {showAnnulerFactureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              🚫 Annuler la facture
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Êtes-vous sûr de vouloir annuler la facture <strong>{factureToCancel?.numero}</strong> ?
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Cette action restaurera les stocks et ne peut pas être annulée.
              </p>
              
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Motif d'annulation *
              </label>
              <textarea
                value={motifAnnulation}
                onChange={(e) => setMotifAnnulation(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                placeholder="Expliquez pourquoi vous annulez cette facture..."
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAnnulerFactureModal(false);
                  setFactureToCancel(null);
                  setMotifAnnulation('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={confirmerAnnulationFacture}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                🚫 Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression de facture */}
      {showSupprimerFactureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              🗑️ Supprimer la facture
            </h3>
            
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Êtes-vous sûr de vouloir supprimer définitivement la facture <strong>{factureToDelete?.numero}</strong> ?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                ⚠️ Cette action est irréversible ! La facture sera archivée et ne pourra plus être consultée.
              </p>
              
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Motif de suppression *
              </label>
              <textarea
                value={motifSuppression}
                onChange={(e) => setMotifSuppression(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                placeholder="Expliquez pourquoi vous supprimez cette facture..."
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSupprimerFactureModal(false);
                  setFactureToDelete(null);
                  setMotifSuppression('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={confirmerSuppressionFacture}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                🗑️ Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 
          'bg-blue-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* ==== MODALS GESTION D'OUTILS ==== */}

      {/* Modal Outil (Création/Modification) */}
      {showOutilModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingOutil ? '✏️ Modifier l\'Outil' : '➕ Nouvel Outil'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom de l'outil *
                </label>
                <input
                  type="text"
                  value={outilForm.nom}
                  onChange={(e) => setOutilForm({...outilForm, nom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Référence
                </label>
                <input
                  type="text"
                  value={outilForm.reference}
                  onChange={(e) => setOutilForm({...outilForm, reference: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantité en stock
                </label>
                <input
                  type="number"
                  value={outilForm.quantite_stock}
                  onChange={(e) => setOutilForm({...outilForm, quantite_stock: parseInt(e.target.value) || 0})}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prix unitaire (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={outilForm.prix_unitaire_usd}
                  onChange={(e) => setOutilForm({...outilForm, prix_unitaire_usd: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fournisseur
                </label>
                <input
                  type="text"
                  value={outilForm.fournisseur}
                  onChange={(e) => setOutilForm({...outilForm, fournisseur: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date d'achat
                </label>
                <input
                  type="date"
                  value={outilForm.date_achat}
                  onChange={(e) => setOutilForm({...outilForm, date_achat: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  État
                </label>
                <select
                  value={outilForm.etat}
                  onChange={(e) => setOutilForm({...outilForm, etat: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="neuf">Neuf</option>
                  <option value="bon">Bon état</option>
                  <option value="use">Usé</option>
                  <option value="defaillant">Défaillant</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Localisation
                </label>
                <input
                  type="text"
                  value={outilForm.localisation}
                  onChange={(e) => setOutilForm({...outilForm, localisation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Entrepôt A, Bureau technique..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Numéro de série
                </label>
                <input
                  type="text"
                  value={outilForm.numero_serie}
                  onChange={(e) => setOutilForm({...outilForm, numero_serie: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={outilForm.description}
                onChange={(e) => setOutilForm({...outilForm, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOutilModal(false);
                  setEditingOutil(null);
                  setOutilForm({
                    nom: '', description: '', reference: '', quantite_stock: 0, prix_unitaire_usd: '',
                    fournisseur: '', date_achat: '', etat: 'neuf', localisation: '', numero_serie: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={saveOutil}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                disabled={loading || !outilForm.nom}
              >
                {loading ? 'Sauvegarde...' : (editingOutil ? '✏️ Modifier' : '➕ Créer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Approvisionnement */}
      {showApprovisionnementModal && selectedOutil && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              📦 Approvisionner: {selectedOutil.nom}
            </h3>

            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Stock actuel: <strong>{selectedOutil.quantite_stock}</strong></p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Disponible: <strong>{selectedOutil.quantite_disponible}</strong></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantité à ajouter *
                </label>
                <input
                  type="number"
                  value={approvisionnementForm.quantite_ajoutee}
                  onChange={(e) => setApprovisionnementForm({...approvisionnementForm, quantite_ajoutee: parseInt(e.target.value) || 0})}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prix unitaire (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={approvisionnementForm.prix_unitaire_usd}
                  onChange={(e) => setApprovisionnementForm({...approvisionnementForm, prix_unitaire_usd: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fournisseur
                </label>
                <input
                  type="text"
                  value={approvisionnementForm.fournisseur}
                  onChange={(e) => setApprovisionnementForm({...approvisionnementForm, fournisseur: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date d'achat
                </label>
                <input
                  type="date"
                  value={approvisionnementForm.date_achat}
                  onChange={(e) => setApprovisionnementForm({...approvisionnementForm, date_achat: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={approvisionnementForm.notes}
                  onChange={(e) => setApprovisionnementForm({...approvisionnementForm, notes: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Commentaires sur l'approvisionnement..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowApprovisionnementModal(false);
                  setSelectedOutil(null);
                  setApprovisionnementForm({
                    quantite_ajoutee: 0, prix_unitaire_usd: '', fournisseur: '', date_achat: '', notes: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={approvisionnerOutil}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                disabled={loading || !approvisionnementForm.quantite_ajoutee}
              >
                {loading ? 'Approvisionnement...' : '📦 Approvisionner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Affectation */}
      {showAffectationModal && selectedOutil && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              👨‍🔧 Affecter: {selectedOutil.nom}
            </h3>

            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Disponible: <strong>{selectedOutil.quantite_disponible}</strong></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Technicien *
                </label>
                <select
                  value={affectationForm.technicien_id}
                  onChange={(e) => setAffectationForm({...affectationForm, technicien_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Sélectionner un technicien</option>
                  {getTechniciens().map((technicien) => (
                    <option key={technicien.id} value={technicien.id}>
                      {technicien.prenom} {technicien.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantité à affecter *
                </label>
                <input
                  type="number"
                  value={affectationForm.quantite_affectee}
                  onChange={(e) => setAffectationForm({...affectationForm, quantite_affectee: parseInt(e.target.value) || 1})}
                  min="1"
                  max={selectedOutil.quantite_disponible}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date de retour prévue
                </label>
                <input
                  type="date"
                  value={affectationForm.date_retour_prevue}
                  onChange={(e) => setAffectationForm({...affectationForm, date_retour_prevue: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes d'affectation
                </label>
                <textarea
                  value={affectationForm.notes_affectation}
                  onChange={(e) => setAffectationForm({...affectationForm, notes_affectation: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Commentaires sur l'affectation..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAffectationModal(false);
                  setSelectedOutil(null);
                  setAffectationForm({
                    technicien_id: '', quantite_affectee: 1, date_retour_prevue: '', notes_affectation: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={affecterOutil}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                disabled={loading || !affectationForm.technicien_id || !affectationForm.quantite_affectee}
              >
                {loading ? 'Affectation...' : '👨‍🔧 Affecter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Retour */}
      {showRetourModal && selectedAffectation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              ↩️ Retourner: {selectedAffectation.outil_nom}
            </h3>

            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Affecté à: <strong>{selectedAffectation.technicien_nom}</strong></p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quantité affectée: <strong>{selectedAffectation.quantite_affectee}</strong></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantité à retourner *
                </label>
                <input
                  type="number"
                  value={retourForm.quantite_retournee}
                  onChange={(e) => setRetourForm({...retourForm, quantite_retournee: parseInt(e.target.value) || 1})}
                  min="1"
                  max={selectedAffectation.quantite_affectee}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  État de retour *
                </label>
                <select
                  value={retourForm.etat_retour}
                  onChange={(e) => setRetourForm({...retourForm, etat_retour: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="bon">Bon état</option>
                  <option value="endommage">Endommagé</option>
                  <option value="perdu">Perdu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes de retour
                </label>
                <textarea
                  value={retourForm.notes_retour}
                  onChange={(e) => setRetourForm({...retourForm, notes_retour: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Commentaires sur l'état de l'outil retourné..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRetourModal(false);
                  setSelectedAffectation(null);
                  setRetourForm({
                    quantite_retournee: 1, etat_retour: 'bon', notes_retour: ''
                  });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={retournerOutil}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                disabled={loading || !retourForm.quantite_retournee}
              >
                {loading ? 'Retour...' : '↩️ Confirmer le retour'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mouvements Outil */}
      {showMouvementsOutilModal && selectedOutil && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              📈 Historique des mouvements: {selectedOutil.nom}
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Stock Avant/Après
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Motif
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Utilisateur
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {mouvementsOutil.map((mouvement, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(mouvement.date_mouvement).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          mouvement.type_mouvement === 'approvisionnement' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : mouvement.type_mouvement === 'affectation'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : mouvement.type_mouvement === 'retour'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {mouvement.type_mouvement}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {mouvement.type_mouvement === 'affectation' ? '-' : '+'}
                        {mouvement.quantite}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {mouvement.stock_avant} → {mouvement.stock_apres}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {mouvement.motif}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {mouvement.fait_par}
                      </td>
                    </tr>
                  ))}
                  {mouvementsOutil.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        Aucun mouvement enregistré
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowMouvementsOutilModal(false);
                  setSelectedOutil(null);
                  setMouvementsOutil([]);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Confirmation</h3>
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {confirmDialog.message}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;