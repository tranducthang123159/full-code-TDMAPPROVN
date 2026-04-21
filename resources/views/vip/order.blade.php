<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Thanh toán VIP</title>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

    <style>
        html, body{
            width:100%;
            min-height:100vh;
            overflow-x:hidden !important;
            overflow-y:auto !important;
        }

        body{
            font-family: Arial, Helvetica, sans-serif;
            background:
                radial-gradient(circle at top left, rgba(34,197,94,0.08), transparent 320px),
                radial-gradient(circle at top right, rgba(59,130,246,0.08), transparent 380px),
                linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
            margin:0;
            color:#0f172a;
        }

        *{
            box-sizing:border-box;
        }

        .wrap{
            max-width:980px;
            margin:30px auto;
            padding:0 16px 40px;
        }

        .card{
            background:rgba(255,255,255,.96);
            border:1px solid #e5e7eb;
            border-radius:24px;
            padding:26px;
            box-shadow:0 16px 40px rgba(15,23,42,.08);
        }

        .top-badge{
            display:inline-flex;
            align-items:center;
            gap:8px;
            padding:8px 14px;
            border-radius:999px;
            background:#ecfdf5;
            border:1px solid #bbf7d0;
            color:#166534;
            font-size:13px;
            font-weight:800;
            margin-bottom:14px;
        }

        .title{
            font-size:30px;
            font-weight:900;
            margin-bottom:10px;
            line-height:1.2;
        }

        .muted{
            color:#64748b;
            line-height:1.7;
            margin-bottom:24px;
            font-size:15px;
        }

        .grid{
            display:grid;
            grid-template-columns:340px 1fr;
            gap:24px;
            align-items:start;
        }

        .left-panel{
            background:#f8fafc;
            border:1px solid #e5e7eb;
            border-radius:20px;
            padding:20px;
        }

        .pay-logo{
            width:88px;
            height:88px;
            border-radius:22px;
            display:flex;
            align-items:center;
            justify-content:center;
            margin:0 auto 16px;
            font-size:38px;
            background:linear-gradient(135deg, #16a34a, #2563eb);
            color:#fff;
            box-shadow:0 14px 30px rgba(37,99,235,.18);
        }

        .left-title{
            text-align:center;
            font-size:20px;
            font-weight:900;
            margin-bottom:8px;
        }

        .left-desc{
            text-align:center;
            color:#64748b;
            line-height:1.6;
            font-size:14px;
            margin-bottom:18px;
        }

        .step-list{
            display:flex;
            flex-direction:column;
            gap:12px;
        }

        .step-item{
            display:flex;
            gap:12px;
            align-items:flex-start;
            padding:12px;
            background:#fff;
            border:1px solid #e5e7eb;
            border-radius:14px;
        }

        .step-num{
            min-width:30px;
            height:30px;
            border-radius:999px;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#dbeafe;
            color:#1d4ed8;
            font-weight:800;
            font-size:13px;
        }

        .step-text{
            font-size:14px;
            line-height:1.6;
            color:#334155;
        }

        .info-panel{
            display:flex;
            flex-direction:column;
            gap:14px;
        }

        .info-item{
            padding:15px 16px;
            border:1px solid #e5e7eb;
            border-radius:16px;
            background:#f8fafc;
        }

        .label{
            color:#64748b;
            font-size:13px;
            margin-bottom:6px;
        }

        .value{
            font-weight:800;
            word-break:break-word;
            line-height:1.55;
        }

        .value.price{
            font-size:26px;
            color:#b45309;
        }

        .code{
            display:inline-block;
            padding:12px 14px;
            border-radius:12px;
            background:#fff7ed;
            border:1px solid #fdba74;
            color:#9a3412;
            font-weight:800;
            word-break:break-all;
        }

        .btn-group{
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:12px;
            margin-top:6px;
        }

        .btn{
            width:100%;
            border:none;
            border-radius:14px;
            padding:15px;
            font-size:16px;
            font-weight:800;
            cursor:pointer;
            text-decoration:none;
            display:inline-flex;
            justify-content:center;
            align-items:center;
            transition:.2s ease;
        }

        .btn:hover{
            transform:translateY(-1px);
        }

        .btn-primary{
            background:linear-gradient(135deg, #16a34a, #2563eb);
            color:#fff;
            box-shadow:0 10px 24px rgba(37,99,235,.18);
        }

        .btn-secondary{
            background:#fff;
            color:#0f172a;
            border:1px solid #d1d5db;
        }

        .btn:disabled{
            opacity:.7;
            cursor:not-allowed;
            transform:none;
        }

        .status{
            margin-top:18px;
            padding:14px 16px;
            border-radius:14px;
            display:none;
            line-height:1.7;
            font-size:15px;
        }

        .status.active{ display:block; }

        .status.waiting{
            background:#eff6ff;
            border:1px solid #bfdbfe;
            color:#1d4ed8;
        }

        .status.success{
            background:#ecfdf5;
            border:1px solid #bbf7d0;
            color:#166534;
        }

        .status.error{
            background:#fef2f2;
            border:1px solid #fecaca;
            color:#b91c1c;
        }

        .status.warning{
            background:#fff7ed;
            border:1px solid #fdba74;
            color:#9a3412;
        }

        .foot-note{
            margin-top:18px;
            font-size:13px;
            color:#64748b;
            line-height:1.7;
        }

        @media(max-width:768px){
            .wrap{
                margin:18px auto;
                padding:0 12px 28px;
            }

            .card{
                padding:18px;
                border-radius:18px;
            }

            .title{
                font-size:24px;
            }

            .grid{
                grid-template-columns:1fr;
            }

            .btn-group{
                grid-template-columns:1fr;
            }

            .value.price{
                font-size:22px;
            }
        }
    </style>
</head>
<body>

@include('components.header')

<div class="wrap">
    <div class="card">
        <div class="top-badge">✅ Thanh toán tự động qua payOS</div>

        <div class="title">Thanh toán {{ $packageName }}</div>
        <div class="muted">
            Bạn sẽ được chuyển sang cổng thanh toán payOS để quét mã hoặc thanh toán trực tuyến.
            Sau khi thanh toán thành công, hệ thống sẽ <b>tự động kích hoạt VIP</b> mà không cần chờ admin duyệt tay.
        </div>

        <div class="grid">
            <div class="left-panel">
                <div class="pay-logo">₫</div>
                <div class="left-title">Thanh toán an toàn</div>
                <div class="left-desc">
                    Nhấn vào nút bên dưới để mở lại trang thanh toán nếu bạn đã đóng tab hoặc muốn thanh toán lại.
                </div>

                <div class="step-list">
                    <div class="step-item">
                        <div class="step-num">1</div>
                        <div class="step-text">Nhấn <b>Đi đến trang thanh toán</b>.</div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">2</div>
                        <div class="step-text">Quét mã QR hoặc chọn phương thức thanh toán phù hợp.</div>
                    </div>
                    <div class="step-item">
                        <div class="step-num">3</div>
                        <div class="step-text">Sau khi thanh toán xong, trang này sẽ tự cập nhật trạng thái VIP.</div>
                    </div>
                </div>
            </div>

            <div class="info-panel">
                <div class="info-item">
                    <div class="label">Gói VIP</div>
                    <div class="value">{{ $packageName }}</div>
                </div>

                <div class="info-item">
                    <div class="label">Số tiền</div>
                    <div class="value price">{{ number_format($transaction->amount, 0, ',', '.') }}đ</div>
                </div>

                <div class="info-item">
                    <div class="label">Mã giao dịch nội bộ</div>
                    <div class="value">
                        <span class="code">{{ $transaction->transaction_code }}</span>
                    </div>
                </div>

                @if(!empty($transaction->order_code))
                    <div class="info-item">
                        <div class="label">Order Code</div>
                        <div class="value">
                            <span class="code">{{ $transaction->order_code }}</span>
                        </div>
                    </div>
                @endif

                <div class="info-item">
                    <div class="label">Trạng thái hiện tại</div>
                    <div class="value" id="statusText">
                        @php
                            $statusMap = [
                                'pending' => 'Đang khởi tạo đơn thanh toán',
                                'processing' => 'Đang chờ bạn thanh toán',
                                'completed' => 'Thanh toán thành công',
                                'cancelled' => 'Đã hủy',
                                'failed' => 'Thanh toán thất bại',
                            ];
                        @endphp
                        {{ $statusMap[$transaction->status] ?? 'Đang xử lý' }}
                    </div>
                </div>

                <div class="btn-group">
                    <a
                        href="{{ $transaction->checkout_url }}"
                        target="_blank"
                        id="payNowBtn"
                        class="btn btn-primary"
                    >
                        Đi đến trang thanh toán
                    </a>

                    <a
                        href="{{ route('vip.payment') }}"
                        class="btn btn-secondary"
                    >
                        Quay lại chọn gói
                    </a>
                </div>

                <div id="paymentStatus" class="status"></div>

                <div class="foot-note">
                    Hệ thống sẽ tự kiểm tra trạng thái giao dịch sau mỗi vài giây.
                    Sau khi thanh toán thành công, tài khoản sẽ tự bật VIP và chuyển về trang chủ.
                </div>
            </div>
        </div>
    </div>
</div>

@include('components.footer')

<script>
    const transactionId = {{ $transaction->id }};
    let polling = null;
    let redirecting = false;

    function setStatus(type, html) {
        const box = document.getElementById('paymentStatus');
        box.className = 'status active ' + type;
        box.innerHTML = html;
    }

    function stopPolling() {
        if (polling) {
            clearInterval(polling);
            polling = null;
        }
    }

    function updateStatusText(status) {
        const textMap = {
            pending: 'Đang khởi tạo đơn thanh toán',
            processing: 'Đang chờ bạn thanh toán',
            completed: 'Thanh toán thành công',
            cancelled: 'Đã hủy',
            failed: 'Thanh toán thất bại'
        };

        const el = document.getElementById('statusText');
        if (el) {
            el.innerText = textMap[status] || 'Đang xử lý';
        }
    }

    function lockSuccessState() {
        const payBtn = document.getElementById('payNowBtn');
        if (payBtn) {
            payBtn.classList.remove('btn-primary');
            payBtn.classList.add('btn-secondary');
            payBtn.removeAttribute('target');
            payBtn.removeAttribute('href');
            payBtn.style.pointerEvents = 'none';
            payBtn.innerText = 'Đã thanh toán thành công';
        }
    }

    function startPolling() {
        stopPolling();
        checkPaymentStatus();
        polling = setInterval(checkPaymentStatus, 5000);
    }

    function checkPaymentStatus() {
        axios.get('/vip/payment/status/' + transactionId)
        .then(res => {
            const data = res.data;

            if (!data.success) return;

            updateStatusText(data.status);

            if (data.status === 'completed') {
                stopPolling();
                lockSuccessState();
                setStatus(
                    'success',
                    '<b>Thanh toán thành công.</b><br>Hệ thống đã kích hoạt VIP tự động. Đang chuyển trang...'
                );

                if (!redirecting) {
                    redirecting = true;
                    setTimeout(() => {
                        window.location.href = data.home_url || '/';
                    }, 1500);
                }
                return;
            }

            if (data.status === 'cancelled') {
                stopPolling();
                setStatus(
                    'error',
                    '<b>Đơn thanh toán đã bị hủy.</b><br>Bạn có thể quay lại chọn gói và tạo đơn mới.'
                );
                return;
            }

            if (data.status === 'failed') {
                stopPolling();
                setStatus(
                    'error',
                    '<b>Thanh toán thất bại.</b><br>Vui lòng thử lại hoặc tạo đơn thanh toán mới.'
                );
                return;
            }

            if (data.status === 'pending') {
                setStatus(
                    'warning',
                    '<b>Đơn đang được khởi tạo.</b><br>Nếu chờ quá lâu, hãy quay lại tạo đơn mới.'
                );
                return;
            }

            if (data.status === 'processing') {
                setStatus(
                    'waiting',
                    '<b>Đang chờ thanh toán.</b><br>Sau khi bạn thanh toán trên payOS, hệ thống sẽ tự cập nhật.'
                );
            }
        })
        .catch(err => {
            console.error(err);
        });
    }

    window.addEventListener('load', () => {
        @if($transaction->status === 'completed')
            lockSuccessState();
            setStatus('success', '<b>Thanh toán thành công.</b><br>Đang chuyển trang...');
            setTimeout(() => {
                window.location.href = '{{ route('home') }}';
            }, 1200);
        @elseif(in_array($transaction->status, ['pending', 'processing']))
            startPolling();
            @if($transaction->status === 'pending')
                setStatus('warning', '<b>Đơn đang được khởi tạo.</b><br>Hệ thống sẽ tự cập nhật trạng thái.');
            @else
                setStatus('waiting', '<b>Đang chờ thanh toán.</b><br>Vui lòng hoàn tất thanh toán trên payOS.');
            @endif
        @elseif($transaction->status === 'cancelled')
            setStatus('error', '<b>Đơn thanh toán đã bị hủy.</b>');
        @elseif($transaction->status === 'failed')
            setStatus('error', '<b>Thanh toán thất bại.</b>');
        @endif
    });
</script>

</body>
</html>