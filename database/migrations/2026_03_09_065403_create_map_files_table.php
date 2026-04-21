<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

public function up(): void
{
Schema::create('map_files', function (Blueprint $table) {

$table->id();

/* user upload */

$table->foreignId('user_id')->constrained()->cascadeOnDelete();

/* loại bản đồ */

$table->string('type'); 
// dc_moi | dc_cu | quy_hoach | tinh

/* tên file */

$table->string('file_name');

/* đường dẫn */

$table->string('file_path');

/* dung lượng */

$table->bigInteger('file_size');

$table->timestamps();

});
}

public function down(): void
{
Schema::dropIfExists('map_files');
}

};