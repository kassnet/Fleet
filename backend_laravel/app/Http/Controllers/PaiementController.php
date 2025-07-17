<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Paiement;
use App\Models\PaymentTransaction;
use App\Models\Facture;
use Illuminate\Support\Facades\Process;

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
            'origin_url' => 'required|url',
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

        // Préparer les données pour Stripe
        $amount = $facture->devise === 'USD' ? $facture->total_ttc_usd : $facture->total_ttc_fc;
        $currency = strtolower($facture->devise === 'USD' ? 'usd' : 'fc');
        $origin_url = rtrim($request->origin_url, '/');
        
        $stripe_data = [
            'amount' => (float) $amount,
            'currency' => $currency,
            'success_url' => $origin_url . '/payment/success?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $origin_url . '/payment/cancel',
            'metadata' => [
                'facture_id' => $facture->id,
                'facture_numero' => $facture->numero,
                'source' => 'facture_payment',
                'user_id' => auth()->id(),
            ]
        ];

        try {
            // Appeler le service Python Stripe
            $python_command = 'python3 ' . base_path('stripe_service.py') . ' create_session ' . escapeshellarg(json_encode($stripe_data));
            $result = shell_exec($python_command);
            $stripe_response = json_decode($result, true);

            if (!$stripe_response || !$stripe_response['success']) {
                return response()->json([
                    'error' => 'Stripe error',
                    'message' => 'Erreur lors de la création de la session Stripe',
                    'details' => $stripe_response['error'] ?? 'Unknown error'
                ], 500);
            }

            // Créer l'enregistrement de transaction
            $transaction = PaymentTransaction::create([
                'session_id' => $stripe_response['session_id'],
                'user_id' => auth()->id(),
                'user_email' => auth()->user()->email,
                'amount' => $amount,
                'currency' => $currency,
                'metadata' => $stripe_data['metadata'],
                'payment_status' => 'initiated',
                'status' => 'open',
            ]);

            return response()->json([
                'session_id' => $stripe_response['session_id'],
                'url' => $stripe_response['url'],
                'amount' => $amount,
                'currency' => $currency,
                'transaction_id' => $transaction->id,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'System error',
                'message' => 'Erreur système lors de la création du paiement',
                'details' => $e->getMessage()
            ], 500);
        }
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

        try {
            // Vérifier le statut avec Stripe via Python
            $python_command = 'python3 ' . base_path('stripe_service.py') . ' check_status ' . escapeshellarg($session_id);
            $result = shell_exec($python_command);
            $stripe_status = json_decode($result, true);

            if (!$stripe_status || !$stripe_status['success']) {
                return response()->json([
                    'error' => 'Stripe status check failed',
                    'message' => 'Impossible de vérifier le statut Stripe'
                ], 500);
            }

            // Mettre à jour la transaction
            $transaction->update([
                'payment_status' => $stripe_status['payment_status'],
                'status' => $stripe_status['status'],
            ]);

            // Si le paiement est complété et pas encore traité
            if ($stripe_status['payment_status'] === 'paid' && $transaction->payment_status !== 'completed') {
                $this->processSuccessfulPayment($transaction, $stripe_status);
            }

            return response()->json([
                'session_id' => $session_id,
                'status' => $stripe_status['status'],
                'payment_status' => $stripe_status['payment_status'],
                'amount_total' => $stripe_status['amount_total'],
                'currency' => $stripe_status['currency'],
                'metadata' => $stripe_status['metadata'],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'System error',
                'message' => 'Erreur lors de la vérification du statut',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Traiter un paiement réussi
     */
    private function processSuccessfulPayment($transaction, $stripe_status)
    {
        if (!$transaction->metadata || !isset($transaction->metadata['facture_id'])) {
            return;
        }

        $facture = Facture::find($transaction->metadata['facture_id']);
        
        if (!$facture || $facture->statut === 'payee') {
            return;
        }

        // Vérifier qu'on n'a pas déjà traité ce paiement
        $existing_payment = Paiement::where('transaction_id', $transaction->session_id)->first();
        if ($existing_payment) {
            return;
        }

        // Créer l'enregistrement de paiement
        Paiement::create([
            'facture_id' => $facture->id,
            'facture_numero' => $facture->numero,
            'montant_usd' => $transaction->currency === 'usd' ? $transaction->amount : $transaction->amount / 2800,
            'montant_fc' => $transaction->currency === 'fc' ? $transaction->amount : $transaction->amount * 2800,
            'devise_paiement' => strtoupper($transaction->currency),
            'methode_paiement' => 'stripe',
            'statut' => 'completed',
            'transaction_id' => $transaction->session_id,
            'date_paiement' => now(),
            'notes' => 'Paiement Stripe confirmé'
        ]);

        // Mettre à jour la facture
        $facture->update([
            'statut' => 'payee',
            'date_paiement' => now()
        ]);

        // Marquer la transaction comme traitée
        $transaction->update(['payment_status' => 'completed']);
    }

    /**
     * Webhook Stripe
     */
    public function stripeWebhook(Request $request)
    {
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');

        if (!$signature) {
            return response()->json(['error' => 'No signature'], 400);
        }

        try {
            // Traiter le webhook via Python
            $python_command = 'python3 ' . base_path('stripe_service.py') . ' handle_webhook ' . 
                             escapeshellarg($payload) . ' ' . escapeshellarg($signature);
            $result = shell_exec($python_command);
            $webhook_response = json_decode($result, true);

            if (!$webhook_response || !$webhook_response['success']) {
                return response()->json(['error' => 'Webhook processing failed'], 400);
            }

            // Traiter l'événement selon le type
            if ($webhook_response['event_type'] === 'checkout.session.completed') {
                $session_id = $webhook_response['session_id'];
                
                if ($session_id) {
                    $transaction = PaymentTransaction::where('session_id', $session_id)->first();
                    
                    if ($transaction) {
                        $transaction->update([
                            'payment_status' => 'completed',
                            'status' => 'complete'
                        ]);

                        // Traiter le paiement réussi
                        $this->processSuccessfulPayment($transaction, $webhook_response);
                    }
                }
            }

            return response()->json(['received' => true]);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Webhook error: ' . $e->getMessage()], 500);
        }
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