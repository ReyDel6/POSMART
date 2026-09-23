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
        'shipping_zone_id',
        'shipping_fee',
        'total_price',
        'status',
        'midtrans_order_id',
        'snap_token',
        'snap_redirect_url',
        'payment_status',
        'payment_mode',
        'payment_method',
        'payment_type',
        'paid_at',
        'stock_released_at',
    ];

    protected function casts(): array
    {
        return [
            'total_price'       => 'float',
            'shipping_fee'      => 'float',
            'paid_at'           => 'datetime',
            'stock_released_at' => 'datetime',
        ];
    }

    /**
     * Kembalikan stok yang sempat dikunci, aman dipanggil berulang kali.
     * Stok hanya dilepas satu kali (ditandai kolom stock_released_at).
     */
    public function releaseItemsStock(): bool
    {
        if ($this->stock_released_at !== null) {
            return false;
        }

        if ($this->payment_status === 'paid') {
            return false;
        }

        $this->loadMissing('items');

        foreach ($this->items as $item) {
            if ($item->product_id > 0 && $item->qty > 0) {
                Product::where('id', $item->product_id)->increment('stock', $item->qty);
            }
        }

        $this->update(['stock_released_at' => now()]);

        return true;
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
