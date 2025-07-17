<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Devis extends Model
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
        'validite_jours',
        'date_expiration',
        'date_acceptation',
        'notes',
        'conditions',
        'facture_id',
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
            'validite_jours' => 'integer',
            'date_expiration' => 'datetime',
            'date_acceptation' => 'datetime',
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
            
            // Générer automatiquement le numéro de devis
            if (!$model->numero) {
                $model->numero = 'DEVIS-' . date('Ymd') . '-' . strtoupper(substr(md5(uniqid()), 0, 6));
            }
            
            // Calculer la date d'expiration
            if (!$model->date_expiration && $model->validite_jours) {
                $model->date_expiration = now()->addDays($model->validite_jours);
            }
        });
    }

    // Relations
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function facture()
    {
        return $this->belongsTo(Facture::class);
    }

    // Méthodes utilitaires
    public function isExpired()
    {
        return $this->date_expiration && $this->date_expiration < now();
    }

    public function isAccepted()
    {
        return $this->statut === 'accepte';
    }

    public function canBeConvertedToInvoice()
    {
        return $this->statut === 'accepte' && !$this->facture_id;
    }

    public function getTotalAmount($currency = 'USD')
    {
        return $currency === 'USD' ? $this->total_ttc_usd : $this->total_ttc_fc;
    }
}