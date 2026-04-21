<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();

        // Ưu tiên check Spatie role trước
        if (method_exists($user, 'hasRole') && $user->hasRole('admin')) {
            return $next($request);
        }

        // Fallback nếu bạn vẫn có cột is_admin
        if ((int) ($user->is_admin ?? 0) === 1) {
            return $next($request);
        }

        abort(403, 'Bạn không có quyền truy cập trang admin.');
    }
}