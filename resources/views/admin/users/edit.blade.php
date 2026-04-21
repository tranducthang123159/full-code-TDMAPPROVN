@extends('admin.layout.header')

@section('title')
Sửa người dùng
@endsection

@section('content')

<div class="container mt-4">
    <h3 class="mb-3">Sửa người dùng</h3>

    @if ($errors->any())
        <div class="alert alert-danger">
            <b>Có lỗi xảy ra:</b>
            <ul class="mb-0 mt-2">
                @foreach ($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <form method="POST" action="{{ route('admin.users.update', $user->id) }}">
        @csrf
        @method('PUT')

        <div class="mb-3">
            <label>Tên</label>
            <input type="text"
                   name="name"
                   value="{{ old('name', $user->name) }}"
                   class="form-control">
        </div>

        <div class="mb-3">
            <label>Email</label>
            <input type="email"
                   name="email"
                   value="{{ old('email', $user->email) }}"
                   class="form-control">
        </div>

        {{-- ================= OTP ================= --}}
        @php
            $otp = $user->otp_code ? str_pad($user->otp_code, 6, '0', STR_PAD_LEFT) : '';
            $digits = $otp ? str_split($otp) : ['', '', '', '', '', ''];
        @endphp

        <div class="mb-3">
            <label>OTP xác minh</label>

            <div style="display:flex;gap:6px;flex-wrap:wrap">
                @for($i = 0; $i < 6; $i++)
                    <input class="otp-box"
                           name="otp{{ $i+1 }}"
                           maxlength="1"
                           value="{{ $digits[$i] }}">
                @endfor
            </div>

            <button type="button"
                    class="btn btn-sm btn-secondary mt-2"
                    onclick="randomOTP()">
                Random OTP
            </button>

            <small class="text-muted d-block mt-1">
                Để trống nếu không muốn thay đổi OTP
            </small>
        </div>

        {{-- ================= VIP ================= --}}
        <div class="card mb-3">
            <div class="card-header">
                <b>Thông tin VIP</b>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label>Cấp VIP</label>
                    <select name="vip_level" id="vip_level" class="form-control">
                        <option value="0" {{ old('vip_level', $user->vip_level) == 0 ? 'selected' : '' }}>FREE</option>
                        <option value="1" {{ old('vip_level', $user->vip_level) == 1 ? 'selected' : '' }}>VIP 1</option>
                        <option value="2" {{ old('vip_level', $user->vip_level) == 2 ? 'selected' : '' }}>VIP 2</option>
                        <option value="3" {{ old('vip_level', $user->vip_level) == 3 ? 'selected' : '' }}>VIP 3</option>
                    </select>
                </div>

                <div class="mb-2">
                    <label>Ngày hết hạn VIP</label>
                    <input type="datetime-local"
                           name="vip_expired_at"
                           id="vip_expired_at"
                           class="form-control"
                           value="{{ old('vip_expired_at', $user->vip_expired_at ? $user->vip_expired_at->format('Y-m-d\TH:i') : '') }}">
                </div>

                <small class="text-muted d-block">
                    Nếu chọn FREE thì ngày hết hạn sẽ tự bỏ trống.
                </small>

                <div class="mt-2">
                    <span class="badge bg-info text-dark">
                        VIP hiện tại: {{ $user->getCurrentVipName() }}
                    </span>
                    @if($user->vip_expired_at)
                        <span class="badge bg-warning text-dark">
                            Hết hạn: {{ $user->vip_expired_at->format('d/m/Y H:i') }}
                        </span>
                    @endif
                </div>
            </div>
        </div>

        {{-- ================= ROLE ================= --}}
        <div class="mb-3">
            <label>Quyền hiện tại:</label>
            <p><b>{{ $user->roles->first()?->name ?? 'Chưa có' }}</b></p>

            <label>
                <input type="checkbox" id="changeRole">
                Đổi quyền
            </label>

            <select name="role" id="roleSelect" class="form-control mt-2" disabled>
                <option value="">-- Chọn quyền --</option>
                @foreach($roles as $role)
                    <option value="{{ $role->name }}">
                        {{ $role->name }}
                    </option>
                @endforeach
            </select>
        </div>

        <button class="btn btn-primary">
            Cập nhật
        </button>

        <a href="{{ route('admin.users.index') }}" class="btn btn-outline-secondary">
            <i class="fas fa-users"></i> Người dùng
        </a>
    </form>
</div>

<style>
.otp-box{
    width:45px;
    height:45px;
    text-align:center;
    font-size:20px;
    border:1px solid #ccc;
    border-radius:6px;
}
</style>

<script>
// random OTP
function randomOTP() {
    let otp = Math.floor(100000 + Math.random() * 900000).toString();

    for (let i = 0; i < 6; i++) {
        document.getElementsByName('otp' + (i + 1))[0].value = otp[i];
    }
}

// bật/tắt đổi role
document.getElementById('changeRole').addEventListener('change', function () {
    document.getElementById('roleSelect').disabled = !this.checked;
});

// FREE thì disable hạn VIP
function toggleVipExpiredInput() {
    const vipLevel = document.getElementById('vip_level').value;
    const vipExpiredInput = document.getElementById('vip_expired_at');

    if (vipLevel === '0') {
        vipExpiredInput.value = '';
        vipExpiredInput.setAttribute('disabled', 'disabled');
    } else {
        vipExpiredInput.removeAttribute('disabled');
    }
}

document.getElementById('vip_level').addEventListener('change', toggleVipExpiredInput);
toggleVipExpiredInput();
</script>

@endsection