<?php

require_once 'vendor/autoload.php';

use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Client;
use App\Models\Produit;
use App\Models\Facture;
use App\Models\Paiement;
use App\Models\Devis;
use App\Models\MouvementStock;
use App\Models\PaymentTransaction;
use App\Models\TauxChange;

// Configuration de la base de données
$capsule = new Capsule;
$capsule->addConnection([
    'driver' => 'mysql',
    'host' => '127.0.0.1',
    'database' => 'facturapp_db',
    'username' => 'laravel',
    'password' => 'laravel123',
    'charset' => 'utf8',
    'collation' => 'utf8_unicode_ci',
    'prefix' => '',
]);

$capsule->setAsGlobal();
$capsule->bootEloquent();

/**
 * Importer les données depuis les fichiers JSON
 */
function importData($model, $filename) {
    $filepath = "/app/migration_data/{$filename}.json";
    
    if (!file_exists($filepath)) {
        echo "❌ Fichier {$filename}.json introuvable\n";
        return 0;
    }
    
    $data = json_decode(file_get_contents($filepath), true);
    
    if (empty($data)) {
        echo "ℹ️ Aucune donnée à importer pour {$filename}\n";
        return 0;
    }
    
    $imported = 0;
    
    foreach ($data as $item) {
        try {
            // Traitement spécial pour les utilisateurs (hash du mot de passe)
            if ($model === User::class && isset($item['hashed_password'])) {
                $item['password'] = $item['hashed_password'];
                unset($item['hashed_password']);
            }
            
            // Traitement spécial pour les dates
            foreach ($item as $key => $value) {
                if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $value)) {
                    $item[$key] = date('Y-m-d H:i:s', strtotime($value));
                }
            }
            
            // Créer l'enregistrement
            $model::create($item);
            $imported++;
            
        } catch (Exception $e) {
            echo "❌ Erreur lors de l'import de {$filename}: " . $e->getMessage() . "\n";
        }
    }
    
    echo "✅ {$imported} enregistrements importés pour {$filename}\n";
    return $imported;
}

echo "🚀 DÉBUT DE L'IMPORT DES DONNÉES VERS MYSQL\n";
echo "=" . str_repeat("=", 49) . "\n";

$totalImported = 0;

// Ordre d'import important (à cause des clés étrangères)
$imports = [
    [User::class, 'users'],
    [Client::class, 'clients'],
    [Produit::class, 'produits'],
    [Facture::class, 'factures'],
    [Paiement::class, 'paiements'],
    [Devis::class, 'devis'],
    [MouvementStock::class, 'mouvements_stock'],
    [TauxChange::class, 'taux_change'],
];

foreach ($imports as [$model, $filename]) {
    $count = importData($model, $filename);
    $totalImported += $count;
}

// Créer le taux de change par défaut s'il n'existe pas
try {
    $tauxExists = TauxChange::where('devise_base', 'USD')
                           ->where('devise_cible', 'FC')
                           ->exists();
    
    if (!$tauxExists) {
        TauxChange::create([
            'devise_base' => 'USD',
            'devise_cible' => 'FC',
            'taux' => 2800,
            'actif' => true,
        ]);
        echo "✅ Taux de change par défaut créé (USD -> FC: 2800)\n";
    }
} catch (Exception $e) {
    echo "❌ Erreur lors de la création du taux de change: " . $e->getMessage() . "\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "🎉 IMPORT TERMINÉ - {$totalImported} enregistrements importés\n";
echo str_repeat("=", 50) . "\n";