<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = [
        'user_id',
        'vip_level',
        'amount',
        'transaction_code',
        'order_code',
        'payment_link_id',
        'checkout_url',
        'status',
        'user_confirmed_paid',
        'paid_at',
        'completed_at',
        'payos_webhook_data',
    ];

    protected $casts = [
        'user_confirmed_paid' => 'boolean',
        'paid_at' => 'datetime',
        'completed_at' => 'datetime',
        'payos_webhook_data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}