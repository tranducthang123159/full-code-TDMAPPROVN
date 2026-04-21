<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\MapFile;

class CheckVipUpload
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth()->user();

        if(!$user){
            return redirect()->back()->with('error','Bạn chưa đăng nhập');
        }

        $count = MapFile::where('user_id',$user->id)->count();

        // VIP thường (1 xã)
        if($user->vip_level == 1 && $count >= 1){
            return back()->with('error','VIP thường chỉ upload 1 xã');
        }

        // VIP cao (6 xã)
        if($user->vip_level == 2 && $count >= 6){
            return back()->with('error','VIP cao chỉ upload tối đa 6 xã');
        }

        // VIP PRO không giới hạn

        return $next($request);
    }
}