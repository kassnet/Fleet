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
        Schema::create('affectation_outils', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('outil_id')->constrained('outils')->onDelete('cascade');
            $table->foreignId('technicien_id')->constrained('users')->onDelete('cascade');
            $table->integer('quantite_affectee');
            $table->text('notes_affectation')->nullable();
            $table->enum('statut', ['en_cours', 'terminee', 'annulee'])->default('en_cours');
            $table->timestamp('date_affectation');
            $table->timestamp('date_retour_prevue')->nullable();
            $table->timestamp('date_retour_effective')->nullable();
            $table->integer('quantite_retournee')->default(0);
            $table->enum('etat_retour', ['bon', 'endommage', 'perdu'])->nullable();
            $table->text('notes_retour')->nullable();
            $table->timestamps();
            
            $table->index('outil_id');
            $table->index('technicien_id');
            $table->index('statut');
            $table->index('date_affectation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('affectation_outils');
    }
};
