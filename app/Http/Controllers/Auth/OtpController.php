<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class OtpController extends Controller
{

public function form()
{
return view('auth.verify-otp');
}

public function verify(Request $request)
{
    
    $request->validate([
        'otp' => 'required|digits:6'
    ]);

    $user = Auth::user();

    // ❗ tránh 419 khi mất session
    if (!$user) {
        return redirect('/login')->withErrors([
            'email' => 'Phiên đăng nhập đã hết hạn'
        ]);
    }

    // ❗ check hết hạn TRƯỚC
    if ($user->otp_expire && Carbon::now()->gt($user->otp_expire)) {
        return back()->with('error','OTP đã hết hạn, vui lòng gửi lại mã');
    }

    // ❗ check sai OTP
    if ($user->otp_code != $request->otp) {
        return back()->withErrors([
            'otp' => 'OTP không đúng'
        ]);
    }

$user->email_verified_at = now();
$user->save();

// 🔥 reload user trong session CHUẨN
Auth::setUser($user->fresh());

// 🔥 thêm dòng này để chắc chắn
$request->session()->regenerate();

return redirect('/dashboard')->with('success','Xác minh thành công');
}
/* ======================
GỬI LẠI OTP
====================== */

public function resend()
{
    $user = Auth::user();

    // ❌ nếu chưa hết hạn thì không cho gửi
    if ($user->otp_expire && now()->lt($user->otp_expire)) {
        return back()->with('error','Vui lòng chờ OTP hiện tại hết hạn');
    }

    $otp = random_int(100000,999999);

    $user->update([
        'otp_code' => $otp,
        'otp_expire' => now()->addMinutes(5)
    ]);

    try {
        Mail::raw("Mã OTP mới của bạn là: $otp", function ($message) use ($user) {
            $message->to($user->email)
                ->subject('OTP mới xác minh tài khoản');
        });
    } catch (\Exception $e) {
        return back()->with('error','Không gửi được mail, thử lại sau');
    }

    return back()->with('success','OTP mới đã gửi vào email');
}

}