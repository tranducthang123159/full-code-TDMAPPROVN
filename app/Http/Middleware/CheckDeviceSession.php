<?php

namespace App\Http\Middleware;

use App\Models\UserDevice;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckDeviceSession
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $deviceToken = $request->session()->get('current_device_token');

            if ($deviceToken) {
                $device = UserDevice::where('user_id', Auth::id())
                    ->where('device_token', $deviceToken)
                    ->where('is_active', true)
                    ->where('is_revoked', false)
                    ->first();

                if (!$device) {
                    Auth::guard('web')->logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();

                    return redirect('/login')->withErrors([
                        'email' => 'Thiết bị này đã bị đăng xuất hoặc bị thu hồi quyền truy cập.',
                    ]);
                }

                $device->update([
                    'last_seen_at' => now(),
                    'ip_address' => $request->ip(),
                ]);
            }
        }

        return $next($request);
    }
}