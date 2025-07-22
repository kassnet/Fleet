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
        Schema::create('outils', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('nom');
            $table->text('description')->nullable();
            $table->string('reference')->nullable();
            $table->foreignId('entrepot_id')->nullable()->constrained('entrepots')->onDelete('set null');
            $table->string('entrepot_nom')->nullable(); // Dénormalisé pour performance
            $table->integer('quantite_stock')->default(0);
            $table->integer('quantite_disponible')->default(0);
            $table->decimal('prix_unitaire_usd', 10, 2)->nullable();
            $table->string('fournisseur')->nullable();
            $table->date('date_achat')->nullable();
            $table->enum('etat', ['neuf', 'bon', 'moyen', 'mauvais', 'hors_service'])->default('neuf');
            $table->string('localisation')->nullable();
            $table->string('numero_serie')->nullable();
            $table->timestamps();
            
            $table->index('nom');
            $table->index('reference');
            $table->index('entrepot_id');
            $table->index('etat');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('outils');
    }
};
