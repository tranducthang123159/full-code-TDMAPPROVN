<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('order_code')->nullable()->unique()->after('transaction_code');
            $table->string('payment_link_id')->nullable()->after('order_code');
            $table->string('checkout_url', 1000)->nullable()->after('payment_link_id');
            $table->timestamp('paid_at')->nullable()->after('checkout_url');
            $table->timestamp('completed_at')->nullable()->after('paid_at');
            $table->json('payos_webhook_data')->nullable()->after('completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn([
                'order_code',
                'payment_link_id',
                'checkout_url',
                'paid_at',
                'completed_at',
                'payos_webhook_data',
            ]);
        });
    }
};