<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_area_scopes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('province_code', 20);
            $table->string('province_name');
            $table->string('area_code', 20);
            $table->string('area_name');
            $table->string('area_level', 50)->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'area_code'], 'uniq_user_area_scope');
            $table->index(['province_code'], 'idx_user_area_scopes_province_code');
            $table->index(['area_code'], 'idx_user_area_scopes_area_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_area_scopes');
    }
};