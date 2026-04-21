<?php

return [
    'client_id' => env('PAYOS_CLIENT_ID'),
    'api_key' => env('PAYOS_API_KEY'),
    'checksum_key' => env('PAYOS_CHECKSUM_KEY'),

    'return_url' => env('PAYOS_RETURN_URL'),
    'cancel_url' => env('PAYOS_CANCEL_URL'),
    'webhook_url' => env('PAYOS_WEBHOOK_URL'),
];