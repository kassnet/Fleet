<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Produit extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'nom',
        'description',
        'prix_usd',
        'prix_fc',
        'unite',
        'tva',
        'actif',
        'gestion_stock',
        'stock_actuel',
        'stock_minimum',
        'stock_maximum',
    ];

    protected function casts(): array
    {
        return [
            'prix_usd' => 'decimal:2',
            'prix_fc' => 'decimal:2',
            'tva' => 'decimal:2',
            'actif' => 'boolean',
            'gestion_stock' => 'boolean',
            'stock_actuel' => 'integer',
            'stock_minimum' => 'integer',
            'stock_maximum' => 'integer',
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
        });
    }

    // Relations
    public function mouvements_stock()
    {
        return $this->hasMany(MouvementStock::class);
    }

    // Méthodes utilitaires
    public function calculerPrixFC($tauxChange = 2800)
    {
        if (!$this->prix_fc) {
            return $this->prix_usd * $tauxChange;
        }
        return $this->prix_fc;
    }

    public function isStockBas()
    {
        if (!$this->gestion_stock) {
            return false;
        }
        return $this->stock_actuel <= $this->stock_minimum;
    }
}