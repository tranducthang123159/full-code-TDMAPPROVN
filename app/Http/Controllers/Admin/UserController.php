<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('roles')->paginate(10);
        return view('admin.users.index', compact('users'));
    }

    public function create()
    {
        $roles = Role::all();
        return view('admin.users.create', compact('roles'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'     => 'required',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role'     => 'required',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => bcrypt($request->password),
        ]);

        $user->assignRole($request->role);

        return redirect()->route('admin.users.index')
            ->with('success', 'Tạo user thành công');
    }

    public function edit(User $user)
    {
        $roles = Role::all();
        return view('admin.users.edit', compact('user', 'roles'));
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name'            => 'required',
            'email'           => [
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'role'            => 'nullable',
            'vip_level'       => 'nullable|integer|in:0,1,2,3',
            'vip_expired_at'  => 'nullable|date',
        ]);

        // ghép OTP
        $otp = $user->otp_code;

        if (
            $request->filled('otp1') &&
            $request->filled('otp2') &&
            $request->filled('otp3') &&
            $request->filled('otp4') &&
            $request->filled('otp5') &&
            $request->filled('otp6')
        ) {
            $otp =
                $request->otp1 .
                $request->otp2 .
                $request->otp3 .
                $request->otp4 .
                $request->otp5 .
                $request->otp6;
        }

        $vipLevel = (int) ($request->vip_level ?? 0);

        // Nếu FREE thì xoá ngày hết hạn
        $vipExpiredAt = $vipLevel === 0
            ? null
            : ($request->filled('vip_expired_at') ? $request->vip_expired_at : null);

        $user->update([
            'name'           => $request->name,
            'email'          => $request->email,
            'otp_code'       => $otp,
            'vip_level'      => $vipLevel,
            'vip_expired_at' => $vipExpiredAt,
        ]);

        // chỉ sync role khi có chọn đổi quyền
        if ($request->filled('role')) {
            $user->syncRoles([$request->role]);
        }

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'Cập nhật thành công');
    }

    public function destroy(User $user)
    {
        // Không cho xóa chính mình
        if ($user->id == auth()->id()) {
            return back()->with('error', 'Không thể xóa chính mình');
        }

        // Không cho xóa admin
        if ($user->hasRole('admin')) {
            return back()->with('error', 'Không thể xóa tài khoản admin');
        }

        // Xóa role trước
        $user->syncRoles([]);

        // Xóa user
        $user->delete();

        return back()->with('success', 'Đã xóa user thành công');
    }
}