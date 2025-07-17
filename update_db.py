#!/usr/bin/env python3
import subprocess
import sys
import os

# Modifier la table users pour ajouter le rôle support
commands = [
    "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'manager', 'comptable', 'utilisateur', 'support') NOT NULL DEFAULT 'utilisateur';",
    "INSERT INTO users (id, nom, prenom, email, password, role, is_active, created_at, updated_at) VALUES (UUID(), 'Support', 'Technique', 'support@facturapp.rdc', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'support', 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE role = 'support';"
]

for cmd in commands:
    try:
        result = subprocess.run([
            'mariadb', '-u', 'laravel', '-plaravel123', 'facturapp_db', '-e', cmd
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Commande exécutée: {cmd[:50]}...")
        else:
            print(f"❌ Erreur: {result.stderr}")
    except Exception as e:
        print(f"❌ Exception: {e}")

print("✅ Mise à jour terminée")