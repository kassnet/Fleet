<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Entrepot extends Model
{
    protected $fillable = [
        'uuid',
        'nom',
        'description',
        'adresse',
        'responsable',
        'capacite_max',
        'statut'
    ];

    protected $casts = [
        'capacite_max' => 'integer'
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (!$model->uuid) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function outils(): HasMany
    {
        return $this->hasMany(Outil::class);
    }

    public function getRouteKeyName()
    {
        return 'uuid';
    }
}
