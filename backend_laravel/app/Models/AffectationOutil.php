<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AffectationOutil extends Model
{
    protected $fillable = [
        'uuid',
        'outil_id',
        'technicien_id',
        'quantite_affectee',
        'notes_affectation',
        'statut',
        'date_affectation',
        'date_retour_prevue',
        'date_retour_effective',
        'quantite_retournee',
        'etat_retour',
        'notes_retour'
    ];

    protected $casts = [
        'quantite_affectee' => 'integer',
        'quantite_retournee' => 'integer',
        'date_affectation' => 'datetime',
        'date_retour_prevue' => 'datetime',
        'date_retour_effective' => 'datetime'
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

    public function outil(): BelongsTo
    {
        return $this->belongsTo(Outil::class);
    }

    public function technicien(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technicien_id');
    }

    public function getRouteKeyName()
    {
        return 'uuid';
    }
}
