<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class AreaBBoxService
{
    public function all(): array
    {
        return Cache::remember('area_bbox_all_v1', 3600, function () {
            $path = storage_path('app/geo/area_bbox.json');

            if (!is_file($path)) {
                throw new \RuntimeException('Thiếu file area_bbox.json');
            }

            $json = json_decode(file_get_contents($path), true);

            if (!is_array($json)) {
                throw new \RuntimeException('File area_bbox.json không hợp lệ');
            }

            return $json;
        });
    }

    public function find(string|int $areaCode): ?array
    {
        $items = $this->all();
        $areaCode = (string) $areaCode;

        return $items[$areaCode] ?? null;
    }
}
