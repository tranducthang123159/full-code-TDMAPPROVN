<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParcelIndex extends Model
{
    use HasFactory;

    protected $fillable = [
        'map_file_id',
        'feature_uid',
        'shbando',
        'sotocu',
        'shthua',
        'tenchu',
        'bbox_min_lng',
        'bbox_min_lat',
        'bbox_max_lng',
        'bbox_max_lat',
        'centroid_lng',
        'centroid_lat',
    ];
}
