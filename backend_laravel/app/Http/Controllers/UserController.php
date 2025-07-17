<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

class UserController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
        $this->middleware(function ($request, $next) {
            if (!auth()->user()->canManageUsers()) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Accès réservé aux administrateurs et au support'
                ], 403);
            }
            return $next($request);
        });
    }

    /**
     * Liste des utilisateurs
     */
    public function index(Request $request)
    {
        $query = User::query();
        
        // Filtres
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }
        
        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('prenom', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        $users = $query->orderBy('nom')->paginate(15);
        
        return response()->json([
            'users' => $users->items(),
            'total' => $users->total(),
            'per_page' => $users->perPage(),
            'current_page' => $users->currentPage(),
        ]);
    }

    /**
     * Créer un utilisateur
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6|confirmed',
            'role' => 'required|in:admin,manager,comptable,utilisateur,support',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'nom' => $request->nom,
            'prenom' => $request->prenom,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Utilisateur créé avec succès',
            'user' => $this->userTransform($user)
        ], 201);
    }

    /**
     * Afficher un utilisateur
     */
    public function show($id)
    {
        $user = User::find($id);
        
        if (!$user) {
            return response()->json([
                'error' => 'User not found',
                'message' => 'Utilisateur introuvable'
            ], 404);
        }

        return response()->json(['user' => $this->userTransform($user)]);
    }

    /**
     * Mettre à jour un utilisateur
     */
    public function update(Request $request, $id)
    {
        $user = User::find($id);
        
        if (!$user) {
            return response()->json([
                'error' => 'User not found',
                'message' => 'Utilisateur introuvable'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nom' => 'sometimes|required|string|max:255',
            'prenom' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,'.$id,
            'role' => 'sometimes|required|in:admin,manager,comptable,utilisateur,support',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $user->update($request->all());

        return response()->json([
            'message' => 'Utilisateur mis à jour avec succès',
            'user' => $this->userTransform($user)
        ]);
    }

    /**
     * Activer/Désactiver un utilisateur
     */
    public function toggleActive($id)
    {
        $user = User::find($id);
        
        if (!$user) {
            return response()->json([
                'error' => 'User not found',
                'message' => 'Utilisateur introuvable'
            ], 404);
        }

        // Empêcher la désactivation de son propre compte
        if ($user->id === auth()->id()) {
            return response()->json([
                'error' => 'Cannot deactivate own account',
                'message' => 'Impossible de désactiver votre propre compte'
            ], 400);
        }

        $user->update(['is_active' => !$user->is_active]);

        return response()->json([
            'message' => $user->is_active ? 'Utilisateur activé' : 'Utilisateur désactivé',
            'user' => $this->userTransform($user)
        ]);
    }

    /**
     * Supprimer un utilisateur
     */
    public function destroy($id)
    {
        $user = User::find($id);
        
        if (!$user) {
            return response()->json([
                'error' => 'User not found',
                'message' => 'Utilisateur introuvable'
            ], 404);
        }

        // Empêcher la suppression de son propre compte
        if ($user->id === auth()->id()) {
            return response()->json([
                'error' => 'Cannot delete own account',
                'message' => 'Impossible de supprimer votre propre compte'
            ], 400);
        }

        $user->delete();

        return response()->json([
            'message' => 'Utilisateur supprimé avec succès'
        ]);
    }

    /**
     * Transformer les données utilisateur
     */
    private function userTransform($user)
    {
        return [
            'id' => $user->id,
            'nom' => $user->nom,
            'prenom' => $user->prenom,
            'email' => $user->email,
            'role' => $user->role,
            'is_active' => $user->is_active,
            'derniere_connexion' => $user->derniere_connexion,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }
}