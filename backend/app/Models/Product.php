<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    const UPDATED_AT = null;

    protected $primaryKey = 'product_id';

    protected $appends = ['id'];

    public function getIdAttribute()
    {
        return $this->attributes['product_id'] ?? null;
    }

    protected $fillable = [
        'barcode',
        'name',
        'price',
        'purchase_price',
        'category_id',
        'category',
        'rating',
        'stock',
        'is_promo',
        'promo',
        'image',
        'description',
        'weight',
        'gallery',
    ];

    protected function casts(): array
    {
        return [
            'product_id'     => 'integer',
            'category_id'    => 'integer',
            'price'          => 'integer',
            'purchase_price' => 'integer',
            'rating'         => 'float',
            'stock'          => 'integer',
            'is_promo'       => 'boolean',
            'promo'          => 'integer',
            'weight'         => 'integer',
            'gallery'        => 'array',
        ];
    }

    public function categoryRef()
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'product_id', 'product_id');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'product_id', 'product_id');
    }
}
