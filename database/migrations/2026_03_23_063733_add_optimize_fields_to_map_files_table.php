<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('map_files', function (Blueprint $table) {
            $table->string('lite_file_path')->nullable()->after('file_path');
            $table->string('ultra_lite_file_path')->nullable()->after('lite_file_path');
            $table->json('bbox')->nullable()->after('ultra_lite_file_path');
            $table->unsignedInteger('feature_count')->default(0)->after('bbox');
        });
    }

    public function down(): void
    {
        Schema::table('map_files', function (Blueprint $table) {
            $table->dropColumn([
                'lite_file_path',
                'ultra_lite_file_path',
                'bbox',
                'feature_count'
            ]);
        });
    }
};