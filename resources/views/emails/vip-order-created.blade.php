<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đơn hàng VIP đã được tạo</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
    <h2>Đơn hàng VIP của bạn đã được tạo</h2>

    <p><strong>Mã giao dịch:</strong> {{ $transaction->transaction_code }}</p>
    <p><strong>Gói VIP:</strong> {{ strtoupper($transaction->vip_level) }}</p>
    <p><strong>Số tiền:</strong> {{ number_format($transaction->amount, 0, ',', '.') }}đ</p>

    <p>Vui lòng chuyển khoản đúng nội dung để hệ thống xác nhận nhanh hơn.</p>
</body>
</html>