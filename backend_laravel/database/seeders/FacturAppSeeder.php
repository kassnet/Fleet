<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Client;
use App\Models\Produit;
use App\Models\TauxChange;

class FacturAppSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Créer les utilisateurs par défaut
        $users = [
            [
                'nom' => 'Admin',
                'prenom' => 'Principal',
                'email' => 'admin@facturapp.rdc',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'is_active' => true,
            ],
            [
                'nom' => 'Manager',
                'prenom' => 'Demo',
                'email' => 'manager@demo.com',
                'password' => Hash::make('manager123'),
                'role' => 'manager',
                'is_active' => true,
            ],
            [
                'nom' => 'Comptable',
                'prenom' => 'Demo',
                'email' => 'comptable@demo.com',
                'password' => Hash::make('comptable123'),
                'role' => 'comptable',
                'is_active' => true,
            ],
            [
                'nom' => 'Utilisateur',
                'prenom' => 'Demo',
                'email' => 'user@demo.com',
                'password' => Hash::make('user123'),
                'role' => 'utilisateur',
                'is_active' => true,
            ],
        ];

        foreach ($users as $userData) {
            User::create($userData);
        }

        // Créer des clients de démonstration
        $clients = [
            [
                'nom' => 'Entreprise Congo SARL',
                'email' => 'contact@congo-sarl.cd',
                'telephone' => '+243 81 234 5678',
                'adresse' => '123 Avenue de la Paix, Kinshasa',
                'ville' => 'Kinshasa',
                'pays' => 'RDC',
                'devise_preferee' => 'USD',
            ],
            [
                'nom' => 'Mining Corp International',
                'email' => 'info@mining-corp.com',
                'telephone' => '+243 97 654 3210',
                'adresse' => '456 Boulevard du 30 Juin, Lubumbashi',
                'ville' => 'Lubumbashi',
                'pays' => 'RDC',
                'devise_preferee' => 'USD',
            ],
        ];

        foreach ($clients as $clientData) {
            Client::create($clientData);
        }

        // Créer des produits de démonstration
        $produits = [
            [
                'nom' => 'Service de Consultation IT',
                'description' => 'Consultation technique en informatique',
                'prix_usd' => 100.00,
                'prix_fc' => 280000.00,
                'unite' => 'heure',
                'tva' => 16.00,
                'actif' => true,
                'gestion_stock' => false,
            ],
            [
                'nom' => 'Formation utilisateur',
                'description' => 'Formation des utilisateurs sur les systèmes',
                'prix_usd' => 50.00,
                'prix_fc' => 140000.00,
                'unite' => 'session',
                'tva' => 16.00,
                'actif' => true,
                'gestion_stock' => true,
                'stock_actuel' => 50,
                'stock_minimum' => 5,
                'stock_maximum' => 100,
            ],
            [
                'nom' => 'Développement logiciel',
                'description' => 'Développement d\'applications sur mesure',
                'prix_usd' => 150.00,
                'prix_fc' => 420000.00,
                'unite' => 'jour',
                'tva' => 16.00,
                'actif' => true,
                'gestion_stock' => false,
            ],
            [
                'nom' => 'Maintenance système',
                'description' => 'Maintenance et support technique',
                'prix_usd' => 80.00,
                'prix_fc' => 224000.00,
                'unite' => 'mois',
                'tva' => 16.00,
                'actif' => true,
                'gestion_stock' => false,
            ],
        ];

        foreach ($produits as $produitData) {
            Produit::create($produitData);
        }

        // Créer le taux de change par défaut
        TauxChange::create([
            'devise_base' => 'USD',
            'devise_cible' => 'FC',
            'taux' => 2800.00,
            'actif' => true,
        ]);

        $this->command->info('✅ Données de démonstration créées avec succès !');
    }
}
