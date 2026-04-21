<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            $table->string('device_token', 120)->nullable();
            $table->string('fingerprint_hash', 120)->nullable();

            $table->string('device_type', 20); // mobile | desktop
            $table->string('browser_name', 50)->nullable();
            $table->string('platform_name', 50)->nullable();
            $table->string('device_name')->nullable();

            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamp('last_seen_at')->nullable();

            // trạng thái hiện tại của phiên đăng nhập
            $table->boolean('is_active')->default(true);

            // bị thu hồi thì không được dùng lại để login
            $table->boolean('is_revoked')->default(false);

            $table->timestamps();

            $table->index(['user_id', 'device_type']);
            $table->index(['user_id', 'device_token']);
            $table->index(['user_id', 'fingerprint_hash']);
            $table->index(['user_id', 'is_revoked']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_devices');
    }
};