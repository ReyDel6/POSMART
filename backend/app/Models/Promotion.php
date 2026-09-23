<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'product_id',
        'tiers',
        'buy_qty',
        'free_qty',
        'items',
        'bundle_price',
        'active',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'tiers'       => 'array',
        'items'       => 'array',
        'active'      => 'boolean',
        'product_id'  => 'integer',
        'buy_qty'     => 'integer',
        'free_qty'    => 'integer',
        'bundle_price'=> 'integer',
        'starts_at'   => 'datetime',
        'ends_at'     => 'datetime',
    ];
}