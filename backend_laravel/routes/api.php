<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ProduitController;
use App\Http\Controllers\FactureController;
use App\Http\Controllers\DevisController;
use App\Http\Controllers\PaiementController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Api\EntrepotController;
use App\Http\Controllers\Api\OutilController;
use App\Http\Controllers\Api\AffectationOutilController;
use App\Http\Controllers\Api\RapportController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Routes d'authentification
Route::group(['prefix' => 'auth'], function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('logout', [AuthController::class, 'logout']);
    Route::post('refresh', [AuthController::class, 'refresh']);
    Route::get('me', [AuthController::class, 'me']);
});

// Routes protégées par authentification JWT
Route::middleware('auth:api')->group(function () {
    
    // Routes Clients
    Route::apiResource('clients', ClientController::class);
    
    // Routes Produits
    Route::apiResource('produits', ProduitController::class);
    Route::put('produits/{id}/stock', [ProduitController::class, 'updateStock']);
    Route::get('produits/{id}/mouvements', [ProduitController::class, 'mouvementsStock']);
    
    // Routes Factures
    Route::apiResource('factures', FactureController::class);
    Route::post('factures/{id}/marquer-payee', [FactureController::class, 'marquerPayee']);
    Route::post('factures/{id}/simuler-paiement', [FactureController::class, 'simulerPaiement']);
    
    // Routes Devis
    Route::apiResource('devis', DevisController::class);
    Route::post('devis/{id}/convertir-facture', [DevisController::class, 'convertirEnFacture']);
    
    // Routes Paiements
    Route::get('paiements', [PaiementController::class, 'index']);
    Route::get('paiements/{id}', [PaiementController::class, 'show']);
    Route::get('paiements/stats', [PaiementController::class, 'stats']);
    
    // Routes Stripe
    Route::post('payments/checkout/session', [PaiementController::class, 'createCheckoutSession']);
    Route::get('payments/checkout/status/{session_id}', [PaiementController::class, 'checkoutStatus']);
    
    // Routes Utilisateurs (Admin + Support)
    Route::apiResource('users', UserController::class);
    Route::post('users/{id}/toggle-active', [UserController::class, 'toggleActive']);
    
    // Routes Paramètres (Support uniquement)
    Route::get('parametres', [ParametreController::class, 'index']);
    Route::post('parametres/taux-change', [ParametreController::class, 'updateTauxChange']);
    Route::get('parametres/logs', [ParametreController::class, 'getLogs']);
    Route::post('parametres/backup', [ParametreController::class, 'backupDatabase']);
    Route::get('parametres/health', [ParametreController::class, 'healthCheck']);
    
    // Routes Entrepôts (Manager/Admin)
    Route::apiResource('entrepots', EntrepotController::class);
    Route::get('entrepots/{entrepot}/validation', [EntrepotController::class, 'validation']);
    
    // Routes Outils (Technicien/Manager/Admin)
    Route::apiResource('outils', OutilController::class);
    Route::post('outils/{outil}/approvisionner', [OutilController::class, 'approvisionner']);
    Route::get('outils/{outil}/mouvements', [OutilController::class, 'mouvements']);
    Route::get('outils/stats', [OutilController::class, 'stats']);
    
    // Routes Affectations d'outils (Manager/Admin)
    Route::apiResource('affectations', AffectationOutilController::class)->except(['update']);
    Route::post('affectations/{affectation}/retourner', [AffectationOutilController::class, 'retourner']);
    Route::get('affectations/stats', [AffectationOutilController::class, 'stats']);
    Route::get('affectations/techniciens', [AffectationOutilController::class, 'techniciens']);
    
    // Routes Rapports (Technicien/Manager/Admin)
    Route::prefix('rapports')->group(function () {
        Route::get('mouvements', [RapportController::class, 'mouvements']);
        Route::get('stock-par-entrepot', [RapportController::class, 'stockParEntrepot']);
        Route::get('entrepot/{entrepot}/detail', [RapportController::class, 'detailEntrepot']);
        Route::get('dashboard', [RapportController::class, 'dashboard']);
        Route::post('export', [RapportController::class, 'export']);
    });
    
    // Alias pour compatibilité avec l'ancien système
    Route::get('outils/rapports/mouvements', [RapportController::class, 'mouvements']);
    Route::get('outils/rapports/stock-par-entrepot', [RapportController::class, 'stockParEntrepot']);
    
});

// Webhook Stripe (non protégé)
Route::post('webhook/stripe', [PaiementController::class, 'stripeWebhook']);

// Test route
Route::get('test', function () {
    return response()->json([
        'message' => 'FacturApp API Laravel est fonctionnel !',
        'version' => '1.0.0',
        'framework' => 'Laravel 11',
        'database' => 'MySQL',
        'timestamp' => now()->toISOString(),
        'routes' => [
            'auth' => '/api/auth/*',
            'clients' => '/api/clients',
            'produits' => '/api/produits',
            'factures' => '/api/factures',
            'devis' => '/api/devis',
            'paiements' => '/api/paiements',
            'stripe' => '/api/payments/checkout/*'
        ]
    ]);
});