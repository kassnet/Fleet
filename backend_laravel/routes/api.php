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
use App\Http\Controllers\ParametreController;

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