<?php

namespace App\Services;

use App\Models\MapFile;
use App\Models\ParcelIndex;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
class MapFeatureService
{
    /** @var array<string, array|null> */
    protected static array $geojsonCache = [];

    public function getParcelViewportFeatures(MapFile $mapFile, $bboxInput, array $options = []): array
    {
        $bbox = $this->parseViewportBbox($bboxInput);
        if (!$bbox) {
            throw new \RuntimeException('bbox không hợp lệ');
        }

        $zoom = (int) ($options['zoom'] ?? 0);
        $limit = max(200, min(10000, (int) ($options['limit'] ?? 6000)));
        $minZoom = 17;

        if ($zoom > 0 && $zoom < $minZoom) {
            return $this->buildEmptyViewportResponse($bbox, $zoom, $minZoom, true, false, 0, 0, 'Hãy zoom từ mức 17 trở lên để tải đầy đủ thửa trong vùng nhìn.');
        }

        $this->ensureParcelIndex($mapFile);

        if ($this->isParcelChunkGridReady($mapFile)) {
            return $this->getParcelViewportFeaturesFromChunkGrid($mapFile, $bbox, $zoom, $limit, $minZoom);
        }

        return $this->getParcelViewportFeaturesFromFullGeoJson($mapFile, $bbox, $zoom, $limit, $minZoom);
    }

    public function searchParcels(MapFile $mapFile, array $filters, int $limit = 100): array
    {
        $limit = max(1, min(200, $limit));

        $this->ensureParcelIndex($mapFile);

        $query = ParcelIndex::query()
            ->where('map_file_id', $mapFile->id);

        $filterMap = [
            'shbando' => 'shbando',
            'sotocu' => 'sotocu',
            'shthua' => 'shthua',
            'tenchu' => 'tenchu',
        ];

        foreach ($filterMap as $inputKey => $column) {
            $value = trim((string) ($filters[$inputKey] ?? ''));
            if ($value !== '') {
                $query->where($column, 'like', '%' . $value . '%');
            }
        }

        $total = (clone $query)->count();

        $items = $query
            ->orderBy('shbando')
            ->orderBy('shthua')
            ->limit($limit)
            ->get()
            ->map(function (ParcelIndex $row) {
                return [
                    'feature_uid' => $row->feature_uid,
                    'shbando' => $row->shbando,
                    'sotocu' => $row->sotocu,
                    'shthua' => $row->shthua,
                    'tenchu' => $row->tenchu,
                    'centroid' => [$row->centroid_lng, $row->centroid_lat],
                    'bbox' => [
                        $row->bbox_min_lng,
                        $row->bbox_min_lat,
                        $row->bbox_max_lng,
                        $row->bbox_max_lat,
                    ],
                ];
            })
            ->all();

        return [
            'items' => $items,
            'total_matched' => $total,
        ];
    }

    public function resolveParcelFeature(MapFile $mapFile, array $needle): ?array
    {
        $featureUid = trim((string) ($needle['feature_uid'] ?? ''));
        $properties = is_array($needle['properties'] ?? null) ? $needle['properties'] : [];
        $bbox = $this->normalizeBbox($needle['bbox'] ?? null);
        $center = $this->normalizeCoord($needle['center'] ?? null);
        $shortlist = $this->buildResolveShortlist($mapFile, $featureUid, $properties, $bbox);

        $bestFeature = null;
        $bestScore = 0;

        foreach ($this->readFeatures($mapFile) as $feature) {
            $candidateUid = $this->buildFeatureUid($feature);

            if ($featureUid !== '' && $candidateUid === $featureUid) {
                return $feature;
            }

            $score = $this->scoreFeatureMatch($feature, $properties, $bbox, $center);

            if ($shortlist && isset($shortlist[$candidateUid])) {
                $score += 40;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestFeature = $feature;

                if ($bestScore >= 140) {
                    break;
                }
            }
        }

        return $bestScore > 0 ? $bestFeature : null;
    }

    public function getPlanningCandidates(MapFile $planningMapFile, array $parcelFeature, int $limit = 300): array
    {
        $limit = max(1, min(500, $limit));
        $parcelBbox = $this->computeFeatureBbox($parcelFeature);
        if (!$parcelBbox) {
            return [];
        }

        $results = [];
        foreach ($this->readFeatures($planningMapFile) as $feature) {
            $featureBbox = $this->computeFeatureBbox($feature);
            if (!$featureBbox) {
                continue;
            }

            if (!$this->bboxIntersects($parcelBbox, $featureBbox)) {
                continue;
            }

            $results[] = $feature;
            if (count($results) >= $limit) {
                break;
            }
        }

        return $results;
    }

    public function splitFeatureByVertices(array $feature, int $idx1, int $idx2): array
    {
        $ring = $this->getOuterRing($feature);
        if (count($ring) < 4) {
            throw new \RuntimeException('Ring không hợp lệ để tách.');
        }

        if ($this->coordsEqual($ring[0], $ring[count($ring) - 1])) {
            array_pop($ring);
        }

        $n = count($ring);
        if ($n < 3) {
            throw new \RuntimeException('Ring không đủ số đỉnh.');
        }

        if ($idx1 < 0 || $idx2 < 0 || $idx1 >= $n || $idx2 >= $n || $idx1 === $idx2) {
            throw new \RuntimeException('Chỉ số đỉnh tách không hợp lệ.');
        }

        $forward = [];
        $i = $idx1;
        while (true) {
            $forward[] = $ring[$i];
            if ($i === $idx2) {
                break;
            }
            $i = ($i + 1) % $n;
        }
        $forward[] = $ring[$idx1];

        $backward = [];
        $i = $idx2;
        while (true) {
            $backward[] = $ring[$i];
            if ($i === $idx1) {
                break;
            }
            $i = ($i + 1) % $n;
        }
        $backward[] = $ring[$idx2];

        if (count($forward) < 4 || count($backward) < 4) {
            throw new \RuntimeException('Một trong hai thửa sau tách không đủ số đỉnh.');
        }

        $f1 = $feature;
        $f2 = $feature;
        $this->setOuterRing($f1, $forward);
        $this->setOuterRing($f2, $backward);

        $props1 = is_array($f1['properties'] ?? null) ? $f1['properties'] : [];
        $props2 = is_array($f2['properties'] ?? null) ? $f2['properties'] : [];
        $parentParcelNo = (string) ($props1['DISPLAY_NAME'] ?? $props1['SHTHUA'] ?? '-');

        $props1['DISPLAY_NAME'] = $parentParcelNo . '-1';
        $props2['DISPLAY_NAME'] = $parentParcelNo . '-2';
        $f1['properties'] = $props1;
        $f2['properties'] = $props2;

        return [$f1, $f2];
    }

    public function hasParcelIndex(MapFile $mapFile): bool
    {
        try {
            return ParcelIndex::query()->where('map_file_id', $mapFile->id)->exists();
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function refreshMapSummary(MapFile $mapFile): array
    {
        $document = $this->getGeoJsonDocument($mapFile);
        $features = is_array($document['features'] ?? null) ? $document['features'] : [];

        $count = count($features);
        $globalBbox = null;

        if (is_array($document['bbox'] ?? null) && count($document['bbox']) >= 4) {
            $globalBbox = array_values(array_slice(array_map('floatval', $document['bbox']), 0, 4));
        }

        if (!$globalBbox) {
            foreach ($features as $feature) {
                $bbox = $this->computeFeatureBbox($feature);
                if (!$bbox) {
                    continue;
                }
                $globalBbox = $globalBbox ? $this->mergeBbox($globalBbox, $bbox) : $bbox;
            }
        }

        $dirty = false;

        if ((int) $mapFile->feature_count !== $count) {
            $mapFile->feature_count = $count;
            $dirty = true;
        }

        $existingBbox = $this->normalizeBbox($mapFile->bbox);
        if ($globalBbox && $existingBbox !== $globalBbox) {
            $mapFile->bbox = $globalBbox;
            $dirty = true;
        }

        if ($dirty) {
            $mapFile->save();
        }

        return [
            'feature_count' => $count,
            'bbox' => $globalBbox,
        ];
    }

public function ensureParcelIndex(MapFile $mapFile): void
{
    if (!in_array(strtolower((string) $mapFile->type), ['dcmoi', 'dccu'], true)) {
        return;
    }

    Cache::lock('parcel-index-build:' . $mapFile->id, 60)->block(15, function () use ($mapFile) {
        $mapFile->refresh();

        if ($this->hasParcelIndex($mapFile)) {
            if ((int) $mapFile->feature_count <= 0 || !is_array($mapFile->bbox)) {
                $this->refreshMapSummary($mapFile);
            }
            return;
        }

        $batch = [];
        $count = 0;
        $globalBbox = null;
        $now = now();

        DB::transaction(function () use ($mapFile, &$batch, &$count, &$globalBbox, $now) {
            ParcelIndex::query()->where('map_file_id', $mapFile->id)->delete();

            foreach ($this->readFeatures($mapFile) as $feature) {
                $bbox = $this->computeFeatureBbox($feature);
                if (!$bbox) {
                    continue;
                }

                $props = is_array($feature['properties'] ?? null) ? $feature['properties'] : [];
                $centroid = [($bbox[0] + $bbox[2]) / 2, ($bbox[1] + $bbox[3]) / 2];
                $featureUid = $this->buildFeatureUid($feature);

                // chống trùng uid ngay trong cùng một lượt build
                $batch[$featureUid] = [
                    'map_file_id' => $mapFile->id,
                    'feature_uid' => $featureUid,
                    'shbando' => $this->toText($props['SHBANDO'] ?? null),
                    'sotocu' => $this->toText($props['SOTOCU'] ?? null),
                    'shthua' => $this->toText($props['SHTHUA'] ?? null),
                    'tenchu' => $this->toText($props['TENCHU'] ?? null),
                    'bbox_min_lng' => $bbox[0],
                    'bbox_min_lat' => $bbox[1],
                    'bbox_max_lng' => $bbox[2],
                    'bbox_max_lat' => $bbox[3],
                    'centroid_lng' => $centroid[0],
                    'centroid_lat' => $centroid[1],
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                $count++;
                $globalBbox = $globalBbox ? $this->mergeBbox($globalBbox, $bbox) : $bbox;

                if (count($batch) >= 500) {
                    ParcelIndex::upsert(
                        array_values($batch),
                        ['map_file_id', 'feature_uid'],
                        [
                            'shbando',
                            'sotocu',
                            'shthua',
                            'tenchu',
                            'bbox_min_lng',
                            'bbox_min_lat',
                            'bbox_max_lng',
                            'bbox_max_lat',
                            'centroid_lng',
                            'centroid_lat',
                            'updated_at',
                        ]
                    );
                    $batch = [];
                }
            }

            if ($batch) {
                ParcelIndex::upsert(
                    array_values($batch),
                    ['map_file_id', 'feature_uid'],
                    [
                        'shbando',
                        'sotocu',
                        'shthua',
                        'tenchu',
                        'bbox_min_lng',
                        'bbox_min_lat',
                        'bbox_max_lng',
                        'bbox_max_lat',
                        'centroid_lng',
                        'centroid_lat',
                        'updated_at',
                    ]
                );
            }

            $mapFile->feature_count = $count;
            if ($globalBbox) {
                $mapFile->bbox = $globalBbox;
            }
            $mapFile->save();
        });
    });
}
    public function getGeoJsonDocument(MapFile $mapFile): array
    {
        $path = $mapFile->file_path;
        if (!$path || !Storage::disk('public')->exists($path)) {
            return [];
        }

        $absolute = Storage::disk('public')->path($path);
        if (!is_file($absolute)) {
            return [];
        }

        $mtime = @filemtime($absolute) ?: 0;
        $cacheKey = $absolute . '|' . $mtime . '|' . (int) $mapFile->id;

        if (array_key_exists($cacheKey, self::$geojsonCache)) {
            return self::$geojsonCache[$cacheKey] ?: [];
        }

        $json = json_decode((string) file_get_contents($absolute), true);
        if (!is_array($json) || !is_array($json['features'] ?? null)) {
            self::$geojsonCache[$cacheKey] = [];
            return [];
        }

        self::$geojsonCache = [$cacheKey => $json];

        return $json;
    }

    public function clearGeoJsonCache(MapFile $mapFile): void
    {
        $path = $mapFile->file_path;
        if (!$path) {
            self::$geojsonCache = [];
            return;
        }

        $absolute = Storage::disk('public')->path($path);
        foreach (array_keys(self::$geojsonCache) as $cacheKey) {
            if (str_starts_with($cacheKey, $absolute . '|')) {
                unset(self::$geojsonCache[$cacheKey]);
            }
        }
    }


    protected function buildEmptyViewportResponse(array $bbox, int $zoom, int $minZoom, bool $requiresZoomIn, bool $truncated, int $returnedCount, int $totalCandidates, string $message): array
    {
        return [
            'feature_collection' => [
                'type' => 'FeatureCollection',
                'features' => [],
                'bbox' => $bbox,
            ],
            'bbox' => $bbox,
            'zoom' => $zoom,
            'min_zoom' => $minZoom,
            'requires_zoom_in' => $requiresZoomIn,
            'is_complete' => !$requiresZoomIn && !$truncated,
            'truncated' => $truncated,
            'returned_count' => $returnedCount,
            'total_candidates' => $totalCandidates,
            'message' => $message,
        ];
    }

    protected function getParcelViewportFeaturesFromFullGeoJson(MapFile $mapFile, array $bbox, int $zoom, int $limit, int $minZoom): array
    {
        $query = ParcelIndex::query()
            ->where('map_file_id', $mapFile->id)
            ->where('bbox_max_lng', '>=', $bbox[0])
            ->where('bbox_min_lng', '<=', $bbox[2])
            ->where('bbox_max_lat', '>=', $bbox[1])
            ->where('bbox_min_lat', '<=', $bbox[3]);

        $totalCandidates = (clone $query)->count();
        if ($totalCandidates <= 0) {
            return $this->buildEmptyViewportResponse($bbox, $zoom, $minZoom, false, false, 0, 0, 'Không có thửa nào trong vùng nhìn hiện tại.');
        }

        if ($totalCandidates > $limit) {
            return $this->buildEmptyViewportResponse($bbox, $zoom, $minZoom, true, true, 0, $totalCandidates, 'Vùng hiện tại quá dày thửa. Hãy zoom gần thêm để tải đủ toàn bộ thửa trong màn hình.');
        }

        $selectedUids = array_fill_keys(
            $query->pluck('feature_uid')->map(fn ($uid) => (string) $uid)->all(),
            true
        );

        $features = [];
        if ($selectedUids) {
            foreach ($this->readFeatures($mapFile) as $feature) {
                $uid = $this->buildFeatureUid($feature);
                if (!isset($selectedUids[$uid])) {
                    continue;
                }

                $featureBbox = $this->computeFeatureBbox($feature);
                if ($featureBbox && !$this->bboxIntersects($bbox, $featureBbox)) {
                    continue;
                }

                $feature['properties'] = is_array($feature['properties'] ?? null) ? $feature['properties'] : [];
                if (!isset($feature['properties']['PARCEL_UID']) || $feature['properties']['PARCEL_UID'] === '') {
                    $feature['properties']['PARCEL_UID'] = $uid;
                }
                $features[] = $feature;
            }
        }

        return [
            'feature_collection' => [
                'type' => 'FeatureCollection',
                'features' => array_values($features),
                'bbox' => $bbox,
            ],
            'bbox' => $bbox,
            'zoom' => $zoom,
            'min_zoom' => $minZoom,
            'requires_zoom_in' => false,
            'is_complete' => true,
            'truncated' => false,
            'returned_count' => count($features),
            'total_candidates' => $totalCandidates,
            'message' => 'OK',
        ];
    }


    public function needsParcelChunkGrid(MapFile $mapFile): bool
    {
        if (!in_array(strtolower((string) $mapFile->type), ['dcmoi', 'dccu'], true)) {
            return false;
        }

        $featureCount = (int) ($mapFile->feature_count ?? 0);
        if ($featureCount <= 1500) {
            return false;
        }

        return !$this->isParcelChunkGridReady($mapFile);
    }

    public function isParcelChunkGridReady(MapFile $mapFile): bool
    {
        $manifest = $this->getParcelChunkManifest($mapFile);
        if (!is_array($manifest)) {
            return false;
        }

        $manifestFeatureCount = (int) ($manifest['feature_count'] ?? 0);
        $mapFeatureCount = (int) ($mapFile->feature_count ?? 0);

        if ($manifestFeatureCount > 0 && $mapFeatureCount > 0 && $manifestFeatureCount !== $mapFeatureCount) {
            return false;
        }

        return true;
    }

    public function hasParcelChunkGrid(MapFile $mapFile): bool
    {
        $manifestPath = $this->getParcelChunkManifestPath($mapFile);
        return $manifestPath !== null && Storage::disk('public')->exists($manifestPath);
    }

    public function ensureParcelChunkGrid(MapFile $mapFile, bool $force = false): array
    {
        if (!in_array(strtolower((string) $mapFile->type), ['dcmoi', 'dccu'], true)) {
            return ['ready' => false, 'message' => null];
        }

        $manifestPath = $this->getParcelChunkManifestPath($mapFile);
        $chunkDir = $this->getParcelChunkDir($mapFile);
        if ($manifestPath === null || $chunkDir === null) {
            return ['ready' => false, 'message' => 'Không xác định được thư mục chunk'];
        }

        if (!$force && Storage::disk('public')->exists($manifestPath)) {
            $manifest = $this->getParcelChunkManifest($mapFile);
            if (is_array($manifest) && ((int) ($manifest['feature_count'] ?? 0) === (int) $mapFile->feature_count)) {
                return [
                    'ready' => true,
                    'message' => 'Đã có lưới chunk địa chính sẵn cho hosting.',
                ];
            }
        }

        Cache::lock('parcel-chunk-build:' . $mapFile->id, 300)->block(30, function () use ($mapFile, $manifestPath, $chunkDir) {
            Storage::disk('public')->deleteDirectory($chunkDir);
            Storage::disk('public')->makeDirectory($chunkDir);

            $gridZoom = 18;
            $bucketFeatures = [];
            $bucketBboxes = [];
            $featureCount = 0;
            $oversizedCount = 0;

            foreach ($this->readFeatures($mapFile) as $feature) {
                $bbox = $this->computeFeatureBbox($feature);
                if (!$bbox) {
                    continue;
                }

                $uid = $this->buildFeatureUid($feature);
                $feature['properties'] = is_array($feature['properties'] ?? null) ? $feature['properties'] : [];
                if (!isset($feature['properties']['PARCEL_UID']) || $feature['properties']['PARCEL_UID'] === '') {
                    $feature['properties']['PARCEL_UID'] = $uid;
                }
                $feature['bbox'] = $bbox;

                $tileRange = $this->bboxToTileRange($bbox, $gridZoom);
                if (!$tileRange) {
                    continue;
                }

                $tileKeys = [];
                $tileSpan = (($tileRange['x_max'] - $tileRange['x_min']) + 1) * (($tileRange['y_max'] - $tileRange['y_min']) + 1);
                if ($tileSpan > 64) {
                    $oversizedCount++;
                    $center = [($bbox[0] + $bbox[2]) / 2, ($bbox[1] + $bbox[3]) / 2];
                    $tile = $this->lngLatToTile($center[0], $center[1], $gridZoom);
                    if ($tile) {
                        $tileKeys[] = $this->tileKey($gridZoom, $tile['x'], $tile['y']);
                    }
                } else {
                    for ($x = $tileRange['x_min']; $x <= $tileRange['x_max']; $x++) {
                        for ($y = $tileRange['y_min']; $y <= $tileRange['y_max']; $y++) {
                            $tileKeys[] = $this->tileKey($gridZoom, $x, $y);
                        }
                    }
                }

                foreach ($tileKeys as $tileKey) {
                    $bucketFeatures[$tileKey][] = $feature;
                    $bucketBboxes[$tileKey] = isset($bucketBboxes[$tileKey])
                        ? $this->mergeBbox($bucketBboxes[$tileKey], $bbox)
                        : $bbox;
                }

                $featureCount++;
            }

            $chunkCount = 0;
            foreach ($bucketFeatures as $tileKey => $features) {
                [$z, $x, $y] = array_map('intval', explode(':', $tileKey));
                $relative = $chunkDir . '/' . $z . '/' . $x . '/' . $y . '.geojson';
                $dir = dirname($relative);
                Storage::disk('public')->makeDirectory($dir);
                Storage::disk('public')->put($relative, json_encode([
                    'type' => 'FeatureCollection',
                    'features' => array_values($features),
                    'bbox' => $bucketBboxes[$tileKey] ?? null,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
                $chunkCount++;
            }

            Storage::disk('public')->put($manifestPath, json_encode([
                'version' => 'grid-chunks-v1',
                'grid_zoom' => $gridZoom,
                'feature_count' => $featureCount,
                'chunk_count' => $chunkCount,
                'oversized_feature_count' => $oversizedCount,
                'updated_at' => now()->toIso8601String(),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        });

        $manifest = $this->getParcelChunkManifest($mapFile);
        return [
            'ready' => is_array($manifest),
            'message' => is_array($manifest)
                ? ('Đã chia sẵn ' . (int) ($manifest['chunk_count'] ?? 0) . ' chunk địa chính cho hosting.')
                : 'Không tạo được manifest chunk địa chính.',
        ];
    }

    protected function getParcelViewportFeaturesFromChunkGrid(MapFile $mapFile, array $bbox, int $zoom, int $limit, int $minZoom): array
    {
        $manifest = $this->getParcelChunkManifest($mapFile);
        if (!is_array($manifest)) {
            return $this->getParcelViewportFeaturesFromFullGeoJson($mapFile, $bbox, $zoom, $limit, $minZoom);
        }

        $gridZoom = max(1, (int) ($manifest['grid_zoom'] ?? 17));
        $tileRange = $this->bboxToTileRange($bbox, $gridZoom);
        if (!$tileRange) {
            return $this->buildEmptyViewportResponse($bbox, $zoom, $minZoom, false, false, 0, 0, 'Không có thửa nào trong vùng nhìn hiện tại.');
        }

        $seen = [];
        $features = [];
        for ($x = $tileRange['x_min']; $x <= $tileRange['x_max']; $x++) {
            for ($y = $tileRange['y_min']; $y <= $tileRange['y_max']; $y++) {
                foreach ($this->readParcelChunkFile($mapFile, $gridZoom, $x, $y) as $feature) {
                    $uid = (string) ($feature['properties']['PARCEL_UID'] ?? $this->buildFeatureUid($feature));
                    if (isset($seen[$uid])) {
                        continue;
                    }
                    $featureBbox = $this->computeFeatureBbox($feature);
                    if ($featureBbox && !$this->bboxIntersects($bbox, $featureBbox)) {
                        continue;
                    }
                    $seen[$uid] = true;
                    $features[] = $feature;
                    if (count($features) > $limit) {
                        return $this->buildEmptyViewportResponse($bbox, $zoom, $minZoom, true, true, 0, count($features), 'Vùng hiện tại quá dày thửa. Hãy zoom gần thêm để tải đủ toàn bộ thửa trong màn hình.');
                    }
                }
            }
        }

        $totalCandidates = count($features);
        if ($totalCandidates <= 0) {
            return $this->buildEmptyViewportResponse($bbox, $zoom, $minZoom, false, false, 0, 0, 'Không có thửa nào trong vùng nhìn hiện tại.');
        }

        return [
            'feature_collection' => [
                'type' => 'FeatureCollection',
                'features' => array_values($features),
                'bbox' => $bbox,
            ],
            'bbox' => $bbox,
            'zoom' => $zoom,
            'min_zoom' => $minZoom,
            'requires_zoom_in' => false,
            'is_complete' => true,
            'truncated' => false,
            'returned_count' => $totalCandidates,
            'total_candidates' => $totalCandidates,
            'message' => 'OK',
        ];
    }

    protected function getParcelChunkDir(MapFile $mapFile): ?string
    {
        if (!$mapFile->file_path) {
            return null;
        }
        $relativeDir = trim(dirname((string) $mapFile->file_path), '.\/');
        return $relativeDir === '' ? null : ($relativeDir . '/parcel_chunks');
    }

    protected function getParcelChunkManifestPath(MapFile $mapFile): ?string
    {
        if (!$mapFile->file_path) {
            return null;
        }
        $relativeDir = trim(dirname((string) $mapFile->file_path), '.\/');
        return $relativeDir === '' ? null : ($relativeDir . '/parcel-chunk-manifest.json');
    }

    protected function getParcelChunkManifest(MapFile $mapFile): ?array
    {
        $manifestPath = $this->getParcelChunkManifestPath($mapFile);
        if (!$manifestPath || !Storage::disk('public')->exists($manifestPath)) {
            return null;
        }
        $json = json_decode((string) Storage::disk('public')->get($manifestPath), true);
        return is_array($json) ? $json : null;
    }

    protected function readParcelChunkFile(MapFile $mapFile, int $z, int $x, int $y): array
    {
        $chunkDir = $this->getParcelChunkDir($mapFile);
        if (!$chunkDir) {
            return [];
        }
        $path = $chunkDir . '/' . $z . '/' . $x . '/' . $y . '.geojson';
        if (!Storage::disk('public')->exists($path)) {
            return [];
        }
        try {
            $json = json_decode((string) Storage::disk('public')->get($path), true);
            return is_array($json['features'] ?? null) ? $json['features'] : [];
        } catch (\Throwable $e) {
            Log::warning('READ PARCEL CHUNK FAILED', [
                'map_file_id' => $mapFile->id,
                'path' => $path,
                'message' => $e->getMessage(),
            ]);
            return [];
        }
    }

    protected function tileKey(int $z, int $x, int $y): string
    {
        return $z . ':' . $x . ':' . $y;
    }

    protected function bboxToTileRange(array $bbox, int $z): ?array
    {
        $sw = $this->lngLatToTile($bbox[0], $bbox[3], $z);
        $ne = $this->lngLatToTile($bbox[2], $bbox[1], $z);
        if (!$sw || !$ne) {
            return null;
        }
        return [
            'x_min' => min($sw['x'], $ne['x']),
            'x_max' => max($sw['x'], $ne['x']),
            'y_min' => min($sw['y'], $ne['y']),
            'y_max' => max($sw['y'], $ne['y']),
        ];
    }

    protected function lngLatToTile(float $lng, float $lat, int $z): ?array
    {
        $lat = max(-85.05112878, min(85.05112878, $lat));
        $n = 2 ** $z;
        $x = (int) floor(($lng + 180.0) / 360.0 * $n);
        $latRad = deg2rad($lat);
        $y = (int) floor((1.0 - log(tan($latRad) + 1.0 / cos($latRad)) / M_PI) / 2.0 * $n);
        $x = max(0, min($n - 1, $x));
        $y = max(0, min($n - 1, $y));
        return ['x' => $x, 'y' => $y];
    }

    protected function readFeatures(MapFile $mapFile): array
    {
        $json = $this->getGeoJsonDocument($mapFile);
        return is_array($json['features'] ?? null) ? $json['features'] : [];
    }

public function buildFeatureUid(array $feature): string
{
    $props = is_array($feature['properties'] ?? null) ? $feature['properties'] : [];
    $directKeys = ['PARCEL_UID', 'parcel_uid', 'uid', 'UID', 'OBJECTID', 'OBJECTID_1', 'FID', 'fid', 'ID', 'id', 'gid', 'GID'];

    foreach ($directKeys as $key) {
        if (array_key_exists($key, $props) && $props[$key] !== null && $props[$key] !== '') {
            return (string) $props[$key];
        }
    }

    $bbox = $this->computeFeatureBbox($feature) ?: [0, 0, 0, 0];

    return md5(json_encode([
        'shbando' => $props['SHBANDO'] ?? null,
        'sotocu' => $props['SOTOCU'] ?? null,
        'shthua' => $props['SHTHUA'] ?? null,
        'tenchu' => $props['TENCHU'] ?? null,
        'bbox' => $bbox,
        'geometry' => $feature['geometry'] ?? null,
    ], JSON_UNESCAPED_UNICODE));
}

    protected function buildResolveShortlist(MapFile $mapFile, string $featureUid, array $properties, ?array $bbox): array
    {
        if (!$this->hasParcelIndex($mapFile)) {
            return [];
        }

        try {
            $query = ParcelIndex::query()->where('map_file_id', $mapFile->id);

            if ($featureUid !== '') {
                $uids = (clone $query)->where('feature_uid', $featureUid)->limit(1)->pluck('feature_uid')->all();
                if ($uids) {
                    return array_fill_keys($uids, true);
                }
            }

            if ($bbox) {
                $query->where('bbox_max_lng', '>=', $bbox[0])
                    ->where('bbox_min_lng', '<=', $bbox[2])
                    ->where('bbox_max_lat', '>=', $bbox[1])
                    ->where('bbox_min_lat', '<=', $bbox[3]);
            }

            $textMap = [
                'SHBANDO' => 'shbando',
                'SOTOCU' => 'sotocu',
                'SHTHUA' => 'shthua',
                'TENCHU' => 'tenchu',
            ];

            foreach ($textMap as $inputKey => $column) {
                $value = trim((string) ($properties[$inputKey] ?? ''));
                if ($value !== '') {
                    $query->where($column, 'like', '%' . $value . '%');
                }
            }

            $uids = $query->limit(200)->pluck('feature_uid')->all();
            return $uids ? array_fill_keys($uids, true) : [];
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function scoreFeatureMatch(array $feature, array $properties, ?array $bbox, ?array $center): int
    {
        $candidateProps = is_array($feature['properties'] ?? null) ? $feature['properties'] : [];
        $score = 0;

        $directKeys = ['PARCEL_UID', 'parcel_uid', 'uid', 'UID', 'OBJECTID', 'OBJECTID_1', 'FID', 'fid', 'ID', 'id', 'gid', 'GID'];
        foreach ($directKeys as $key) {
            $a = isset($properties[$key]) ? trim((string) $properties[$key]) : '';
            $b = isset($candidateProps[$key]) ? trim((string) $candidateProps[$key]) : '';
            if ($a !== '' && $b !== '' && $a === $b) {
                $score += 100;
            }
        }

        foreach (['SHBANDO', 'SOTOCU', 'SHTHUA', 'TENCHU', 'KHLOAIDAT'] as $key) {
            $a = mb_strtolower(trim((string) ($properties[$key] ?? '')));
            $b = mb_strtolower(trim((string) ($candidateProps[$key] ?? '')));
            if ($a !== '' && $b !== '' && $a === $b) {
                $score += 12;
            }
        }

        $candidateBbox = $this->computeFeatureBbox($feature);
        if ($bbox && $candidateBbox && $this->bboxIntersects($bbox, $candidateBbox)) {
            $score += 8;
        }

        if ($center && $candidateBbox) {
            if ($center[0] >= $candidateBbox[0] && $center[0] <= $candidateBbox[2] && $center[1] >= $candidateBbox[1] && $center[1] <= $candidateBbox[3]) {
                $score += 6;
            }
        }

        return $score;
    }

    public function computeFeatureBbox(array $feature): ?array
    {
        $existingBbox = $this->normalizeBbox($feature['bbox'] ?? null);
        if ($existingBbox) {
            return $existingBbox;
        }

        $geometry = $feature['geometry'] ?? null;
        if (!is_array($geometry)) {
            return null;
        }

        $coords = $geometry['coordinates'] ?? null;
        if (!is_array($coords)) {
            return null;
        }

        $flat = [];
        $this->flattenCoords($coords, $flat);
        if (!$flat) {
            return null;
        }

        $minX = $maxX = $flat[0][0];
        $minY = $maxY = $flat[0][1];
        foreach ($flat as [$x, $y]) {
            $minX = min($minX, $x);
            $minY = min($minY, $y);
            $maxX = max($maxX, $x);
            $maxY = max($maxY, $y);
        }

        return [$minX, $minY, $maxX, $maxY];
    }

    protected function flattenCoords(array $coords, array &$flat): void
    {
        if (count($coords) >= 2 && is_numeric($coords[0]) && is_numeric($coords[1])) {
            $flat[] = [(float) $coords[0], (float) $coords[1]];
            return;
        }

        foreach ($coords as $part) {
            if (is_array($part)) {
                $this->flattenCoords($part, $flat);
            }
        }
    }

    protected function bboxIntersects(array $a, array $b): bool
    {
        return !(
            $a[2] < $b[0] ||
            $a[0] > $b[2] ||
            $a[3] < $b[1] ||
            $a[1] > $b[3]
        );
    }

    protected function mergeBbox(array $a, array $b): array
    {
        return [
            min($a[0], $b[0]),
            min($a[1], $b[1]),
            max($a[2], $b[2]),
            max($a[3], $b[3]),
        ];
    }

    protected function parseViewportBbox($bboxInput): ?array
    {
        if (is_string($bboxInput)) {
            $parts = array_map('trim', explode(',', $bboxInput));
            if (count($parts) === 4) {
                $bboxInput = array_map('floatval', $parts);
            }
        }

        $bbox = $this->normalizeBbox($bboxInput);
        if (!$bbox) {
            return null;
        }

        if ($bbox[0] > $bbox[2]) {
            [$bbox[0], $bbox[2]] = [$bbox[2], $bbox[0]];
        }
        if ($bbox[1] > $bbox[3]) {
            [$bbox[1], $bbox[3]] = [$bbox[3], $bbox[1]];
        }

        return $bbox;
    }

    protected function normalizeBbox($bbox): ?array
    {
        if (!is_array($bbox) || count($bbox) !== 4) {
            return null;
        }

        return array_map('floatval', $bbox);
    }

    protected function normalizeCoord($coord): ?array
    {
        if (!is_array($coord) || count($coord) < 2) {
            return null;
        }

        return [(float) $coord[0], (float) $coord[1]];
    }

    protected function toText($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        return trim((string) $value);
    }

    protected function getOuterRing(array $feature): array
    {
        $geometry = $feature['geometry'] ?? null;
        if (!is_array($geometry)) {
            return [];
        }

        $type = strtolower((string) ($geometry['type'] ?? ''));
        $coordinates = $geometry['coordinates'] ?? null;
        if (!is_array($coordinates)) {
            return [];
        }

        if ($type === 'polygon') {
            return is_array($coordinates[0] ?? null) ? $coordinates[0] : [];
        }

        if ($type === 'multipolygon') {
            return is_array($coordinates[0][0] ?? null) ? $coordinates[0][0] : [];
        }

        return [];
    }

    protected function setOuterRing(array &$feature, array $ring): void
    {
        $geometry = $feature['geometry'] ?? null;
        if (!is_array($geometry)) {
            throw new \RuntimeException('Feature không có geometry.');
        }

        $type = strtolower((string) ($geometry['type'] ?? ''));
        if ($type === 'polygon') {
            $feature['geometry']['coordinates'][0] = $ring;
            return;
        }

        if ($type === 'multipolygon') {
            $feature['geometry']['coordinates'][0][0] = $ring;
            return;
        }

        throw new \RuntimeException('Chỉ hỗ trợ Polygon hoặc MultiPolygon.');
    }

    protected function coordsEqual(array $a, array $b): bool
    {
        return count($a) >= 2 && count($b) >= 2
            && (float) $a[0] === (float) $b[0]
            && (float) $a[1] === (float) $b[1];
    }
}
