<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VipMapFile extends Model
{

protected $table = 'vip_map_files';

protected $fillable = [
'user_id',
'type',
'file_name',
'file_path',
'file_size'
];

public function user()
{
return $this->belongsTo(User::class);
}

}