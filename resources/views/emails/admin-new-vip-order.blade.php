<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đơn hàng VIP mới</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f6f8fb; padding:30px; color:#1f2937;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; padding:30px; border:1px solid #e5e7eb;">
        
        <div style="text-align:center; margin-bottom:20px;">
            <img src="{{ asset('images/logo.png') }}" alt="Tài Đỗ Map" style="max-width:120px; height:auto;">
        </div>

        <h2 style="margin-top:0; color:#111827;">Bạn nhận được một đơn hàng VIP mới</h2>

        <p>Hệ thống vừa ghi nhận một khách hàng đã bấm <b>"Tôi đã thanh toán"</b>.</p>

        <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:16px; margin:18px 0;">
            <p style="margin:0 0 8px;"><b>ID giao dịch:</b> #{{ $transaction->id }}</p>
            <p style="margin:0 0 8px;"><b>Khách hàng:</b> {{ $transaction->user->name ?? 'Không rõ' }}</p>
            <p style="margin:0 0 8px;"><b>Email:</b> {{ $transaction->user->email ?? '-' }}</p>
            <p style="margin:0 0 8px;"><b>SĐT:</b> {{ $transaction->user->phone ?? '-' }}</p>
            <p style="margin:0 0 8px;"><b>Gói VIP:</b> {{ strtoupper($transaction->vip_level) }}</p>
            <p style="margin:0 0 8px;"><b>Số tiền:</b> {{ number_format($transaction->amount, 0, ',', '.') }}đ</p>
            <p style="margin:0;"><b>Nội dung CK:</b> {{ $transaction->transaction_code }}</p>
        </div>

        <p>Vui lòng đăng nhập trang quản trị để kiểm tra và xác nhận giao dịch.</p>

        <p style="margin-top:24px;">Trân trọng,<br><b>Hệ thống TAI DO MAP</b></p>
    </div>
</body>
</html>