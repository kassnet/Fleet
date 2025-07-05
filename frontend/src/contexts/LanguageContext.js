import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Dictionnaire des traductions
const translations = {
  fr: {
    // Header
    'app.title': 'FacturApp',
    'app.description': 'Système de gestion de facturation professionnel',
    'user.logout': 'Déconnexion',
    'user.role.admin': 'Admin',
    'user.role.manager': 'Manager', 
    'user.role.comptable': 'Comptable',
    'user.role.utilisateur': 'Utilisateur',
    
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.clients': 'Clients',
    'nav.products': 'Produits',
    'nav.invoices': 'Factures',
    'nav.payments': 'Paiements',
    'nav.sales': 'Ventes',
    'nav.stock': 'Stock',
    'nav.settings': 'Paramètres',
    'nav.users': 'Utilisateurs',
    
    // Dashboard
    'dashboard.title': 'Tableau de bord',
    'dashboard.welcome': 'Bienvenue dans',
    'dashboard.stats.totalClients': 'Clients total',
    'dashboard.stats.totalProducts': 'Produits total',
    'dashboard.stats.totalInvoices': 'Factures total',
    'dashboard.stats.totalRevenue': 'Chiffre d\'affaires',
    
    // Clients Section
    'clients.title': 'Gestion des clients',
    'clients.add': 'Nouveau client',
    'clients.edit': 'Modifier le client',
    'clients.name': 'Nom du client',
    'clients.email': 'Email',
    'clients.phone': 'Téléphone',
    'clients.address': 'Adresse',
    'clients.actions': 'Actions',
    'clients.empty': 'Aucun client trouvé',
    
    // Products Section
    'products.title': 'Gestion des produits',
    'products.add': 'Nouveau produit',
    'products.edit': 'Modifier le produit',
    'products.name': 'Nom du produit',
    'products.description': 'Description',
    'products.priceUSD': 'Prix USD',
    'products.priceFC': 'Prix FC',
    'products.stock': 'Stock',
    'products.stockMin': 'Stock minimum',
    'products.stockManagement': 'Gestion stock',
    'products.actions': 'Actions',
    'products.empty': 'Aucun produit trouvé',
    
    // Invoices Section
    'invoices.title': 'Gestion des factures',
    'invoices.add': 'Nouvelle facture',
    'invoices.edit': 'Modifier la facture',
    'invoices.number': 'Numéro',
    'invoices.client': 'Client',
    'invoices.date': 'Date',
    'invoices.total': 'Total',
    'invoices.status': 'Statut',
    'invoices.actions': 'Actions',
    'invoices.empty': 'Aucune facture trouvée',
    
    // Payments Section
    'payments.title': 'Historique des paiements',
    'payments.invoice': 'Facture',
    'payments.amount': 'Montant',
    'payments.method': 'Méthode',
    'payments.date': 'Date',
    'payments.status': 'Statut',
    'payments.actions': 'Actions',
    'payments.empty': 'Aucun paiement trouvé',
    
    // Users Section
    'users.title': 'Gestion des utilisateurs',
    'users.add': 'Nouvel utilisateur',
    'users.name': 'Nom',
    'users.email': 'Email',
    'users.role': 'Rôle',
    'users.actions': 'Actions',
    
    // Sales Section
    'sales.title': 'Gestion des ventes',
    'sales.dashboard': 'Tableau de bord ventes',
    'sales.quotes': 'Devis',
    'sales.opportunities': 'Opportunités',
    'sales.orders': 'Commandes',
    'sales.activities': 'Activités',
    
    // Quotes
    'quotes.title': 'Gestion des devis',
    'quotes.add': 'Nouveau devis',
    'quotes.number': 'Numéro',
    'quotes.client': 'Client',
    'quotes.amount': 'Montant',
    'quotes.status': 'Statut',
    'quotes.validity': 'Validité',
    'quotes.actions': 'Actions',
    'quotes.convert': 'Convertir en facture',
    'quotes.status.draft': 'Brouillon',
    'quotes.status.sent': 'Envoyé',
    'quotes.status.accepted': 'Accepté',
    'quotes.status.rejected': 'Refusé',
    'quotes.status.expired': 'Expiré',
    
    // Opportunities
    'opportunities.title': 'Gestion des opportunités',
    'opportunities.add': 'Nouvelle opportunité',
    'opportunities.name': 'Nom',
    'opportunities.client': 'Client',
    'opportunities.value': 'Valeur',
    'opportunities.probability': 'Probabilité',
    'opportunities.stage': 'Étape',
    'opportunities.priority': 'Priorité',
    'opportunities.stage.prospect': 'Prospect',
    'opportunities.stage.qualification': 'Qualification',
    'opportunities.stage.proposal': 'Proposition',
    'opportunities.stage.negotiation': 'Négociation',
    'opportunities.stage.won': 'Gagné',
    'opportunities.stage.lost': 'Perdu',
    
    // Orders
    'orders.title': 'Gestion des commandes',
    'orders.add': 'Nouvelle commande',
    'orders.number': 'Numéro',
    'orders.client': 'Client',
    'orders.amount': 'Montant',
    'orders.status': 'Statut',
    'orders.delivery': 'Livraison',
    'orders.status.new': 'Nouvelle',
    'orders.status.confirmed': 'Confirmée',
    'orders.status.preparing': 'En préparation',
    'orders.status.shipped': 'Expédiée',
    'orders.status.delivered': 'Livrée',
    'orders.status.cancelled': 'Annulée',
    
    // Buttons
    'btn.add': 'Ajouter',
    'btn.edit': 'Modifier',
    'btn.delete': 'Supprimer',
    'btn.save': 'Enregistrer',
    'btn.cancel': 'Annuler',
    'btn.close': 'Fermer',
    'btn.confirm': 'Confirmer',
    'btn.view': 'Voir',
    'btn.send': 'Envoyer',
    'btn.simulate': 'Simuler paiement',
    'btn.markPaid': 'Marquer payée',
    'btn.validate': 'Valider',
    
    // Forms
    'form.name': 'Nom',
    'form.email': 'Email',
    'form.phone': 'Téléphone',
    'form.address': 'Adresse',
    'form.description': 'Description',
    'form.price': 'Prix',
    'form.quantity': 'Quantité',
    'form.currency': 'Devise',
    'form.notes': 'Notes',
    
    // Messages
    'msg.success': 'Succès',
    'msg.error': 'Erreur',
    'msg.warning': 'Attention',
    'msg.info': 'Information',
    'msg.confirm.delete': 'Êtes-vous sûr de vouloir supprimer cet élément ?',
    
    // Login
    'login.title': 'Connexion',
    'login.subtitle': 'Connectez-vous à votre compte',
    'login.email': 'Adresse email',
    'login.password': 'Mot de passe',
    'login.signin': 'Se connecter',
    'login.demo': 'Comptes de démonstration',
    
    // Common
    'common.loading': 'Chargement...',
    'common.noData': 'Aucune donnée disponible',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.sort': 'Trier',
    'common.export': 'Exporter',
    'common.import': 'Importer',
    'common.quickActions': 'Actions rapides',
    
    // Configuration Section
    'config.title': 'Configuration de l\'application',
    'config.general': 'Paramètres généraux',
    'config.logo': 'Logo de l\'application',
    'config.logo.upload': 'Téléverser un nouveau logo',
    'config.logo.current': 'Logo actuel',
    'config.logo.change': 'Changer le logo',
    'config.users': 'Gestion des utilisateurs',
    'config.users.activate': 'Activer',
    'config.users.deactivate': 'Désactiver',
    'config.users.status': 'Statut',
    'config.users.active': 'Actif',
    'config.users.inactive': 'Inactif',
    'config.users.permissions': 'Permissions',
    'config.users.role': 'Rôle',
    'config.users.lastLogin': 'Dernière connexion',
    'config.app': 'Application',
    'config.app.name': 'Nom de l\'application',
    'config.app.theme': 'Thème par défaut',
    'config.app.language': 'Langue par défaut'
  },
  en: {
    // Header
    'app.title': 'FacturApp',
    'app.description': 'Professional billing management system',
    'user.logout': 'Logout',
    'user.role.admin': 'Admin',
    'user.role.manager': 'Manager',
    'user.role.comptable': 'Accountant',
    'user.role.utilisateur': 'User',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'Clients',
    'nav.products': 'Products',
    'nav.invoices': 'Invoices',
    'nav.payments': 'Payments',
    'nav.sales': 'Sales',
    'nav.stock': 'Stock',
    'nav.settings': 'Settings',
    'nav.users': 'Users',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome to',
    'dashboard.stats.totalClients': 'Total Clients',
    'dashboard.stats.totalProducts': 'Total Products',
    'dashboard.stats.totalInvoices': 'Total Invoices',
    'dashboard.stats.totalRevenue': 'Total Revenue',
    
    // Clients Section
    'clients.title': 'Client Management',
    'clients.add': 'New Client',
    'clients.edit': 'Edit Client',
    'clients.name': 'Client Name',
    'clients.email': 'Email',
    'clients.phone': 'Phone',
    'clients.address': 'Address',
    'clients.actions': 'Actions',
    'clients.empty': 'No clients found',
    
    // Products Section
    'products.title': 'Product Management',
    'products.add': 'New Product',
    'products.edit': 'Edit Product',
    'products.name': 'Product Name',
    'products.description': 'Description',
    'products.priceUSD': 'Price USD',
    'products.priceFC': 'Price FC',
    'products.stock': 'Stock',
    'products.stockMin': 'Min Stock',
    'products.stockManagement': 'Stock Management',
    'products.actions': 'Actions',
    'products.empty': 'No products found',
    
    // Invoices Section
    'invoices.title': 'Invoice Management',
    'invoices.add': 'New Invoice',
    'invoices.edit': 'Edit Invoice',
    'invoices.number': 'Number',
    'invoices.client': 'Client',
    'invoices.date': 'Date',
    'invoices.total': 'Total',
    'invoices.status': 'Status',
    'invoices.actions': 'Actions',
    'invoices.empty': 'No invoices found',
    
    // Payments Section
    'payments.title': 'Payment History',
    'payments.invoice': 'Invoice',
    'payments.amount': 'Amount',
    'payments.method': 'Method',
    'payments.date': 'Date',
    'payments.status': 'Status',
    'payments.actions': 'Actions',
    'payments.empty': 'No payments found',
    
    // Users Section
    'users.title': 'User Management',
    'users.add': 'New User',
    'users.name': 'Name',
    'users.email': 'Email',
    'users.role': 'Role',
    'users.actions': 'Actions',
    
    // Sales Section
    'sales.title': 'Sales Management',
    'sales.dashboard': 'Sales Dashboard',
    'sales.quotes': 'Quotes',
    'sales.opportunities': 'Opportunities',
    'sales.orders': 'Orders',
    'sales.activities': 'Activities',
    
    // Quotes
    'quotes.title': 'Quote Management',
    'quotes.add': 'New Quote',
    'quotes.number': 'Number',
    'quotes.client': 'Client',
    'quotes.amount': 'Amount',
    'quotes.status': 'Status',
    'quotes.validity': 'Validity',
    'quotes.actions': 'Actions',
    'quotes.convert': 'Convert to Invoice',
    'quotes.status.draft': 'Draft',
    'quotes.status.sent': 'Sent',
    'quotes.status.accepted': 'Accepted',
    'quotes.status.rejected': 'Rejected',
    'quotes.status.expired': 'Expired',
    
    // Opportunities
    'opportunities.title': 'Opportunity Management',
    'opportunities.add': 'New Opportunity',
    'opportunities.name': 'Name',
    'opportunities.client': 'Client',
    'opportunities.value': 'Value',
    'opportunities.probability': 'Probability',
    'opportunities.stage': 'Stage',
    'opportunities.priority': 'Priority',
    'opportunities.stage.prospect': 'Prospect',
    'opportunities.stage.qualification': 'Qualification',
    'opportunities.stage.proposal': 'Proposal',
    'opportunities.stage.negotiation': 'Negotiation',
    'opportunities.stage.won': 'Won',
    'opportunities.stage.lost': 'Lost',
    
    // Orders
    'orders.title': 'Order Management',
    'orders.add': 'New Order',
    'orders.number': 'Number',
    'orders.client': 'Client',
    'orders.amount': 'Amount',
    'orders.status': 'Status',
    'orders.delivery': 'Delivery',
    'orders.status.new': 'New',
    'orders.status.confirmed': 'Confirmed',
    'orders.status.preparing': 'Preparing',
    'orders.status.shipped': 'Shipped',
    'orders.status.delivered': 'Delivered',
    'orders.status.cancelled': 'Cancelled',
    
    // Buttons
    'btn.add': 'Add',
    'btn.edit': 'Edit',
    'btn.delete': 'Delete',
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.close': 'Close',
    'btn.confirm': 'Confirm',
    'btn.view': 'View',
    'btn.send': 'Send',
    'btn.simulate': 'Simulate Payment',
    'btn.markPaid': 'Mark Paid',
    'btn.validate': 'Validate',
    
    // Forms
    'form.name': 'Name',
    'form.email': 'Email',
    'form.phone': 'Phone',
    'form.address': 'Address',
    'form.description': 'Description',
    'form.price': 'Price',
    'form.quantity': 'Quantity',
    'form.currency': 'Currency',
    'form.notes': 'Notes',
    
    // Messages
    'msg.success': 'Success',
    'msg.error': 'Error',
    'msg.warning': 'Warning',
    'msg.info': 'Information',
    'msg.confirm.delete': 'Are you sure you want to delete this item?',
    
    // Login
    'login.title': 'Login',
    'login.subtitle': 'Sign in to your account',
    'login.email': 'Email address',
    'login.password': 'Password',
    'login.signin': 'Sign in',
    'login.demo': 'Demo accounts',
    
    // Common
    'common.loading': 'Loading...',
    'common.noData': 'No data available',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.quickActions': 'Quick Actions'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Vérifier localStorage d'abord, sinon utiliser la langue du navigateur
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && translations[savedLanguage]) {
      return savedLanguage;
    }
    // Détecter la langue du navigateur
    const browserLanguage = navigator.language.slice(0, 2);
    return translations[browserLanguage] ? browserLanguage : 'fr';
  });

  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
      localStorage.setItem('language', newLanguage);
    }
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  const value = {
    language,
    changeLanguage,
    t,
    availableLanguages: [
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'en', name: 'English', flag: '🇺🇸' }
    ]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};