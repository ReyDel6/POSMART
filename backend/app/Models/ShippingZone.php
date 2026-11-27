<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingZone extends Model
{
    const UPDATED_AT = null;

    protected $table = 'shipping_zones';

    protected $fillable = [
        'name',
        'coverage',
        'fee',
        'free_shipping_minimum',
        'is_active',
        'sort',
    ];

    protected function casts(): array
    {
        return [
            'fee'       => 'integer',
            'free_shipping_minimum' => 'integer',
            'is_active' => 'boolean',
            'sort'      => 'integer',
        ];
    }
}