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
        Schema::create('paiements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('facture_id');
            $table->string('facture_numero');
            $table->decimal('montant_usd', 10, 2);
            $table->decimal('montant_fc', 12, 2);
            $table->enum('devise_paiement', ['USD', 'FC']);
            $table->enum('methode_paiement', ['stripe', 'cash', 'bank_transfer', 'manuel'])->default('stripe');
            $table->enum('statut', ['pending', 'completed', 'failed', 'cancelled'])->default('pending');
            $table->string('transaction_id')->nullable();
            $table->timestamp('date_paiement')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->foreign('facture_id')->references('id')->on('factures')->onDelete('cascade');
            $table->index('facture_numero');
            $table->index('statut');
            $table->index('date_paiement');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('paiements');
    }
};