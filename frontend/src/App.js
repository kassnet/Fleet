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

  // Form states
  const [clientForm, setClientForm] = useState({ nom: '', email: '', telephone: '', adresse: '' });
  const [produitForm, setProduitForm] = useState({ nom: '', description: '', prix_usd: '', prix_fc: '', stock_actuel: '', stock_minimum: '', gestion_stock: true });
  const [factureForm, setFactureForm] = useState({ client_id: '', items: [], devise: 'USD', notes: '', numero: '' });
  const [stockForm, setStockForm] = useState({ produit_id: '', nouvelle_quantite: '', motif: '' });
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

  // Edition states
  const [editingClient, setEditingClient] = useState(null);
  const [editingProduit, setEditingProduit] = useState(null);
  const [editingFacture, setEditingFacture] = useState(null);
  const [mouvementsStock, setMouvementsStock] = useState([]);
  
  // Sales edition states
  const [editingDevis, setEditingDevis] = useState(null);
  const [editingOpportunite, setEditingOpportunite] = useState(null);
  const [editingCommande, setEditingCommande] = useState(null);
  const [selectedOpportunite, setSelectedOpportunite] = useState(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Permissions pour les ventes (Admin et Manager uniquement)
  const canManageSales = () => {
    return user && ['admin', 'manager'].includes(user.role);
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

  const loadData = async () => {
    if (!user || !accessToken) {
      console.log('❌ Pas d\'utilisateur ou de token, abandon du chargement');
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
      setTauxChange(tauxRes.data || { taux_change_actuel: 2800 });

      // Données restreintes seulement pour certains rôles
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'comptable') {
        console.log('💼 Chargement des données restreintes pour rôle:', user.role);
        try {
          const [facturesRes, paiementsRes] = await Promise.all([
            apiCall('GET', '/api/factures'),
            apiCall('GET', '/api/paiements')
          ]);
          
          setFactures(facturesRes.data || []);
          setPaiements(Array.isArray(paiementsRes.data) ? paiementsRes.data : []);
          console.log('💳 Données restreintes chargées - Factures:', facturesRes.data.length, 'Paiements:', paiementsRes.data.length);
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
          const [devisRes, opportunitesRes, commandesRes, venteStatsRes] = await Promise.all([
            apiCall('GET', '/api/devis'),
            apiCall('GET', '/api/opportunites'),
            apiCall('GET', '/api/commandes'),
            apiCall('GET', '/api/vente/stats')
          ]);
          
          setDevis(devisRes.data || []);
          setOpportunites(opportunitesRes.data || []);
          setCommandes(commandesRes.data || []);
          setVenteStats(venteStatsRes.data || {});
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
  }, [user, accessToken]); // Dépendre aussi du accessToken

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

  // Gestion des stocks
  const updateStock = async () => {
    try {
      await apiCall('PUT', `/api/produits/${stockForm.produit_id}/stock`, {
        nouvelle_quantite: parseInt(stockForm.nouvelle_quantite),
        motif: stockForm.motif
      });

      loadData();
      setShowStockModal(false);
      setStockForm({ produit_id: '', nouvelle_quantite: '', motif: '' });
      showNotification('Stock mis à jour avec succès', 'success');
    } catch (error) {
      console.error('Erreur mise à jour stock:', error);
      showNotification('Erreur lors de la mise à jour du stock', 'error');
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
      await apiCall('PUT', `/api/taux-change?nouveau_taux=${nouveauTaux}`);
      
      loadData();
      setShowTauxModal(false);
      showNotification('Taux de change mis à jour', 'success');
    } catch (error) {
      console.error('Erreur mise à jour taux:', error);
      showNotification('Erreur lors de la mise à jour du taux de change', 'error');
    }
  };

  // ===== FONCTIONS VENTES =====
  
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
        total_ttc_fc: totaux.totalFC
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

    if (canManageUsers()) {
      tabs.push({ id: 'users', label: t('nav.users'), icon: '👤', roles: ['admin'] });
    }

    return tabs;
  };

  const getStatutBadge = (statut) => {
    const styles = {
      'brouillon': 'bg-gray-100 text-gray-600',
      'envoyee': 'bg-blue-100 text-blue-600',
      'payee': 'bg-green-100 text-green-600',
      'overdue': 'bg-red-100 text-red-600'
    };

    const labels = {
      'brouillon': 'Brouillon',
      'envoyee': 'Envoyée',
      'payee': 'Payée',
      'overdue': 'En retard'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[statut] || 'bg-gray-100 text-gray-600'}`}>
        {labels[statut] || statut}
      </span>
    );
  };

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header avec authentification */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img 
                  src="/logo.png" 
                  alt="FacturApp Logo" 
                  className="h-8 w-8 object-contain"
                />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('app.title')}</h1>
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
                   user.role === 'comptable' ? `💰 ${t('user.role.comptable')}` : `👤 ${t('user.role.utilisateur')}`}
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
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h2>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Taux USD/FC: <span className="font-medium">{tauxChange.taux_change_actuel?.toLocaleString()}</span>
                {canManageProducts() && (
                  <button 
                    onClick={() => setShowTauxModal(true)}
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Modifier
                  </button>
                )}
              </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.stats.totalClients')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_clients || 0}</p>
                  </div>
                  <span className="text-3xl">👥</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.stats.totalProducts')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_produits || 0}</p>
                  </div>
                  <span className="text-3xl">📦</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.stats.totalInvoices')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_factures || 0}</p>
                  </div>
                  <span className="text-3xl">🧾</span>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.stats.totalRevenue')} (USD)</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">${(stats.ca_mensuel_usd || 0).toLocaleString()}</p>
                  </div>
                  <span className="text-3xl">💰</span>
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {paiement.statut === 'pending' ? (
                                  <button
                                    onClick={() => validerPaiement(paiement.id)}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    ✅ Valider
                                  </button>
                                ) : (
                                  <span className="text-green-600">✅ Validé</span>
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

        {/* Section Gestion des utilisateurs */}
        {activeTab === 'users' && (
          <ProtectedRoute requiredRoles={['admin']}>
            <UserManagement />
          </ProtectedRoute>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>💼 <strong>{t('app.title')}</strong> - {t('app.description')}</p>
            <p className="mt-1">📦 Stocks • 💱 Multi-devises • 💳 Paiements • 🔐 Authentification sécurisée</p>
          </div>
        </div>
      </footer>

      {/* Modals et autres composants... (garder tous les modals existants) */}

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
                    <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded">
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Gestion du stock</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produit *</label>
                <select
                  value={stockForm.produit_id}
                  onChange={(e) => setStockForm(prev => ({...prev, produit_id: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle quantité *</label>
                <input
                  type="number"
                  required
                  value={stockForm.nouvelle_quantite}
                  onChange={(e) => setStockForm(prev => ({...prev, nouvelle_quantite: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif *</label>
                <select
                  value={stockForm.motif}
                  onChange={(e) => setStockForm(prev => ({...prev, motif: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Sélectionner un motif</option>
                  <option value="achat">Achat / Réapprovisionnement</option>
                  <option value="vente">Vente</option>
                  <option value="ajustement">Ajustement d'inventaire</option>
                  <option value="perte">Perte / Casse</option>
                  <option value="retour">Retour client</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setStockForm({ produit_id: '', nouvelle_quantite: '', motif: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={updateStock}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Mettre à jour
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
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Mouvements de stock</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock après</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Motif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(mouvementsStock || []).map((mouvement, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          mouvement.type === 'entree' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {mouvement.type === 'entree' ? '+' : '-'} {mouvement.quantite}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{mouvement.quantite}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{mouvement.stock_apres}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{mouvement.motif}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowMouvementsModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
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
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-3">
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