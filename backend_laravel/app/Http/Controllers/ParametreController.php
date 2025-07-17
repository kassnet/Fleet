<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\TauxChange;
use App\Models\User;
use App\Models\Client;
use App\Models\Produit;
use App\Models\Facture;
use App\Models\Paiement;

class ParametreController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
        $this->middleware(function ($request, $next) {
            if (!auth()->user()->canAccessSettings()) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Accès réservé au support uniquement'
                ], 403);
            }
            return $next($request);
        });
    }

    /**
     * Obtenir les paramètres système
     */
    public function index()
    {
        // Taux de change actuel
        $taux_change = TauxChange::where('actif', true)->first();
        
        // Statistiques système
        $stats = [
            'total_users' => User::count(),
            'total_clients' => Client::count(),
            'total_produits' => Produit::count(),
            'total_factures' => Facture::count(),
            'total_paiements' => Paiement::count(),
            'factures_payees' => Facture::where('statut', 'payee')->count(),
            'factures_en_attente' => Facture::whereIn('statut', ['brouillon', 'envoyee'])->count(),
            'revenus_total_usd' => Paiement::where('statut', 'completed')->sum('montant_usd'),
            'revenus_total_fc' => Paiement::where('statut', 'completed')->sum('montant_fc'),
        ];

        return response()->json([
            'taux_change' => $taux_change,
            'stats' => $stats,
            'version' => [
                'app' => '1.0.0',
                'backend' => 'Laravel 11',
                'database' => 'MySQL',
                'php' => PHP_VERSION,
            ]
        ]);
    }

    /**
     * Mettre à jour le taux de change
     */
    public function updateTauxChange(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'taux' => 'required|numeric|min:0.01',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Taux de change invalide',
                'errors' => $validator->errors()
            ], 422);
        }

        // Désactiver l'ancien taux
        TauxChange::where('actif', true)->update(['actif' => false]);

        // Créer le nouveau taux
        $nouveauTaux = TauxChange::create([
            'devise_base' => 'USD',
            'devise_cible' => 'FC',
            'taux' => $request->taux,
            'actif' => true,
        ]);

        return response()->json([
            'message' => 'Taux de change mis à jour avec succès',
            'taux' => $nouveauTaux
        ]);
    }

    /**
     * Obtenir les logs système (simulation)
     */
    public function getLogs()
    {
        // Simulation des logs système
        $logs = [
            [
                'timestamp' => now()->subMinutes(5)->toISOString(),
                'level' => 'INFO',
                'message' => 'Authentification réussie pour admin@facturapp.rdc',
                'module' => 'AUTH'
            ],
            [
                'timestamp' => now()->subMinutes(10)->toISOString(),
                'level' => 'INFO',
                'message' => 'Nouvelle facture créée (FACT-20250717-ABC123)',
                'module' => 'FACTURE'
            ],
            [
                'timestamp' => now()->subMinutes(15)->toISOString(),
                'level' => 'INFO',
                'message' => 'Paiement Stripe confirmé (session_cs_test_123)',
                'module' => 'PAIEMENT'
            ],
            [
                'timestamp' => now()->subMinutes(20)->toISOString(),
                'level' => 'WARNING',
                'message' => 'Tentative d\'accès non autorisé aux paramètres',
                'module' => 'SECURITY'
            ],
            [
                'timestamp' => now()->subMinutes(25)->toISOString(),
                'level' => 'INFO',
                'message' => 'Mise à jour du stock pour produit Formation utilisateur',
                'module' => 'STOCK'
            ],
        ];

        return response()->json(['logs' => $logs]);
    }

    /**
     * Sauvegarder la base de données
     */
    public function backupDatabase()
    {
        try {
            // Simulation de sauvegarde
            $backup_filename = 'facturapp_backup_' . date('Y-m-d_H-i-s') . '.sql';
            
            // En production, utiliser mysqldump ou une autre méthode
            $backup_info = [
                'filename' => $backup_filename,
                'size' => '2.5 MB',
                'timestamp' => now()->toISOString(),
                'tables' => [
                    'users' => User::count() . ' enregistrements',
                    'clients' => Client::count() . ' enregistrements',
                    'produits' => Produit::count() . ' enregistrements',
                    'factures' => Facture::count() . ' enregistrements',
                    'paiements' => Paiement::count() . ' enregistrements',
                ],
                'status' => 'success'
            ];

            return response()->json([
                'message' => 'Sauvegarde créée avec succès',
                'backup' => $backup_info
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Backup failed',
                'message' => 'Erreur lors de la sauvegarde',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Vérifier la santé du système
     */
    public function healthCheck()
    {
        $health = [
            'status' => 'healthy',
            'timestamp' => now()->toISOString(),
            'services' => [
                'database' => $this->checkDatabase(),
                'cache' => $this->checkCache(),
                'storage' => $this->checkStorage(),
                'api' => 'operational'
            ],
            'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB',
            'uptime' => 'Système opérationnel',
        ];

        return response()->json(['health' => $health]);
    }

    private function checkDatabase()
    {
        try {
            User::count();
            return 'operational';
        } catch (\Exception $e) {
            return 'error';
        }
    }

    private function checkCache()
    {
        // Simulation du cache
        return 'operational';
    }

    private function checkStorage()
    {
        // Simulation du stockage
        return 'operational';
    }
}