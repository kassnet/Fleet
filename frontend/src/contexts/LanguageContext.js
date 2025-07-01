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
    
    // Buttons
    'btn.add': 'Ajouter',
    'btn.edit': 'Modifier',
    'btn.delete': 'Supprimer',
    'btn.save': 'Enregistrer',
    'btn.cancel': 'Annuler',
    'btn.close': 'Fermer',
    'btn.confirm': 'Confirmer',
    
    // Forms
    'form.name': 'Nom',
    'form.email': 'Email',
    'form.phone': 'Téléphone',
    'form.address': 'Adresse',
    'form.description': 'Description',
    'form.price': 'Prix',
    'form.quantity': 'Quantité',
    
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
    'common.import': 'Importer'
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
    
    // Buttons
    'btn.add': 'Add',
    'btn.edit': 'Edit',
    'btn.delete': 'Delete',
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.close': 'Close',
    'btn.confirm': 'Confirm',
    
    // Forms
    'form.name': 'Name',
    'form.email': 'Email',
    'form.phone': 'Phone',
    'form.address': 'Address',
    'form.description': 'Description',
    'form.price': 'Price',
    'form.quantity': 'Quantity',
    
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
    'common.import': 'Import'
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