import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
    const { user, accessToken } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [notification, setNotification] = useState(null);
    
    const [userForm, setUserForm] = useState({
        email: '',
        nom: '',
        prenom: '',
        password: '',
        role: 'utilisateur'
    });

    const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    // Helper pour les requêtes authentifiées (même que dans App.js)
    const apiCall = async (method, endpoint, data = null) => {
        const url = `${API_URL}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
            },
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await apiCall('GET', '/api/users');
            setUsers(response || []);
        } catch (error) {
            console.error('Erreur chargement utilisateurs:', error);
            showNotification('Erreur lors du chargement des utilisateurs', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'admin') {
            loadUsers();
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            if (editingUser) {
                // Modification
                const updateData = {
                    nom: userForm.nom,
                    prenom: userForm.prenom,
                    role: userForm.role
                };
                
                await apiCall('PUT', `/api/users/${editingUser.id}`, updateData);
                showNotification('Utilisateur modifié avec succès !');
            } else {
                // Création
                await apiCall('POST', '/api/users', userForm);
                showNotification('Utilisateur créé avec succès !');
            }
            
            loadUsers();
            resetForm();
        } catch (error) {
            console.error('Erreur sauvegarde utilisateur:', error);
            showNotification(
                'Erreur lors de la sauvegarde',
                'error'
            );
        }
    };

    const handleEdit = (userToEdit) => {
        setEditingUser(userToEdit);
        setUserForm({
            email: userToEdit.email,
            nom: userToEdit.nom,
            prenom: userToEdit.prenom,
            password: '',
            role: userToEdit.role
        });
        setShowModal(true);
    };

    const handleDelete = async (userId) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            try {
                await apiCall('DELETE', `/api/users/${userId}`);
                showNotification('Utilisateur supprimé avec succès !');
                loadUsers();
            } catch (error) {
                console.error('Erreur suppression utilisateur:', error);
                showNotification(
                    'Erreur lors de la suppression',
                    'error'
                );
            }
        }
    };

    const resetForm = () => {
        setUserForm({
            email: '',
            nom: '',
            prenom: '',
            password: '',
            role: 'utilisateur'
        });
        setEditingUser(null);
        setShowModal(false);
    };

    const getRoleBadge = (role) => {
        const styles = {
            admin: 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
            manager: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
            comptable: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
            utilisateur: 'bg-gradient-to-r from-gray-500 to-slate-500 text-white',
            support: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
        };
        
        const labels = {
            admin: '👑 Admin',
            manager: '👔 Manager',
            comptable: '💰 Comptable',
            utilisateur: '👤 Utilisateur',
            support: '🔧 Support'
        };

        return (
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[role] || styles.utilisateur}`}>
                {labels[role] || labels.utilisateur}
            </span>
        );
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

    const getRoleAvatarBg = (role) => {
        const backgrounds = {
            admin: 'bg-gradient-to-r from-red-500 to-pink-500',
            manager: 'bg-gradient-to-r from-blue-500 to-cyan-500',
            comptable: 'bg-gradient-to-r from-green-500 to-emerald-500',
            utilisateur: 'bg-gradient-to-r from-gray-500 to-slate-500',
            support: 'bg-gradient-to-r from-purple-500 to-indigo-500'
        };
        return backgrounds[role] || backgrounds.utilisateur;
    };

    if (user?.role !== 'admin') {
        return (
            <div className="text-center py-8">
                <p className="text-red-600">Accès refusé. Seuls les administrateurs peuvent gérer les utilisateurs.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl">
                        👥
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Gestion des utilisateurs</h2>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2"
                >
                    <span>➕</span>
                    <span>Nouvel utilisateur</span>
                </button>
            </div>

            {/* Notifications */}
            {notification && (
                <div className={`p-4 rounded-lg ${
                    notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                    {notification.message}
                </div>
            )}

            {/* Liste des utilisateurs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
                        <div className="text-gray-500 dark:text-gray-400 text-lg">Chargement...</div>
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="text-gray-400 text-6xl mb-4">👤</div>
                        <div className="text-gray-500 dark:text-gray-400 text-lg">Aucun utilisateur trouvé. Créez votre premier utilisateur !</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">👤 Utilisateur</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">📧 Email</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">🏷️ Rôle</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">🔄 Statut</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">📅 Dernière connexion</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">⚡ Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {users.map((userItem) => (
                                    <tr key={userItem.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900 dark:hover:to-pink-900 transition-all duration-300">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            <div className="flex items-center space-x-3">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getRoleAvatarBg(userItem.role)} text-white font-bold`}>
                                                    {getRoleEmoji(userItem.role)}
                                                </div>
                                                <span>{userItem.prenom} {userItem.nom}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                            {userItem.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getRoleBadge(userItem.role)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                userItem.is_active 
                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                                                    : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                                            }`}>
                                                {userItem.is_active ? '✅ Actif' : '❌ Inactif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                            {userItem.derniere_connexion 
                                                ? new Date(userItem.derniere_connexion).toLocaleDateString('fr-FR')
                                                : 'Jamais'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                                            <button
                                                onClick={() => handleEdit(userItem)}
                                                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-md text-xs"
                                            >
                                                ✏️ Modifier
                                            </button>
                                            {userItem.id !== user.id && (
                                                <button
                                                    onClick={() => handleDelete(userItem.id)}
                                                    className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-lg font-semibold hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-md text-xs"
                                                >
                                                    🗑️ Supprimer
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

            {/* Modal de création/modification */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-medium mb-4">
                            {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                        </h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={userForm.email}
                                    onChange={(e) => setUserForm(prev => ({...prev, email: e.target.value}))}
                                    disabled={editingUser} // L'email ne peut pas être modifié
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Prénom *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={userForm.prenom}
                                        onChange={(e) => setUserForm(prev => ({...prev, prenom: e.target.value}))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nom *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={userForm.nom}
                                        onChange={(e) => setUserForm(prev => ({...prev, nom: e.target.value}))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mot de passe *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={userForm.password}
                                        onChange={(e) => setUserForm(prev => ({...prev, password: e.target.value}))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rôle *
                                </label>
                                <select
                                    value={userForm.role}
                                    onChange={(e) => setUserForm(prev => ({...prev, role: e.target.value}))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="utilisateur">👤 Utilisateur</option>
                                    <option value="comptable">💰 Comptable</option>
                                    <option value="manager">👔 Manager</option>
                                    <option value="technicien">🔧 Technicien</option>
                                    <option value="admin">👑 Admin</option>
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                                >
                                    {editingUser ? 'Modifier' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;