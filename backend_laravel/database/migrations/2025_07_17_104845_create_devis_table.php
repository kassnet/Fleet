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
        Schema::create('devis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('numero')->unique();
            $table->uuid('client_id');
            $table->string('client_nom');
            $table->string('client_email');
            $table->text('client_adresse')->nullable();
            $table->enum('devise', ['USD', 'FC'])->default('USD');
            $table->json('lignes'); // Stockage JSON des lignes de devis
            $table->decimal('total_ht_usd', 10, 2);
            $table->decimal('total_ht_fc', 12, 2);
            $table->decimal('total_tva_usd', 10, 2);
            $table->decimal('total_tva_fc', 12, 2);
            $table->decimal('total_ttc_usd', 10, 2);
            $table->decimal('total_ttc_fc', 12, 2);
            $table->enum('statut', ['brouillon', 'envoye', 'accepte', 'refuse', 'expire'])->default('brouillon');
            $table->integer('validite_jours')->default(30);
            $table->timestamp('date_expiration')->nullable();
            $table->timestamp('date_acceptation')->nullable();
            $table->text('notes')->nullable();
            $table->text('conditions')->nullable();
            $table->uuid('facture_id')->nullable(); // Si converti en facture
            $table->timestamps();
            
            $table->foreign('client_id')->references('id')->on('clients')->onDelete('cascade');
            $table->foreign('facture_id')->references('id')->on('factures')->onDelete('set null');
            $table->index('numero');
            $table->index('statut');
            $table->index('date_expiration');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('devis');
    }
};