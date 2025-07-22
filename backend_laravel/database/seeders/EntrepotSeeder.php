<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Entrepot;

class EntrepotSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $entrepots = [
            [
                'nom' => 'Entrepôt Principal',
                'description' => 'Entrepôt principal de stockage des outils',
                'adresse' => '123 Rue de la Logistique, 75001 Paris',
                'responsable' => 'Marie Dupont',
                'capacite_max' => 1000,
                'statut' => 'actif'
            ],
            [
                'nom' => 'Entrepôt Nord',
                'description' => 'Entrepôt de la zone nord',
                'adresse' => '456 Avenue du Nord, 59000 Lille',
                'responsable' => 'Pierre Martin',
                'capacite_max' => 500,
                'statut' => 'actif'
            ],
            [
                'nom' => 'Entrepôt Sud',
                'description' => 'Entrepôt de la zone sud',
                'adresse' => '789 Boulevard du Midi, 13000 Marseille',
                'responsable' => 'Sophie Bernard',
                'capacite_max' => 750,
                'statut' => 'actif'
            ],
            [
                'nom' => 'Entrepôt Central',
                'description' => 'Entrepôt de distribution centrale',
                'adresse' => '321 Place Centrale, 69000 Lyon',
                'responsable' => 'Michel Leroy',
                'capacite_max' => 800,
                'statut' => 'actif'
            ],
            [
                'nom' => 'Entrepôt Ouest',
                'description' => 'Entrepôt de la zone ouest',
                'adresse' => '654 Rue de l\'Océan, 44000 Nantes',
                'responsable' => 'Anne Moreau',
                'capacite_max' => 400,
                'statut' => 'actif'
            ],
            [
                'nom' => 'Entrepôt Est',
                'description' => 'Entrepôt de la zone est',
                'adresse' => '987 Avenue de l\'Est, 67000 Strasbourg',
                'responsable' => 'Laurent Petit',
                'capacite_max' => 600,
                'statut' => 'actif'
            ],
            [
                'nom' => 'Entrepôt de Réparation',
                'description' => 'Entrepôt spécialisé pour les outils en réparation',
                'adresse' => '147 Rue de la Réparation, 31000 Toulouse',
                'responsable' => 'Claire Durand',
                'capacite_max' => 200,
                'statut' => 'maintenance'
            ],
            [
                'nom' => 'Entrepôt Temporaire',
                'description' => 'Entrepôt temporaire pour surplus',
                'adresse' => '258 Chemin Temporaire, 35000 Rennes',
                'responsable' => 'Jean Rousseau',
                'capacite_max' => 300,
                'statut' => 'inactif'
            ]
        ];

        foreach ($entrepots as $entrepot) {
            Entrepot::create($entrepot);
        }
    }
}
