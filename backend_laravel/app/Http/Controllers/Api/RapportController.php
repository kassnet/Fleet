<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MouvementOutil;
use App\Models\Outil;
use App\Models\Entrepot;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RapportController extends Controller
{
    /**
     * Rapport des mouvements d'outils avec filtres
     */
    public function mouvements(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date|after_or_equal:date_debut',
            'entrepot_id' => 'nullable|exists:entrepots,id',
            'type_mouvement' => 'nullable|in:approvisionnement,affectation,retour,correction'
        ]);

        $query = MouvementOutil::with(['outil.entrepot', 'user']);

        // Filtres de date
        if (!empty($validated['date_debut'])) {
            $query->whereDate('date_mouvement', '>=', $validated['date_debut']);
        }
        if (!empty($validated['date_fin'])) {
            $query->whereDate('date_mouvement', '<=', $validated['date_fin']);
        }

        // Filtre par entrepôt
        if (!empty($validated['entrepot_id'])) {
            $query->whereHas('outil', function($q) use ($validated) {
                $q->where('entrepot_id', $validated['entrepot_id']);
            });
        }

        // Filtre par type de mouvement
        if (!empty($validated['type_mouvement'])) {
            $query->where('type_mouvement', $validated['type_mouvement']);
        }

        $mouvements = $query->orderBy('date_mouvement', 'desc')->get();

        // Statistiques
        $stats = [
            'total_mouvements' => $mouvements->count(),
            'par_type' => $mouvements->groupBy('type_mouvement')->map(function($items) {
                return [
                    'count' => $items->count(),
                    'quantite_total' => $items->sum('quantite')
                ];
            }),
            'periode' => [
                'debut' => $validated['date_debut'] ?? $mouvements->min('date_mouvement'),
                'fin' => $validated['date_fin'] ?? $mouvements->max('date_mouvement')
            ]
        ];

        return response()->json([
            'mouvements' => $mouvements,
            'statistiques' => $stats
        ]);
    }

    /**
     * Rapport des stocks par entrepôt
     */
    public function stockParEntrepot(): JsonResponse
    {
        // Statistiques par entrepôt
        $entrepots = Entrepot::with(['outils'])->get()->map(function($entrepot) {
            $outils = $entrepot->outils;
            return [
                'entrepot' => $entrepot,
                'statistiques' => [
                    'total_outils' => $outils->count(),
                    'stock_total' => $outils->sum('quantite_stock'),
                    'disponible' => $outils->sum('quantite_disponible'),
                    'affecte' => $outils->sum('quantite_stock') - $outils->sum('quantite_disponible'),
                    'valeur_usd' => $outils->sum(function($outil) {
                        return $outil->quantite_stock * ($outil->prix_unitaire_usd ?? 0);
                    })
                ]
            ];
        });

        // Outils sans entrepôt
        $outilsSansEntrepot = Outil::whereNull('entrepot_id')->get();
        if ($outilsSansEntrepot->count() > 0) {
            $entrepots->push([
                'entrepot' => [
                    'id' => null,
                    'nom' => 'Sans entrepôt',
                    'statut' => 'N/A'
                ],
                'statistiques' => [
                    'total_outils' => $outilsSansEntrepot->count(),
                    'stock_total' => $outilsSansEntrepot->sum('quantite_stock'),
                    'disponible' => $outilsSansEntrepot->sum('quantite_disponible'),
                    'affecte' => $outilsSansEntrepot->sum('quantite_stock') - $outilsSansEntrepot->sum('quantite_disponible'),
                    'valeur_usd' => $outilsSansEntrepot->sum(function($outil) {
                        return $outil->quantite_stock * ($outil->prix_unitaire_usd ?? 0);
                    })
                ]
            ]);
        }

        // Statistiques globales
        $statsGlobales = [
            'total_entrepots' => Entrepot::count(),
            'total_outils' => Outil::count(),
            'stock_total_global' => Outil::sum('quantite_stock'),
            'disponible_global' => Outil::sum('quantite_disponible'),
            'affecte_global' => Outil::sum('quantite_stock') - Outil::sum('quantite_disponible'),
            'valeur_totale_usd' => Outil::sum(DB::raw('quantite_stock * COALESCE(prix_unitaire_usd, 0)'))
        ];

        return response()->json([
            'entrepots' => $entrepots,
            'statistiques_globales' => $statsGlobales
        ]);
    }

    /**
     * Rapport détaillé d'un entrepôt spécifique
     */
    public function detailEntrepot(Entrepot $entrepot): JsonResponse
    {
        $outils = $entrepot->outils()->with(['affectations' => function($query) {
            $query->where('statut', 'en_cours')->with('technicien');
        }])->get();

        $stats = [
            'entrepot' => $entrepot,
            'total_outils' => $outils->count(),
            'stock_total' => $outils->sum('quantite_stock'),
            'disponible' => $outils->sum('quantite_disponible'),
            'affecte' => $outils->sum('quantite_stock') - $outils->sum('quantite_disponible'),
            'valeur_usd' => $outils->sum(function($outil) {
                return $outil->quantite_stock * ($outil->prix_unitaire_usd ?? 0);
            }),
            'par_etat' => $outils->groupBy('etat')->map(function($items) {
                return [
                    'count' => $items->count(),
                    'stock' => $items->sum('quantite_stock')
                ];
            }),
            'mouvements_recents' => MouvementOutil::whereHas('outil', function($q) use ($entrepot) {
                $q->where('entrepot_id', $entrepot->id);
            })->with(['outil', 'user'])
            ->orderBy('date_mouvement', 'desc')
            ->limit(10)
            ->get()
        ];

        return response()->json([
            'detail' => $stats,
            'outils' => $outils
        ]);
    }

    /**
     * Tableau de bord avec métriques clés
     */
    public function dashboard(): JsonResponse
    {
        $today = Carbon::today();
        $thisWeek = Carbon::now()->startOfWeek();
        $thisMonth = Carbon::now()->startOfMonth();

        $dashboard = [
            'metriques_generales' => [
                'total_entrepots' => Entrepot::count(),
                'entrepots_actifs' => Entrepot::where('statut', 'actif')->count(),
                'total_outils' => Outil::count(),
                'stock_total' => Outil::sum('quantite_stock'),
                'disponible_total' => Outil::sum('quantite_disponible'),
                'affectations_en_cours' => DB::table('affectation_outils')->where('statut', 'en_cours')->count()
            ],
            'mouvements_periode' => [
                'aujourd_hui' => MouvementOutil::whereDate('date_mouvement', $today)->count(),
                'cette_semaine' => MouvementOutil::where('date_mouvement', '>=', $thisWeek)->count(),
                'ce_mois' => MouvementOutil::where('date_mouvement', '>=', $thisMonth)->count()
            ],
            'top_entrepots' => Entrepot::withCount('outils')
                ->orderBy('outils_count', 'desc')
                ->limit(5)
                ->get(),
            'outils_critiques' => Outil::where('quantite_disponible', '<=', 5)
                ->where('quantite_disponible', '>', 0)
                ->with('entrepot')
                ->orderBy('quantite_disponible')
                ->limit(10)
                ->get(),
            'derniers_mouvements' => MouvementOutil::with(['outil', 'user'])
                ->orderBy('date_mouvement', 'desc')
                ->limit(5)
                ->get()
        ];

        return response()->json($dashboard);
    }

    /**
     * Export des données pour Excel/CSV
     */
    public function export(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:mouvements,stocks,affectations',
            'format' => 'required|in:json,csv',
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date'
        ]);

        $data = [];
        
        switch ($validated['type']) {
            case 'mouvements':
                $query = MouvementOutil::with(['outil.entrepot', 'user']);
                if ($validated['date_debut']) {
                    $query->whereDate('date_mouvement', '>=', $validated['date_debut']);
                }
                if ($validated['date_fin']) {
                    $query->whereDate('date_mouvement', '<=', $validated['date_fin']);
                }
                $data = $query->orderBy('date_mouvement', 'desc')->get();
                break;
                
            case 'stocks':
                $data = Outil::with('entrepot')->orderBy('nom')->get();
                break;
                
            case 'affectations':
                $query = DB::table('affectation_outils')
                    ->join('outils', 'affectation_outils.outil_id', '=', 'outils.id')
                    ->join('users', 'affectation_outils.technicien_id', '=', 'users.id')
                    ->select([
                        'affectation_outils.*',
                        'outils.nom as outil_nom',
                        'users.prenom',
                        'users.nom'
                    ]);
                if ($validated['date_debut']) {
                    $query->whereDate('affectation_outils.date_affectation', '>=', $validated['date_debut']);
                }
                if ($validated['date_fin']) {
                    $query->whereDate('affectation_outils.date_affectation', '<=', $validated['date_fin']);
                }
                $data = $query->orderBy('date_affectation', 'desc')->get();
                break;
        }

        return response()->json([
            'type' => $validated['type'],
            'format' => $validated['format'],
            'data' => $data,
            'count' => is_countable($data) ? count($data) : $data->count(),
            'export_date' => now()->toISOString()
        ]);
    }
}