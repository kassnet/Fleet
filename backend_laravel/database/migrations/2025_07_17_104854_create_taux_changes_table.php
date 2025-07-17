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
        Schema::create('taux_changes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('devise_base')->default('USD');
            $table->string('devise_cible')->default('FC');
            $table->decimal('taux', 10, 4);
            $table->boolean('actif')->default(true);
            $table->timestamps();
            
            $table->unique(['devise_base', 'devise_cible']);
            $table->index('actif');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('taux_changes');
    }
};