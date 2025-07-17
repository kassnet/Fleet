<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Paiement;
use App\Models\PaymentTransaction;
use App\Models\Facture;

class PaiementController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Liste des paiements
     */
    public function index(Request $request)
    {
        $query = Paiement::with(['facture']);
        
        // Filtres
        if ($request->has('statut')) {
            $query->where('statut', $request->statut);
        }
        
        if ($request->has('methode_paiement')) {
            $query->where('methode_paiement', $request->methode_paiement);
        }
        
        if ($request->has('facture_id')) {
            $query->where('facture_id', $request->facture_id);
        }
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('facture_numero', 'like', "%{$search}%")
                  ->orWhere('transaction_id', 'like', "%{$search}%");
            });
        }
        
        $paiements = $query->orderBy('created_at', 'desc')->paginate(15);
        
        return response()->json([
            'paiements' => $paiements->items(),
            'total' => $paiements->total(),
            'per_page' => $paiements->perPage(),
            'current_page' => $paiements->currentPage(),
        ]);
    }

    /**
     * Afficher un paiement
     */
    public function show($id)
    {
        $paiement = Paiement::with(['facture'])->find($id);
        
        if (!$paiement) {
            return response()->json([
                'error' => 'Payment not found',
                'message' => 'Paiement introuvable'
            ], 404);
        }

        return response()->json(['paiement' => $paiement]);
    }

    /**
     * Créer une session de paiement Stripe
     */
    public function createCheckoutSession(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'facture_id' => 'required|exists:factures,id',
            'success_url' => 'required|url',
            'cancel_url' => 'required|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $facture = Facture::find($request->facture_id);
        
        if ($facture->statut === 'payee') {
            return response()->json([
                'error' => 'Invoice already paid',
                'message' => 'Facture déjà payée'
            ], 400);
        }

        // Générer un session_id unique
        $session_id = 'cs_' . uniqid();
        
        // Montant en fonction de la devise de la facture
        $amount = $facture->devise === 'USD' ? $facture->total_ttc_usd : $facture->total_ttc_fc;
        $currency = strtolower($facture->devise === 'USD' ? 'usd' : 'fc');
        
        // Créer l'enregistrement de transaction
        $transaction = PaymentTransaction::create([
            'session_id' => $session_id,
            'user_id' => auth()->id(),
            'user_email' => auth()->user()->email,
            'amount' => $amount,
            'currency' => $currency,
            'metadata' => [
                'facture_id' => $facture->id,
                'facture_numero' => $facture->numero,
                'source' => 'facture_payment'
            ],
            'payment_status' => 'initiated',
            'status' => 'open',
        ]);

        // Simuler une URL Stripe (en production, utiliser la vraie API Stripe)
        $checkout_url = "https://checkout.stripe.com/pay/{$session_id}";

        return response()->json([
            'session_id' => $session_id,
            'url' => $checkout_url,
            'amount' => $amount,
            'currency' => $currency,
        ]);
    }

    /**
     * Vérifier le statut d'une session de paiement
     */
    public function checkoutStatus($session_id)
    {
        $transaction = PaymentTransaction::where('session_id', $session_id)->first();
        
        if (!$transaction) {
            return response()->json([
                'error' => 'Session not found',
                'message' => 'Session de paiement introuvable'
            ], 404);
        }

        // Simulation du statut (en production, vérifier avec Stripe)
        if ($transaction->payment_status === 'initiated') {
            // Simuler une progression : 50% de chance de succès
            $success = rand(0, 1);
            
            if ($success) {
                $transaction->update([
                    'payment_status' => 'completed',
                    'status' => 'complete'
                ]);
                
                // Créer l'enregistrement de paiement
                if ($transaction->metadata && isset($transaction->metadata['facture_id'])) {
                    $facture = Facture::find($transaction->metadata['facture_id']);
                    
                    if ($facture && $facture->statut !== 'payee') {
                        Paiement::create([
                            'facture_id' => $facture->id,
                            'facture_numero' => $facture->numero,
                            'montant_usd' => $transaction->currency === 'usd' ? $transaction->amount : $transaction->amount / 2800,
                            'montant_fc' => $transaction->currency === 'fc' ? $transaction->amount : $transaction->amount * 2800,
                            'devise_paiement' => strtoupper($transaction->currency),
                            'methode_paiement' => 'stripe',
                            'statut' => 'completed',
                            'transaction_id' => $session_id,
                            'date_paiement' => now(),
                            'notes' => 'Paiement Stripe'
                        ]);
                        
                        $facture->update([
                            'statut' => 'payee',
                            'date_paiement' => now()
                        ]);
                    }
                }
            }
        }

        return response()->json([
            'session_id' => $session_id,
            'status' => $transaction->status,
            'payment_status' => $transaction->payment_status,
            'amount_total' => $transaction->amount * 100, // Stripe retourne en centimes
            'currency' => $transaction->currency,
            'metadata' => $transaction->metadata,
        ]);
    }

    /**
     * Webhook Stripe (simulation)
     */
    public function stripeWebhook(Request $request)
    {
        // En production, vérifier la signature Stripe
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');
        
        // Simulation de traitement webhook
        $event = json_decode($payload, true);
        
        if (isset($event['type']) && $event['type'] === 'checkout.session.completed') {
            $session_id = $event['data']['object']['id'] ?? null;
            
            if ($session_id) {
                $transaction = PaymentTransaction::where('session_id', $session_id)->first();
                
                if ($transaction) {
                    $transaction->update([
                        'payment_status' => 'completed',
                        'status' => 'complete'
                    ]);
                }
            }
        }

        return response()->json(['received' => true]);
    }

    /**
     * Statistiques des paiements
     */
    public function stats()
    {
        $stats = [
            'total_paiements' => Paiement::count(),
            'paiements_completes' => Paiement::where('statut', 'completed')->count(),
            'paiements_en_attente' => Paiement::where('statut', 'pending')->count(),
            'montant_total_usd' => Paiement::where('statut', 'completed')->sum('montant_usd'),
            'montant_total_fc' => Paiement::where('statut', 'completed')->sum('montant_fc'),
            'paiements_stripe' => Paiement::where('methode_paiement', 'stripe')->count(),
            'paiements_manuels' => Paiement::where('methode_paiement', 'manuel')->count(),
        ];

        return response()->json(['stats' => $stats]);
    }
}