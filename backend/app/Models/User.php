<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    const UPDATED_AT = null;

    protected $primaryKey = 'user_id';

    protected $appends = ['id'];

    public function getIdAttribute()
    {
        return $this->attributes['user_id'] ?? null;
    }

    protected $fillable = [
        'google_id',
        'name',
        'email',
        'password',
        'phone',
        'address',
        'role',
        'is_active',
        'points',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'points'   => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'user_id', 'user_id');
    }

    public function points()
    {
        return $this->hasMany(UserPoint::class, 'user_id', 'user_id');
    }
}
