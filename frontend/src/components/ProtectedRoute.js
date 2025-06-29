import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
    const { user, loading, checkPermission } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    // Si des rôles spécifiques sont requis
    if (requiredRoles.length > 0 && !checkPermission(requiredRoles)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h2>
                    <p className="text-gray-600 mb-4">
                        Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                    </p>
                    <p className="text-sm text-gray-500">
                        Votre rôle : <span className="font-medium">{user.role}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                        Rôles requis : <span className="font-medium">{requiredRoles.join(', ')}</span>
                    </p>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;