<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'barcode',
        'name',
        'price',
        'category',
        'rating',
        'stock',
        'is_promo',
        'promo',
        'image',
    ];

    protected function casts(): array
    {
        return [
            'price'    => 'integer',
            'rating'   => 'float',
            'stock'    => 'integer',
            'is_promo' => 'boolean',
            'promo'    => 'integer',
        ];
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'product_id');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'product_id');
    }
}
