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
        Schema::create('entrepots', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('nom');
            $table->text('description')->nullable();
            $table->string('adresse')->nullable();
            $table->string('responsable')->nullable();
            $table->integer('capacite_max')->nullable();
            $table->enum('statut', ['actif', 'inactif', 'maintenance'])->default('actif');
            $table->timestamps();
            
            $table->index('nom');
            $table->index('statut');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entrepots');
    }
};
