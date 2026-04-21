<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\UserDevice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class AuthenticatedSessionController extends Controller
{
    public function create()
    {
        return view('auth.login');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => [
                'required',
                function ($attr, $value, $fail) {
                    $isEmail = filter_var($value, FILTER_VALIDATE_EMAIL);
                    $isPhone = preg_match('/^0[0-9]{9}$/', $value);

                    if (!$isEmail && !$isPhone) {
                        $fail('Nhập email hoặc số điện thoại hợp lệ');
                    }
                }
            ],
            'password' => ['required', 'string'],
            'device_token' => ['nullable', 'string', 'max:120'],
            'fingerprint_hash' => ['nullable', 'string', 'max:120'],
        ]);

        $login = $request->input('email');
        $field = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';

        if (!Auth::attempt([
            $field => $login,
            'password' => $request->password
        ], $request->boolean('remember'))) {
            return back()->withErrors([
                'email' => 'Email / SĐT hoặc mật khẩu không đúng!',
            ])->withInput();
        }

        $request->session()->regenerate();

        $user = Auth::user();

        $deviceResult = $this->registerOrRejectDevice($request, $user);

        if (!$deviceResult['ok']) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return back()
                ->withErrors([
                    'email' => $deviceResult['message'],
                ])
                ->withInput()
                ->with('device_limit_reached', true)
                ->with('device_manage_url', route('devices.index'));
        }

        if (!$user->email_verified_at) {
            return redirect('/verify-otp');
        }

        return redirect('/')
            ->with('success', 'Đăng nhập thành công!');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $deviceToken = $request->session()->get('current_device_token');

        if ($user && $deviceToken) {
            UserDevice::where('user_id', $user->id)
                ->where('device_token', $deviceToken)
                ->where('is_revoked', false)
                ->update([
                    'is_active' => false,
                    'last_seen_at' => now(),
                ]);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login')->with('success', 'Bạn đã đăng xuất thành công!');
    }

    protected function registerOrRejectDevice(Request $request, $user): array
    {
        $deviceToken = $request->input('device_token');
        $fingerprintHash = $request->input('fingerprint_hash');
        $userAgent = $request->userAgent();
        $ip = $request->ip();

        if (!$deviceToken) {
            $deviceToken = 'fallback_' . Str::uuid();
        }

        $deviceType = $this->detectDeviceType($request);
        $browserName = $this->detectBrowserName($request);
        $platformName = $this->detectPlatformName($request);

        $deviceName = ($deviceType === 'mobile' ? 'Điện thoại' : 'Máy tính')
            . ' - ' . $browserName . ' - ' . $platformName;

        // 1) Nhận đúng thiết bị cũ theo device_token
        $existingByToken = UserDevice::where('user_id', $user->id)
            ->where('device_token', $deviceToken)
            ->where('is_revoked', false)
            ->first();

        if ($existingByToken) {
            $existingByToken->update([
                'fingerprint_hash' => $fingerprintHash,
                'device_type' => $deviceType,
                'browser_name' => $browserName,
                'platform_name' => $platformName,
                'device_name' => $deviceName,
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'last_seen_at' => now(),
                'is_active' => true,
            ]);

            $request->session()->put('current_device_token', $deviceToken);

            return [
                'ok' => true,
                'message' => null,
            ];
        }

        // 2) Khớp gần đúng theo fingerprint nếu token đổi
        $existingByFingerprint = null;

        if ($fingerprintHash) {
            $existingByFingerprint = UserDevice::where('user_id', $user->id)
                ->where('fingerprint_hash', $fingerprintHash)
                ->where('device_type', $deviceType)
                ->where('is_revoked', false)
                ->where(function ($q) use ($browserName, $platformName) {
                    $q->where('browser_name', $browserName)
                      ->orWhere('platform_name', $platformName);
                })
                ->first();
        }

        if ($existingByFingerprint) {
            $existingByFingerprint->update([
                'device_token' => $deviceToken,
                'fingerprint_hash' => $fingerprintHash,
                'device_type' => $deviceType,
                'browser_name' => $browserName,
                'platform_name' => $platformName,
                'device_name' => $deviceName,
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'last_seen_at' => now(),
                'is_active' => true,
            ]);

            $request->session()->put('current_device_token', $deviceToken);

            return [
                'ok' => true,
                'message' => null,
            ];
        }

        // 3) Thiết bị mới hoàn toàn => đếm theo thiết bị đã đăng ký, không đếm theo online/offline
        $limit = $this->getVipDeviceLimit($user);

        if (!$limit['unlimited']) {
            $registeredSameTypeCount = UserDevice::where('user_id', $user->id)
                ->where('device_type', $deviceType)
                ->where('is_revoked', false)
                ->count();

            $maxAllowed = $limit[$deviceType] ?? 0;

            if ($registeredSameTypeCount >= $maxAllowed) {
                if ($deviceType === 'mobile') {
                    return [
                        'ok' => false,
                        'message' => "Tài khoản này đã đủ {$maxAllowed} điện thoại đã đăng ký. Muốn dùng máy mới, hãy vào Quản lý thiết bị để thu hồi thiết bị cũ.",
                    ];
                }

                return [
                    'ok' => false,
                    'message' => "Tài khoản này đã đủ {$maxAllowed} máy tính đã đăng ký. Muốn dùng máy mới, hãy vào Quản lý thiết bị để thu hồi thiết bị cũ.",
                ];
            }
        }

        // 4) Ghi nhận thiết bị mới, khóa cố định vào account
        UserDevice::create([
            'user_id' => $user->id,
            'device_token' => $deviceToken,
            'fingerprint_hash' => $fingerprintHash,
            'device_type' => $deviceType,
            'browser_name' => $browserName,
            'platform_name' => $platformName,
            'device_name' => $deviceName,
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'last_seen_at' => now(),
            'is_active' => true,
            'is_revoked' => false,
        ]);

        $request->session()->put('current_device_token', $deviceToken);

        return [
            'ok' => true,
            'message' => null,
        ];
    }

    protected function getVipDeviceLimit($user): array
    {
        return match ((int) ($user->vip_level ?? 0)) {
            1 => [
                'mobile' => 1,
                'desktop' => 1,
                'unlimited' => false,
            ],
            2 => [
                'mobile' => 4,
                'desktop' => 4,
                'unlimited' => false,
            ],
            3 => [
                'mobile' => null,
                'desktop' => null,
                'unlimited' => true,
            ],
            default => [
                'mobile' => 1,
                'desktop' => 0,
                'unlimited' => false,
            ],
        };
    }

    protected function detectDeviceType(Request $request): string
    {
        $ua = strtolower($request->userAgent() ?? '');

        return preg_match('/android|iphone|ipad|ipod|mobile|opera mini|iemobile|wpdesktop/', $ua)
            ? 'mobile'
            : 'desktop';
    }

    protected function detectBrowserName(Request $request): string
    {
        $ua = $request->userAgent() ?? '';

        if (str_contains($ua, 'Edg')) return 'Edge';
        if (str_contains($ua, 'Chrome')) return 'Chrome';
        if (str_contains($ua, 'Firefox')) return 'Firefox';
        if (str_contains($ua, 'Safari') && !str_contains($ua, 'Chrome')) return 'Safari';

        return 'Unknown';
    }

    protected function detectPlatformName(Request $request): string
    {
        $ua = strtolower($request->userAgent() ?? '');

        if (str_contains($ua, 'android')) return 'Android';
        if (str_contains($ua, 'iphone') || str_contains($ua, 'ipad') || str_contains($ua, 'ipod')) return 'iOS';
        if (str_contains($ua, 'windows')) return 'Windows';
        if (str_contains($ua, 'mac os') || str_contains($ua, 'macintosh')) return 'macOS';
        if (str_contains($ua, 'linux')) return 'Linux';

        return 'Unknown';
    }
}