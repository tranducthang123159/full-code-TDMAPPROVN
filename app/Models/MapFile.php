<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MapFile extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'file_name',
        'file_path',
        'lite_file_path',
        'ultra_lite_file_path',
        'bbox',
        'feature_count',
        'file_size',
        'province_code',
        'province_name',
        'area_code',
        'area_name',
        'area_level',
    ];

    protected $casts = [
        'bbox' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}