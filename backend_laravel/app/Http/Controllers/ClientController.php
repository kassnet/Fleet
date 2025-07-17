<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Client;

class ClientController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Liste des clients
     */
    public function index(Request $request)
    {
        $query = Client::query();
        
        // Filtres de recherche
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        $clients = $query->orderBy('nom')->paginate(15);
        
        return response()->json([
            'clients' => $clients->items(),
            'total' => $clients->total(),
            'per_page' => $clients->perPage(),
            'current_page' => $clients->currentPage(),
        ]);
    }

    /**
     * Créer un client
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:255',
            'email' => 'required|email|unique:clients,email',
            'telephone' => 'nullable|string|max:50',
            'adresse' => 'nullable|string',
            'ville' => 'nullable|string|max:100',
            'code_postal' => 'nullable|string|max:20',
            'pays' => 'nullable|string|max:100',
            'devise_preferee' => 'nullable|in:USD,FC',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $client = Client::create($request->all());

        return response()->json([
            'message' => 'Client créé avec succès',
            'client' => $client
        ], 201);
    }

    /**
     * Afficher un client
     */
    public function show($id)
    {
        $client = Client::find($id);
        
        if (!$client) {
            return response()->json([
                'error' => 'Client not found',
                'message' => 'Client introuvable'
            ], 404);
        }

        return response()->json(['client' => $client]);
    }

    /**
     * Mettre à jour un client
     */
    public function update(Request $request, $id)
    {
        $client = Client::find($id);
        
        if (!$client) {
            return response()->json([
                'error' => 'Client not found',
                'message' => 'Client introuvable'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nom' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:clients,email,'.$id,
            'telephone' => 'nullable|string|max:50',
            'adresse' => 'nullable|string',
            'ville' => 'nullable|string|max:100',
            'code_postal' => 'nullable|string|max:20',
            'pays' => 'nullable|string|max:100',
            'devise_preferee' => 'nullable|in:USD,FC',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation error',
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $client->update($request->all());

        return response()->json([
            'message' => 'Client mis à jour avec succès',
            'client' => $client
        ]);
    }

    /**
     * Supprimer un client
     */
    public function destroy($id)
    {
        $client = Client::find($id);
        
        if (!$client) {
            return response()->json([
                'error' => 'Client not found',
                'message' => 'Client introuvable'
            ], 404);
        }

        $client->delete();

        return response()->json([
            'message' => 'Client supprimé avec succès'
        ]);
    }
}