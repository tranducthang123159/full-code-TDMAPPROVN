<?php

namespace App\Services;

class DvhcService
{
    protected array $items = [];

    public function __construct()
    {
        $path = storage_path('app/data/vietnam_dvhc.json');

        if (file_exists($path)) {
            $json = file_get_contents($path);
            $this->items = json_decode($json, true) ?? [];
        }
    }

    public function getProvinces(): array
    {
        $provinces = [];

        foreach ($this->items as $item) {
            $provinceCode = (string)($item['Mã TP'] ?? '');
            $provinceName = trim((string)($item['Tỉnh / Thành Phố'] ?? ''));

            if (!$provinceCode || !$provinceName) {
                continue;
            }

            $provinces[$provinceCode] = [
                'province_code' => $provinceCode,
                'province_name' => $provinceName,
            ];
        }

        return array_values($provinces);
    }

    public function getAreasByProvinceCode(string|int $provinceCode): array
    {
        $provinceCode = (string)$provinceCode;

        $areas = [];

        foreach ($this->items as $item) {
            if ((string)($item['Mã TP'] ?? '') !== $provinceCode) {
                continue;
            }

            $areas[] = [
                'area_code'      => (string)($item['Mã'] ?? ''),
                'area_name'      => trim((string)($item['Tên'] ?? '')),
                'area_level'     => trim((string)($item['Cấp'] ?? '')),
                'province_code'  => (string)($item['Mã TP'] ?? ''),
                'province_name'  => trim((string)($item['Tỉnh / Thành Phố'] ?? '')),
            ];
        }

        return $areas;
    }

    public function findByAreaCode(string|int $areaCode): ?array
    {
        $areaCode = (string)$areaCode;

        foreach ($this->items as $item) {
            if ((string)($item['Mã'] ?? '') === $areaCode) {
                return [
                    'area_code'      => (string)($item['Mã'] ?? ''),
                    'area_name'      => trim((string)($item['Tên'] ?? '')),
                    'area_level'     => trim((string)($item['Cấp'] ?? '')),
                    'province_code'  => (string)($item['Mã TP'] ?? ''),
                    'province_name'  => trim((string)($item['Tỉnh / Thành Phố'] ?? '')),
                ];
            }
        }

        return null;
    }
}