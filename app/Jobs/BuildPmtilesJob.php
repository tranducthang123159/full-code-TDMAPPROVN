<?php

namespace App\Jobs;

use App\Models\MapFile;
use App\Services\PmtilesBuilderService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class BuildPmtilesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 3600;
    public int $tries = 1;

    public function __construct(public int $mapFileId, public bool $force = false)
    {
    }

    public function handle(PmtilesBuilderService $builder): void
    {
        $mapFile = MapFile::find($this->mapFileId);
        if (!$mapFile) {
            return;
        }

        $builder->buildForMapFile($mapFile, [
            'force' => $this->force,
        ]);
    }
}
