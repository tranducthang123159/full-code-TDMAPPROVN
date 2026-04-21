<?php

namespace App\Services;

use App\Models\MapFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MapArtifactService
{
    public const ARTIFACT_SCHEMA_VERSION = 'v4-grid-chunks';

    public function __construct(
        protected MapFeatureService $featureService,
        protected PmtilesBuilderService $pmtilesBuilder,
    ) {
    }

    public function isCurrent(MapFile $mapFile): bool
    {
        $relativeDir = trim(dirname((string) $mapFile->file_path), '.\\/');
        if ($relativeDir === '') {
            return false;
        }

        $markerPath = $relativeDir . '/artifact.version';
        if (!Storage::disk('public')->exists($markerPath)) {
            return false;
        }

        $version = trim((string) Storage::disk('public')->get($markerPath));

        return $version === self::ARTIFACT_SCHEMA_VERSION;
    }

    public function prepare(MapFile $mapFile, array $options = []): array
    {
        $force = (bool) ($options['force'] ?? false);
        $buildPmtilesNow = (bool) ($options['build_pmtiles_now'] ?? false);
        $queuePmtiles = array_key_exists('queue_pmtiles', $options)
            ? (bool) $options['queue_pmtiles']
            : true;

        $result = [
            'summary' => null,
            'parcel_index_ready' => false,
            'pmtiles_ready' => false,
            'pmtiles_status' => 'missing',
            'lite_ready' => false,
            'ultra_ready' => false,
            'notes' => [],
            'errors' => [],
        ];

        try {
            $result['summary'] = $this->featureService->refreshMapSummary($mapFile);
        } catch (\Throwable $e) {
            $result['errors'][] = 'Không đọc được GeoJSON để lấy thống kê: ' . $e->getMessage();

            return $result;
        }

        try {
            $variant = $this->ensureGeoJsonVariants($mapFile, $force);
            $result['lite_ready'] = $variant['lite_ready'];
            $result['ultra_ready'] = $variant['ultra_ready'];
            if ($variant['note']) {
                $result['notes'][] = $variant['note'];
            }
        } catch (\Throwable $e) {
            $result['errors'][] = 'Không tạo được file lite/ultra: ' . $e->getMessage();
        }

        if (in_array(strtolower((string) $mapFile->type), ['dcmoi', 'dccu'], true)) {
            try {
                $this->featureService->ensureParcelIndex($mapFile);
                $result['parcel_index_ready'] = true;
            } catch (\Throwable $e) {
                $result['errors'][] = 'Không tạo được parcel index: ' . $e->getMessage();
            }

            try {
                $chunkInfo = $this->featureService->ensureParcelChunkGrid($mapFile, $force);
                if (!empty($chunkInfo['ready']) && !empty($chunkInfo['message'])) {
                    $result['notes'][] = (string) $chunkInfo['message'];
                }
            } catch (\Throwable $e) {
                $result['errors'][] = 'Không tạo được lưới chunk địa chính: ' . $e->getMessage();
            }
        }

        try {
            if ($buildPmtilesNow) {
                $pmtiles = $this->ensurePmtiles($mapFile, $force);
            } elseif ($queuePmtiles) {
                $pmtiles = $this->queuePmtilesBuild($mapFile, $force);
            } else {
                $pmtiles = $this->pmtilesBuilder->getStatus($mapFile);
            }

            $result['pmtiles_ready'] = (bool) ($pmtiles['ready'] ?? false);
            $result['pmtiles_status'] = (string) ($pmtiles['status'] ?? ($result['pmtiles_ready'] ? 'ready' : 'missing'));
            if (!empty($pmtiles['message'])) {
                $result['notes'][] = (string) $pmtiles['message'];
            }
        } catch (\Throwable $e) {
            $result['errors'][] = 'Không xử lý được PMTiles: ' . $e->getMessage();
        }

        $this->writeArtifactVersionMarker($mapFile);

        return $result;
    }

    protected function writeArtifactVersionMarker(MapFile $mapFile): void
    {
        try {
            $relativeDir = trim(dirname((string) $mapFile->file_path), '.\\/');
            if ($relativeDir === '') {
                return;
            }

            Storage::disk('public')->put($relativeDir . '/artifact.version', self::ARTIFACT_SCHEMA_VERSION);
        } catch (\Throwable $e) {
            Log::warning('WRITE ARTIFACT VERSION MARKER FAILED', [
                'map_file_id' => $mapFile->id,
                'message' => $e->getMessage(),
            ]);
        }
    }

    protected function ensurePmtiles(MapFile $mapFile, bool $force = false): array
    {
        return $this->pmtilesBuilder->buildForMapFile($mapFile, [
            'force' => $force,
        ]);
    }

    protected function queuePmtilesBuild(MapFile $mapFile, bool $force = false): array
    {
        return $this->pmtilesBuilder->queueBuildForMapFile($mapFile, [
            'force' => $force,
        ]);
    }

    protected function ensureGeoJsonVariants(MapFile $mapFile, bool $force = false): array
    {
        $document = $this->featureService->getGeoJsonDocument($mapFile);
        $features = is_array($document['features'] ?? null) ? $document['features'] : [];
        $featureCount = count($features);

        if (!$features) {
            return [
                'lite_ready' => false,
                'ultra_ready' => false,
                'note' => 'GeoJSON rỗng, bỏ qua lite/ultra',
            ];
        }

        $relativeDir = trim(dirname((string) $mapFile->file_path), '.\\/');
        if ($relativeDir === '') {
            return [
                'lite_ready' => false,
                'ultra_ready' => false,
                'note' => 'Không xác định được thư mục dữ liệu',
            ];
        }

        $litePath = $relativeDir . '/lite.geojson';
        $ultraPath = $relativeDir . '/ultra_lite.geojson';

        $sizeMb = 0.0;
        try {
            $fullPath = Storage::disk('public')->path($mapFile->file_path);
            $sizeMb = is_file($fullPath) ? ((float) filesize($fullPath) / 1024 / 1024) : 0.0;
        } catch (\Throwable $e) {
            $sizeMb = 0.0;
        }

        $liteExists = Storage::disk('public')->exists($litePath);
        $ultraExists = Storage::disk('public')->exists($ultraPath);
        $liteStep = $this->chooseStep($featureCount, $sizeMb, false);
        $ultraStep = $this->chooseStep($featureCount, $sizeMb, true);
        $note = null;

        if ($force || !$liteExists) {
            $liteDoc = $this->simplifyGeoJsonDocument($document, $liteStep);
            Storage::disk('public')->put($litePath, json_encode($liteDoc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            $liteExists = true;
        }

        if ($force || !$ultraExists) {
            $ultraDoc = $this->simplifyGeoJsonDocument($document, $ultraStep);
            Storage::disk('public')->put($ultraPath, json_encode($ultraDoc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            $ultraExists = true;
        }

        $dirty = false;
        if ($liteExists && $mapFile->lite_file_path !== $litePath) {
            $mapFile->lite_file_path = $litePath;
            $dirty = true;
        }

        if ($ultraExists && $mapFile->ultra_lite_file_path !== $ultraPath) {
            $mapFile->ultra_lite_file_path = $ultraPath;
            $dirty = true;
        }

        if ($dirty) {
            $mapFile->save();
        }

        if ($sizeMb > 70) {
            $note = 'Đã tạo file lite/ultra để preview tạm. PMTiles vẫn luôn build từ file full.';
        }

        return [
            'lite_ready' => $liteExists,
            'ultra_ready' => $ultraExists,
            'note' => $note,
        ];
    }

    protected function chooseStep(int $featureCount, float $sizeMb, bool $ultra = false): int
    {
        $base = 1;

        if ($featureCount >= 30000) {
            $base = 2;
        }
        if ($featureCount >= 80000) {
            $base = 3;
        }
        if ($featureCount >= 150000) {
            $base = 4;
        }
        if ($sizeMb >= 35) {
            $base = max($base, 2);
        }
        if ($sizeMb >= 80) {
            $base = max($base, 3);
        }

        return $ultra ? min(4, $base + 1) : min(3, max(1, $base));
    }

    protected function simplifyGeoJsonDocument(array $document, int $step): array
    {
        $step = max(2, $step);
        $copy = $document;
        $copy['features'] = [];

        foreach (($document['features'] ?? []) as $feature) {
            $newFeature = $feature;
            if (is_array($feature['geometry'] ?? null)) {
                $newFeature['geometry'] = $this->simplifyGeometry($feature['geometry'], $step);
            }
            $copy['features'][] = $newFeature;
        }

        return $copy;
    }

    protected function simplifyGeometry(array $geometry, int $step): array
    {
        $type = strtolower((string) ($geometry['type'] ?? ''));
        $coords = $geometry['coordinates'] ?? null;

        if (!is_array($coords)) {
            return $geometry;
        }

        switch ($type) {
            case 'linestring':
                $geometry['coordinates'] = $this->simplifyCoordList($coords, $step, false);
                break;

            case 'multilinestring':
                $geometry['coordinates'] = array_map(fn ($line) => $this->simplifyCoordList($line, $step, false), $coords);
                break;

            case 'polygon':
                $geometry['coordinates'] = array_map(fn ($ring) => $this->simplifyCoordList($ring, $step, true), $coords);
                break;

            case 'multipolygon':
                $geometry['coordinates'] = array_map(function ($polygon) use ($step) {
                    return array_map(fn ($ring) => $this->simplifyCoordList($ring, $step, true), $polygon);
                }, $coords);
                break;
        }

        return $geometry;
    }

    protected function simplifyCoordList(array $coords, int $step, bool $isRing): array
    {
        if (count($coords) <= ($isRing ? 20 : 6)) {
            return $isRing ? $this->ensureClosedRing($coords) : $coords;
        }

        if ($isRing) {
            $step = max(2, min($step, 2));
        } else {
            $step = max(2, min($step, 4));
        }

        $work = $coords;
        $wasClosed = $isRing && $this->coordsEqual($work[0] ?? [], $work[count($work) - 1] ?? []);
        if ($wasClosed) {
            array_pop($work);
        }

        $count = count($work);
        if ($count <= 2) {
            return $isRing ? $this->ensureClosedRing($coords) : $coords;
        }

        $result = [$work[0]];
        for ($i = 1; $i < $count - 1; $i++) {
            if ($i % $step === 0) {
                $result[] = $work[$i];
            }
        }
        $result[] = $work[$count - 1];

        if ($isRing) {
            while (count($result) < 4 && count($result) < $count) {
                $idx = count($result) - 1;
                $candidate = $work[min($idx, $count - 2)] ?? null;
                if (is_array($candidate)) {
                    array_splice($result, -1, 0, [$candidate]);
                } else {
                    break;
                }
            }

            return $this->ensureClosedRing($result);
        }

        return $result;
    }

    protected function ensureClosedRing(array $ring): array
    {
        if (!$ring) {
            return $ring;
        }

        if (!$this->coordsEqual($ring[0], $ring[count($ring) - 1])) {
            $ring[] = $ring[0];
        }

        while (count($ring) < 4) {
            $ring[] = $ring[count($ring) - 1];
        }

        return $ring;
    }

    protected function coordsEqual(array $a, array $b): bool
    {
        return count($a) >= 2 && count($b) >= 2
            && (float) $a[0] === (float) $b[0]
            && (float) $a[1] === (float) $b[1];
    }
}
