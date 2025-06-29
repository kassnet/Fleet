import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [produits, setProduits] = useState([]);
  const [factures, setFactures] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [stats, setStats] = useState({});
  const [tauxChange, setTauxChange] = useState({ taux: 2800 });
  const [loading, setLoading] = useState(false);

  // États pour les notifications et confirmations modernes
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // États pour les modales
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProduitModal, setShowProduitModal] = useState(false);
  const [showFactureModal, setShowFactureModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showTauxModal, setShowTauxModal] = useState(false);
  const [showMouvementsModal, setShowMouvementsModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [mouvementsStock, setMouvementsStock] = useState([]);
  const [produitMouvements, setProduitMouvements] = useState({ id: '', nom: '' });

  // États pour les formulaires
  const [clientForm, setClientForm] = useState({
    nom: '', email: '', telephone: '', adresse: '', ville: '', code_postal: '', pays: 'RDC', devise_preferee: 'USD'
  });
  const [produitForm, setProduitForm] = useState({
    nom: '', description: '', prix_usd: '', unite: 'unité', tva: 16.0, actif: true,
    gestion_stock: false, stock_actuel: '', stock_minimum: '', stock_maximum: ''
  });
  const [factureForm, setFactureForm] = useState({
    client_id: '', devise: 'USD', lignes: [], notes: ''
  });
  const [stockForm, setStockForm] = useState({
    produit_id: '', nouvelle_quantite: '', motif: ''
  });

  // Devises disponibles
  const devises = [
    { code: 'USD', nom: 'Dollar Américain', symbole: '$' },
    { code: 'FC', nom: 'Franc Congolais', symbole: 'FC' }
  ];

  // Fonctions utilitaires pour notifications et confirmations
  const showNotification = (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setNotification({ id, message, type });
    setTimeout(() => {
      setNotification(null);
    }, duration);
  };

  const showConfirm = (message, onConfirm, onCancel = null) => {
    setConfirmDialog({
      message,
      onConfirm: () => {
        setConfirmDialog(null);
        onConfirm();
      },
      onCancel: () => {
        setConfirmDialog(null);
        if (onCancel) onCancel();
      }
    });
  };

  const setOperationLoading = (operation, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [operation]: isLoading
    }));
  };

  // Chargement des données
  useEffect(() => {
    loadData();
  }, []);

  // Fermer le menu mobile quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMobileMenu && !event.target.closest('header')) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileMenu]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsRes, produitsRes, facturesRes, statsRes, paiementsRes, tauxRes] = await Promise.all([
        fetch(`${API_URL}/api/clients`),
        fetch(`${API_URL}/api/produits`),
        fetch(`${API_URL}/api/factures`),
        fetch(`${API_URL}/api/stats`),
        fetch(`${API_URL}/api/paiements`),
        fetch(`${API_URL}/api/taux-change`)
      ]);

      setClients(await clientsRes.json());
      setProduits(await produitsRes.json());
      setFactures(await facturesRes.json());
      setStats(await statsRes.json());
      setPaiements(await paiementsRes.json());
      setTauxChange(await tauxRes.json());
    } catch (error) {
      console.error('Erreur de chargement:', error);
    }
    setLoading(false);
  };

  // Fonctions utilitaires
  const formatMontant = (montant, devise) => {
    const symbole = devises.find(d => d.code === devise)?.symbole || devise;
    if (devise === 'FC') {
      return `${montant?.toLocaleString('fr-FR')} ${symbole}`;
    }
    return `${symbole} ${montant?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const convertirMontant = async (montant, deviseSource, deviseCible) => {
    if (deviseSource === deviseCible) return montant;
    
    try {
      const response = await fetch(
        `${API_URL}/api/conversion?montant=${montant}&devise_source=${deviseSource}&devise_cible=${deviseCible}`
      );
      const data = await response.json();
      return data.montant_converti;
    } catch (error) {
      console.error('Erreur conversion:', error);
      return montant;
    }
  };

  // Fonctions CRUD Clients
  const saveClient = async () => {
    // Validation des données
    if (!clientForm.nom || !clientForm.email) {
      showNotification('Veuillez remplir au moins le nom et l\'email', 'error');
      return;
    }

    setOperationLoading('saveClient', true);
    try {
      const url = editingItem ? `${API_URL}/api/clients/${editingItem.id}` : `${API_URL}/api/clients`;
      const method = editingItem ? 'PUT' : 'POST';
      
      const clientData = {
        nom: clientForm.nom,
        email: clientForm.email,
        telephone: clientForm.telephone || '',
        adresse: clientForm.adresse || '',
        ville: clientForm.ville || '',
        code_postal: clientForm.code_postal || '',
        pays: clientForm.pays || 'RDC',
        devise_preferee: clientForm.devise_preferee || 'USD'
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      // Mise à jour locale sans rechargement complet
      if (editingItem) {
        setClients(prev => prev.map(c => c.id === editingItem.id ? result : c));
        showNotification('Client modifié avec succès !', 'success');
      } else {
        setClients(prev => [...prev, result]);
        showNotification('Client créé avec succès !', 'success');
      }
      
      setShowClientModal(false);
      resetClientForm();
    } catch (error) {
      console.error('Erreur sauvegarde client:', error);
      showNotification(`Erreur lors de la sauvegarde: ${error.message}`, 'error');
    } finally {
      setOperationLoading('saveClient', false);
    }
  };

  const deleteClient = async (id) => {
    showConfirm(
      'Êtes-vous sûr de vouloir supprimer ce client définitivement ?',
      async () => {
        setOperationLoading('deleteClient', true);
        try {
          const response = await fetch(`${API_URL}/api/clients/${id}`, { method: 'DELETE' });
          
          if (!response.ok) {
            throw new Error(`Erreur ${response.status}`);
          }
          
          // Mise à jour locale sans rechargement
          setClients(prev => prev.filter(c => c.id !== id));
          showNotification('Client supprimé avec succès !', 'success');
        } catch (error) {
          console.error('Erreur suppression client:', error);
          showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
        } finally {
          setOperationLoading('deleteClient', false);
        }
      }
    );
  };

  const resetClientForm = () => {
    setClientForm({ nom: '', email: '', telephone: '', adresse: '', ville: '', code_postal: '', pays: 'RDC', devise_preferee: 'USD' });
    setEditingItem(null);
  };

  // Fonctions CRUD Produits
  // Fonctions CRUD Produits
  const saveProduit = async () => {
    // Validation des données
    if (!produitForm.nom || !produitForm.prix_usd) {
      showNotification('Veuillez remplir au moins le nom et le prix USD', 'error');
      return;
    }

    setOperationLoading('saveProduit', true);
    try {
      const url = editingItem ? `${API_URL}/api/produits/${editingItem.id}` : `${API_URL}/api/produits`;
      const method = editingItem ? 'PUT' : 'POST';
      
      const produitData = {
        nom: produitForm.nom,
        description: produitForm.description || '',
        prix_usd: parseFloat(produitForm.prix_usd) || 0,
        unite: produitForm.unite || 'unité',
        tva: parseFloat(produitForm.tva) || 16.0,
        actif: produitForm.actif !== undefined ? produitForm.actif : true,
        gestion_stock: produitForm.gestion_stock || false,
        stock_actuel: produitForm.gestion_stock ? parseInt(produitForm.stock_actuel) || 0 : null,
        stock_minimum: produitForm.gestion_stock ? parseInt(produitForm.stock_minimum) || 0 : null,
        stock_maximum: produitForm.gestion_stock ? parseInt(produitForm.stock_maximum) || 0 : null
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produitData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      // Mise à jour locale sans rechargement complet
      if (editingItem) {
        setProduits(prev => prev.map(p => p.id === editingItem.id ? result : p));
        showNotification('Produit modifié avec succès !', 'success');
      } else {
        setProduits(prev => [...prev, result]);
        showNotification('Produit créé avec succès !', 'success');
      }
      
      setShowProduitModal(false);
      resetProduitForm();
    } catch (error) {
      console.error('Erreur sauvegarde produit:', error);
      showNotification(`Erreur lors de la sauvegarde: ${error.message}`, 'error');
    } finally {
      setOperationLoading('saveProduit', false);
    }
  };

  const deleteProduit = async (id) => {
    showConfirm(
      'Êtes-vous sûr de vouloir supprimer ce produit définitivement ?',
      async () => {
        setOperationLoading('deleteProduit', true);
        try {
          const response = await fetch(`${API_URL}/api/produits/${id}`, { method: 'DELETE' });
          
          if (!response.ok) {
            throw new Error(`Erreur ${response.status}`);
          }
          
          // Mise à jour locale sans rechargement
          setProduits(prev => prev.filter(p => p.id !== id));
          showNotification('Produit supprimé avec succès !', 'success');
        } catch (error) {
          console.error('Erreur suppression produit:', error);
          showNotification(`Erreur lors de la suppression: ${error.message}`, 'error');
        } finally {
          setOperationLoading('deleteProduit', false);
        }
      }
    );
  };

  const resetProduitForm = () => {
    setProduitForm({
      nom: '', description: '', prix_usd: '', unite: 'unité', tva: 16.0, actif: true,
      gestion_stock: false, stock_actuel: '', stock_minimum: '', stock_maximum: ''
    });
    setEditingItem(null);
  };

  // Gestion des stocks
  const updateStock = async () => {
    try {
      await fetch(`${API_URL}/api/produits/${stockForm.produit_id}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nouvelle_quantite: parseInt(stockForm.nouvelle_quantite),
          motif: stockForm.motif || 'Mise à jour manuelle'
        })
      });
      
      loadData();
      setShowStockModal(false);
      setStockForm({ produit_id: '', nouvelle_quantite: '', motif: '' });
      alert('Stock mis à jour avec succès');
    } catch (error) {
      console.error('Erreur mise à jour stock:', error);
    }
  };

  const voirMouvementsStock = async (produitId, nomProduit) => {
    try {
      const response = await fetch(`${API_URL}/api/produits/${produitId}/mouvements`);
      const data = await response.json();
      setMouvementsStock(data);
      setProduitMouvements({ id: produitId, nom: nomProduit });
      setShowMouvementsModal(true);
    } catch (error) {
      console.error('Erreur récupération mouvements:', error);
      alert('Erreur lors de la récupération des mouvements de stock');
    }
  };

  // Gestion du taux de change
  const updateTauxChange = async (nouveauTaux) => {
    try {
      await fetch(`${API_URL}/api/taux-change`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nouveau_taux: parseFloat(nouveauTaux) })
      });
      
      loadData();
      setShowTauxModal(false);
      alert('Taux de change mis à jour');
    } catch (error) {
      console.error('Erreur mise à jour taux:', error);
    }
  };

  // Fonctions Factures
  const createFacture = () => {
    setFactureForm({ client_id: '', devise: 'USD', lignes: [], notes: '' });
    setShowFactureModal(true);
  };

  const addLigneFacture = useCallback(() => {
    setFactureForm(prev => ({
      ...prev,
      lignes: [...prev.lignes, {
        produit_id: '',
        nom_produit: '',
        quantite: 1,
        prix_unitaire_usd: 0,
        prix_unitaire_fc: 0,
        devise: prev.devise || 'USD',
        tva: 16.0,
        total_ht_usd: 0,
        total_ht_fc: 0,
        total_ttc_usd: 0,
        total_ttc_fc: 0
      }]
    }));
  }, []);

  const updateLigneFacture = useCallback(async (index, field, value) => {
    setFactureForm(prev => {
      const newLignes = [...prev.lignes];
      newLignes[index] = { ...newLignes[index], [field]: value };
      
      if (field === 'produit_id' && value) {
        const produit = produits.find(p => p.id === value);
        if (produit) {
          newLignes[index].nom_produit = produit.nom;
          newLignes[index].prix_unitaire_usd = produit.prix_usd;
          newLignes[index].prix_unitaire_fc = produit.prix_fc || (produit.prix_usd * tauxChange.taux);
          newLignes[index].tva = produit.tva;
          newLignes[index].devise = prev.devise || 'USD';
          
          // Recalculer immédiatement les totaux pour ce nouveau produit
          const quantite = newLignes[index].quantite || 1;
          newLignes[index].total_ht_usd = quantite * newLignes[index].prix_unitaire_usd;
          newLignes[index].total_ht_fc = quantite * newLignes[index].prix_unitaire_fc;
          newLignes[index].total_ttc_usd = newLignes[index].total_ht_usd * (1 + (newLignes[index].tva || 0) / 100);
          newLignes[index].total_ttc_fc = newLignes[index].total_ht_fc * (1 + (newLignes[index].tva || 0) / 100);
        }
      }
      
      // Recalculer les totaux si la quantité ou les prix changent
      if (field === 'quantite' || field === 'prix_unitaire_usd' || field === 'prix_unitaire_fc') {
        const ligne = newLignes[index];
        const quantite = parseFloat(ligne.quantite) || 0;
        const prixUsd = parseFloat(ligne.prix_unitaire_usd) || 0;
        const prixFc = parseFloat(ligne.prix_unitaire_fc) || 0;
        const tva = parseFloat(ligne.tva) || 0;
        
        ligne.total_ht_usd = quantite * prixUsd;
        ligne.total_ht_fc = quantite * prixFc;
        ligne.total_ttc_usd = ligne.total_ht_usd * (1 + tva / 100);
        ligne.total_ttc_fc = ligne.total_ht_fc * (1 + tva / 100);
      }
      
      return { ...prev, lignes: newLignes };
    });
  }, [produits, tauxChange]);

  const removeLigneFacture = useCallback((index) => {
    setFactureForm(prev => ({
      ...prev,
      lignes: prev.lignes.filter((_, i) => i !== index)
    }));
  }, []);

  const saveFacture = async () => {
    try {
      const client = clients.find(c => c.id === factureForm.client_id);
      if (!client) {
        showNotification('Veuillez sélectionner un client', 'error');
        return;
      }

      if (factureForm.lignes.length === 0) {
        showNotification('Veuillez ajouter au moins un produit', 'error');
        return;
      }

      const total_ht_usd = factureForm.lignes.reduce((sum, ligne) => sum + (ligne.total_ht_usd || 0), 0);
      const total_ht_fc = factureForm.lignes.reduce((sum, ligne) => sum + (ligne.total_ht_fc || 0), 0);
      const total_tva_usd = factureForm.lignes.reduce((sum, ligne) => sum + ((ligne.total_ht_usd || 0) * (ligne.tva || 0) / 100), 0);
      const total_tva_fc = factureForm.lignes.reduce((sum, ligne) => sum + ((ligne.total_ht_fc || 0) * (ligne.tva || 0) / 100), 0);
      const total_ttc_usd = total_ht_usd + total_tva_usd;
      const total_ttc_fc = total_ht_fc + total_tva_fc;

      const facture = {
        client_id: client.id,
        client_nom: client.nom,
        client_email: client.email,
        client_adresse: `${client.adresse}, ${client.ville} ${client.code_postal}`,
        devise: factureForm.devise,
        lignes: factureForm.lignes,
        total_ht_usd,
        total_ht_fc,
        total_tva_usd,
        total_tva_fc,
        total_ttc_usd,
        total_ttc_fc,
        notes: factureForm.notes
      };

      console.log('Création facture avec les données:', facture);

      const response = await fetch(`${API_URL}/api/factures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facture)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const factureCreee = await response.json();
      console.log('Facture créée avec succès:', factureCreee);

      showNotification(`Facture ${factureCreee.numero} créée avec succès !`, 'success');
      
      loadData();
      setShowFactureModal(false);
      setFactureForm({ client_id: '', devise: 'USD', lignes: [], notes: '' });
    } catch (error) {
      console.error('Erreur création facture:', error);
      showNotification(`Erreur lors de la création de la facture: ${error.message}`, 'error');
    }
  };

  const envoyerFacture = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/factures/${id}/envoyer`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      showNotification('📧 Facture envoyée par email (simulation)', 'success');
      loadData();
    } catch (error) {
      console.error('Erreur envoi facture:', error);
      showNotification(`❌ Erreur lors de l'envoi de la facture: ${error.message}`, 'error');
    }
  };

  const marquerCommePayee = async (facture) => {
    const confirmMessage = `Marquer la facture ${facture.numero} comme payée ?

Montant: ${formatMontant(facture.total_ttc_usd, 'USD')} / ${formatMontant(facture.total_ttc_fc, 'FC')}`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await fetch(`${API_URL}/api/factures/${facture.id}/payer`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erreur ${response.status}: ${errorText}`);
        }

        showNotification(`✅ Facture ${facture.numero} marquée comme payée !`, 'success');
        loadData();
      } catch (error) {
        console.error('Erreur marquage facture:', error);
        showNotification(`❌ Erreur lors du marquage de la facture: ${error.message}`, 'error');
      }
    }
  };

  const validerPaiement = async (paiementId) => {
    if (window.confirm('Valider ce paiement comme terminé ?')) {
      try {
        const response = await fetch(`${API_URL}/api/paiements/${paiementId}/valider`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`Erreur ${response.status}`);
        }
        
        alert('✅ Paiement validé avec succès !');
        loadData();
      } catch (error) {
        console.error('Erreur validation paiement:', error);
        alert('❌ Erreur lors de la validation du paiement');
      }
    }
  };

  const simulerPaiement = async (facture, devise = 'USD') => {
    try {
      console.log('Simulation de paiement pour facture:', facture.id, 'en', devise);
      
      const response = await fetch(`${API_URL}/api/paiements/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          facture_id: facture.id, 
          devise_paiement: devise 
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur API simulation paiement:', errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Réponse simulation paiement:', data);
      
      const montant = devise === 'USD' ? facture.total_ttc_usd : facture.total_ttc_fc;
      const montantFormatte = formatMontant(montant, devise);
      
      const confirmMessage = `Simuler le paiement Stripe ?

Facture: ${facture.numero}
Montant: ${montantFormatte}
Devise: ${devise}
Transaction ID: ${data.transaction_id}

✅ Confirmer le paiement ?`;

      if (window.confirm(confirmMessage)) {
        // Marquer comme payée en simulation
        const payResponse = await fetch(`${API_URL}/api/factures/${facture.id}/payer`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paiement_id: data.paiement_id })
        });
        
        if (!payResponse.ok) {
          const errorText = await payResponse.text();
          console.error('Erreur marquage facture payée:', errorText);
          throw new Error(`Erreur lors du marquage comme payée: ${errorText}`);
        }

        showNotification(`💳 Paiement simulé avec succès ! Facture ${facture.numero} marquée comme payée`, 'success');
        loadData();
      }
    } catch (error) {
      console.error('Erreur simulation paiement:', error);
      showNotification(`❌ Erreur lors de la simulation de paiement: ${error.message}`, 'error');
    }
  };

  // Rendu des composants
  const renderDashboard = () => (
    <div className="flex h-full">
      {/* Sidebar gauche */}
      <div className="hidden lg:block w-64 bg-white shadow-lg border-r">
        <div className="p-6">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-2xl font-bold">📊</span>
            </div>
            <div>
              <h2 className="font-bold text-gray-900">FacturePro</h2>
              <p className="text-xs text-gray-500">Tableau de bord</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Statistiques dans la sidebar */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Statistiques</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-2">👥</span>
                    <span className="text-sm font-medium text-blue-800">Clients</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{stats.total_clients || 0}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">📦</span>
                    <span className="text-sm font-medium text-green-800">Produits</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{stats.total_produits || 0}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-purple-600 mr-2">📄</span>
                    <span className="text-sm font-medium text-purple-800">Factures</span>
                  </div>
                  <span className="text-lg font-bold text-purple-600">{stats.total_factures || 0}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-red-600 mr-2">⚠️</span>
                    <span className="text-sm font-medium text-red-800">Impayées</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">{stats.factures_impayees || 0}</span>
                </div>
              </div>
            </div>

            {/* Chiffre d'affaires */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Chiffre d'affaires</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 font-medium">CA Mensuel</p>
                  <p className="text-lg font-bold text-green-700">{formatMontant(stats.ca_mensuel_usd, 'USD')}</p>
                  <p className="text-xs text-green-500">{formatMontant(stats.ca_mensuel_fc, 'FC')}</p>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">CA Annuel</p>
                  <p className="text-lg font-bold text-blue-700">{formatMontant(stats.ca_annuel_usd, 'USD')}</p>
                  <p className="text-xs text-blue-500">{formatMontant(stats.ca_annuel_fc, 'FC')}</p>
                </div>
              </div>
            </div>

            {/* Alertes */}
            {stats.produits_stock_bas > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center">
                  <span className="text-orange-600 text-lg mr-2">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-orange-800">Stock bas</p>
                    <p className="text-xs text-orange-600">{stats.produits_stock_bas} produit(s)</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Taux de change */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">💱</span>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Taux USD/FC</p>
                    <p className="text-sm font-bold text-blue-700">1 USD = {stats.taux_change_actuel?.toLocaleString('fr-FR')} FC</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTauxModal(true)}
                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                >
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 p-6">
        {/* Logo et titre pour desktop */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-3xl">🧾</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue dans FacturePro RDC</h1>
          <p className="text-gray-600">Votre solution complète de facturation et gestion des stocks</p>
        </div>

        {/* Actions rapides */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Actions rapides</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button
              onClick={() => {setShowClientModal(true); resetClientForm();}}
              className="group bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300 hover:-translate-y-1"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 transition-colors">
                  <span className="text-white text-2xl">👥</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Nouveau Client</h3>
                <p className="text-sm text-gray-600">Ajouter un nouveau client à votre base</p>
              </div>
            </button>

            <button
              onClick={() => {setShowProduitModal(true); resetProduitForm();}}
              className="group bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-green-300 hover:-translate-y-1"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-600 transition-colors">
                  <span className="text-white text-2xl">📦</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Nouveau Produit</h3>
                <p className="text-sm text-gray-600">Ajouter un produit ou service</p>
              </div>
            </button>

            <button
              onClick={createFacture}
              className="group bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-purple-300 hover:-translate-y-1"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-600 transition-colors">
                  <span className="text-white text-2xl">📄</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Nouvelle Facture</h3>
                <p className="text-sm text-gray-600">Créer une nouvelle facture</p>
              </div>
            </button>

            <button
              onClick={() => setShowStockModal(true)}
              className="group bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-orange-300 hover:-translate-y-1"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-600 transition-colors">
                  <span className="text-white text-2xl">📊</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Gérer Stock</h3>
                <p className="text-sm text-gray-600">Mettre à jour les stocks</p>
              </div>
            </button>
          </div>

          {/* Résumé rapide pour mobile */}
          <div className="lg:hidden mt-8 grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Clients</p>
              <p className="text-2xl font-bold text-blue-700">{stats.total_clients || 0}</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">CA Mensuel</p>
              <p className="text-lg font-bold text-green-700">{formatMontant(stats.ca_mensuel_usd, 'USD')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClients = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des clients</h2>
        <button
          onClick={() => {setShowClientModal(true); resetClientForm();}}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          ➕ Nouveau client
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Vue Mobile - Cards */}
        <div className="block md:hidden">
          {clients.map(client => (
            <div key={client.id} className="mobile-card">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">{client.nom}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingItem(client);
                      setClientForm(client);
                      setShowClientModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteClient(client.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Email:</span>
                  <span className="mobile-card-value">{client.email}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Téléphone:</span>
                  <span className="mobile-card-value">{client.telephone}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Ville:</span>
                  <span className="mobile-card-value">{client.ville}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Devise:</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    client.devise_preferee === 'USD' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {client.devise_preferee}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Vue Desktop - Tableau */}
        <div className="desktop-table overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Devise</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{client.nom}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{client.telephone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{client.ville}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      client.devise_preferee === 'USD' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {client.devise_preferee}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => {
                        setEditingItem(client);
                        setClientForm({
                          nom: client.nom,
                          email: client.email,
                          telephone: client.telephone || '',
                          adresse: client.adresse || '',
                          ville: client.ville || '',
                          code_postal: client.code_postal || '',
                          pays: client.pays || 'RDC',
                          devise_preferee: client.devise_preferee || 'USD'
                        });
                        setShowClientModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderProduits = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Catalogue produits/services</h2>
        <button
          onClick={() => {setShowProduitModal(true); resetProduitForm();}}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
        >
          ➕ Nouveau produit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {produits.map(produit => (
          <div key={produit.id} className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg">{produit.nom}</h3>
              <div className="space-x-2">
                <button
                  onClick={() => {
                    setEditingItem(produit);
                    setProduitForm({
                      nom: produit.nom,
                      description: produit.description || '',
                      prix_usd: produit.prix_usd,
                      unite: produit.unite,
                      tva: produit.tva,
                      actif: produit.actif,
                      gestion_stock: produit.gestion_stock,
                      stock_actuel: produit.stock_actuel || '',
                      stock_minimum: produit.stock_minimum || '',
                      stock_maximum: produit.stock_maximum || ''
                    });
                    setShowProduitModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteProduit(produit.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <p className="text-gray-600 mb-3">{produit.description}</p>
            
            <div className="border-t pt-3">
              <div className="mb-2">
                <p className="text-lg font-bold text-green-600">{formatMontant(produit.prix_usd, 'USD')}</p>
                <p className="text-sm text-gray-600">{formatMontant(produit.prix_fc, 'FC')}</p>
                <p className="text-sm text-gray-500">par {produit.unite} • TVA {produit.tva}%</p>
              </div>
              
              {produit.gestion_stock && (
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Stock:</span>
                    <span className={`text-sm font-medium ${
                      produit.stock_actuel <= produit.stock_minimum ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {produit.stock_actuel} / {produit.stock_maximum}
                    </span>
                  </div>
                  {produit.stock_actuel <= produit.stock_minimum && (
                    <p className="text-xs text-red-500">⚠️ Stock bas</p>
                  )}
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className={`inline-block px-2 py-1 text-xs rounded ${
                  produit.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {produit.actif ? 'Actif' : 'Inactif'}
                </span>
                
                {produit.gestion_stock && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => {
                        setStockForm({ produit_id: produit.id, nouvelle_quantite: produit.stock_actuel, motif: '' });
                        setShowStockModal(true);
                      }}
                      className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
                    >
                      📦 Stock
                    </button>
                    <button
                      onClick={() => voirMouvementsStock(produit.id, produit.nom)}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      📋 Historique
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFactures = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des factures</h2>
        <button
          onClick={createFacture}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition"
        >
          ➕ Nouvelle facture
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numéro</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Devise</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {factures.map(facture => (
                <tr key={facture.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{facture.numero}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{facture.client_nom}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-bold">{formatMontant(facture.total_ttc_usd, 'USD')}</p>
                      <p className="text-xs text-gray-500">{formatMontant(facture.total_ttc_fc, 'FC')}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      facture.devise === 'USD' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {facture.devise}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      facture.statut === 'payee' ? 'bg-green-100 text-green-800' :
                      facture.statut === 'envoyee' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {facture.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                    {new Date(facture.date_creation).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    {facture.statut === 'brouillon' && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => envoyerFacture(facture.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm bg-blue-50 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 transition"
                        >
                          📧 Envoyer
                        </button>
                      </div>
                    )}
                    {facture.statut === 'envoyee' && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => simulerPaiement(facture, 'USD')}
                          className="text-green-600 hover:text-green-800 text-xs bg-green-50 px-2 py-1 rounded border border-green-200 hover:bg-green-100 transition"
                        >
                          💳 Payer USD ({formatMontant(facture.total_ttc_usd, 'USD')})
                        </button>
                        <button
                          onClick={() => simulerPaiement(facture, 'FC')}
                          className="text-blue-600 hover:text-blue-800 text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 transition"
                        >
                          💳 Payer FC ({formatMontant(facture.total_ttc_fc, 'FC')})
                        </button>
                        <button
                          onClick={() => marquerCommePayee(facture)}
                          className="text-green-600 hover:text-green-800 text-xs bg-green-50 px-2 py-1 rounded border border-green-200 hover:bg-green-100 transition"
                        >
                          ✅ Marquer payée
                        </button>
                      </div>
                    )}
                    {facture.statut === 'payee' && (
                      <div className="text-green-600 text-sm">
                        <div className="flex items-center">
                          <span className="text-green-500 mr-1">✅</span>
                          Payée
                        </div>
                        {facture.date_paiement && (
                          <div className="text-xs text-gray-500">
                            {new Date(facture.date_paiement).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>
                    )}
                    {(facture.statut === 'brouillon' || facture.statut === 'envoyee') && (
                      <button
                        onClick={() => marquerCommePayee(facture)}
                        className="text-green-600 hover:text-green-800 text-sm bg-green-50 px-2 py-1 rounded border border-green-200 hover:bg-green-100 transition"
                      >
                        ✅ Marquer payée
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPaiements = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Historique des paiements</h2>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facture</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Devise</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paiements.map(paiement => (
                <tr key={paiement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{paiement.facture_numero}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {paiement.devise_paiement === 'USD' 
                      ? formatMontant(paiement.montant_usd, 'USD')
                      : formatMontant(paiement.montant_fc, 'FC')
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      paiement.devise_paiement === 'USD' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {paiement.devise_paiement}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{paiement.methode_paiement}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      paiement.statut === 'completed' ? 'bg-green-100 text-green-800' :
                      paiement.statut === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {paiement.statut === 'completed' ? 'Terminé' :
                       paiement.statut === 'pending' ? 'En attente' : 'Échoué'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                    {new Date(paiement.date_paiement).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {paiement.statut === 'pending' && (
                      <button
                        onClick={() => validerPaiement(paiement.id)}
                        className="text-green-600 hover:text-green-800 text-sm bg-green-50 px-2 py-1 rounded border border-green-200 hover:bg-green-100 transition"
                      >
                        ✅ Valider
                      </button>
                    )}
                    {paiement.statut === 'completed' && (
                      <span className="text-green-600 text-sm">
                        <span className="text-green-500 mr-1">✅</span>
                        Validé
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-lg font-bold">🧾</span>
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900">FacturePro RDC</h1>
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">DÉMO+</span>
              </div>
            </div>
            
            {/* Navigation Desktop */}
            <nav className="hidden md:flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Tableau de bord
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'clients' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                👥 Clients
              </button>
              <button
                onClick={() => setActiveTab('produits')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'produits' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📦 Produits
              </button>
              <button
                onClick={() => setActiveTab('factures')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'factures' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📄 Factures
              </button>
              <button
                onClick={() => setActiveTab('paiements')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'paiements' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                💳 Paiements
              </button>
            </nav>

            {/* Bouton Menu Hamburger - Mobile & Tablette */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-expanded="false"
              >
                <span className="sr-only">Ouvrir le menu</span>
                {/* Icon Hamburger */}
                {showMobileMenu ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Menu Mobile */}
        {showMobileMenu && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b shadow-lg z-50">
            <div className="px-4 pt-2 pb-3 space-y-1">
              <button
                onClick={() => {setActiveTab('dashboard'); setShowMobileMenu(false);}}
                className={`w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  activeTab === 'dashboard' 
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                📊 Tableau de bord
              </button>
              <button
                onClick={() => {setActiveTab('clients'); setShowMobileMenu(false);}}
                className={`w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  activeTab === 'clients' 
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                👥 Clients
              </button>
              <button
                onClick={() => {setActiveTab('produits'); setShowMobileMenu(false);}}
                className={`w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  activeTab === 'produits' 
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                📦 Produits
              </button>
              <button
                onClick={() => {setActiveTab('factures'); setShowMobileMenu(false);}}
                className={`w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  activeTab === 'factures' 
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                📄 Factures
              </button>
              <button
                onClick={() => {setActiveTab('paiements'); setShowMobileMenu(false);}}
                className={`w-full text-left px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  activeTab === 'paiements' 
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                💳 Paiements
              </button>
              
              {/* Actions rapides dans le menu mobile */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Actions rapides
                </p>
                <button
                  onClick={() => {setShowClientModal(true); resetClientForm(); setShowMobileMenu(false);}}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  ➕ Nouveau client
                </button>
                <button
                  onClick={() => {setShowProduitModal(true); resetProduitForm(); setShowMobileMenu(false);}}
                  className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors"
                >
                  ➕ Nouveau produit
                </button>
                <button
                  onClick={() => {createFacture(); setShowMobileMenu(false);}}
                  className="w-full text-left px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                >
                  ➕ Nouvelle facture
                </button>
                <button
                  onClick={() => {setShowStockModal(true); setShowMobileMenu(false);}}
                  className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                >
                  📦 Gérer les stocks
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 main-content-mobile">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'clients' && renderClients()}
          {activeTab === 'produits' && renderProduits()}
          {activeTab === 'factures' && renderFactures()}
          {activeTab === 'paiements' && renderPaiements()}
        </div>
      </main>

      {/* Navigation Mobile Bottom - Très petits écrans uniquement */}
      <div className="sm:hidden mobile-nav-bottom">
        <div className="flex justify-around">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <div className="text-lg">📊</div>
            <div>Tableau</div>
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`mobile-nav-item ${activeTab === 'clients' ? 'active' : ''}`}
          >
            <div className="text-lg">👥</div>
            <div>Clients</div>
          </button>
          <button
            onClick={() => setActiveTab('produits')}
            className={`mobile-nav-item ${activeTab === 'produits' ? 'active' : ''}`}
          >
            <div className="text-lg">📦</div>
            <div>Produits</div>
          </button>
          <button
            onClick={() => setActiveTab('factures')}
            className={`mobile-nav-item ${activeTab === 'factures' ? 'active' : ''}`}
          >
            <div className="text-lg">📄</div>
            <div>Factures</div>
          </button>
          <button
            onClick={() => setActiveTab('paiements')}
            className={`mobile-nav-item ${activeTab === 'paiements' ? 'active' : ''}`}
          >
            <div className="text-lg">💳</div>
            <div>Paiements</div>
          </button>
        </div>
      </div>

      {/* Modals */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg modal-responsive">
            <h3 className="text-lg sm:text-xl font-bold mb-4">
              {editingItem ? 'Modifier le client' : 'Nouveau client'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nom *"
                value={clientForm.nom || ''}
                onChange={(e) => setClientForm(prev => ({...prev, nom: e.target.value}))}
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-responsive-base"
                autoFocus
              />
              <input
                type="email"
                placeholder="Email *"
                value={clientForm.email || ''}
                onChange={(e) => setClientForm(prev => ({...prev, email: e.target.value}))}
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-responsive-base"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={clientForm.telephone || ''}
                onChange={(e) => setClientForm(prev => ({...prev, telephone: e.target.value}))}
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-responsive-base"
              />
              <input
                type="text"
                placeholder="Adresse"
                value={clientForm.adresse || ''}
                onChange={(e) => setClientForm(prev => ({...prev, adresse: e.target.value}))}
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-responsive-base"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Ville"
                  value={clientForm.ville || ''}
                  onChange={(e) => setClientForm(prev => ({...prev, ville: e.target.value}))}
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-responsive-base"
                />
                <input
                  type="text"
                  placeholder="Code postal"
                  value={clientForm.code_postal || ''}
                  onChange={(e) => setClientForm(prev => ({...prev, code_postal: e.target.value}))}
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-responsive-base"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={clientForm.pays || 'RDC'}
                  onChange={(e) => setClientForm(prev => ({...prev, pays: e.target.value}))}
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-responsive-base"
                >
                  <option value="RDC">RDC</option>
                  <option value="France">France</option>
                  <option value="Belgique">Belgique</option>
                  <option value="Autre">Autre</option>
                </select>
                <select
                  value={clientForm.devise_preferee || 'USD'}
                  onChange={(e) => setClientForm(prev => ({...prev, devise_preferee: e.target.value}))}
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-responsive-base"
                >
                  <option value="USD">USD</option>
                  <option value="FC">FC</option>
                </select>
              </div>
            </div>
            <div className="btn-group-responsive mt-6">
              <button
                onClick={() => {setShowClientModal(false); resetClientForm();}}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition btn-responsive"
              >
                Annuler
              </button>
              <button
                onClick={saveClient}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition btn-responsive"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {showProduitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingItem ? 'Modifier le produit' : 'Nouveau produit'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nom *"
                value={produitForm.nom || ''}
                onChange={(e) => setProduitForm(prev => ({...prev, nom: e.target.value}))}
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <textarea
                placeholder="Description"
                value={produitForm.description || ''}
                onChange={(e) => setProduitForm(prev => ({...prev, description: e.target.value}))}
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="3"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Prix USD *"
                  value={produitForm.prix_usd || ''}
                  onChange={(e) => setProduitForm(prev => ({...prev, prix_usd: e.target.value}))}
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  value={produitForm.unite || 'unité'}
                  onChange={(e) => setProduitForm(prev => ({...prev, unite: e.target.value}))}
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="unité">unité</option>
                  <option value="heure">heure</option>
                  <option value="jour">jour</option>
                  <option value="mois">mois</option>
                  <option value="projet">projet</option>
                </select>
              </div>
              <input
                type="number"
                step="0.1"
                placeholder="TVA (%)"
                value={produitForm.tva || 16.0}
                onChange={(e) => setProduitForm(prev => ({...prev, tva: parseFloat(e.target.value) || 0}))}
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              
              <div className="border-t pt-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={produitForm.gestion_stock || false}
                    onChange={(e) => setProduitForm(prev => ({...prev, gestion_stock: e.target.checked}))}
                    className="rounded"
                  />
                  <span>Gérer le stock pour ce produit</span>
                </label>
                
                {produitForm.gestion_stock && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <input
                      type="number"
                      placeholder="Stock actuel"
                      value={produitForm.stock_actuel || ''}
                      onChange={(e) => setProduitForm(prev => ({...prev, stock_actuel: e.target.value}))}
                      className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="number"
                      placeholder="Stock minimum"
                      value={produitForm.stock_minimum || ''}
                      onChange={(e) => setProduitForm(prev => ({...prev, stock_minimum: e.target.value}))}
                      className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="number"
                      placeholder="Stock maximum"
                      value={produitForm.stock_maximum || ''}
                      onChange={(e) => setProduitForm(prev => ({...prev, stock_maximum: e.target.value}))}
                      className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {setShowProduitModal(false); resetProduitForm();}}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition"
              >
                Annuler
              </button>
              <button
                onClick={saveProduit}
                className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 transition"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {showFactureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-6xl w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Nouvelle facture</h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-2">Client *</label>
                  <select
                    value={factureForm.client_id || ''}
                    onChange={(e) => setFactureForm(prev => ({...prev, client_id: e.target.value}))}
                    className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.nom} ({client.devise_preferee})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-2">Devise de facturation</label>
                  <select
                    value={factureForm.devise || 'USD'}
                    onChange={(e) => setFactureForm(prev => ({...prev, devise: e.target.value}))}
                    className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="FC">FC (Franc Congolais)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block font-medium">Lignes de facturation</label>
                  <button
                    onClick={addLigneFacture}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    ➕ Ajouter ligne
                  </button>
                </div>
                
                <div className="space-y-3">
                  {factureForm.lignes.map((ligne, index) => (
                    <div key={`ligne-${index}`} className="border p-4 rounded bg-gray-50">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-4">
                          <select
                            value={ligne.produit_id || ''}
                            onChange={(e) => updateLigneFacture(index, 'produit_id', e.target.value)}
                            className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Sélectionner produit</option>
                            {produits.map(produit => (
                              <option key={produit.id} value={produit.id}>
                                {produit.nom} - {formatMontant(produit.prix_usd, 'USD')}
                                {produit.gestion_stock && ` (Stock: ${produit.stock_actuel})`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Quantité"
                            value={ligne.quantite || ''}
                            onChange={(e) => updateLigneFacture(index, 'quantite', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Prix unit. USD"
                            value={ligne.prix_unitaire_usd || ''}
                            onChange={(e) => updateLigneFacture(index, 'prix_unitaire_usd', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-medium">
                            {formatMontant(ligne.total_ttc_usd || 0, 'USD')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatMontant(ligne.total_ttc_fc || 0, 'FC')}
                          </p>
                        </div>
                        <div className="col-span-1">
                          <p className="text-xs text-gray-600">TVA: {ligne.tva}%</p>
                        </div>
                        <div className="col-span-1">
                          <button
                            onClick={() => removeLigneFacture(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium mb-2">Notes</label>
                <textarea
                  value={factureForm.notes || ''}
                  onChange={(e) => setFactureForm(prev => ({...prev, notes: e.target.value}))}
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="3"
                  placeholder="Notes ou conditions particulières..."
                />
              </div>

              <div className="border-t pt-4">
                <div className="text-right space-y-1">
                  <p>Total HT: {formatMontant(factureForm.lignes.reduce((sum, ligne) => sum + (ligne.total_ht_usd || 0), 0), 'USD')} / {formatMontant(factureForm.lignes.reduce((sum, ligne) => sum + (ligne.total_ht_fc || 0), 0), 'FC')}</p>
                  <p>Total TVA: {formatMontant(factureForm.lignes.reduce((sum, ligne) => sum + ((ligne.total_ht_usd || 0) * (ligne.tva || 0) / 100), 0), 'USD')} / {formatMontant(factureForm.lignes.reduce((sum, ligne) => sum + ((ligne.total_ht_fc || 0) * (ligne.tva || 0) / 100), 0), 'FC')}</p>
                  <p className="text-xl font-bold">
                    Total TTC: {formatMontant(factureForm.lignes.reduce((sum, ligne) => sum + (ligne.total_ttc_usd || 0), 0), 'USD')}
                  </p>
                  <p className="text-lg font-medium text-gray-600">
                    Équivalent: {formatMontant(factureForm.lignes.reduce((sum, ligne) => sum + (ligne.total_ttc_fc || 0), 0), 'FC')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowFactureModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition"
              >
                Annuler
              </button>
              <button
                onClick={saveFacture}
                className="flex-1 bg-purple-500 text-white py-2 rounded hover:bg-purple-600 transition"
              >
                Créer la facture
              </button>
            </div>
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Mise à jour du stock</h3>
            <div className="space-y-4">
              <select
                value={stockForm.produit_id || ''}
                onChange={(e) => setStockForm(prev => ({...prev, produit_id: e.target.value}))}
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Sélectionner un produit</option>
                {produits.filter(p => p.gestion_stock).map(produit => (
                  <option key={produit.id} value={produit.id}>
                    {produit.nom} (Stock actuel: {produit.stock_actuel})
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Nouvelle quantité"
                value={stockForm.nouvelle_quantite || ''}
                onChange={(e) => setStockForm(prev => ({...prev, nouvelle_quantite: e.target.value}))}
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                placeholder="Motif (optionnel)"
                value={stockForm.motif || ''}
                onChange={(e) => setStockForm(prev => ({...prev, motif: e.target.value}))}
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowStockModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition"
              >
                Annuler
              </button>
              <button
                onClick={updateStock}
                className="flex-1 bg-orange-500 text-white py-2 rounded hover:bg-orange-600 transition"
              >
                Mettre à jour
              </button>
            </div>
          </div>
        </div>
      )}

      {showTauxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Modifier le taux de change</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Taux actuel: 1 USD = {stats.taux_change_actuel?.toLocaleString('fr-FR')} FC</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Nouveau taux (ex: 2850)"
                  defaultValue={stats.taux_change_actuel}
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id="nouveauTaux"
                />
              </div>
              <p className="text-sm text-gray-600">
                Ce taux sera utilisé pour toutes les nouvelles conversions automatiques.
              </p>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowTauxModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const nouveauTaux = document.getElementById('nouveauTaux').value;
                  if (nouveauTaux && parseFloat(nouveauTaux) > 0) {
                    updateTauxChange(nouveauTaux);
                  }
                }}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
              >
                Mettre à jour
              </button>
            </div>
          </div>
        </div>
      )}

      {showMouvementsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg modal-responsive-large">
            <h3 className="text-lg sm:text-xl font-bold mb-4">
              Historique des mouvements de stock - {produitMouvements.nom}
            </h3>
            
            <div className="max-h-96 overflow-y-auto">
              {mouvementsStock.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun mouvement de stock trouvé</p>
              ) : (
                <div className="space-y-3">
                  {mouvementsStock.map((mouvement, index) => (
                    <div key={index} className="border p-3 rounded bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`px-2 py-1 text-xs rounded font-medium ${
                            mouvement.type_mouvement === 'entree' ? 'bg-green-100 text-green-800' :
                            mouvement.type_mouvement === 'sortie' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {mouvement.type_mouvement === 'entree' ? '📥 Entrée' :
                             mouvement.type_mouvement === 'sortie' ? '📤 Sortie' : '🔄 Correction'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(mouvement.date_mouvement).toLocaleDateString('fr-FR')} {new Date(mouvement.date_mouvement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Quantité:</span>
                          <span className={`ml-1 font-medium ${
                            mouvement.quantite > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {mouvement.quantite > 0 ? '+' : ''}{mouvement.quantite}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Stock avant:</span>
                          <span className="ml-1 font-medium">{mouvement.stock_avant}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Stock après:</span>
                          <span className="ml-1 font-medium">{mouvement.stock_après}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Motif:</span>
                          <span className="ml-1 text-gray-800">{mouvement.motif || 'Non spécifié'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowMouvementsModal(false)}
                className="bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition btn-responsive"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-8">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>🇨🇩 <strong>FacturePro RDC</strong> - Gestion complète avec devises multiples (USD/FC)</p>
            <p className="mt-1">📦 Stocks • 💱 Taux de change • 💳 Paiements simulés</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;