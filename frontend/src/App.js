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

  // Modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProduitModal, setShowProduitModal] = useState(false);
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showMouvementsModal, setShowMouvementsModal] = useState(false);
  const [showTauxModal, setShowTauxModal] = useState(false);

  // Form states
  const [clientForm, setClientForm] = useState({ nom: '', email: '', telephone: '', adresse: '' });
  const [produitForm, setProduitForm] = useState({ nom: '', description: '', prix_usd: '', prix_fc: '', stock_actuel: '', stock_minimum: '', gestion_stock: true });
  const [factureForm, setFactureForm] = useState({ client_id: '', items: [], devise: 'USD', notes: '', numero: '' });
  const [stockForm, setStockForm] = useState({ produit_id: '', nouvelle_quantite: '', motif: '' });
  const [nouveauTaux, setNouveauTaux] = useState(2800);

  // Edition states
  const [editingClient, setEditingClient] = useState(null);
  const [editingProduit, setEditingProduit] = useState(null);
  const [editingFacture, setEditingFacture] = useState(null);
  const [mouvementsStock, setMouvementsStock] = useState([]);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

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
                <span className="text-2xl">📊</span>
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
                    <span>Nouveau produit</span>
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
                <h2 className="text-2xl font-bold">Gestion des clients</h2>
                <button
                  onClick={() => setShowClientModal(true)}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
                >
                  + Nouveau client
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
                <h2 className="text-2xl font-bold">Gestion des produits</h2>
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
                    + Nouveau produit
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
                <h2 className="text-2xl font-bold">Gestion des factures</h2>
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