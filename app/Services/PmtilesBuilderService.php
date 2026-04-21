<?php

namespace App\Services;

use App\Jobs\BuildPmtilesJob;
use App\Models\MapFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PmtilesBuilderService
{
    public function buildForMapFile(MapFile $mapFile, array $options = []): array
    {
        $force = (bool) ($options['force'] ?? false);
        $fullPath = $mapFile->file_path;

        if (!$fullPath || !Storage::disk('public')->exists($fullPath)) {
            return $this->markFailed($mapFile, 'Không tìm thấy full.geojson');
        }

        if (!$this->isAvailable()) {
            return $this->markFailed($mapFile, 'Hosting chưa có tippecanoe hoặc không cho phép exec');
        }

        $paths = $this->getPaths($mapFile);
        if (!$paths['pmtiles_relative']) {
            return $this->markFailed($mapFile, 'Không xác định được đường dẫn PMTiles');
        }

        if (!$force && Storage::disk('public')->exists($paths['pmtiles_relative'])) {
            return $this->markReady($mapFile, 'PMTiles đã sẵn sàng');
        }

        $lock = $this->acquireLock($paths['lock_abs']);
        if (($lock['acquired'] ?? false) !== true) {
            return [
                'success' => false,
                'ready' => false,
                'queued' => false,
                'status' => 'processing',
                'message' => $lock['message'] ?? 'Đang có tiến trình build PMTiles khác',
            ];
        }

        $tmpOutput = $paths['pmtiles_abs'] . '.building';
        @unlink($tmpOutput);

        try {
            $this->writeStatus($paths['status_abs'], [
                'status' => 'processing',
                'message' => 'Đang build PMTiles từ file full.geojson',
                'updated_at' => now()->toIso8601String(),
            ]);

            $cmd = $this->buildTippecanoeCommand($mapFile, $paths['full_abs'], $tmpOutput);
            $lines = [];
            $exitCode = 1;

            try {
                exec($cmd, $lines, $exitCode);
            } catch (\Throwable $e) {
                return $this->markFailed($mapFile, 'Hosting chặn exec khi build PMTiles', $e->getMessage());
            }

            $log = trim(implode("\n", $lines));
            @file_put_contents($paths['log_abs'], $log);

            if ($exitCode !== 0 || !is_file($tmpOutput)) {
                Log::warning('BUILD PMTILES FAILED', [
                    'map_file_id' => $mapFile->id,
                    'command' => $cmd,
                    'exit_code' => $exitCode,
                    'output' => $log,
                ]);

                @unlink($tmpOutput);
                return $this->markFailed($mapFile, 'Build PMTiles thất bại', $log);
            }

            if (is_file($paths['pmtiles_abs']) && !@unlink($paths['pmtiles_abs'])) {
                @unlink($tmpOutput);
                return $this->markFailed($mapFile, 'Không thể ghi đè file PMTiles cũ');
            }

            if (!@rename($tmpOutput, $paths['pmtiles_abs'])) {
                @unlink($tmpOutput);
                return $this->markFailed($mapFile, 'Không thể hoàn tất file PMTiles');
            }

            return $this->markReady($mapFile, 'Build PMTiles thành công', $log);
        } finally {
            $this->releaseLock($lock['handle'] ?? null, $paths['lock_abs']);
        }
    }

    public function queueBuildForMapFile(MapFile $mapFile, array $options = []): array
    {
        $force = (bool) ($options['force'] ?? false);
        $dispatchMode = strtolower((string) env('PMTILES_DISPATCH_MODE', 'after_response'));
        $status = $this->getStatus($mapFile);

        if (($status['ready'] ?? false) && !$force) {
            return [
                'success' => true,
                'ready' => true,
                'queued' => false,
                'status' => 'ready',
                'message' => 'PMTiles đã sẵn sàng',
            ];
        }

        if (!$this->isAvailable()) {
            return $this->markFailed($mapFile, 'Hosting chưa có tippecanoe hoặc không cho phép exec');
        }

        if (in_array($status['status'] ?? null, ['pending', 'processing'], true) && !$force) {
            return [
                'success' => true,
                'ready' => false,
                'queued' => true,
                'status' => $status['status'],
                'message' => $status['message'] ?: 'PMTiles đang chờ build nền',
            ];
        }

        $paths = $this->getPaths($mapFile);
        $this->writeStatus($paths['status_abs'], [
            'status' => 'pending',
            'message' => 'Đã xếp hàng build PMTiles từ file full.geojson',
            'updated_at' => now()->toIso8601String(),
        ]);

        if ($dispatchMode === 'none') {
            return [
                'success' => true,
                'ready' => false,
                'queued' => false,
                'status' => 'pending',
                'message' => 'Đã đánh dấu chờ build PMTiles. Hãy chạy php artisan tdmap:build-pmtiles',
            ];
        }

        try {
            if ($dispatchMode === 'queue') {
                BuildPmtilesJob::dispatch($mapFile->id, $force);
            } else {
                BuildPmtilesJob::dispatchAfterResponse($mapFile->id, $force);
            }
        } catch (\Throwable $e) {
            Log::warning('QUEUE PMTILES BUILD FAILED', [
                'map_file_id' => $mapFile->id,
                'message' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'ready' => false,
                'queued' => false,
                'status' => 'pending',
                'message' => 'Đã đánh dấu chờ build PMTiles nhưng chưa dispatch được job: ' . $e->getMessage(),
            ];
        }

        return [
            'success' => true,
            'ready' => false,
            'queued' => true,
            'status' => 'pending',
            'message' => $dispatchMode === 'queue'
                ? 'Đã đưa PMTiles vào queue nền'
                : 'Đã lên lịch build PMTiles sau khi trả response',
        ];
    }

    public function getStatus(MapFile $mapFile): array
    {
        $paths = $this->getPaths($mapFile);
        $pmtilesExists = $paths['pmtiles_relative'] && Storage::disk('public')->exists($paths['pmtiles_relative']);
        $status = [
            'ready' => $pmtilesExists,
            'status' => $pmtilesExists ? 'ready' : 'missing',
            'message' => $pmtilesExists ? 'PMTiles đã sẵn sàng' : 'Chưa có PMTiles',
            'pmtiles_relative' => $pmtilesExists ? $paths['pmtiles_relative'] : null,
            'pmtiles_public_url' => $pmtilesExists ? Storage::disk('public')->url($paths['pmtiles_relative']) : null,
            'log_relative' => Storage::disk('public')->exists($paths['log_relative']) ? $paths['log_relative'] : null,
        ];

        if (is_file($paths['status_abs'])) {
            $decoded = json_decode((string) @file_get_contents($paths['status_abs']), true);
            if (is_array($decoded)) {
                $status['status'] = (string) ($decoded['status'] ?? $status['status']);
                $status['message'] = (string) ($decoded['message'] ?? $status['message']);
                $status['updated_at'] = $decoded['updated_at'] ?? null;
                if (!empty($decoded['log'])) {
                    $status['log'] = (string) $decoded['log'];
                }
            }
        }

        if ($pmtilesExists) {
            $status['ready'] = true;
            $status['status'] = 'ready';
            $status['message'] = 'PMTiles đã sẵn sàng';
        } elseif (is_file($paths['lock_abs']) && $status['status'] === 'missing') {
            $status['status'] = 'processing';
            $status['message'] = 'Đang build PMTiles từ file full.geojson';
        } elseif ($status['status'] === 'missing' && $this->isAvailable()) {
            $status['status'] = 'pending';
            $status['message'] = 'PMTiles chưa build xong';
        } elseif ($status['status'] === 'missing') {
            $status['status'] = 'unavailable';
            $status['message'] = 'Hosting chưa có tippecanoe hoặc không cho phép exec';
        }

        return $status;
    }

    public function cleanupForMapFile(MapFile $mapFile): void
    {
        $paths = $this->getPaths($mapFile);

        foreach (['pmtiles_relative', 'status_relative', 'log_relative', 'lock_relative'] as $key) {
            $relative = $paths[$key] ?? null;
            if ($relative && Storage::disk('public')->exists($relative)) {
                Storage::disk('public')->delete($relative);
            }
        }

        foreach (['pmtiles_abs', 'status_abs', 'log_abs', 'lock_abs'] as $key) {
            $absolute = $paths[$key] ?? null;
            if ($absolute && is_file($absolute)) {
                @unlink($absolute);
            }
        }
    }

    public function isAvailable(): bool
    {
        if (!function_exists('exec')) {
            return false;
        }

        $bin = (string) env('TIPPECANOE_BIN', 'tippecanoe');

        if ($bin !== 'tippecanoe' && is_file($bin) && is_executable($bin)) {
            return true;
        }

        $lines = [];
        $exitCode = 1;

        try {
            exec('command -v ' . escapeshellarg($bin) . ' 2>/dev/null', $lines, $exitCode);
        } catch (\Throwable $e) {
            return false;
        }

        return $exitCode === 0 && !empty($lines);
    }

    protected function buildTippecanoeCommand(MapFile $mapFile, string $input, string $output): string
    {
        $bin = (string) env('TIPPECANOE_BIN', 'tippecanoe');
        $isPlanning = strtolower((string) $mapFile->type) === 'quyhoach';
        $layer = $isPlanning ? 'planning' : 'parcels';

        if ($isPlanning) {
            $minZoom = (int) env('PMTILES_PLANNING_MINZOOM', 11);
            $maxZoom = (int) env('PMTILES_PLANNING_MAXZOOM', 19);
            return sprintf(
                '%s -f -Z%d -z%d --read-parallel --drop-densest-as-needed --extend-zooms-if-still-dropping -o %s -l %s %s 2>&1',
                escapeshellcmd($bin),
                $minZoom,
                $maxZoom,
                escapeshellarg($output),
                escapeshellarg($layer),
                escapeshellarg($input),
            );
        }

        $minZoom = (int) env('PMTILES_PARCEL_MINZOOM', 16);
        $maxZoom = (int) env('PMTILES_PARCEL_MAXZOOM', 20);

        return sprintf(
            '%s -f -Z%d -z%d --read-parallel --detect-shared-borders --no-feature-limit --no-tile-size-limit -o %s -l %s %s 2>&1',
            escapeshellcmd($bin),
            $minZoom,
            $maxZoom,
            escapeshellarg($output),
            escapeshellarg($layer),
            escapeshellarg($input),
        );
    }

    protected function getPaths(MapFile $mapFile): array
    {
        $relativeDir = trim(dirname((string) $mapFile->file_path), '.\\/');
        $relativeDir = $relativeDir === '' || $relativeDir === '.' ? '' : $relativeDir;

        $baseRelative = $relativeDir !== '' ? $relativeDir . '/full.pmtiles' : 'full.pmtiles';
        $statusRelative = $baseRelative . '.status.json';
        $logRelative = $baseRelative . '.build.log';
        $lockRelative = $baseRelative . '.lock';

        return [
            'full_abs' => $mapFile->file_path ? Storage::disk('public')->path($mapFile->file_path) : null,
            'pmtiles_relative' => $baseRelative,
            'pmtiles_abs' => Storage::disk('public')->path($baseRelative),
            'status_relative' => $statusRelative,
            'status_abs' => Storage::disk('public')->path($statusRelative),
            'log_relative' => $logRelative,
            'log_abs' => Storage::disk('public')->path($logRelative),
            'lock_relative' => $lockRelative,
            'lock_abs' => Storage::disk('public')->path($lockRelative),
        ];
    }

    protected function writeStatus(string $absolutePath, array $payload): void
    {
        $dir = dirname($absolutePath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        @file_put_contents(
            $absolutePath,
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
        );
    }

    protected function acquireLock(string $lockPath): array
    {
        if (is_file($lockPath)) {
            $maxAge = (int) env('PMTILES_LOCK_TIMEOUT_SECONDS', 7200);
            $mtime = @filemtime($lockPath) ?: 0;
            if ($mtime > 0 && (time() - $mtime) > $maxAge) {
                @unlink($lockPath);
            }
        }

        $dir = dirname($lockPath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        $handle = @fopen($lockPath, 'x');
        if ($handle === false) {
            return [
                'acquired' => false,
                'message' => 'Đang có tiến trình build PMTiles khác hoặc lock chưa được giải phóng',
            ];
        }

        @fwrite($handle, (string) getmypid());

        return [
            'acquired' => true,
            'handle' => $handle,
        ];
    }

    protected function releaseLock($handle, string $lockPath): void
    {
        if (is_resource($handle)) {
            @fclose($handle);
        }

        if (is_file($lockPath)) {
            @unlink($lockPath);
        }
    }

    protected function markReady(MapFile $mapFile, string $message, ?string $log = null): array
    {
        $paths = $this->getPaths($mapFile);
        $payload = [
            'status' => 'ready',
            'message' => $message,
            'updated_at' => now()->toIso8601String(),
        ];

        if ($log !== null && $log !== '') {
            $payload['log'] = $log;
            @file_put_contents($paths['log_abs'], $log);
        }

        $this->writeStatus($paths['status_abs'], $payload);

        return [
            'success' => true,
            'ready' => true,
            'queued' => false,
            'status' => 'ready',
            'message' => $message,
            'path' => $paths['pmtiles_abs'],
            'log' => $log,
        ];
    }

    protected function markFailed(MapFile $mapFile, string $message, ?string $log = null): array
    {
        $paths = $this->getPaths($mapFile);
        $payload = [
            'status' => 'failed',
            'message' => $message,
            'updated_at' => now()->toIso8601String(),
        ];

        if ($log !== null && $log !== '') {
            $payload['log'] = $log;
            @file_put_contents($paths['log_abs'], $log);
        }

        $this->writeStatus($paths['status_abs'], $payload);

        return [
            'success' => false,
            'ready' => false,
            'queued' => false,
            'status' => 'failed',
            'message' => $message,
            'log' => $log,
        ];
    }
}
