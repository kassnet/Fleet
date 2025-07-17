<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email')->unique();
            $table->string('nom');
            $table->string('prenom');
            $table->enum('role', ['admin', 'manager', 'comptable', 'utilisateur'])->default('utilisateur');
            $table->boolean('is_active')->default(true);
            $table->string('password');
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('derniere_connexion')->nullable();
            $table->timestamps();
            $table->rememberToken();
            
            $table->index('email');
            $table->index('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};