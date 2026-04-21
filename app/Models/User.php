<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;
use App\Models\MapFile;
use App\Models\UserAreaScope;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'otp_code',
        'otp_expire',
        'vip_level',
        'vip_expired_at'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'otp_expire' => 'datetime',
        'vip_expired_at' => 'datetime',
        'password' => 'hashed',
        'vip_level' => 'integer',
    ];

    public function mapFiles()
    {
        return $this->hasMany(MapFile::class, 'user_id');
    }

    public function areaScopes()
    {
        return $this->hasMany(UserAreaScope::class, 'user_id');
    }

    public function getCurrentVipLevel(): int
    {
        $level = (int) ($this->vip_level ?? 0);

        if (in_array($level, [1, 2, 3])) {
            if ($this->vip_expired_at && now()->greaterThan($this->vip_expired_at)) {
                return 0;
            }
        }

        return $level;
    }

    public function getCurrentVipName(): string
    {
        return match ($this->getCurrentVipLevel()) {
            1 => 'VIP 1',
            2 => 'VIP 2',
            3 => 'VIP 3',
            default => 'FREE',
        };
    }

    public function getAreaLimit(): int
    {
        return match ($this->getCurrentVipLevel()) {
            1 => 1,
            2 => 6,
            3 => -1,
            default => 0,
        };
    }

    public function canUploadMap(): bool
    {
        return $this->getCurrentVipLevel() > 0;
    }

    public function usedAreaCount(): int
    {
        return $this->areaScopes()->count();
    }

    public function remainingAreaCount(): ?int
    {
        $limit = $this->getAreaLimit();

        if ($limit === -1) {
            return null;
        }

        return max(0, $limit - $this->usedAreaCount());
    }

    public function canUseNewArea(): bool
    {
        $limit = $this->getAreaLimit();

        if ($limit === -1) {
            return true;
        }

        return $this->usedAreaCount() < $limit;
    }

    public function hasAreaAccess(string|int $areaCode): bool
    {
        if ($this->getCurrentVipLevel() === 3) {
            return true;
        }

        return $this->areaScopes()
            ->where('area_code', (string)$areaCode)
            ->exists();
    }

    public function grantAreaAccess(array $area): UserAreaScope
    {
        return $this->areaScopes()->firstOrCreate(
            [
                'area_code' => (string)$area['area_code'],
            ],
            [
                'province_code' => (string)$area['province_code'],
                'province_name' => $area['province_name'],
                'area_name'     => $area['area_name'],
                'area_level'    => $area['area_level'],
            ]
        );
    }
}