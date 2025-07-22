<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffectationOutil;
use App\Models\Outil;
use App\Models\User;
use App\Models\MouvementOutil;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AffectationOutilController extends Controller
{
    /**
     * Display a listing of the affectations.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AffectationOutil::with(['outil', 'technicien']);
        
        // Filtrage par technicien (pour les techniciens, seulement leurs affectations)
        if (Auth::user()->isTechnicien()) {
            $query->where('technicien_id', Auth::id());
        } elseif ($request->has('technicien_id')) {
            $query->where('technicien_id', $request->technicien_id);
        }
        
        // Filtrage par statut
        if ($request->has('statut')) {
            $query->where('statut', $request->statut);
        }
        
        // Filtrage par outil
        if ($request->has('outil_id')) {
            $query->where('outil_id', $request->outil_id);
        }
        
        $affectations = $query->orderBy('date_affectation', 'desc')->get();
        
        return response()->json($affectations);
    }

    /**
     * Store a newly created affectation in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'outil_id' => 'required|exists:outils,id',
            'technicien_id' => 'required|exists:users,id',
            'quantite_affectee' => 'required|integer|min:1',
            'notes_affectation' => 'nullable|string',
            'date_retour_prevue' => 'nullable|date|after:today'
        ]);

        // Vérifier que le technicien a bien le rôle technicien
        $technicien = User::find($validated['technicien_id']);
        if (!$technicien->isTechnicien()) {
            return response()->json([
                'message' => 'L\'utilisateur sélectionné n\'est pas un technicien'
            ], 400);
        }

        // Vérifier la disponibilité de l'outil
        $outil = Outil::find($validated['outil_id']);
        if ($outil->quantite_disponible < $validated['quantite_affectee']) {
            return response()->json([
                'message' => "Quantité insuffisante. Disponible: {$outil->quantite_disponible}, Demandé: {$validated['quantite_affectee']}"
            ], 400);
        }

        DB::transaction(function() use ($validated, $outil, &$affectation) {
            // Créer l'affectation
            $affectation = AffectationOutil::create([
                ...$validated,
                'date_affectation' => now(),
                'statut' => 'en_cours'
            ]);

            // Mettre à jour la disponibilité de l'outil
            $outil->update([
                'quantite_disponible' => $outil->quantite_disponible - $validated['quantite_affectee']
            ]);

            // Enregistrer le mouvement
            MouvementOutil::create([
                'outil_id' => $outil->id,
                'user_id' => Auth::id(),
                'type_mouvement' => 'affectation',
                'quantite' => $validated['quantite_affectee'],
                'stock_avant' => $outil->quantite_disponible + $validated['quantite_affectee'],
                'stock_apres' => $outil->quantite_disponible,
                'motif' => "Affectation à {$technicien->prenom} {$technicien->nom}" . 
                          ($validated['notes_affectation'] ? " - {$validated['notes_affectation']}" : ''),
                'date_mouvement' => now()
            ]);
        });

        return response()->json($affectation->load(['outil', 'technicien']), 201);
    }

    /**
     * Display the specified affectation.
     */
    public function show(AffectationOutil $affectation): JsonResponse
    {
        return response()->json($affectation->load(['outil', 'technicien']));
    }

    /**
     * Retourner un outil affecté
     */
    public function retourner(Request $request, AffectationOutil $affectation): JsonResponse
    {
        if ($affectation->statut !== 'en_cours') {
            return response()->json([
                'message' => 'Cette affectation n\'est pas en cours'
            ], 400);
        }

        $validated = $request->validate([
            'quantite_retournee' => 'required|integer|min:1|max:' . $affectation->quantite_affectee,
            'etat_retour' => 'required|in:bon,endommage,perdu',
            'notes_retour' => 'nullable|string'
        ]);

        DB::transaction(function() use ($validated, $affectation) {
            $outil = $affectation->outil;
            
            // Mettre à jour l'affectation
            $affectation->update([
                'quantite_retournee' => $validated['quantite_retournee'],
                'etat_retour' => $validated['etat_retour'],
                'notes_retour' => $validated['notes_retour'],
                'date_retour_effective' => now(),
                'statut' => $validated['quantite_retournee'] == $affectation->quantite_affectee ? 'terminee' : 'en_cours'
            ]);

            // Remettre en stock seulement si l'état est bon
            if ($validated['etat_retour'] === 'bon') {
                $outil->update([
                    'quantite_disponible' => $outil->quantite_disponible + $validated['quantite_retournee']
                ]);
            }

            // Enregistrer le mouvement
            MouvementOutil::create([
                'outil_id' => $outil->id,
                'user_id' => Auth::id(),
                'type_mouvement' => 'retour',
                'quantite' => $validated['quantite_retournee'],
                'stock_avant' => $outil->quantite_disponible - ($validated['etat_retour'] === 'bon' ? $validated['quantite_retournee'] : 0),
                'stock_apres' => $outil->quantite_disponible,
                'motif' => "Retour par {$affectation->technicien->prenom} {$affectation->technicien->nom} - État: {$validated['etat_retour']}" .
                          ($validated['notes_retour'] ? " - {$validated['notes_retour']}" : ''),
                'date_mouvement' => now()
            ]);
        });

        return response()->json([
            'message' => 'Retour effectué avec succès',
            'affectation' => $affectation->fresh()->load(['outil', 'technicien'])
        ]);
    }

    /**
     * Get affectations statistics
     */
    public function stats(): JsonResponse
    {
        $stats = [
            'total_affectations' => AffectationOutil::count(),
            'en_cours' => AffectationOutil::where('statut', 'en_cours')->count(),
            'terminees' => AffectationOutil::where('statut', 'terminee')->count(),
            'par_technicien' => AffectationOutil::with('technicien')
                ->select('technicien_id', DB::raw('count(*) as count'))
                ->groupBy('technicien_id')
                ->get()
                ->map(function($item) {
                    return [
                        'technicien' => $item->technicien->prenom . ' ' . $item->technicien->nom,
                        'count' => $item->count
                    ];
                })
        ];

        return response()->json($stats);
    }

    /**
     * Get techniciens list for affectation
     */
    public function techniciens(): JsonResponse
    {
        $techniciens = User::where('role', 'technicien')
            ->where('is_active', true)
            ->select('id', 'prenom', 'nom', 'email')
            ->orderBy('prenom')
            ->get();

        return response()->json($techniciens);
    }
}