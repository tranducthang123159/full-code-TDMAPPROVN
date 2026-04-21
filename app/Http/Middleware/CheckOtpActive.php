<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckOtpActive
{
public function handle(Request $request, Closure $next)
{
    if (Auth::check()) {

        $user = Auth::user()->fresh(); // 🔥 thêm dòng này

        if ($request->routeIs('otp.verify')) {
            return $next($request);
        }

        if (!$user->email_verified_at) {

            if (!$request->routeIs('otp.*')) {
                return redirect()->route('otp.form');
            }

            return $next($request);
        }

        if ($request->routeIs('otp.*')) {
            return redirect('/dashboard');
        }
    }

    return $next($request);
}
}