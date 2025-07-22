<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Créer un utilisateur admin
        User::create([
            'id' => (string) Str::uuid(),
            'prenom' => 'Admin',
            'nom' => 'FacturApp',
            'email' => 'admin@facturapp.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
            'email_verified_at' => now()
        ]);

        // Créer un manager
        User::create([
            'id' => (string) Str::uuid(),
            'prenom' => 'Manager',
            'nom' => 'Test',
            'email' => 'manager@facturapp.com',
            'password' => Hash::make('password123'),
            'role' => 'manager',
            'is_active' => true,
            'email_verified_at' => now()
        ]);

        // Créer un technicien
        User::create([
            'id' => (string) Str::uuid(),
            'prenom' => 'Jean',
            'nom' => 'Technicien',
            'email' => 'technicien@facturapp.com',
            'password' => Hash::make('password123'),
            'role' => 'technicien',
            'is_active' => true,
            'email_verified_at' => now()
        ]);
    }
}
