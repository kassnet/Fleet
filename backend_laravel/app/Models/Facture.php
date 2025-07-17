<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Facture extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'numero',
        'client_id',
        'client_nom',
        'client_email',
        'client_adresse',
        'devise',
        'lignes',
        'total_ht_usd',
        'total_ht_fc',
        'total_tva_usd',
        'total_tva_fc',
        'total_ttc_usd',
        'total_ttc_fc',
        'statut',
        'date_echeance',
        'date_paiement',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'lignes' => 'json',
            'total_ht_usd' => 'decimal:2',
            'total_ht_fc' => 'decimal:2',
            'total_tva_usd' => 'decimal:2',
            'total_tva_fc' => 'decimal:2',
            'total_ttc_usd' => 'decimal:2',
            'total_ttc_fc' => 'decimal:2',
            'date_echeance' => 'datetime',
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
            
            // Générer automatiquement le numéro de facture
            if (!$model->numero) {
                $model->numero = 'FACT-' . date('Ymd') . '-' . strtoupper(substr(md5(uniqid()), 0, 6));
            }
        });
    }

    // Relations
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function paiements()
    {
        return $this->hasMany(Paiement::class);
    }

    public function devis()
    {
        return $this->hasOne(Devis::class, 'facture_id');
    }

    // Méthodes utilitaires
    public function isPaid()
    {
        return $this->statut === 'payee';
    }

    public function isOverdue()
    {
        return $this->date_echeance && $this->date_echeance < now() && $this->statut !== 'payee';
    }

    public function getTotalAmount($currency = 'USD')
    {
        return $currency === 'USD' ? $this->total_ttc_usd : $this->total_ttc_fc;
    }
}