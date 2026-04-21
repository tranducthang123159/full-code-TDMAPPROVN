<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->boolean('user_confirmed_paid')->default(false)->after('status');
            $table->timestamp('user_confirmed_paid_at')->nullable()->after('user_confirmed_paid');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['user_confirmed_paid', 'user_confirmed_paid_at']);
        });
    }
};