<?php

namespace App\Console\Commands;

use App\Models\MapFile;
use App\Services\PmtilesBuilderService;
use Illuminate\Console\Command;

class BuildPmtilesCommand extends Command
{
    protected $signature = 'tdmap:build-pmtiles {mapFileId?} {--pending-only} {--force}';
    protected $description = 'Build full.pmtiles từ full.geojson bằng tippecanoe';

    public function handle(PmtilesBuilderService $service): int
    {
        $mapFileId = $this->argument('mapFileId');
        $pendingOnly = (bool) $this->option('pending-only');
        $force = (bool) $this->option('force');

        $query = MapFile::query();
        if ($mapFileId) {
            $query->whereKey($mapFileId);
        }

        $count = 0;
        $query->chunkById(20, function ($files) use ($service, $pendingOnly, $force, &$count) {
            foreach ($files as $file) {
                if ($pendingOnly) {
                    $status = $service->getStatus($file);
                    if (!in_array($status['status'] ?? null, ['pending', 'failed', 'missing', 'unavailable'], true) && !$force) {
                        continue;
                    }
                }

                $this->info('Building PMTiles for map file #' . $file->id . ' - ' . $file->file_name);
                $result = $service->buildForMapFile($file, [
                    'force' => $force,
                ]);
                $this->line((string) ($result['message'] ?? 'Done'));
                $count++;
            }
        });

        $this->info('Done: ' . $count . ' file(s).');

        return self::SUCCESS;
    }
}
