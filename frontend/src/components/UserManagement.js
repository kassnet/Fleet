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
                
                await axios.put(`${API_URL}/api/users/${editingUser.id}`, updateData);
                showNotification('Utilisateur modifié avec succès !');
            } else {
                // Création
                await axios.post(`${API_URL}/api/users`, userForm);
                showNotification('Utilisateur créé avec succès !');
            }
            
            loadUsers();
            resetForm();
        } catch (error) {
            console.error('Erreur sauvegarde utilisateur:', error);
            showNotification(
                error.response?.data?.detail || 'Erreur lors de la sauvegarde',
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
                await axios.delete(`${API_URL}/api/users/${userId}`);
                showNotification('Utilisateur supprimé avec succès !');
                loadUsers();
            } catch (error) {
                console.error('Erreur suppression utilisateur:', error);
                showNotification(
                    error.response?.data?.detail || 'Erreur lors de la suppression',
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
            admin: 'bg-red-100 text-red-800',
            manager: 'bg-blue-100 text-blue-800',
            comptable: 'bg-green-100 text-green-800',
            utilisateur: 'bg-gray-100 text-gray-800'
        };
        
        const labels = {
            admin: '👑 Admin',
            manager: '👔 Manager',
            comptable: '💰 Comptable',
            utilisateur: '👤 Utilisateur'
        };

        return (
            <span className={`px-2 py-1 text-xs rounded-full ${styles[role]}`}>
                {labels[role]}
            </span>
        );
    };

    if (!checkPermission(['admin'])) {
        return (
            <div className="text-center py-8">
                <p className="text-red-600">Accès refusé. Seuls les administrateurs peuvent gérer les utilisateurs.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
                >
                    + Nouvel utilisateur
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dernière connexion</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.map((userItem) => (
                                    <tr key={userItem.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">
                                                {userItem.prenom} {userItem.nom}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            {userItem.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getRoleBadge(userItem.role)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                userItem.is_active 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {userItem.is_active ? 'Actif' : 'Inactif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {userItem.derniere_connexion 
                                                ? new Date(userItem.derniere_connexion).toLocaleDateString('fr-FR')
                                                : 'Jamais'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                            <button
                                                onClick={() => handleEdit(userItem)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                Modifier
                                            </button>
                                            {userItem.id !== user.id && (
                                                <button
                                                    onClick={() => handleDelete(userItem.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    Supprimer
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