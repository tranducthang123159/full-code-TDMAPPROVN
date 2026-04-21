<?php

namespace App\Http\Controllers;

use App\Models\MapFile;
use App\Services\DvhcService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MapController extends Controller
{
    public function getProvinces(DvhcService $dvhc)
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa đăng nhập',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'data' => $dvhc->getProvinces(),
        ]);
    }

    public function getAreas(Request $request, DvhcService $dvhc)
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa đăng nhập',
            ], 401);
        }

        $request->validate([
            'province_code' => 'required',
        ], [
            'province_code.required' => 'Thiếu mã tỉnh/thành',
        ]);

        return response()->json([
            'success' => true,
            'data' => $dvhc->getAreasByProvinceCode($request->province_code),
        ]);
    }

    public function myAreaScopes()
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa đăng nhập',
            ], 401);
        }

        $user = Auth::user();

        return response()->json([
            'success' => true,
            'vip_level' => $user->getCurrentVipLevel(),
            'vip_name' => $user->getCurrentVipName(),
            'area_limit' => $user->getAreaLimit(),
            'used_area_count' => $user->usedAreaCount(),
            'remaining_area_count' => $user->remainingAreaCount(),
            'can_upload' => $user->canUploadMap(),
            'scopes' => $user->areaScopes()
                ->select('province_code', 'province_name', 'area_code', 'area_name', 'area_level')
                ->orderBy('province_name')
                ->orderBy('area_name')
                ->get(),
        ]);
    }

public function upload(Request $request, DvhcService $dvhc)
{
    $stored = null;
    $hadExisting = false;

    try {
        @set_time_limit(300);
        @ini_set('max_execution_time', '300');
        @ini_set('max_input_time', '300');
        @ini_set('memory_limit', '512M');

        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn cần đăng nhập để tải file',
            ], 401);
        }

        $request->validate([
            'file'          => 'required|file|max:102400',
            'type'          => 'required|in:dcmoi,dccu,quyhoach',
            'province_code' => 'required',
            'area_code'     => 'required',
            'fast_mode'     => 'nullable',
        ], [
            'file.required'          => 'Bạn chưa chọn file',
            'file.max'               => 'File vượt quá giới hạn 100MB',
            'type.required'          => 'Thiếu loại bản đồ',
            'province_code.required' => 'Bạn chưa chọn tỉnh/thành',
            'area_code.required'     => 'Bạn chưa chọn xã/phường',
        ]);

        $user = Auth::user();

        if (!$user->canUploadMap()) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản hiện không có quyền upload. Vui lòng gia hạn VIP.',
            ], 403);
        }

        $type         = (string) $request->input('type');
        $uploadedFile = $request->file('file');
        $provinceCode = trim((string) $request->input('province_code'));
        $areaCode     = trim((string) $request->input('area_code'));
        $fastMode     = (string) $request->input('fast_mode') === '1';

        if (!$uploadedFile instanceof UploadedFile) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy file upload',
            ], 422);
        }

        $area = $dvhc->findByAreaCode($areaCode);

        if (!$area) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy địa bàn đã chọn',
            ], 422);
        }

        if ((string) $area['province_code'] !== $provinceCode) {
            return response()->json([
                'success' => false,
                'message' => 'Tỉnh/thành không khớp với xã/phường đã chọn',
            ], 422);
        }

        $name = $uploadedFile->getClientOriginalName();
        $size = (int) ($uploadedFile->getSize() ?: 0);

        // Fast mode: không parse GeoJSON khi upload
        $featureCount = 0;
        $bbox = null;

        // 1) Chỉ transaction phần kiểm tra quyền địa bàn
        DB::beginTransaction();

        try {
            $alreadyHasAccess = $user->hasAreaAccess($areaCode);

            if (!$alreadyHasAccess && $user->getCurrentVipLevel() !== 3) {
                if (!$user->canUseNewArea()) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn đã dùng hết số địa bàn của gói ' . $user->getCurrentVipName(),
                    ], 422);
                }

                $user->grantAreaAccess($area);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        // 2) Xác định trước file cũ hay file mới
        $existing = MapFile::query()
            ->where('user_id', $user->id)
            ->where('type', $type)
            ->where('area_code', $areaCode)
            ->first();

        $hadExisting = (bool) $existing;

        // 3) Save file trước, cực nhanh, không nằm trong transaction
        $stored = $this->saveUploadedGeoJsonFileFast(
            $user->id,
            $areaCode,
            $type,
            $uploadedFile
        );

        // 4) Upsert DB 1 lần
        $mapFile = MapFile::updateOrCreate(
            [
                'user_id'   => $user->id,
                'type'      => $type,
                'area_code' => $areaCode,
            ],
            [
                'file_name'            => $name,
                'file_path'            => $stored['file_path'],
                'lite_file_path'       => null,
                'ultra_lite_file_path' => null,
                'bbox'                 => $bbox,
                'feature_count'        => $featureCount,
                'file_size'            => $size,
                'province_code'        => $area['province_code'],
                'province_name'        => $area['province_name'],
                'area_code'            => $area['area_code'],
                'area_name'            => $area['area_name'],
                'area_level'           => $area['area_level'],
            ]
        );

        $pmtilesMeta = $this->resolvePmtilesMeta($mapFile);

        return response()->json([
            'success'        => true,
            'id'             => $mapFile->id,
            'name'           => $name,
            'size'           => $size,
            'type'           => $type,
            'render_mode'    => $pmtilesMeta['render_mode'],
            'pmtiles_ready'  => $pmtilesMeta['pmtiles_ready'],
            'pmtiles_url'    => $pmtilesMeta['pmtiles_url'],
            'pmtiles_public_url' => $pmtilesMeta['pmtiles_public_url'],
            'source_layer'   => $pmtilesMeta['source_layer'],
            'feature_count'  => $featureCount,
            'province_code'  => $area['province_code'],
            'province_name'  => $area['province_name'],
            'area_code'      => $area['area_code'],
            'area_name'      => $area['area_name'],
            'area_level'     => $area['area_level'],
            'message'        => $hadExisting
                ? ($fastMode ? 'Đã ghi đè file cũ rất nhanh' : 'Đã cập nhật file cũ')
                : ($fastMode ? 'Tải file nhanh lên thành công' : 'Tải file lên thành công'),
        ]);
    } catch (\Throwable $e) {
        // chỉ xóa file mới nếu là record mới hoàn toàn mà DB fail
        if (!$hadExisting && !empty($stored['file_path'])) {
            try {
                $this->deleteFileIfExists($stored['file_path']);
            } catch (\Throwable $deleteErr) {
                // bỏ qua
            }
        }

        Log::error('UPLOAD ERROR', [
            'message' => $e->getMessage(),
            'line'    => $e->getLine(),
            'file'    => $e->getFile(),
        ]);

        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
        ], 500);
    }
}


protected function saveUploadedGeoJsonFileFast(
    int $userId,
    string $areaCode,
    string $type,
    UploadedFile $file
): array {
    $relativeDir = "map_files/user_{$userId}/{$areaCode}/{$type}";
    $absoluteDir = storage_path("app/public/{$relativeDir}");

    if (!is_dir($absoluteDir)) {
        if (!mkdir($absoluteDir, 0755, true) && !is_dir($absoluteDir)) {
            throw new \RuntimeException('Không tạo được thư mục lưu file');
        }
    }

    $tmpPath   = $absoluteDir . DIRECTORY_SEPARATOR . 'full.uploading';
    $finalPath = $absoluteDir . DIRECTORY_SEPARATOR . 'full.geojson';
    $pmtilesPath = $absoluteDir . DIRECTORY_SEPARATOR . 'full.pmtiles';

    if (file_exists($tmpPath)) {
        @unlink($tmpPath);
    }

    if (file_exists($finalPath) && !@unlink($finalPath)) {
        throw new \RuntimeException('Không thể ghi đè file cũ');
    }

    if (file_exists($pmtilesPath)) {
        @unlink($pmtilesPath);
    }

    $file->move($absoluteDir, 'full.uploading');

    if (!file_exists($tmpPath)) {
        throw new \RuntimeException('Không lưu được file tạm');
    }

    if (!@rename($tmpPath, $finalPath)) {
        @unlink($tmpPath);
        throw new \RuntimeException('Không hoàn tất lưu file');
    }

    clearstatcache(true, $finalPath);

    if (!file_exists($finalPath)) {
        throw new \RuntimeException('Không lưu được file lên storage');
    }

    return [
        'file_path' => "{$relativeDir}/full.geojson",
    ];
}


    public function myFiles()
    {
        $user = Auth::user();
        $files = MapFile::where('user_id', $user->id)->latest()->get();

        return view('map.myfiles', compact('user', 'files'));
    }

    public function myFilesJson()
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa đăng nhập',
            ], 401);
        }

        $user = Auth::user();

        $files = MapFile::where('user_id', $user->id)
            ->latest()
            ->get([
                'id',
                'type',
                'file_name',
                'file_size',
                'province_code',
                'province_name',
                'area_code',
                'area_name',
                'area_level',
                'created_at',
            ]);

        return response()->json([
            'success' => true,
            'vip_level' => $user->getCurrentVipLevel(),
            'vip_name' => $user->getCurrentVipName(),
            'can_upload' => $user->canUploadMap(),
            'area_limit' => $user->getAreaLimit(),
            'used_area_count' => $user->usedAreaCount(),
            'remaining_area_count' => $user->remainingAreaCount(),
            'area_scopes' => $user->areaScopes()
                ->select('province_code', 'province_name', 'area_code', 'area_name', 'area_level')
                ->orderBy('province_name')
                ->orderBy('area_name')
                ->get(),
            'files' => $files,
        ]);
    }

    public function getGeoJson($id)
    {
        $file = MapFile::find($id);

        if (!$file) {
            return response()->json([
                'success' => false,
                'message' => 'File không tồn tại',
            ], 404);
        }

        if ((int) $file->user_id !== (int) Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem file này',
            ], 403);
        }

        $pmtilesMeta = $this->resolvePmtilesMeta($file);

        return response()->json([
            'success' => true,
            'id' => $file->id,
            'type' => $file->type,
            'file_name' => $file->file_name,
            'feature_count' => $file->feature_count,
            'bbox' => $file->bbox,
            'province_code' => $file->province_code,
            'province_name' => $file->province_name,
            'area_code' => $file->area_code,
            'area_name' => $file->area_name,
            'area_level' => $file->area_level,
            'render_mode' => $pmtilesMeta['render_mode'],
            'pmtiles_ready' => $pmtilesMeta['pmtiles_ready'],
            'pmtiles_url' => $pmtilesMeta['pmtiles_url'],
            'pmtiles_public_url' => $pmtilesMeta['pmtiles_public_url'],
            'source_layer' => $pmtilesMeta['source_layer'],
            'full_url' => $file->file_path
                ? route('map.files.serve', ['id' => $file->id, 'level' => 'full'])
                : null,
            'lite_url' => $file->lite_file_path
                ? route('map.files.serve', ['id' => $file->id, 'level' => 'lite'])
                : null,
            'ultra_lite_url' => $file->ultra_lite_file_path
                ? route('map.files.serve', ['id' => $file->id, 'level' => 'ultra'])
                : null,
        ]);
    }

    public function serveGeoJson($id, $level)
    {
        $file = MapFile::find($id);

        if (!$file) {
            return response()->json([
                'success' => false,
                'message' => 'File không tồn tại',
            ], 404);
        }

        if ((int) $file->user_id !== (int) Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem file này',
            ], 403);
        }

        $path = null;

        switch ($level) {
            case 'full':
                $path = $file->file_path;
                break;
            case 'lite':
                $path = $file->lite_file_path;
                break;
            case 'ultra':
                $path = $file->ultra_lite_file_path;
                break;
            case 'pmtiles':
                return $this->servePmtiles($file);
            default:
                $path = null;
                break;
        }

        if (!$path) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đường dẫn file',
            ], 404);
        }

        if (!Storage::disk('public')->exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'File vật lý không tồn tại',
            ], 404);
        }

        return Storage::disk('public')->response(
            $path,
            null,
            [
                'Content-Type'  => 'application/geo+json; charset=UTF-8',
                'Cache-Control' => 'public, max-age=604800, immutable',
                'Content-Encoding' => 'identity',
            ]
        );
    }

    public function download($id)
    {
        $file = MapFile::findOrFail($id);

        if ((int) $file->user_id !== (int) Auth::id()) {
            abort(403);
        }

        $path = $file->file_path;

        if (!$path || !Storage::disk('public')->exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'File không tồn tại',
            ], 404);
        }

        return Storage::disk('public')->download($path, $file->file_name);
    }

    public function delete($id)
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa đăng nhập',
            ], 401);
        }

        $file = MapFile::find($id);

        if (!$file) {
            return response()->json([
                'success' => false,
                'message' => 'File không tồn tại',
            ], 404);
        }

        if ((int) $file->user_id !== (int) Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa file này',
            ], 403);
        }

        DB::beginTransaction();

        try {
            $this->deleteFileIfExists($file->file_path);
            $this->deleteFileIfExists($file->lite_file_path);
            $this->deleteFileIfExists($file->ultra_lite_file_path);
            $this->deleteFileIfExists($this->guessPmtilesPath($file));

            $areaName = $file->area_name;
            $type = $file->type;

            $file->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Đã xóa file {$type} tại {$areaName}. Bạn vẫn có thể tải lại đúng mã xã này.",
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('DELETE MAP ERROR', [
                'message' => $e->getMessage(),
                'line'    => $e->getLine(),
                'file'    => $e->getFile(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Xóa file thất bại',
            ], 500);
        }
    }


    protected function resolvePmtilesMeta(MapFile $file): array
    {
        $pmtilesPath = $this->guessPmtilesPath($file);
        $exists = $pmtilesPath && Storage::disk('public')->exists($pmtilesPath);
        $sourceLayer = $this->guessSourceLayer($file->type);

        return [
            'render_mode' => $exists ? 'pmtiles' : 'geojson',
            'pmtiles_ready' => $exists,
            'pmtiles_path' => $exists ? $pmtilesPath : null,
            'pmtiles_url' => $exists ? route('map.files.serve', ['id' => $file->id, 'level' => 'pmtiles']) : null,
            'pmtiles_public_url' => $exists ? Storage::disk('public')->url($pmtilesPath) : null,
            'source_layer' => $sourceLayer,
        ];
    }

    protected function guessPmtilesPath(MapFile $file): ?string
    {
        if (!$file->file_path) {
            return null;
        }

        $dir = trim(dirname($file->file_path), '.\/');
        if ($dir === '' || $dir === '.') {
            return 'full.pmtiles';
        }

        return $dir . '/full.pmtiles';
    }

    protected function guessSourceLayer(?string $type): string
    {
        $normalized = strtolower((string) $type);

        if ($normalized === 'quyhoach') {
            return 'planning';
        }

        return 'parcels';
    }

    protected function servePmtiles(MapFile $file)
    {
        $path = $this->guessPmtilesPath($file);

        if (!$path || !Storage::disk('public')->exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'File PMTiles không tồn tại',
            ], 404);
        }

        $absolutePath = Storage::disk('public')->path($path);
        if (!is_file($absolutePath)) {
            return response()->json([
                'success' => false,
                'message' => 'Không đọc được file PMTiles',
            ], 404);
        }

        $size = filesize($absolutePath);
        $start = 0;
        $end = $size > 0 ? $size - 1 : 0;
        $status = 200;

        $rangeHeader = request()->header('Range');
        if ($rangeHeader && preg_match('/bytes=(\d*)-(\d*)/i', $rangeHeader, $matches)) {
            $rangeStart = $matches[1] ?? '';
            $rangeEnd = $matches[2] ?? '';

            if ($rangeStart !== '') {
                $start = max(0, (int) $rangeStart);
            }

            if ($rangeEnd !== '') {
                $end = min($end, (int) $rangeEnd);
            }

            if ($rangeStart === '' && $rangeEnd !== '') {
                $suffixLength = min($size, (int) $rangeEnd);
                $start = max(0, $size - $suffixLength);
                $end = $size - 1;
            }

            if ($start > $end || $start >= $size) {
                return response('', 416, [
                    'Content-Range' => 'bytes */' . $size,
                    'Accept-Ranges' => 'bytes',
                ]);
            }

            $status = 206;
        }

        $length = ($end - $start) + 1;

        $headers = [
            'Content-Type' => 'application/octet-stream',
            'Content-Length' => (string) $length,
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'public, max-age=604800, immutable',
            'Content-Disposition' => 'inline; filename="' . basename($absolutePath) . '"',
        ];

        if ($status === 206) {
            $headers['Content-Range'] = 'bytes ' . $start . '-' . $end . '/' . $size;
        }

        return response()->stream(function () use ($absolutePath, $start, $end) {
            $handle = fopen($absolutePath, 'rb');
            if ($handle === false) {
                return;
            }

            try {
                fseek($handle, $start);
                $remaining = ($end - $start) + 1;
                $chunkSize = 1024 * 256;

                while (!feof($handle) && $remaining > 0) {
                    $readLength = min($chunkSize, $remaining);
                    $buffer = fread($handle, $readLength);
                    if ($buffer === false) {
                        break;
                    }

                    echo $buffer;
                    flush();
                    $remaining -= strlen($buffer);

                    if (connection_aborted()) {
                        break;
                    }
                }
            } finally {
                fclose($handle);
            }
        }, $status, $headers);
    }

    protected function saveUploadedGeoJsonFile(int $mapFileId, UploadedFile $file): array
    {
        $dir = "map_files/{$mapFileId}";
        $storedPath = Storage::disk('public')->putFileAs($dir, $file, 'full.geojson');

        if (!$storedPath) {
            throw new \RuntimeException('Không lưu được file lên storage');
        }

        return [
            'file_path' => $storedPath,
        ];
    }

    protected function decodeBboxFromRequest(?string $bboxJson): ?array
    {
        if (!$bboxJson) {
            return null;
        }

        try {
            $bbox = json_decode($bboxJson, true);

            if (!is_array($bbox) || count($bbox) !== 4) {
                return null;
            }

            return array_map('floatval', $bbox);
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected function extractBbox(array $geojson): ?array
    {
        if (
            isset($geojson['bbox']) &&
            is_array($geojson['bbox']) &&
            count($geojson['bbox']) === 4
        ) {
            return array_map('floatval', $geojson['bbox']);
        }

        return null;
    }

    protected function deleteFileIfExists(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    protected function extractAreaCodeFromGeoJson(array $geojson): ?string
    {
        $possibleKeys = [
            'Maxa',
            'maxa',
            'MAXA',
            'ma_xa',
            'ma_xaphuong',
            'ma_phuong',
            'ma_dvhc',
            'ma_donvi',
            'ma_don_vi',
            'ma_xa_phuong',
            'xa_id',
            'ward_code',
            'commune_code',
            'madvhc',
        ];

        $foundCodes = [];

        foreach ($geojson['features'] ?? [] as $feature) {
            $properties = $feature['properties'] ?? [];

            if (!is_array($properties)) {
                continue;
            }

            foreach ($possibleKeys as $key) {
                if (
                    array_key_exists($key, $properties) &&
                    $properties[$key] !== null &&
                    $properties[$key] !== ''
                ) {
                    $normalized = $this->normalizeAreaCode($properties[$key]);

                    if ($normalized !== null) {
                        $foundCodes[] = $normalized;
                        break;
                    }
                }
            }
        }

        $foundCodes = array_values(array_unique(array_filter($foundCodes)));

        if (count($foundCodes) === 1) {
            return $foundCodes[0];
        }

        if (count($foundCodes) > 1) {
            return '__MULTI_AREA__';
        }

        return null;
    }

    protected function normalizeAreaCode($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        $value = preg_replace('/\s+/', '', $value);

        return $value !== '' ? $value : null;
    }
}