<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserDevice extends Model
{
    protected $fillable = [
        'user_id',
        'device_token',
        'fingerprint_hash',
        'device_type',
        'browser_name',
        'platform_name',
        'device_name',
        'ip_address',
        'user_agent',
        'last_seen_at',
        'is_active',
        'is_revoked',
    ];

    protected $casts = [
        'last_seen_at' => 'datetime',
        'is_active' => 'boolean',
        'is_revoked' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}