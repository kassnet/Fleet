<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Outil extends Model
{
    protected $fillable = [
        'uuid',
        'nom',
        'description',
        'reference',
        'entrepot_id',
        'entrepot_nom',
        'quantite_stock',
        'quantite_disponible',
        'prix_unitaire_usd',
        'fournisseur',
        'date_achat',
        'etat',
        'localisation',
        'numero_serie'
    ];

    protected $casts = [
        'quantite_stock' => 'integer',
        'quantite_disponible' => 'integer',
        'prix_unitaire_usd' => 'decimal:2',
        'date_achat' => 'date'
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (!$model->uuid) {
                $model->uuid = (string) Str::uuid();
            }
        });

        // Auto-populate entrepot_nom when entrepot_id changes
        static::saving(function ($model) {
            if ($model->isDirty('entrepot_id') && $model->entrepot_id) {
                $entrepot = Entrepot::find($model->entrepot_id);
                $model->entrepot_nom = $entrepot ? $entrepot->nom : null;
            }
        });
    }

    public function entrepot(): BelongsTo
    {
        return $this->belongsTo(Entrepot::class);
    }

    public function affectations(): HasMany
    {
        return $this->hasMany(AffectationOutil::class);
    }

    public function mouvements(): HasMany
    {
        return $this->hasMany(MouvementOutil::class);
    }

    public function getRouteKeyName()
    {
        return 'uuid';
    }
}
