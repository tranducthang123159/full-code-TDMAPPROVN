<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Gói VIP đã được kích hoạt</title>
       <img src="{{ asset('images/logo.png') }}" alt="Tài Đỗ Map" class="site-logo">
</head>
<body style="font-family: Arial, sans-serif; background:#f6f8fb; padding:30px; color:#1f2937;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; padding:30px; border:1px solid #e5e7eb;">
        <h2 style="margin-top:0; color:#111827;">Cảm ơn bạn đã sử dụng dịch vụ</h2>

        <p>Xin chào <b>{{ $user->name ?? 'bạn' }}</b>,</p>

        <p>
            Chúng tôi đã xác nhận thanh toán thành công và gói
            <b>{{ strtoupper($transaction->vip_level) }}</b>
            của bạn đã được kích hoạt.
        </p>

        <div style="background:#ecfdf5; border:1px solid #bbf7d0; border-radius:12px; padding:16px; margin:18px 0;">
            <p style="margin:0 0 8px;"><b>Gói đang sử dụng:</b> {{ $user->getCurrentVipName() }}</p>
            <p style="margin:0 0 8px;"><b>Ngày hết hạn:</b> {{ optional($user->vip_expired_at)->format('d/m/Y H:i') }}</p>
            <p style="margin:0;"><b>Mã giao dịch:</b> {{ $transaction->transaction_code }}</p>
        </div>

        <p>
            Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi.
        </p>

        <p style="margin-top:24px;">Trân trọng,<br><b>TAI DO MAP</b></p>
    </div>
</body>
</html> 