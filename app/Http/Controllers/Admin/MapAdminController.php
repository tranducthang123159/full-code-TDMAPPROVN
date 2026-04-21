<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MapFile;
use App\Models\UserAreaScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MapAdminController extends Controller
{
    public function index()
    {
        try {
            $files = MapFile::with('user')->latest()->paginate(20);

            return view('admin.mapfiles', compact('files'));
        } catch (\Throwable $e) {
            Log::error('Lỗi admin mapfiles index', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            abort(500, 'Lỗi tải danh sách file map: ' . $e->getMessage());
        }
    }

    public function download($id)
    {
        $file = MapFile::findOrFail($id);

        $path = storage_path('app/public/' . $file->file_path);

        if (!file_exists($path)) {
            abort(404, 'File không tồn tại trên server.');
        }

        return response()->download($path, $file->file_name);
    }

    public function destroyFile($id)
    {
        $file = MapFile::with('user')->findOrFail($id);

        DB::beginTransaction();

        try {
            $this->deleteMapFilePhysicalFiles($file);
            $file->delete();

            DB::commit();

            return redirect()
                ->back()
                ->with('success', 'Đã xóa file map thành công.');
        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('Admin xóa file map thất bại', [
                'map_file_id' => $id,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return redirect()
                ->back()
                ->with('error', 'Xóa file map thất bại: ' . $e->getMessage());
        }
    }

    public function removeArea($userId, $areaCode)
    {
        DB::beginTransaction();

        try {
            $mapFiles = MapFile::where('user_id', $userId)
                ->where('area_code', $areaCode)
                ->get();

            $deletedMapCount = 0;

            foreach ($mapFiles as $mapFile) {
                $this->deleteMapFilePhysicalFiles($mapFile);
                $mapFile->delete();
                $deletedMapCount++;
            }

            $deletedScopeCount = UserAreaScope::where('user_id', $userId)
                ->where('area_code', $areaCode)
                ->delete();

            DB::commit();

            Log::info('Admin gỡ xã thành công', [
                'user_id' => $userId,
                'area_code' => $areaCode,
                'deleted_map_files' => $deletedMapCount,
                'deleted_scopes' => $deletedScopeCount,
            ]);

            return redirect()
                ->back()
                ->with('success', "Đã gỡ xã thành công. Đã xóa {$deletedMapCount} file map.");
        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('Admin gỡ xã thất bại', [
                'user_id' => $userId,
                'area_code' => $areaCode,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return redirect()
                ->back()
                ->with('error', 'Gỡ xã thất bại: ' . $e->getMessage());
        }
    }

    protected function deleteMapFilePhysicalFiles(MapFile $file): void
    {
        $paths = array_filter([
            $file->file_path,
            $file->lite_file_path,
            $file->ultra_lite_file_path,
        ]);

        foreach ($paths as $path) {
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }

        $folder = 'map_files/' . $file->id;

        if (Storage::disk('public')->exists($folder)) {
            $allFiles = Storage::disk('public')->files($folder);

            if (empty($allFiles)) {
                Storage::disk('public')->deleteDirectory($folder);
            }
        }
    }
}