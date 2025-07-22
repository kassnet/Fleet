<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Outil;
use App\Models\Entrepot;
use App\Models\MouvementOutil;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OutilController extends Controller
{
    /**
     * Display a listing of the outils.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Outil::with(['entrepot']);
        
        // Filtrage par entrepôt
        if ($request->has('entrepot_id')) {
            $query->where('entrepot_id', $request->entrepot_id);
        }
        
        // Filtrage par état
        if ($request->has('etat')) {
            $query->where('etat', $request->etat);
        }
        
        // Recherche par nom/référence
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nom', 'LIKE', "%{$search}%")
                  ->orWhere('reference', 'LIKE', "%{$search}%");
            });
        }
        
        $outils = $query->orderBy('nom')->get();
        
        return response()->json($outils);
    }

    /**
     * Store a newly created outil in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'description' => 'nullable|string',
            'reference' => 'nullable|string|max:255|unique:outils,reference',
            'entrepot_id' => 'nullable|exists:entrepots,id',
            'quantite_stock' => 'required|integer|min:0',
            'prix_unitaire_usd' => 'nullable|numeric|min:0',
            'fournisseur' => 'nullable|string|max:255',
            'date_achat' => 'nullable|date',
            'etat' => 'nullable|in:neuf,bon,moyen,mauvais,hors_service',
            'localisation' => 'nullable|string|max:255',
            'numero_serie' => 'nullable|string|max:255'
        ]);

        $validated['quantite_disponible'] = $validated['quantite_stock'];

        $outil = Outil::create($validated);

        // Enregistrer le mouvement initial si stock > 0
        if ($validated['quantite_stock'] > 0) {
            MouvementOutil::create([
                'outil_id' => $outil->id,
                'user_id' => Auth::id(),
                'type_mouvement' => 'approvisionnement',
                'quantite' => $validated['quantite_stock'],
                'stock_avant' => 0,
                'stock_apres' => $validated['quantite_stock'],
                'motif' => 'Stock initial lors de la création',
                'date_mouvement' => now()
            ]);
        }

        return response()->json($outil->load('entrepot'), 201);
    }

    /**
     * Display the specified outil.
     */
    public function show(Outil $outil): JsonResponse
    {
        return response()->json($outil->load(['entrepot', 'mouvements.user', 'affectations.technicien']));
    }

    /**
     * Update the specified outil in storage.
     */
    public function update(Request $request, Outil $outil): JsonResponse
    {
        $validated = $request->validate([
            'nom' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'reference' => 'sometimes|string|max:255|unique:outils,reference,' . $outil->id,
            'entrepot_id' => 'nullable|exists:entrepots,id',
            'prix_unitaire_usd' => 'nullable|numeric|min:0',
            'fournisseur' => 'nullable|string|max:255',
            'date_achat' => 'nullable|date',
            'etat' => 'nullable|in:neuf,bon,moyen,mauvais,hors_service',
            'localisation' => 'nullable|string|max:255',
            'numero_serie' => 'nullable|string|max:255'
        ]);

        $outil->update($validated);

        return response()->json($outil->load('entrepot'));
    }

    /**
     * Remove the specified outil from storage.
     */
    public function destroy(Outil $outil): JsonResponse
    {
        // Vérifier s'il y a des affectations en cours
        $affectationsEnCours = $outil->affectations()->where('statut', 'en_cours')->count();
        
        if ($affectationsEnCours > 0) {
            return response()->json([
                'message' => "Impossible de supprimer l'outil '{$outil->nom}'. Il y a {$affectationsEnCours} affectation(s) en cours."
            ], 400);
        }

        $outil->delete();

        return response()->json(['message' => 'Outil supprimé avec succès']);
    }

    /**
     * Approvisionner un outil
     */
    public function approvisionner(Request $request, Outil $outil): JsonResponse
    {
        $validated = $request->validate([
            'quantite' => 'required|integer|min:1',
            'motif' => 'required|string|max:500'
        ]);

        $stockAvant = $outil->quantite_stock;
        $stockApres = $stockAvant + $validated['quantite'];

        DB::transaction(function() use ($outil, $validated, $stockAvant, $stockApres) {
            // Mettre à jour les stocks
            $outil->update([
                'quantite_stock' => $stockApres,
                'quantite_disponible' => $outil->quantite_disponible + $validated['quantite']
            ]);

            // Enregistrer le mouvement
            MouvementOutil::create([
                'outil_id' => $outil->id,
                'user_id' => Auth::id(),
                'type_mouvement' => 'approvisionnement',
                'quantite' => $validated['quantite'],
                'stock_avant' => $stockAvant,
                'stock_apres' => $stockApres,
                'motif' => $validated['motif'],
                'date_mouvement' => now()
            ]);
        });

        return response()->json([
            'message' => 'Approvisionnement effectué avec succès',
            'nouveau_stock' => $stockApres,
            'nouvelle_disponibilite' => $outil->fresh()->quantite_disponible
        ]);
    }

    /**
     * Get mouvements for an outil
     */
    public function mouvements(Outil $outil): JsonResponse
    {
        $mouvements = MouvementOutil::where('outil_id', $outil->id)
            ->with(['user'])
            ->orderBy('date_mouvement', 'desc')
            ->get();

        return response()->json($mouvements);
    }

    /**
     * Get stock statistics
     */
    public function stats(): JsonResponse
    {
        $stats = [
            'total_outils' => Outil::count(),
            'total_stock' => Outil::sum('quantite_stock'),
            'total_disponible' => Outil::sum('quantite_disponible'),
            'total_affecte' => Outil::sum('quantite_stock') - Outil::sum('quantite_disponible'),
            'par_etat' => Outil::select('etat', DB::raw('count(*) as count'))
                ->groupBy('etat')
                ->get()
                ->pluck('count', 'etat'),
            'par_entrepot' => Outil::select('entrepot_nom', DB::raw('count(*) as count, sum(quantite_stock) as stock'))
                ->groupBy('entrepot_nom')
                ->get()
        ];

        return response()->json($stats);
    }
}