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
        Schema::create('mouvements_stock', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('produit_id');
            $table->enum('type_mouvement', ['entree', 'sortie', 'correction']);
            $table->integer('quantite');
            $table->integer('stock_avant');
            $table->integer('stock_apres');
            $table->text('motif')->nullable();
            $table->timestamp('date_mouvement');
            $table->timestamps();
            
            $table->foreign('produit_id')->references('id')->on('produits')->onDelete('cascade');
            $table->index('produit_id');
            $table->index('type_mouvement');
            $table->index('date_mouvement');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mouvements_stock');
    }
};