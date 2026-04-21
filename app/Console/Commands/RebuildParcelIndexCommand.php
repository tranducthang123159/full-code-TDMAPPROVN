<?php

namespace App\Console\Commands;

use App\Models\MapFile;
use App\Services\MapFeatureService;
use Illuminate\Console\Command;

class RebuildParcelIndexCommand extends Command
{
    protected $signature = 'tdmap:rebuild-parcel-index {mapFileId?}';
    protected $description = 'Tạo lại chỉ mục tìm kiếm thửa đất cho một file hoặc toàn bộ file địa chính';

    public function handle(MapFeatureService $featureService): int
    {
        $mapFileId = $this->argument('mapFileId');

        $query = MapFile::query()->whereIn('type', ['dcmoi', 'dccu']);
        if ($mapFileId) {
            $query->whereKey($mapFileId);
        }

        $count = 0;
        $query->chunkById(20, function ($files) use ($featureService, &$count) {
            foreach ($files as $file) {
                $this->info('Indexing map file #' . $file->id . ' - ' . $file->file_name);
                $featureService->ensureParcelIndex($file);
                $count++;
            }
        });

        $this->info('Done: ' . $count . ' file(s).');
        return self::SUCCESS;
    }
}
