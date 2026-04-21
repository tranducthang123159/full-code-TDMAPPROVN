<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đang kiểm tra thanh toán VIP</title>
       <img src="{{ asset('images/logo.png') }}" alt="Tài Đỗ Map" class="site-logo">
</head>
<body style="font-family: Arial, sans-serif; background:#f6f8fb; padding:30px; color:#1f2937;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; padding:30px; border:1px solid #e5e7eb;">
        <h2 style="margin-top:0; color:#111827;">Chúng tôi đã ghi nhận yêu cầu thanh toán của bạn</h2>

        <p>Xin chào <b>{{ $transaction->user->name ?? 'bạn' }}</b>,</p>

        <p>
            Hệ thống đã ghi nhận rằng bạn vừa bấm xác nhận <b>"Tôi đã thanh toán"</b>.
            Vui lòng chờ trong giây lát, số tiền của bạn đang được kiểm tra.
        </p>

        <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:16px; margin:18px 0;">
            <p style="margin:0 0 8px;"><b>Mã giao dịch:</b> {{ $transaction->transaction_code }}</p>
            <p style="margin:0 0 8px;"><b>Gói:</b> {{ strtoupper($transaction->vip_level) }}</p>
            <p style="margin:0;"><b>Số tiền:</b> {{ number_format($transaction->amount, 0, ',', '.') }}đ</p>
        </div>

        <p>
            Sau khi admin xác nhận thanh toán thành công, gói VIP sẽ được kích hoạt cho tài khoản của bạn.
        </p>

        <p style="margin-top:24px;">Trân trọng,<br><b>TAI DO MAP</b></p>
    </div>
</body>
</html>