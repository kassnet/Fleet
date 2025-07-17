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
        Schema::create('produits', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nom');
            $table->text('description')->nullable();
            $table->decimal('prix_usd', 10, 2);
            $table->decimal('prix_fc', 12, 2)->nullable();
            $table->string('unite')->default('unité');
            $table->decimal('tva', 5, 2)->default(20.0);
            $table->boolean('actif')->default(true);
            $table->boolean('gestion_stock')->default(false);
            $table->integer('stock_actuel')->nullable();
            $table->integer('stock_minimum')->nullable();
            $table->integer('stock_maximum')->nullable();
            $table->timestamps();
            
            $table->index('nom');
            $table->index('actif');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produits');
    }
};