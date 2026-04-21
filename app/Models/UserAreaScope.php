<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserAreaScope extends Model
{
    protected $fillable = [
        'user_id',
        'province_code',
        'province_name',
        'area_code',
        'area_name',
        'area_level',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}