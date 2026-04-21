<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tài Đỗ Map | Xác minh OTP đăng ký</title>
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="description" content="Trang xác minh OTP đăng ký tài khoản chính thức của Tài Đỗ Map.">
    <link rel="icon" type="image/png" href="{{ asset('images/logo.png') }}">

    <style>
        * {
            box-sizing: border-box;
        }

        html,
        body {
            width: 100%;
            min-height: 100vh;
            overflow-x: hidden !important;
            overflow-y: auto !important;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Segoe UI', sans-serif;
            background:
                radial-gradient(circle at top left, rgba(56,189,248,.14), transparent 32%),
                radial-gradient(circle at bottom right, rgba(14,165,233,.14), transparent 28%),
                linear-gradient(135deg, #0b1630 0%, #10264d 52%, #0a1b36 100%);
            color: white;
        }

        body::before {
            content: "";
            position: fixed;
            inset: 0;
            background-image:
                linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
            background-size: 40px 40px;
            pointer-events: none;
        }

        .page-wrapper {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            position: relative;
            z-index: 1;
        }

        .main-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
        }

        .otp-card {
            width: 100%;
            max-width: 440px;
            padding: 36px 30px;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.10);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            border: 1px solid rgba(255, 255, 255, 0.14);
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.42);
            color: white;
            animation: fadeIn .6s ease;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .brand-logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
            display: block;
            margin: 0 auto 14px;
            background: rgba(255,255,255,.95);
            border-radius: 18px;
            padding: 10px;
            box-shadow: 0 10px 24px rgba(0,0,0,.22);
        }

        .title {
            text-align: center;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: .2px;
            margin-bottom: 6px;
        }

        .subtitle {
            text-align: center;
            font-size: 13px;
            opacity: .88;
            margin: 0 0 10px;
            line-height: 1.7;
        }

        .trust-note {
            text-align: center;
            font-size: 12.5px;
            color: rgba(255,255,255,.84);
            line-height: 1.7;
            margin: 0 0 20px;
            padding: 12px 14px;
            border-radius: 14px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.10);
        }

        .otp-heading {
            text-align: center;
            margin-bottom: 14px;
            font-size: 20px;
            font-weight: 700;
        }

        .otp-subtext {
            text-align: center;
            font-size: 13px;
            line-height: 1.7;
            color: rgba(255,255,255,.84);
            margin: 0 0 18px;
        }

        .alert {
            padding: 12px;
            border-radius: 10px;
            margin-bottom: 15px;
            text-align: center;
            font-size: 14px;
            animation: fadeIn .4s;
            font-weight: 600;
        }

        .alert-success {
            background: #16a34a;
        }

        .alert-error {
            background: #dc2626;
        }

        .otp-input {
            width: 100%;
            padding: 14px;
            margin-top: 10px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.25);
            background: rgba(255, 255, 255, 0.12);
            color: white;
            font-size: 16px;
            text-align: center;
            letter-spacing: 4px;
            transition: .3s;
        }

        .otp-input::placeholder {
            color: rgba(255, 255, 255, 0.6);
            letter-spacing: 2px;
        }

        .otp-input:focus {
            outline: none;
            border-color: #38bdf8;
            box-shadow: 0 0 8px rgba(56, 189, 248, .35);
            background: rgba(255, 255, 255, 0.18);
        }

        .submit-btn {
            width: 100%;
            margin-top: 15px;
            padding: 13px;
            border: none;
            border-radius: 14px;
            background: linear-gradient(135deg, #0ea5e9, #2563eb);
            color: white;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: .3s;
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(37, 99, 235, .35);
        }

        .error {
            margin-top: 10px;
            color: #ff9b9b;
            font-size: 14px;
            text-align: center;
            font-weight: 600;
        }

        .helper-text {
            margin-top: 12px;
            text-align: center;
            font-size: 13px;
            line-height: 1.8;
            color: rgba(255,255,255,.84);
        }

        .helper-text a {
            color: #67e8f9;
            text-decoration: none;
            font-weight: 700;
        }

        .helper-text a:hover {
            text-decoration: underline;
        }

        .links-box {
            margin-top: 16px;
            text-align: center;
            font-size: 13px;
            line-height: 1.9;
            color: rgba(255,255,255,.85);
        }

        .links-box a {
            color: #7dd3fc;
            text-decoration: none;
            font-weight: 600;
        }

        .links-box a:hover {
            text-decoration: underline;
        }

        .footer-text {
            margin-top: 10px;
            text-align: center;
            font-size: 12px;
            color: rgba(255,255,255,.72);
        }

        #loadingOverlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, .6);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }

        .loading-box {
            background: white;
            padding: 25px 35px;
            border-radius: 12px;
            text-align: center;
            color: #333;
            font-weight: 700;
        }

        .spinner {
            width: 35px;
            height: 35px;
            border: 4px solid #ddd;
            border-top: 4px solid #2563eb;
            border-radius: 50%;
            margin: 0 auto 10px;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        .guland-footer,
        header {
            position: relative;
            z-index: 1;
        }

        @media(max-width:480px) {
            .main-content {
                align-items: flex-start;
                padding-top: 36px;
            }

            .otp-card {
                padding: 24px 18px;
                border-radius: 18px;
            }

            .title {
                font-size: 20px;
            }

            .subtitle,
            .trust-note,
            .otp-subtext {
                font-size: 12px;
            }

            .brand-logo {
                width: 62px;
                height: 62px;
                border-radius: 16px;
            }
        }
    </style>
</head>

<body>

    @include('components.header')

    <div class="page-wrapper">

        <div class="main-content">
            <div class="otp-card">

                <img src="{{ asset('images/logo.png') }}" alt="Tài Đỗ Map" class="brand-logo">

                <div class="title">Xác minh OTP Tài Đỗ Map</div>
                <div class="subtitle">Cổng tài khoản chính thức của nền tảng hỗ trợ tra cứu và xử lý dữ liệu bản đồ GIS</div>

                <div class="trust-note">
                    Mã OTP này chỉ dùng để kích hoạt tài khoản Tài Đỗ Map. Không chia sẻ mã này cho bất kỳ ai.
                    Hệ thống không yêu cầu OTP ngân hàng, mã ví điện tử hoặc thông tin thanh toán bí mật.
                </div>

                <h2 class="otp-heading">Xác minh OTP đăng ký</h2>
                <p class="otp-subtext">
                    Nhập mã OTP đã được gửi tới email của bạn để hoàn tất đăng ký tài khoản.
                </p>

                @if(session('success'))
                    <div class="alert alert-success" id="alertBox">
                        {{ session('success') }}
                    </div>
                @endif

                @if(session('error'))
                    <div class="alert alert-error" id="alertBox">
                        {{ session('error') }}
                    </div>
                @endif

                <form method="POST" action="{{ route('otp.verify') }}" onsubmit="showLoading()">
                    @csrf

                    <input
                        type="text"
                        name="otp"
                        class="otp-input"
                        placeholder="Nhập mã OTP"
                        maxlength="6"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        required
                    >

                    @error('otp')
                        <div class="error">{{ $message }}</div>
                    @enderror

                    <button type="submit" class="submit-btn">Xác minh OTP</button>

                    <p class="helper-text">
                        Mã hết hạn sau: <span id="countdown">05:00</span>
                    </p>

                    <p class="helper-text">
                        Chưa nhận được mã?
                        <a href="{{ route('otp.resend') }}">Gửi lại OTP</a>
                    </p>
                </form>

                <div class="links-box">
                    <a href="{{ route('policy.privacy') }}">Chính sách bảo mật</a> |
                    <a href="{{ route('policy.terms') }}">Điều khoản sử dụng</a> |
                    <a href="{{ route('policy.contact') }}">Liên hệ</a>
                </div>

                <div class="footer-text">
                    © {{ date('Y') }} Tài Đỗ Map
                </div>

            </div>
        </div>

        @include('components.footer')

    </div>

    <div id="loadingOverlay">
        <div class="loading-box">
            <div class="spinner"></div>
            Đang xác minh OTP...
        </div>
    </div>

    <script>
        function showLoading() {
            document.getElementById('loadingOverlay').style.display = 'flex';
        }

        setTimeout(() => {
            const box = document.getElementById('alertBox');
            if (box) {
                box.style.transition = 'opacity .5s ease';
                box.style.opacity = '0';
                setTimeout(() => box.remove(), 500);
            }
        }, 3000);
    </script>

    <script>
        let time = 300;

        const countdown = setInterval(() => {
            const m = Math.floor(time / 60);
            const s = time % 60;

            document.getElementById('countdown').innerText =
                `${m}:${s < 10 ? '0' : ''}${s}`;

            if (time <= 0) {
                clearInterval(countdown);
                document.getElementById('countdown').innerText = 'Hết hạn';
            }

            time--;
        }, 1000);
    </script>
</body>
</html>