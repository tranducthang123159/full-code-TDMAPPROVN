<?php

namespace App\Http\Controllers;

use App\Models\MapFile;
use App\Services\DvhcService;
use App\Services\AreaBBoxService;
use App\Services\MapArtifactService;
use App\Services\MapFeatureService;
use App\Services\PmtilesBuilderService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MapController extends Controller
{
    public function __construct(
        protected MapArtifactService $artifactService,
        protected MapFeatureService $featureService,
        protected PmtilesBuilderService $pmtilesBuilder,
        protected AreaBBoxService $areaBBoxService,
    ) {
    }

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
            @set_time_limit(600);
            @ini_set('max_execution_time', '600');
            @ini_set('max_input_time', '600');
            @ini_set('memory_limit', '1024M');

            if (!Auth::check()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn cần đăng nhập để tải file',
                ], 401);
            }

            $request->validate([
                'file' => 'required|file|max:102400',
                'type' => 'required|in:dcmoi,dccu,quyhoach',
                'province_code' => 'required',
                'area_code' => 'required',
                'area_ticket' => 'required|string',
                'fast_mode' => 'nullable',
            ], [
                'file.required' => 'Bạn chưa chọn file',
                'file.max' => 'File vượt quá giới hạn 100MB',
                'type.required' => 'Thiếu loại bản đồ',
                'province_code.required' => 'Bạn chưa chọn tỉnh/thành',
                'area_code.required' => 'Bạn chưa chọn xã/phường',
                'area_ticket.required' => 'Thiếu vé xác thực địa bàn upload',
            ]);

            $user = Auth::user();

            if (!$user->canUploadMap()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tài khoản hiện không có quyền upload. Vui lòng gia hạn VIP.',
                ], 403);
            }

            $type = (string) $request->input('type');
            $uploadedFile = $request->file('file');
            $provinceCode = trim((string) $request->input('province_code'));
            $areaCode = trim((string) $request->input('area_code'));
            $areaTicket = (string) $request->input('area_ticket');
            $fastMode = (string) $request->input('fast_mode') === '1';

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

            $this->verifyAreaTicket(
                $areaTicket,
                (int) $user->id,
                $provinceCode,
                $areaCode
            );

            $this->assertGeoJsonWithinAreaBBox(
                $uploadedFile,
                $provinceCode,
                $areaCode
            );

            $this->validateUploadedGeoJsonAreaCode($uploadedFile, $areaCode);

            $name = $uploadedFile->getClientOriginalName();
            $size = (int) ($uploadedFile->getSize() ?: 0);

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

            $existing = MapFile::query()
                ->where('user_id', $user->id)
                ->where('type', $type)
                ->where('area_code', $areaCode)
                ->first();

            $hadExisting = (bool) $existing;

            $stored = $this->saveUploadedGeoJsonFileFast(
                $user->id,
                $areaCode,
                $type,
                $uploadedFile
            );

            $mapFile = MapFile::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'type' => $type,
                    'area_code' => $areaCode,
                ],
                [
                    'file_name' => $name,
                    'file_path' => $stored['file_path'],
                    'lite_file_path' => null,
                    'ultra_lite_file_path' => null,
                    'bbox' => null,
                    'feature_count' => 0,
                    'file_size' => $size,
                    'province_code' => $area['province_code'],
                    'province_name' => $area['province_name'],
                    'area_code' => $area['area_code'],
                    'area_name' => $area['area_name'],
                    'area_level' => $area['area_level'],
                ]
            );

            $this->clearParcelIndexSafe($mapFile->id);
            $this->featureService->clearGeoJsonCache($mapFile);

            $artifactResult = $this->prepareArtifactsSafe($mapFile, true);
            $mapFile->refresh();
            $meta = $this->buildMapJsonPayload($mapFile, $artifactResult);

            $messageParts = [];
            $messageParts[] = $hadExisting
                ? ($fastMode ? 'Đã ghi đè file cũ và tối ưu lại dữ liệu' : 'Đã cập nhật file cũ')
                : ($fastMode ? 'Tải file lên thành công và đã xử lý dữ liệu' : 'Tải file lên thành công');

            if (!empty($artifactResult['notes'])) {
                $messageParts = array_merge($messageParts, $artifactResult['notes']);
            }

            if (!empty($artifactResult['errors'])) {
                $messageParts[] = 'Một số bước tối ưu chưa hoàn tất: ' . implode(' | ', $artifactResult['errors']);
            }

            return response()->json(array_merge($meta, [
                'success' => true,
                'name' => $name,
                'size' => $size,
                'message' => implode('. ', array_filter($messageParts)),
            ]));
        } catch (\Throwable $e) {
            if (!$hadExisting && !empty($stored['file_path'])) {
                try {
                    $this->deleteFileIfExists($stored['file_path']);
                } catch (\Throwable $deleteErr) {
                }
            }

            Log::error('UPLOAD ERROR', [
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
/**
 * Đọc tất cả mã xã tìm thấy trong GeoJSON.
 */
protected function extractAreaCodesFromGeoJsonArray(array $geojson, int $sampleLimit = 400): array
    {
        $features = $geojson['features'] ?? null;

        if (!is_array($features) || empty($features)) {
            return [];
        }

        $candidateKeys = [
            'Maxa', 'maxa', 'MAXA',
            'ma_xa', 'MA_XA',
            'ma_xaphuong', 'MA_XAPHUONG',
            'ma_xa_phuong', 'MA_XA_PHUONG',
            'ma_phuong', 'MA_PHUONG',
            'ma_dvhc', 'MA_DVHC',
            'madvhc', 'MADVHC',
            'ma_donvi', 'MA_DONVI',
            'ma_don_vi', 'MA_DON_VI',
            'xa_id', 'XA_ID',
            'ward_code', 'WARD_CODE',
            'commune_code', 'COMMUNE_CODE',
            'area_code', 'AREA_CODE',
        ];

        $foundCodes = [];
        $checked = 0;
        $total = count($features);
        $step = max(1, (int) floor($total / max(1, $sampleLimit)));

        for ($i = 0; $i < $total && $checked < $sampleLimit; $i += $step) {
            $feature = $features[$i] ?? null;
            if (!is_array($feature)) {
                continue;
            }

            $props = $feature['properties'] ?? null;
            if (!is_array($props)) {
                continue;
            }

            foreach ($candidateKeys as $key) {
                if (!array_key_exists($key, $props)) {
                    continue;
                }

                $value = $props[$key];

                if ($value === null) {
                    continue;
                }

                $code = preg_replace('/\s+/', '', trim((string) $value));
                if ($code === '') {
                    continue;
                }

                $foundCodes[$code] = true;
                $checked++;

                if (count($foundCodes) > 1) {
                    return array_values(array_keys($foundCodes));
                }

                break;
            }
        }

        return array_values(array_keys($foundCodes));
    }

/**
 * Check mã xã của file upload có khớp với area_code người dùng chọn hay không.
 */
protected function validateUploadedGeoJsonAreaCode(UploadedFile $file, string $selectedAreaCode): void
    {
        $realPath = $file->getRealPath();

        if (!$realPath || !is_file($realPath)) {
            throw new \RuntimeException('Không đọc được file tạm để kiểm tra mã xã');
        }

        $raw = file_get_contents($realPath);

        if ($raw === false || trim($raw) === '') {
            throw new \RuntimeException('Không đọc được nội dung file GeoJSON');
        }

        $geojson = json_decode($raw, true);

        if (!is_array($geojson)) {
            throw new \RuntimeException('File không phải GeoJSON hợp lệ');
        }

        if (($geojson['type'] ?? null) !== 'FeatureCollection') {
            throw new \RuntimeException('GeoJSON phải là FeatureCollection');
        }

        $features = $geojson['features'] ?? null;
        if (!is_array($features) || empty($features)) {
            throw new \RuntimeException('GeoJSON không có features');
        }

        $codes = $this->extractAreaCodesFromGeoJsonArray($geojson, 400);

        if (empty($codes)) {
            throw new \RuntimeException('Không tìm thấy mã xã trong GeoJSON');
        }

        if (count($codes) > 1) {
            throw new \RuntimeException('GeoJSON chứa nhiều mã xã khác nhau: ' . implode(', ', $codes));
        }

        $detectedAreaCode = preg_replace('/\s+/', '', trim((string) ($codes[0] ?? '')));
        $selectedAreaCode = preg_replace('/\s+/', '', trim((string) $selectedAreaCode));

        if ($detectedAreaCode === '') {
            throw new \RuntimeException('Không xác định được mã xã từ GeoJSON');
        }

        if ($detectedAreaCode !== $selectedAreaCode) {
            throw new \RuntimeException(
                'Mã xã trong GeoJSON (' . $detectedAreaCode . ') không khớp với xã/phường đã chọn (' . $selectedAreaCode . ')'
            );
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

        $tmpPath = $absoluteDir . DIRECTORY_SEPARATOR . 'full.uploading';
        $finalPath = $absoluteDir . DIRECTORY_SEPARATOR . 'full.geojson';

        foreach (['full.pmtiles', 'lite.geojson', 'ultra_lite.geojson', 'artifact.version', 'parcel-chunk-manifest.json'] as $derivedName) {
            $derivedPath = $absoluteDir . DIRECTORY_SEPARATOR . $derivedName;
            if (file_exists($derivedPath)) {
                @unlink($derivedPath);
            }
        }

        $chunkDir = $absoluteDir . DIRECTORY_SEPARATOR . 'parcel_chunks';
        if (is_dir($chunkDir)) {
            $this->deleteDirectoryRecursive($chunkDir);
        }

        if (file_exists($tmpPath)) {
            @unlink($tmpPath);
        }

        if (file_exists($finalPath) && !@unlink($finalPath)) {
            throw new \RuntimeException('Không thể ghi đè file cũ');
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
                'feature_count',
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

        $artifactResult = null;
        if ($this->shouldPrepareArtifacts($file)) {
            $artifactResult = $this->prepareArtifactsSafe($file, false);
            $file->refresh();
        }

        return response()->json(array_merge([
            'success' => true,
        ], $this->buildMapJsonPayload($file, $artifactResult)));
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
                'Content-Type' => 'application/geo+json; charset=UTF-8',
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
            $this->deleteFileIfExists(trim(dirname((string) $file->file_path), '.\/') . '/artifact.version');
            $this->deleteFileIfExists(trim(dirname((string) $file->file_path), '.\/') . '/parcel-chunk-manifest.json');
            Storage::disk('public')->deleteDirectory(trim(dirname((string) $file->file_path), '.\/') . '/parcel_chunks');
            $this->pmtilesBuilder->cleanupForMapFile($file);

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
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Xóa file thất bại',
            ], 500);
        }
    }

    protected function buildMapJsonPayload(MapFile $file, ?array $artifactResult = null): array
    {
        $pmtilesMeta = $this->resolvePmtilesMeta($file);
        $processingErrors = array_values(array_filter($artifactResult['errors'] ?? []));
        $processingNotes = array_values(array_filter($artifactResult['notes'] ?? []));

        if (!empty($pmtilesMeta['pmtiles_message'])) {
            $processingNotes[] = $pmtilesMeta['pmtiles_message'];
            $processingNotes = array_values(array_unique(array_filter($processingNotes)));
        }

        $processingPending = (int) $file->feature_count <= 0
            || empty($file->bbox)
            || in_array($pmtilesMeta['pmtiles_status'], ['pending', 'processing'], true)
            || (!empty($processingErrors) && !$pmtilesMeta['pmtiles_ready'] && !$file->lite_file_path && !$file->ultra_lite_file_path);

        return [
            'id' => $file->id,
            'type' => $file->type,
            'file_name' => $file->file_name,
            'feature_count' => (int) $file->feature_count,
            'bbox' => $file->bbox,
            'province_code' => $file->province_code,
            'province_name' => $file->province_name,
            'area_code' => $file->area_code,
            'area_name' => $file->area_name,
            'area_level' => $file->area_level,
            'render_mode' => $pmtilesMeta['render_mode'],
            'pmtiles_ready' => $pmtilesMeta['pmtiles_ready'],
            'pmtiles_status' => $pmtilesMeta['pmtiles_status'],
            'pmtiles_message' => $pmtilesMeta['pmtiles_message'],
            'pmtiles_url' => $pmtilesMeta['pmtiles_url'],
            'pmtiles_public_url' => $pmtilesMeta['pmtiles_public_url'],
            'source_layer' => $pmtilesMeta['source_layer'],
            'api_urls' => $this->buildApiUrls($file),
            'full_url' => $file->file_path ? route('map.files.serve', ['id' => $file->id, 'level' => 'full']) : null,
            'lite_url' => $file->lite_file_path ? route('map.files.serve', ['id' => $file->id, 'level' => 'lite']) : null,
            'ultra_lite_url' => $file->ultra_lite_file_path ? route('map.files.serve', ['id' => $file->id, 'level' => 'ultra']) : null,
            'processing_pending' => $processingPending,
            'processing_notes' => $processingNotes,
            'processing_errors' => $processingErrors,
        ];
    }

    protected function shouldPrepareArtifacts(MapFile $file): bool
    {
        if ((int) $file->feature_count <= 0) {
            return true;
        }

        if (!is_array($file->bbox) || count($file->bbox) !== 4) {
            return true;
        }

        if (!$file->lite_file_path || !$file->ultra_lite_file_path) {
            return true;
        }

        if (!$this->artifactService->isCurrent($file)) {
            return true;
        }

        if (in_array(strtolower((string) $file->type), ['dcmoi', 'dccu'], true) && !$this->featureService->hasParcelIndex($file)) {
            return true;
        }

        return false;
    }

    protected function prepareArtifactsSafe(MapFile $file, bool $force = false): array
    {
        try {
            return $this->artifactService->prepare($file, ['force' => $force]);
        } catch (\Throwable $e) {
            Log::warning('PREPARE MAP ARTIFACTS FAILED', [
                'map_file_id' => $file->id,
                'message' => $e->getMessage(),
            ]);

            return [
                'summary' => null,
                'parcel_index_ready' => false,
                'pmtiles_ready' => false,
                'lite_ready' => false,
                'ultra_ready' => false,
                'notes' => [],
                'errors' => [$e->getMessage()],
            ];
        }
    }

    protected function resolvePmtilesMeta(MapFile $file): array
    {
        $status = $this->pmtilesBuilder->getStatus($file);
        $sourceLayer = $this->guessSourceLayer($file->type);

        return [
            'render_mode' => !empty($status['ready']) ? 'pmtiles' : 'geojson',
            'pmtiles_ready' => (bool) ($status['ready'] ?? false),
            'pmtiles_status' => (string) ($status['status'] ?? 'missing'),
            'pmtiles_message' => (string) ($status['message'] ?? ''),
            'pmtiles_path' => $status['pmtiles_relative'] ?? null,
            'pmtiles_url' => !empty($status['ready']) ? route('map.files.serve', ['id' => $file->id, 'level' => 'pmtiles']) : null,
            'pmtiles_public_url' => $status['pmtiles_public_url'] ?? null,
            'source_layer' => $sourceLayer,
        ];
    }

    protected function guessPmtilesPath(MapFile $file): ?string
    {
        if (!$file->file_path) {
            return null;
        }

        $dir = trim(dirname($file->file_path), '.\\/');
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


    public function createUploadTicket(Request $request, DvhcService $dvhc)
    {
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chưa đăng nhập',
            ], 401);
        }

        $request->validate([
            'province_code' => 'required',
            'area_code' => 'required',
        ], [
            'province_code.required' => 'Thiếu mã tỉnh/thành',
            'area_code.required' => 'Thiếu mã xã/phường',
        ]);

        $provinceCode = trim((string) $request->input('province_code'));
        $areaCode = trim((string) $request->input('area_code'));

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

        $payload = [
            'uid' => (int) Auth::id(),
            'province_code' => $provinceCode,
            'area_code' => $areaCode,
            'exp' => now()->addMinutes(15)->timestamp,
        ];

        $raw = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $sig = hash_hmac('sha256', $raw, config('app.key'));

        $ticket = base64_encode(json_encode([
            'payload' => $payload,
            'sig' => $sig,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return response()->json([
            'success' => true,
            'area_ticket' => $ticket,
            'expires_at' => $payload['exp'],
        ]);
    }

    protected function verifyAreaTicket(
        string $ticket,
        int $userId,
        string $provinceCode,
        string $areaCode
    ): void {
        $decoded = base64_decode($ticket, true);

        if ($decoded === false || trim($decoded) === '') {
            throw new \RuntimeException('Area ticket không hợp lệ');
        }

        $data = json_decode($decoded, true);

        if (
            !is_array($data) ||
            !isset($data['payload']) ||
            !is_array($data['payload']) ||
            !isset($data['sig'])
        ) {
            throw new \RuntimeException('Area ticket không hợp lệ');
        }

        $payload = $data['payload'];
        $sig = (string) $data['sig'];

        $raw = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $expectedSig = hash_hmac('sha256', $raw, config('app.key'));

        if (!hash_equals($expectedSig, $sig)) {
            throw new \RuntimeException('Area ticket đã bị sửa hoặc giả mạo');
        }

        if ((int) ($payload['exp'] ?? 0) < time()) {
            throw new \RuntimeException('Area ticket đã hết hạn');
        }

        if ((int) ($payload['uid'] ?? 0) !== $userId) {
            throw new \RuntimeException('Area ticket không đúng người dùng');
        }

        if ((string) ($payload['province_code'] ?? '') !== $provinceCode) {
            throw new \RuntimeException('Area ticket không khớp tỉnh/thành');
        }

        if ((string) ($payload['area_code'] ?? '') !== $areaCode) {
            throw new \RuntimeException('Area ticket không khớp xã/phường');
        }
    }

    protected function computeGeoJsonBBoxFromPath(string $path): array
    {
        if (!is_file($path)) {
            throw new \RuntimeException('Không đọc được file GeoJSON');
        }

        $json = json_decode(file_get_contents($path), true);

        if (!is_array($json) || ($json['type'] ?? null) !== 'FeatureCollection') {
            throw new \RuntimeException('GeoJSON không hợp lệ');
        }

        $features = $json['features'] ?? [];

        if (!is_array($features) || empty($features)) {
            throw new \RuntimeException('GeoJSON không có features');
        }

        $minX = INF;
        $minY = INF;
        $maxX = -INF;
        $maxY = -INF;

        foreach ($features as $feature) {
            $geometry = $feature['geometry'] ?? null;
            if (!$geometry || !isset($geometry['coordinates'])) {
                continue;
            }

            $this->walkCoordinatesAndExpandBBox(
                $geometry['coordinates'],
                $minX,
                $minY,
                $maxX,
                $maxY
            );
        }

        if (!is_finite($minX) || !is_finite($minY) || !is_finite($maxX) || !is_finite($maxY)) {
            throw new \RuntimeException('Không tính được bbox từ GeoJSON');
        }

        return [$minX, $minY, $maxX, $maxY];
    }

    protected function walkCoordinatesAndExpandBBox(
        mixed $coords,
        float &$minX,
        float &$minY,
        float &$maxX,
        float &$maxY
    ): void {
        if (!is_array($coords)) {
            return;
        }

        if (
            count($coords) >= 2 &&
            is_numeric($coords[0]) &&
            is_numeric($coords[1])
        ) {
            $x = (float) $coords[0];
            $y = (float) $coords[1];

            $minX = min($minX, $x);
            $minY = min($minY, $y);
            $maxX = max($maxX, $x);
            $maxY = max($maxY, $y);

            return;
        }

        foreach ($coords as $child) {
            $this->walkCoordinatesAndExpandBBox($child, $minX, $minY, $maxX, $maxY);
        }
    }

    protected function assertGeoJsonWithinAreaBBox(
        UploadedFile $file,
        string $provinceCode,
        string $areaCode
    ): void {
        $areaMeta = $this->areaBBoxService->find($areaCode);

        if (!$areaMeta) {
            throw new \RuntimeException('Không tìm thấy bbox xã/phường trên server');
        }

        $serverProvinceCode = (string) ($areaMeta['province_code'] ?? '');
        $serverBBox = $areaMeta['bbox'] ?? null;

        if ($serverProvinceCode !== $provinceCode) {
            throw new \RuntimeException('bbox xã/phường không khớp tỉnh/thành');
        }

        if (!is_array($serverBBox) || count($serverBBox) !== 4) {
            throw new \RuntimeException('bbox xã/phường không hợp lệ');
        }

        $uploadBBox = $this->computeGeoJsonBBoxFromPath($file->getRealPath());

        if (!$this->bboxInsideOrOverlapEnough($uploadBBox, $serverBBox)) {
            throw new \RuntimeException('Dữ liệu GeoJSON nằm ngoài phạm vi xã/phường đã chọn');
        }
    }

    protected function bboxInsideOrOverlapEnough(array $uploadBBox, array $areaBBox): bool
    {
        [$uMinX, $uMinY, $uMaxX, $uMaxY] = $uploadBBox;
        [$aMinX, $aMinY, $aMaxX, $aMaxY] = $areaBBox;

        $interMinX = max($uMinX, $aMinX);
        $interMinY = max($uMinY, $aMinY);
        $interMaxX = min($uMaxX, $aMaxX);
        $interMaxY = min($uMaxY, $aMaxY);

        if ($interMinX >= $interMaxX || $interMinY >= $interMaxY) {
            return false;
        }

        $uploadArea = max(($uMaxX - $uMinX), 0) * max(($uMaxY - $uMinY), 0);
        $interArea = max(($interMaxX - $interMinX), 0) * max(($interMaxY - $interMinY), 0);

        if ($uploadArea <= 0) {
            return false;
        }

        $ratio = $interArea / $uploadArea;

        return $ratio >= 0.90;
    }

    protected function buildApiUrls(MapFile $file): array
    {
        return [
            'parcel_viewport_features' => route('map.api.parcel-viewport-features', ['id' => $file->id]),
            'prepare_hosting_artifacts' => route('map.api.prepare-hosting-artifacts', ['id' => $file->id]),
            'parcel_search' => route('map.api.parcel-search', ['id' => $file->id]),
            'parcel_feature_resolve' => route('map.api.parcel-feature-resolve', ['id' => $file->id]),
            'planning_candidates' => route('map.api.planning-candidates', ['id' => $file->id]),
            'split_preview' => route('map.api.split-preview', ['id' => $file->id]),
        ];
    }

    protected function clearParcelIndexSafe(int $mapFileId): void
    {
        try {
            DB::table('parcel_indices')->where('map_file_id', $mapFileId)->delete();
        } catch (\Throwable $e) {
        }
    }

    protected function deleteDirectoryRecursive(string $absoluteDir): void
    {
        if (!is_dir($absoluteDir)) {
            return;
        }

        $items = scandir($absoluteDir);
        if ($items === false) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $absoluteDir . DIRECTORY_SEPARATOR . $item;
            if (is_dir($path)) {
                $this->deleteDirectoryRecursive($path);
            } elseif (file_exists($path)) {
                @unlink($path);
            }
        }

        @rmdir($absoluteDir);
    }

    protected function deleteFileIfExists(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
