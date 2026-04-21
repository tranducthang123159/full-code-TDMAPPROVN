<?php

namespace App\Http\Controllers;

use App\Models\MapFile;
use App\Services\MapFeatureService;
use App\Services\MapArtifactService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MapDataApiController extends Controller
{
    public function __construct(protected MapFeatureService $featureService, protected MapArtifactService $artifactService)
    {
    }

    public function parcelViewportFeatures(Request $request, $id)
    {
        $mapFile = $this->findAuthorizedMapFile($id);
        if (($error = $this->ensureParcelMap($mapFile)) !== null) {
            return $error;
        }

        $zoom = (int) $request->query('zoom', 0);
        $limit = (int) $request->query('limit', 6000);
        $bbox = $request->query('bbox');

        if ($this->featureService->needsParcelChunkGrid($mapFile)) {
            return response()->json([
                'success' => false,
                'requires_prepare' => true,
                'message' => 'File này chưa có chunk hosting hoặc chunk đã cũ. Hệ thống cần chuẩn bị lại dữ liệu để tải nhanh và vẽ đủ thửa.',
            ], 409);
        }

        try {
            $result = $this->featureService->getParcelViewportFeatures($mapFile, $bbox, [
                'zoom' => $zoom,
                'limit' => $limit,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json(array_merge(['success' => true], $result));
    }


    public function prepareHostingArtifacts(Request $request, $id)
    {
        $mapFile = $this->findAuthorizedMapFile($id);
        if (($error = $this->ensureParcelMap($mapFile)) !== null) {
            return $error;
        }

        try {
            $result = $this->artifactService->prepare($mapFile, [
                'force' => true,
                'queue_pmtiles' => false,
                'build_pmtiles_now' => false,
            ]);
            $mapFile->refresh();

            return response()->json([
                'success' => true,
                'message' => 'Đã chuẩn bị lại dữ liệu chunk hosting cho file này.',
                'notes' => $result['notes'] ?? [],
                'errors' => $result['errors'] ?? [],
                'feature_count' => (int) ($mapFile->feature_count ?? 0),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không chuẩn bị được dữ liệu chunk hosting: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function parcelSearch(Request $request, $id)
    {
        $mapFile = $this->findAuthorizedMapFile($id);
        if (($error = $this->ensureParcelMap($mapFile)) !== null) {
            return $error;
        }

        $result = $this->featureService->searchParcels($mapFile, [
            'shbando' => $request->query('shbando'),
            'sotocu' => $request->query('sotocu'),
            'shthua' => $request->query('shthua'),
            'tenchu' => $request->query('tenchu'),
        ], (int)$request->query('limit', 100));

        return response()->json([
            'success' => true,
            'items' => $result['items'],
            'total_matched' => $result['total_matched'],
        ]);
    }

    public function resolveParcelFeature(Request $request, $id)
    {
        $mapFile = $this->findAuthorizedMapFile($id);
        if (($error = $this->ensureParcelMap($mapFile)) !== null) {
            return $error;
        }

        $payload = $request->validate([
            'feature_uid' => 'nullable|string',
            'properties' => 'nullable|array',
            'bbox' => 'nullable|array',
            'center' => 'nullable|array',
            'geometry' => 'nullable|array',
        ]);

        $feature = $this->featureService->resolveParcelFeature($mapFile, $payload);
        if (!$feature) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy thửa đất gốc để thao tác',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'feature' => $feature,
        ]);
    }

    public function planningCandidates(Request $request, $id)
    {
        $planningMap = $this->findAuthorizedMapFile($id);
        if (strtolower((string)$planningMap->type) !== 'quyhoach') {
            return response()->json([
                'success' => false,
                'message' => 'File này không phải bản đồ quy hoạch',
            ], 422);
        }

        $payload = $request->validate([
            'parcel_feature' => 'required|array',
            'limit' => 'nullable|integer|min:1|max:500',
        ]);

        $items = $this->featureService->getPlanningCandidates(
            $planningMap,
            $payload['parcel_feature'],
            (int)($payload['limit'] ?? 300)
        );

        return response()->json([
            'success' => true,
            'items' => $items,
            'total_candidates' => count($items),
        ]);
    }

    public function splitPreview(Request $request, $id)
    {
        $mapFile = $this->findAuthorizedMapFile($id);
        if (($error = $this->ensureParcelMap($mapFile)) !== null) {
            return $error;
        }

        $payload = $request->validate([
            'feature' => 'required|array',
            'selected_vertices' => 'required|array|size:2',
            'selected_vertices.0' => 'required|integer|min:0',
            'selected_vertices.1' => 'required|integer|min:0',
        ]);

        try {
            $features = $this->featureService->splitFeatureByVertices(
                $payload['feature'],
                (int)$payload['selected_vertices'][0],
                (int)$payload['selected_vertices'][1]
            );
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'features' => $features,
        ]);
    }

    protected function findAuthorizedMapFile($id): MapFile
    {
        $mapFile = MapFile::findOrFail($id);

        if ((int)$mapFile->user_id !== (int)Auth::id()) {
            abort(403, 'Bạn không có quyền dùng file này');
        }

        return $mapFile;
    }

    protected function ensureParcelMap(MapFile $mapFile)
    {
        if (!in_array(strtolower((string)$mapFile->type), ['dcmoi', 'dccu'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'API này chỉ áp dụng cho file địa chính',
            ], 422);
        }

        return null;
    }
}
