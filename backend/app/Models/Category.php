<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $primaryKey = 'category_id';

    protected $fillable = ['name', 'icon', 'is_active'];

    protected $appends = ['id'];

    public function getIdAttribute()
    {
        return $this->attributes['category_id'] ?? null;
    }

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'category_id', 'category_id');
    }
}
