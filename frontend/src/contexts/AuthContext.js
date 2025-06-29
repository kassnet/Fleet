import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
    const [loading, setLoading] = useState(true);

    const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    // Configuration d'axios
    useEffect(() => {
        // Configuration de l'intercepteur pour ajouter le token à toutes les requêtes
        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                if (accessToken) {
                    config.headers.Authorization = `Bearer ${accessToken}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Configuration de l'intercepteur pour gérer les erreurs d'authentification
        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, [accessToken]);

    const login = async (email, password) => {
        try {
            console.log('🔑 Tentative de connexion:', email);
            
            const response = await axios.post(`${API_URL}/api/auth/login`, {
                email,
                password
            });
            
            const { access_token, user: userData } = response.data;
            
            console.log('✅ Connexion réussie:', userData);
            
            setAccessToken(access_token);
            setUser(userData);
            localStorage.setItem('accessToken', access_token);
            localStorage.setItem('user', JSON.stringify(userData));
            
            return { success: true, user: userData };
        } catch (error) {
            console.error('❌ Erreur de connexion:', error.response?.data || error.message);
            return { 
                success: false, 
                error: error.response?.data?.detail || 'Erreur de connexion' 
            };
        }
    };

    const logout = () => {
        console.log('🚪 Déconnexion');
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
    };

    const checkPermission = (requiredRoles) => {
        if (!user) return false;
        
        // Admin a tous les droits
        if (user.role === 'admin') return true;
        
        // Vérifier si le rôle de l'utilisateur est dans la liste des rôles requis
        return requiredRoles.includes(user.role);
    };

    // Vérification de l'authentification au chargement
    useEffect(() => {
        const checkAuth = async () => {
            const savedToken = localStorage.getItem('accessToken');
            const savedUser = localStorage.getItem('user');
            
            if (savedToken && savedUser) {
                try {
                    // Vérifier que le token est toujours valide
                    const response = await axios.get(`${API_URL}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${savedToken}` }
                    });
                    
                    setAccessToken(savedToken);
                    setUser(response.data);
                    console.log('✅ Session restaurée:', response.data);
                } catch (error) {
                    console.log('❌ Session expirée, déconnexion');
                    logout();
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const value = {
        user,
        accessToken,
        login,
        logout,
        loading,
        checkPermission,
        // Helper functions pour les permissions
        isAdmin: () => user?.role === 'admin',
        isManager: () => user?.role === 'manager',
        isComptable: () => user?.role === 'comptable',
        isUtilisateur: () => user?.role === 'utilisateur',
        canManageClients: () => checkPermission(['admin', 'manager']),
        canManageProducts: () => checkPermission(['admin', 'manager']),
        canManageInvoices: () => checkPermission(['admin', 'manager', 'comptable']),
        canManagePayments: () => checkPermission(['admin', 'manager', 'comptable']),
        canManageUsers: () => checkPermission(['admin']),
        canViewOnly: () => user?.role === 'utilisateur'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};