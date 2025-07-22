<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class MouvementOutil extends Model
{
    protected $fillable = [
        'uuid',
        'outil_id',
        'user_id',
        'type_mouvement',
        'quantite',
        'stock_avant',
        'stock_apres',
        'motif',
        'date_mouvement'
    ];

    protected $casts = [
        'quantite' => 'integer',
        'stock_avant' => 'integer',
        'stock_apres' => 'integer',
        'date_mouvement' => 'datetime'
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getRouteKeyName()
    {
        return 'uuid';
    }
}
