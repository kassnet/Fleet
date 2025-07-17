<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class TauxChange extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'devise_base',
        'devise_cible',
        'taux',
        'actif',
    ];

    protected function casts(): array
    {
        return [
            'taux' => 'decimal:4',
            'actif' => 'boolean',
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

    // Méthodes utilitaires
    public static function getActiveRate($deviseBase = 'USD', $deviseCible = 'FC')
    {
        $taux = self::where('devise_base', $deviseBase)
                   ->where('devise_cible', $deviseCible)
                   ->where('actif', true)
                   ->first();
        
        return $taux ? $taux->taux : 2800; // Valeur par défaut
    }

    public static function convertAmount($amount, $from, $to)
    {
        if ($from === $to) {
            return $amount;
        }
        
        $rate = self::getActiveRate($from, $to);
        return $amount * $rate;
    }

    public function isActive()
    {
        return $this->actif;
    }
}