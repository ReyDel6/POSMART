<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingZone extends Model
{
    const UPDATED_AT = null;

    protected $table = 'shipping_zones';

    protected $fillable = [
        'name',
        'fee',
        'is_active',
        'sort',
    ];

    protected function casts(): array
    {
        return [
            'fee'       => 'integer',
            'is_active' => 'boolean',
            'sort'      => 'integer',
        ];
    }
}