<?php

namespace App\Services;

use PayOS\PayOS;

class PayOSService
{
    public function client(): PayOS
    {
        return new PayOS(
            clientId: config('payos.client_id'),
            apiKey: config('payos.api_key'),
            checksumKey: config('payos.checksum_key'),
        );
    }
}