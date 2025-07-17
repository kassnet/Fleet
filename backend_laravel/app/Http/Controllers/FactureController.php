<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Facture;
use App\Models\Client;
use App\Models\Produit;
use App\Models\Paiement;
use App\Models\TauxChange;

class FactureController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Liste des factures
     */
    public function index(Request $request)
    {
        $query = Facture::query();
        
        // Filtres
        if ($request->has('statut')) {
            $query->where('statut', $request->statut);
        }
        
        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('numero', 'like', "%{$search}%")
                  ->orWhere('client_nom', 'like', "%{$search}%");
            });
        }
        
        $factures = $query->orderBy('created_at', 'desc')->paginate(15);
        
        return response()->json([
            'factures' => $factures->items(),
            'total' => $factures->total(),
            'per_page' => $factures->perPage(),
            'current_page' => $factures->currentPage(),
        ]);
    }

    /**
     * Créer une facture
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|exists:clients,id',
            'devise' => 'required|in:USD,FC',
            'lignes' => 'required|array|min:1',
            'lignes.*.produit_id' => 'required|exists:produits,id',
            'lignes.*.quantite' => 'required|numeric|min:0.01',
            'date_echeance' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        // Récupérer le client
        $client = Client::find($request->client_id);
        $taux = TauxChange::getActiveRate('USD', 'FC');

        // Calculer les totaux
        $lignes_calculees = [];
        $total_ht_usd = 0;
        $total_ht_fc = 0;
        $total_tva_usd = 0;
        $total_tva_fc = 0;

        foreach ($request->lignes as $ligne) {
            $produit = Produit::find($ligne['produit_id']);
            $quantite = $ligne['quantite'];
            
            $prix_unitaire_usd = $produit->prix_usd;
            $prix_unitaire_fc = $produit->calculerPrixFC($taux);
            
            $total_ligne_ht_usd = $prix_unitaire_usd * $quantite;
            $total_ligne_ht_fc = $prix_unitaire_fc * $quantite;
            
            $tva_ligne_usd = $total_ligne_ht_usd * ($produit->tva / 100);
            $tva_ligne_fc = $total_ligne_ht_fc * ($produit->tva / 100);
            
            $ligne_calculee = [
                'produit_id' => $produit->id,
                'nom_produit' => $produit->nom,
                'quantite' => $quantite,
                'prix_unitaire_usd' => $prix_unitaire_usd,
                'prix_unitaire_fc' => $prix_unitaire_fc,
                'devise' => $request->devise,
                'tva' => $produit->tva,
                'total_ht_usd' => $total_ligne_ht_usd,
                'total_ht_fc' => $total_ligne_ht_fc,
                'total_ttc_usd' => $total_ligne_ht_usd + $tva_ligne_usd,
                'total_ttc_fc' => $total_ligne_ht_fc + $tva_ligne_fc,
            ];
            
            $lignes_calculees[] = $ligne_calculee;
            $total_ht_usd += $total_ligne_ht_usd;
            $total_ht_fc += $total_ligne_ht_fc;
            $total_tva_usd += $tva_ligne_usd;
            $total_tva_fc += $tva_ligne_fc;
        }

        // Créer la facture
        $facture = Facture::create([
            'client_id' => $client->id,
            'client_nom' => $client->nom,
            'client_email' => $client->email,
            'client_adresse' => $client->adresse,
            'devise' => $request->devise,
            'lignes' => $lignes_calculees,
            'total_ht_usd' => $total_ht_usd,
            'total_ht_fc' => $total_ht_fc,
            'total_tva_usd' => $total_tva_usd,
            'total_tva_fc' => $total_tva_fc,
            'total_ttc_usd' => $total_ht_usd + $total_tva_usd,
            'total_ttc_fc' => $total_ht_fc + $total_tva_fc,
            'statut' => 'brouillon',
            'date_echeance' => $request->date_echeance,
            'notes' => $request->notes,
        ]);

        return response()->json([
            'message' => 'Facture créée avec succès',
            'facture' => $facture
        ], 201);
    }

    /**
     * Afficher une facture
     */
    public function show($id)
    {
        $facture = Facture::with(['client', 'paiements'])->find($id);
        
        if (!$facture) {
            return response()->json([
                'error' => 'Invoice not found',
                'message' => 'Facture introuvable'
            ], 404);
        }

        return response()->json(['facture' => $facture]);
    }

    /**
     * Mettre à jour une facture
     */
    public function update(Request $request, $id)
    {
        $facture = Facture::find($id);
        
        if (!$facture) {
            return response()->json([
                'error' => 'Invoice not found',
                'message' => 'Facture introuvable'
            ], 404);
        }

        if ($facture->statut === 'payee') {
            return response()->json([
                'error' => 'Cannot update paid invoice',
                'message' => 'Impossible de modifier une facture payée'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'statut' => 'sometimes|in:brouillon,envoyee,payee,annulee',
            'date_echeance' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $facture->update($request->all());

        return response()->json([
            'message' => 'Facture mise à jour avec succès',
            'facture' => $facture
        ]);
    }

    /**
     * Supprimer une facture
     */
    public function destroy($id)
    {
        $facture = Facture::find($id);
        
        if (!$facture) {
            return response()->json([
                'error' => 'Invoice not found',
                'message' => 'Facture introuvable'
            ], 404);
        }

        if ($facture->statut === 'payee') {
            return response()->json([
                'error' => 'Cannot delete paid invoice',
                'message' => 'Impossible de supprimer une facture payée'
            ], 400);
        }

        $facture->delete();

        return response()->json([
            'message' => 'Facture supprimée avec succès'
        ]);
    }

    /**
     * Marquer une facture comme payée
     */
    public function marquerPayee(Request $request, $id)
    {
        $facture = Facture::find($id);
        
        if (!$facture) {
            return response()->json([
                'error' => 'Invoice not found',
                'message' => 'Facture introuvable'
            ], 404);
        }

        if ($facture->statut === 'payee') {
            return response()->json([
                'error' => 'Invoice already paid',
                'message' => 'Facture déjà payée'
            ], 400);
        }

        // Créer l'enregistrement de paiement
        $paiement = Paiement::create([
            'facture_id' => $facture->id,
            'facture_numero' => $facture->numero,
            'montant_usd' => $facture->total_ttc_usd,
            'montant_fc' => $facture->total_ttc_fc,
            'devise_paiement' => $request->devise_paiement ?? $facture->devise,
            'methode_paiement' => 'manuel',
            'statut' => 'completed',
            'date_paiement' => now(),
            'notes' => $request->notes ?? 'Marqué comme payé manuellement',
        ]);

        // Mettre à jour la facture
        $facture->update([
            'statut' => 'payee',
            'date_paiement' => now(),
        ]);

        return response()->json([
            'message' => 'Facture marquée comme payée',
            'facture' => $facture,
            'paiement' => $paiement
        ]);
    }

    /**
     * Simuler un paiement Stripe
     */
    public function simulerPaiement(Request $request, $id)
    {
        $facture = Facture::find($id);
        
        if (!$facture) {
            return response()->json([
                'error' => 'Invoice not found',
                'message' => 'Facture introuvable'
            ], 404);
        }

        if ($facture->statut === 'payee') {
            return response()->json([
                'error' => 'Invoice already paid',
                'message' => 'Facture déjà payée'
            ], 400);
        }

        // Simuler une transaction Stripe
        $transaction_id = 'stripe_sim_' . uniqid();
        $checkout_url = "https://checkout.stripe.com/pay/cs_test_" . uniqid();

        // Créer l'enregistrement de paiement en attente
        $paiement = Paiement::create([
            'facture_id' => $facture->id,
            'facture_numero' => $facture->numero,
            'montant_usd' => $facture->total_ttc_usd,
            'montant_fc' => $facture->total_ttc_fc,
            'devise_paiement' => $request->devise_paiement ?? $facture->devise,
            'methode_paiement' => 'stripe',
            'statut' => 'pending',
            'transaction_id' => $transaction_id,
            'notes' => 'Simulation de paiement Stripe',
        ]);

        return response()->json([
            'message' => 'Simulation de paiement créée',
            'checkout_url' => $checkout_url,
            'transaction_id' => $transaction_id,
            'paiement' => $paiement
        ]);
    }
}