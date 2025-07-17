<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Produit;
use App\Models\MouvementStock;
use App\Models\TauxChange;

class ProduitController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Liste des produits
     */
    public function index(Request $request)
    {
        $query = Produit::query();
        
        // Filtres
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        
        if ($request->has('actif')) {
            $query->where('actif', $request->actif);
        }
        
        $produits = $query->orderBy('nom')->paginate(15);
        
        return response()->json([
            'produits' => $produits->items(),
            'total' => $produits->total(),
            'per_page' => $produits->perPage(),
            'current_page' => $produits->currentPage(),
        ]);
    }

    /**
     * Créer un produit
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:255',
            'description' => 'nullable|string',
            'prix_usd' => 'required|numeric|min:0',
            'prix_fc' => 'nullable|numeric|min:0',
            'unite' => 'nullable|string|max:50',
            'tva' => 'nullable|numeric|min:0|max:100',
            'actif' => 'boolean',
            'gestion_stock' => 'boolean',
            'stock_actuel' => 'nullable|integer|min:0',
            'stock_minimum' => 'nullable|integer|min:0',
            'stock_maximum' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        // Calculer le prix FC si non fourni
        $data = $request->all();
        if (!isset($data['prix_fc']) && isset($data['prix_usd'])) {
            $taux = TauxChange::getActiveRate('USD', 'FC');
            $data['prix_fc'] = $data['prix_usd'] * $taux;
        }

        $produit = Produit::create($data);

        return response()->json([
            'message' => 'Produit créé avec succès',
            'produit' => $produit
        ], 201);
    }

    /**
     * Afficher un produit
     */
    public function show($id)
    {
        $produit = Produit::find($id);
        
        if (!$produit) {
            return response()->json([
                'error' => 'Product not found',
                'message' => 'Produit introuvable'
            ], 404);
        }

        return response()->json(['produit' => $produit]);
    }

    /**
     * Mettre à jour un produit
     */
    public function update(Request $request, $id)
    {
        $produit = Produit::find($id);
        
        if (!$produit) {
            return response()->json([
                'error' => 'Product not found',
                'message' => 'Produit introuvable'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nom' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'prix_usd' => 'sometimes|required|numeric|min:0',
            'prix_fc' => 'nullable|numeric|min:0',
            'unite' => 'nullable|string|max:50',
            'tva' => 'nullable|numeric|min:0|max:100',
            'actif' => 'boolean',
            'gestion_stock' => 'boolean',
            'stock_actuel' => 'nullable|integer|min:0',
            'stock_minimum' => 'nullable|integer|min:0',
            'stock_maximum' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $produit->update($request->all());

        return response()->json([
            'message' => 'Produit mis à jour avec succès',
            'produit' => $produit
        ]);
    }

    /**
     * Supprimer un produit
     */
    public function destroy($id)
    {
        $produit = Produit::find($id);
        
        if (!$produit) {
            return response()->json([
                'error' => 'Product not found',
                'message' => 'Produit introuvable'
            ], 404);
        }

        $produit->delete();

        return response()->json([
            'message' => 'Produit supprimé avec succès'
        ]);
    }

    /**
     * Mettre à jour le stock
     */
    public function updateStock(Request $request, $id)
    {
        $produit = Produit::find($id);
        
        if (!$produit) {
            return response()->json([
                'error' => 'Product not found',
                'message' => 'Produit introuvable'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nouvelle_quantite' => 'required|integer|min:0',
            'motif' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $stock_avant = $produit->stock_actuel ?? 0;
        $nouvelle_quantite = $request->nouvelle_quantite;
        $difference = $nouvelle_quantite - $stock_avant;

        // Créer le mouvement de stock
        MouvementStock::create([
            'produit_id' => $id,
            'type_mouvement' => $difference > 0 ? 'entree' : ($difference < 0 ? 'sortie' : 'correction'),
            'quantite' => abs($difference),
            'stock_avant' => $stock_avant,
            'stock_apres' => $nouvelle_quantite,
            'motif' => $request->motif ?? 'Correction manuelle',
            'date_mouvement' => now(),
        ]);

        // Mettre à jour le stock
        $produit->update(['stock_actuel' => $nouvelle_quantite]);

        return response()->json([
            'message' => 'Stock mis à jour avec succès',
            'produit' => $produit
        ]);
    }

    /**
     * Historique des mouvements de stock
     */
    public function mouvementsStock($id)
    {
        $produit = Produit::find($id);
        
        if (!$produit) {
            return response()->json([
                'error' => 'Product not found',
                'message' => 'Produit introuvable'
            ], 404);
        }

        $mouvements = MouvementStock::where('produit_id', $id)
            ->orderBy('date_mouvement', 'desc')
            ->paginate(20);

        return response()->json([
            'mouvements' => $mouvements->items(),
            'total' => $mouvements->total(),
            'per_page' => $mouvements->perPage(),
            'current_page' => $mouvements->currentPage(),
        ]);
    }
}