<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PaymentTransaction extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'session_id',
        'user_id',
        'user_email',
        'amount',
        'currency',
        'metadata',
        'payment_status',
        'status',
        'stripe_payment_intent_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'metadata' => 'json',
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
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Méthodes utilitaires
    public function isCompleted()
    {
        return $this->payment_status === 'completed';
    }

    public function isPending()
    {
        return $this->payment_status === 'pending';
    }

    public function isFailed()
    {
        return $this->payment_status === 'failed';
    }

    public function isCancelled()
    {
        return $this->payment_status === 'cancelled';
    }

    public function isExpired()
    {
        return $this->status === 'expired';
    }
}