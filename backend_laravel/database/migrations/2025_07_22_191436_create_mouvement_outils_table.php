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
        Schema::create('mouvement_outils', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('outil_id')->constrained('outils')->onDelete('cascade');
            $table->char('user_id', 36); // UUID au lieu de foreignId
            $table->enum('type_mouvement', ['approvisionnement', 'affectation', 'retour', 'correction']);
            $table->integer('quantite');
            $table->integer('stock_avant');
            $table->integer('stock_apres');
            $table->text('motif');
            $table->timestamp('date_mouvement');
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('outil_id');
            $table->index('user_id');
            $table->index('type_mouvement');
            $table->index('date_mouvement');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mouvement_outils');
    }
};
