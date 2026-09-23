<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPoint extends Model
{
    const UPDATED_AT = null;

    protected $table = 'user_points_ledger';

    protected $fillable = [
        'user_id',
        'order_id',
        'amount',
        'type',
        'description',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount'     => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}