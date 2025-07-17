<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Devis;
use App\Models\Facture;
use App\Models\Client;
use App\Models\Produit;
use App\Models\TauxChange;

class DevisController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Liste des devis
     */
    public function index(Request $request)
    {
        $query = Devis::query();
        
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
        
        $devis = $query->orderBy('created_at', 'desc')->paginate(15);
        
        return response()->json([
            'devis' => $devis->items(),
            'total' => $devis->total(),
            'per_page' => $devis->perPage(),
            'current_page' => $devis->currentPage(),
        ]);
    }

    /**
     * Créer un devis
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|exists:clients,id',
            'devise' => 'required|in:USD,FC',
            'lignes' => 'required|array|min:1',
            'lignes.*.produit_id' => 'required|exists:produits,id',
            'lignes.*.quantite' => 'required|numeric|min:0.01',
            'validite_jours' => 'nullable|integer|min:1|max:365',
            'notes' => 'nullable|string',
            'conditions' => 'nullable|string',
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

        $validite_jours = $request->validite_jours ?? 30;

        // Créer le devis
        $devis = Devis::create([
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
            'validite_jours' => $validite_jours,
            'date_expiration' => now()->addDays($validite_jours),
            'notes' => $request->notes,
            'conditions' => $request->conditions,
        ]);

        return response()->json([
            'message' => 'Devis créé avec succès',
            'devis' => $devis
        ], 201);
    }

    /**
     * Afficher un devis
     */
    public function show($id)
    {
        $devis = Devis::with(['client', 'facture'])->find($id);
        
        if (!$devis) {
            return response()->json([
                'error' => 'Quote not found',
                'message' => 'Devis introuvable'
            ], 404);
        }

        return response()->json(['devis' => $devis]);
    }

    /**
     * Mettre à jour un devis
     */
    public function update(Request $request, $id)
    {
        $devis = Devis::find($id);
        
        if (!$devis) {
            return response()->json([
                'error' => 'Quote not found',
                'message' => 'Devis introuvable'
            ], 404);
        }

        if (in_array($devis->statut, ['accepte', 'refuse'])) {
            return response()->json([
                'error' => 'Cannot update finalized quote',
                'message' => 'Impossible de modifier un devis finalisé'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'statut' => 'sometimes|in:brouillon,envoye,accepte,refuse,expire',
            'notes' => 'nullable|string',
            'conditions' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        
        // Si le devis est accepté, enregistrer la date
        if (isset($data['statut']) && $data['statut'] === 'accepte') {
            $data['date_acceptation'] = now();
        }

        $devis->update($data);

        return response()->json([
            'message' => 'Devis mis à jour avec succès',
            'devis' => $devis
        ]);
    }

    /**
     * Supprimer un devis
     */
    public function destroy($id)
    {
        $devis = Devis::find($id);
        
        if (!$devis) {
            return response()->json([
                'error' => 'Quote not found',
                'message' => 'Devis introuvable'
            ], 404);
        }

        if ($devis->facture_id) {
            return response()->json([
                'error' => 'Cannot delete converted quote',
                'message' => 'Impossible de supprimer un devis converti en facture'
            ], 400);
        }

        $devis->delete();

        return response()->json([
            'message' => 'Devis supprimé avec succès'
        ]);
    }

    /**
     * Convertir un devis en facture
     */
    public function convertirEnFacture($id)
    {
        $devis = Devis::find($id);
        
        if (!$devis) {
            return response()->json([
                'error' => 'Quote not found',
                'message' => 'Devis introuvable'
            ], 404);
        }

        if ($devis->statut !== 'accepte') {
            return response()->json([
                'error' => 'Quote must be accepted first',
                'message' => 'Le devis doit être accepté avant la conversion'
            ], 400);
        }

        if ($devis->facture_id) {
            return response()->json([
                'error' => 'Quote already converted',
                'message' => 'Devis déjà converti en facture'
            ], 400);
        }

        // Créer la facture basée sur le devis
        $facture = Facture::create([
            'client_id' => $devis->client_id,
            'client_nom' => $devis->client_nom,
            'client_email' => $devis->client_email,
            'client_adresse' => $devis->client_adresse,
            'devise' => $devis->devise,
            'lignes' => $devis->lignes,
            'total_ht_usd' => $devis->total_ht_usd,
            'total_ht_fc' => $devis->total_ht_fc,
            'total_tva_usd' => $devis->total_tva_usd,
            'total_tva_fc' => $devis->total_tva_fc,
            'total_ttc_usd' => $devis->total_ttc_usd,
            'total_ttc_fc' => $devis->total_ttc_fc,
            'statut' => 'brouillon',
            'date_echeance' => now()->addDays(30),
            'notes' => "Facture générée depuis le devis {$devis->numero}",
        ]);

        // Lier le devis à la facture
        $devis->update(['facture_id' => $facture->id]);

        return response()->json([
            'message' => 'Devis converti en facture avec succès',
            'devis' => $devis,
            'facture' => $facture
        ]);
    }
}