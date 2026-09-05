<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'customer_name',
        'phone',
        'address',
        'courier',
        'total_price',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'total_price' => 'float',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }
}
