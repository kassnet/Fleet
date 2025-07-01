import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const { t } = useLanguage();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await login(email, password);
        
        if (!result.success) {
            setError(result.error);
        }
        
        setLoading(false);
    };

    const handleDemoLogin = (demoEmail, demoPassword) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 dark:from-gray-800 dark:via-gray-900 dark:to-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
            <div className="max-w-md w-full space-y-8">
                {/* Contrôles de thème et langue en haut à droite */}
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                    <ThemeToggle />
                    <LanguageSelector />
                </div>

                {/* Logo et titre */}
                <div className="text-center">
                    <div className="mx-auto h-20 w-20 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">📊</span>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-white">
                        {t('app.title')}
                    </h2>
                    <p className="mt-2 text-sm text-blue-100 dark:text-gray-300">
                        {t('login.subtitle')}
                    </p>
                </div>

                {/* Formulaire de connexion */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-gray-700">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('login.email')}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm transition-colors"
                                placeholder="votre.email@exemple.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('login.password')}
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Connexion...
                                    </span>
                                ) : (
                                    'Se connecter'
                                )}
                            </button>
                        </div>

                        {/* Comptes de démonstration */}
                        <div className="border-t border-gray-200 pt-6">
                            <p className="text-center text-sm text-gray-600 mb-4">
                                Comptes de démonstration :
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => handleDemoLogin('admin@facturapp.rdc', 'admin123')}
                                    className="px-3 py-2 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 transition"
                                >
                                    👑 Admin
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDemoLogin('manager@demo.com', 'manager123')}
                                    className="px-3 py-2 bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition"
                                >
                                    👔 Manager
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDemoLogin('comptable@demo.com', 'comptable123')}
                                    className="px-3 py-2 bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 transition"
                                >
                                    💰 Comptable
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDemoLogin('user@demo.com', 'user123')}
                                    className="px-3 py-2 bg-gray-50 text-gray-700 rounded border border-gray-200 hover:bg-gray-100 transition"
                                >
                                    👤 Utilisateur
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-blue-100 text-sm">
                        💼 FacturApp - Système de gestion de facturation professionnel
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;