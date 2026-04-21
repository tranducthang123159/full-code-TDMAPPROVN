<?php

namespace App\Http\Controllers;

use App\Models\UserDevice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DeviceController extends Controller
{
public function index()
{
    $devices = UserDevice::with(['user:id,name,email,phone'])
        ->where('is_revoked', false)
        ->orderByDesc('is_active')
        ->orderByDesc('last_seen_at')
        ->get();

    $currentDeviceToken = session('current_device_token');

    return view('admin.thietbi', compact('devices', 'currentDeviceToken'));
}

    // chỉ đăng xuất phiên hiện tại của thiết bị, không mở slot
    public function deactivate($id)
    {
        $device = UserDevice::where('user_id', Auth::id())
            ->where('is_revoked', false)
            ->findOrFail($id);

        $device->update([
            'is_active' => false,
            'last_seen_at' => now(),
        ]);

        $currentToken = session('current_device_token');

        if ($currentToken && $device->device_token === $currentToken) {
            Auth::guard('web')->logout();
            request()->session()->invalidate();
            request()->session()->regenerateToken();

            return redirect('/login')->with('success', 'Thiết bị hiện tại đã bị đăng xuất.');
        }

        return back()->with('success', 'Đã đăng xuất thiết bị.');
    }

    // thu hồi thiết bị => mở slot cho thiết bị mới
    public function revoke($id)
    {
        $device = UserDevice::where('user_id', Auth::id())
            ->where('is_revoked', false)
            ->findOrFail($id);

        $device->update([
            'is_active' => false,
            'is_revoked' => true,
            'last_seen_at' => now(),
        ]);

        $currentToken = session('current_device_token');

        if ($currentToken && $device->device_token === $currentToken) {
            Auth::guard('web')->logout();
            request()->session()->invalidate();
            request()->session()->regenerateToken();

            return redirect('/login')->with('success', 'Thiết bị hiện tại đã bị thu hồi.');
        }

        return back()->with('success', 'Đã thu hồi thiết bị.');
    }

    // giữ nếu bạn vẫn muốn xóa hẳn record
    public function destroy($id)
    {
        $device = UserDevice::where('user_id', Auth::id())->findOrFail($id);

        $currentToken = session('current_device_token');

        if ($currentToken && $device->device_token === $currentToken) {
            $device->delete();

            Auth::guard('web')->logout();
            request()->session()->invalidate();
            request()->session()->regenerateToken();

            return redirect('/login')->with('success', 'Thiết bị hiện tại đã bị xóa và đăng xuất.');
        }

        $device->delete();

        return back()->with('success', 'Đã xóa thiết bị.');
    }

    public function logoutAll(Request $request)
    {
        UserDevice::where('user_id', Auth::id())
            ->where('is_revoked', false)
            ->update([
                'is_active' => false,
                'last_seen_at' => now(),
            ]);

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login')->with('success', 'Đã đăng xuất tất cả thiết bị.');
    }

    public function checkSession(Request $request)
    {
        $user = Auth::user();
        $currentToken = $request->session()->get('current_device_token');

        if (!$user || !$currentToken) {
            return response()->json([
                'valid' => false,
                'message' => 'Phiên đăng nhập không hợp lệ.'
            ], 401);
        }

        $device = UserDevice::where('user_id', $user->id)
            ->where('device_token', $currentToken)
            ->where('is_active', true)
            ->where('is_revoked', false)
            ->first();

        if (!$device) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'valid' => false,
                'message' => 'Thiết bị đã bị đăng xuất hoặc bị thu hồi.'
            ], 401);
        }

        $device->update([
            'last_seen_at' => now(),
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'valid' => true
        ]);
    }
}