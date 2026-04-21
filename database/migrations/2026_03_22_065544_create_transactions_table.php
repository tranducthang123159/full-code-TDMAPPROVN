<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
     Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // Liên kết với bảng users
            $table->string('vip_level'); // Cấp độ VIP
            $table->decimal('amount', 10, 2); // Số tiền thanh toán
            $table->string('transaction_code'); // Mã giao dịch
            $table->enum('status', ['pending', 'completed', 'failed'])->default('pending'); // Trạng thái thanh toán
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
