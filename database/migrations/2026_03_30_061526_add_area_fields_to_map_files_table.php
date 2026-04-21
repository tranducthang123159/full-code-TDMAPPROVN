<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('map_files', function (Blueprint $table) {
            $table->string('province_code', 20)->nullable()->after('file_size');
            $table->string('province_name')->nullable()->after('province_code');
            $table->string('area_code', 20)->nullable()->after('province_name');
            $table->string('area_name')->nullable()->after('area_code');
            $table->string('area_level', 50)->nullable()->after('area_name');

            $table->index(['area_code'], 'idx_map_files_area_code');
            $table->index(['province_code'], 'idx_map_files_province_code');

            $table->unique(['user_id', 'type', 'area_code'], 'uniq_user_type_area');
        });
    }

    public function down(): void
    {
        Schema::table('map_files', function (Blueprint $table) {
            $table->dropUnique('uniq_user_type_area');
            $table->dropIndex('idx_map_files_area_code');
            $table->dropIndex('idx_map_files_province_code');

            $table->dropColumn([
                'province_code',
                'province_name',
                'area_code',
                'area_name',
                'area_level',
            ]);
        });
    }
};