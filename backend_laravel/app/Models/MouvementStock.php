<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MouvementStock extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;
    protected $table = 'mouvements_stock';

    protected $fillable = [
        'id',
        'produit_id',
        'type_mouvement',
        'quantite',
        'stock_avant',
        'stock_apres',
        'motif',
        'date_mouvement',
    ];

    protected function casts(): array
    {
        return [
            'quantite' => 'integer',
            'stock_avant' => 'integer',
            'stock_apres' => 'integer',
            'date_mouvement' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (! $model->id) {
                $model->id = (string) Str::uuid();
            }
            
            if (!$model->date_mouvement) {
                $model->date_mouvement = now();
            }
        });
    }

    // Relations
    public function produit()
    {
        return $this->belongsTo(Produit::class);
    }

    // Méthodes utilitaires
    public function isEntry()
    {
        return $this->type_mouvement === 'entree';
    }

    public function isExit()
    {
        return $this->type_mouvement === 'sortie';
    }

    public function isCorrection()
    {
        return $this->type_mouvement === 'correction';
    }
}