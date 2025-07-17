<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Support\Str;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'id',
        'nom',
        'prenom',
        'email',
        'password',
        'role',
        'is_active',
        'derniere_connexion',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'derniere_connexion' => 'datetime',
            'is_active' => 'boolean',
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

    // JWT Methods
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'role' => $this->role,
            'email' => $this->email,
        ];
    }

    // Role checks
    public function isAdmin()
    {
        return $this->role === 'admin';
    }

    public function isManager()
    {
        return $this->role === 'manager';
    }

    public function canManageClients()
    {
        return in_array($this->role, ['admin', 'manager']);
    }

    public function canManageProducts()
    {
        return in_array($this->role, ['admin', 'manager']);
    }

    public function canManageInvoices()
    {
        return in_array($this->role, ['admin', 'manager', 'comptable']);
    }

    public function canManagePayments()
    {
        return in_array($this->role, ['admin', 'manager', 'comptable']);
    }

    public function isSupport()
    {
        return $this->role === 'support';
    }

    public function canAccessSettings()
    {
        return $this->role === 'support';
    }

    public function canManageUsers()
    {
        return in_array($this->role, ['admin', 'support']);
    }

    public function canManageSales()
    {
        return in_array($this->role, ['admin', 'manager']);
    }
}