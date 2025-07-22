<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entrepot;
use App\Models\Outil;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class EntrepotController extends Controller
{
    /**
     * Display a listing of the entrepots.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Entrepot::query();
        
        // Filtrage par statut
        if ($request->has('statut')) {
            $query->where('statut', $request->statut);
        }
        
        // Recherche par nom
        if ($request->has('search')) {
            $query->where('nom', 'LIKE', '%' . $request->search . '%');
        }
        
        $entrepots = $query->orderBy('nom')->get();
        
        return response()->json($entrepots);
    }

    /**
     * Store a newly created entrepot in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255|unique:entrepots,nom',
            'description' => 'nullable|string',
            'adresse' => 'nullable|string|max:500',
            'responsable' => 'nullable|string|max:255',
            'capacite_max' => 'nullable|integer|min:0',
            'statut' => 'nullable|in:actif,inactif,maintenance'
        ]);

        $entrepot = Entrepot::create($validated);

        return response()->json($entrepot, 201);
    }

    /**
     * Display the specified entrepot.
     */
    public function show(Entrepot $entrepot): JsonResponse
    {
        return response()->json($entrepot);
    }

    /**
     * Update the specified entrepot in storage.
     */
    public function update(Request $request, Entrepot $entrepot): JsonResponse
    {
        $validated = $request->validate([
            'nom' => 'sometimes|required|string|max:255|unique:entrepots,nom,' . $entrepot->id,
            'description' => 'nullable|string',
            'adresse' => 'nullable|string|max:500',
            'responsable' => 'nullable|string|max:255',
            'capacite_max' => 'nullable|integer|min:0',
            'statut' => 'nullable|in:actif,inactif,maintenance'
        ]);

        $entrepot->update($validated);

        return response()->json($entrepot);
    }

    /**
     * Remove the specified entrepot from storage.
     */
    public function destroy(Entrepot $entrepot): JsonResponse
    {
        // Vérifier s'il y a des outils associés
        $outilsCount = Outil::where('entrepot_id', $entrepot->id)->count();
        
        if ($outilsCount > 0) {
            return response()->json([
                'message' => "Impossible de supprimer l'entrepôt '{$entrepot->nom}'. Il contient encore {$outilsCount} outil(s)."
            ], 400);
        }

        $entrepot->delete();

        return response()->json(['message' => 'Entrepôt supprimé avec succès']);
    }

    /**
     * Get validation rules for entrepot creation/update
     */
    public function validation(): JsonResponse
    {
        return response()->json([
            'validation_rules' => [
                'nom' => 'required|string|max:255|unique',
                'description' => 'nullable|string',
                'adresse' => 'nullable|string|max:500',
                'responsable' => 'nullable|string|max:255',
                'capacite_max' => 'nullable|integer|min:0',
                'statut' => 'nullable|in:actif,inactif,maintenance'
            ],
            'statut_options' => ['actif', 'inactif', 'maintenance']
        ]);
    }
}
