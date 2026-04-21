<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parcel_indices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('map_file_id');
            $table->string('feature_uid', 190);
            $table->string('shbando', 120)->nullable();
            $table->string('sotocu', 120)->nullable();
            $table->string('shthua', 120)->nullable();
            $table->string('tenchu', 255)->nullable();
            $table->decimal('bbox_min_lng', 14, 8)->nullable();
            $table->decimal('bbox_min_lat', 14, 8)->nullable();
            $table->decimal('bbox_max_lng', 14, 8)->nullable();
            $table->decimal('bbox_max_lat', 14, 8)->nullable();
            $table->decimal('centroid_lng', 14, 8)->nullable();
            $table->decimal('centroid_lat', 14, 8)->nullable();
            $table->timestamps();

            $table->index(['map_file_id', 'shbando']);
            $table->index(['map_file_id', 'sotocu']);
            $table->index(['map_file_id', 'shthua']);
            $table->index(['map_file_id', 'tenchu']);
            $table->unique(['map_file_id', 'feature_uid']);

            $table->foreign('map_file_id')
                ->references('id')
                ->on('map_files')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parcel_indices');
    }
};