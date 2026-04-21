<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class RegisteredUserController extends Controller
{
    /**
     * Hiển thị trang đăng ký
     */
    public function create(): View
    {
        return view('auth.register');
    }

    /**
     * Xử lý đăng ký tài khoản
     */
public function store(Request $request): RedirectResponse
{
$request->validate([
    'name' => ['required','string','max:255'],
    'email' => [
        'required',
        'email',
        'max:255',
        'unique:users',
        function ($attr, $value, $fail) {

            if (!str_ends_with($value, '@gmail.com')) {
                $fail('Email phải là @gmail.com');
            }

            // check lỗi phổ biến
            $wrongDomains = ['@gmai.com','@gmial.com','@gmail.con','@gmail.co'];

            foreach ($wrongDomains as $wrong) {
                if (str_ends_with($value, $wrong)) {
                    $fail("Có phải bạn muốn nhập @gmail.com không?");
                }
            }
        }
    ],
            'phone' => ['required','regex:/^0[0-9]{9}$/','unique:users,phone'], // 👈 thêm

    'password' => ['required','confirmed',
        Password::min(8)->letters()->numbers()->mixedCase()->symbols()
    ],
]);
    $otp = random_int(100000,999999); // 🔥 an toàn hơn rand

$user = new User();

$user->name = $request->name;
$user->email = $request->email;
$user->phone = $request->phone; // 👈 thêm
$user->password = Hash::make($request->password);
$user->otp_code = $otp;
$user->otp_expire = Carbon::now()->addMinutes(5);

$user->save();

    try {
        Mail::raw("Mã xác minh tài khoản của bạn là: $otp", function ($message) use ($user) {
            $message->to($user->email)
                ->subject('Xác minh tài khoản');
        });
    } catch (\Exception $e) {
        // log lỗi nếu mail fail
    }

    Auth::login($user);

    return redirect()->route('otp.form');
}
}