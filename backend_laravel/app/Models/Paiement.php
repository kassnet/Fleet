<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Paiement extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'facture_id',
        'facture_numero',
        'montant_usd',
        'montant_fc',
        'devise_paiement',
        'methode_paiement',
        'statut',
        'transaction_id',
        'date_paiement',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'montant_usd' => 'decimal:2',
            'montant_fc' => 'decimal:2',
            'date_paiement' => 'datetime',
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
    public function facture()
    {
        return $this->belongsTo(Facture::class);
    }

    // Méthodes utilitaires
    public function isCompleted()
    {
        return $this->statut === 'completed';
    }

    public function getMontant($currency = 'USD')
    {
        return $currency === 'USD' ? $this->montant_usd : $this->montant_fc;
    }
}