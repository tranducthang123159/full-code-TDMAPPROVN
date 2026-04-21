<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tài Đỗ Map | Đăng nhập tài khoản</title>
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="description" content="Cổng đăng nhập chính thức của Tài Đỗ Map - nền tảng hỗ trợ tra cứu và xử lý dữ liệu bản đồ GIS.">
    <link rel="icon" type="image/png" href="{{ asset('images/logo.png') }}">

    <style>
        *{
            box-sizing:border-box;
            margin:0;
            padding:0;
        }

        html, body{
            width:100%;
            min-height:100vh;
            overflow-x:hidden !important;
            overflow-y:auto !important;
        }

        body{
            font-family:'Segoe UI', sans-serif;
            background:
                radial-gradient(circle at top left, rgba(56,189,248,.14), transparent 32%),
                radial-gradient(circle at bottom right, rgba(14,165,233,.14), transparent 28%),
                linear-gradient(135deg, #0b1630 0%, #10264d 52%, #0a1b36 100%);
            position:relative;
            color:#fff;
        }

        body::before{
            content:"";
            position:fixed;
            inset:0;
            background-image:
                linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
            background-size:40px 40px;
            pointer-events:none;
            z-index:0;
        }

        .page-wrapper{
            position:relative;
            z-index:1;
            min-height:100vh;
            display:flex;
            flex-direction:column;
        }

        .main-content{
            flex:1;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:48px 20px 60px;
        }

        .login-card{
            width:100%;
            max-width:450px;
            padding:36px 30px;
            border-radius:24px;
            background:rgba(255,255,255,0.10);
            backdrop-filter:blur(18px);
            -webkit-backdrop-filter:blur(18px);
            border:1px solid rgba(255,255,255,0.14);
            box-shadow:0 30px 60px rgba(0,0,0,0.40);
            color:white;
            animation:fadeIn .6s ease;
        }

        @keyframes fadeIn{
            from{opacity:0;transform:translateY(20px);}
            to{opacity:1;transform:translateY(0);}
        }

        .brand-logo{
            width:70px;
            height:70px;
            object-fit:contain;
            display:block;
            margin:0 auto 14px;
            background:rgba(255,255,255,.95);
            border-radius:18px;
            padding:10px;
            box-shadow:0 10px 24px rgba(0,0,0,.22);
        }

        .title{
            text-align:center;
            font-size:24px;
            font-weight:800;
            letter-spacing:.2px;
            margin-bottom:6px;
        }

        .subtitle{
            text-align:center;
            font-size:13px;
            opacity:.88;
            margin:0 0 10px;
            line-height:1.7;
        }

        .trust-note{
            text-align:center;
            font-size:12.5px;
            color:rgba(255,255,255,.84);
            line-height:1.7;
            margin:0 0 24px;
            padding:12px 14px;
            border-radius:14px;
            background:rgba(255,255,255,.08);
            border:1px solid rgba(255,255,255,.10);
        }

        .input-group{
            margin-bottom:15px;
            position:relative;
        }

        .input-group input{
            width:100%;
            padding:13px 14px;
            padding-right:48px;
            border-radius:14px;
            border:1px solid rgba(255,255,255,0.18);
            background:rgba(255,255,255,0.10);
            color:white;
            font-size:14px;
            transition:.25s ease;
        }

        .input-group input::placeholder{
            color:rgba(255,255,255,.72);
        }

        .input-group input:focus{
            outline:none;
            border-color:#38bdf8;
            background:rgba(255,255,255,0.14);
            box-shadow:0 0 0 4px rgba(56,189,248,.14);
        }

        .eye{
            position:absolute;
            right:14px;
            top:50%;
            transform:translateY(-50%);
            cursor:pointer;
            font-size:16px;
            opacity:.78;
            transition:.2s;
            user-select:none;
        }

        .eye:hover{
            opacity:1;
            transform:translateY(-50%) scale(1.08);
        }

        .form-row{
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:12px;
            font-size:14px;
            margin-bottom:18px;
            flex-wrap:wrap;
        }

        .remember-label{
            display:flex;
            align-items:center;
            gap:7px;
            color:rgba(255,255,255,.94);
        }

        .remember-label input{
            accent-color:#38bdf8;
        }

        .forgot-link{
            color:#7dd3fc;
            text-decoration:none;
            font-weight:600;
        }

        .forgot-link:hover{
            text-decoration:underline;
        }

        .login-btn{
            width:100%;
            padding:14px;
            border:none;
            border-radius:15px;
            background:linear-gradient(135deg,#0ea5e9,#2563eb);
            color:white;
            font-weight:700;
            font-size:15px;
            cursor:pointer;
            transition:.25s ease;
            box-shadow:0 14px 25px rgba(37,99,235,.28);
        }

        .login-btn:hover{
            transform:translateY(-2px);
            box-shadow:0 16px 28px rgba(37,99,235,.38);
        }

        .links-box{
            margin-top:18px;
            text-align:center;
            font-size:13px;
            line-height:1.9;
            color:rgba(255,255,255,.85);
        }

        .links-box a{
            color:#7dd3fc;
            text-decoration:none;
            font-weight:600;
        }

        .links-box a:hover{
            text-decoration:underline;
        }

        .footer-text{
            margin-top:10px;
            text-align:center;
            font-size:12px;
            color:rgba(255,255,255,.72);
        }

        .alert{
            padding:12px 14px;
            border-radius:12px;
            margin-bottom:15px;
            text-align:center;
            font-size:14px;
            animation:fadeIn .4s;
            font-weight:600;
        }

        .alert-success{
            background:#16a34a;
            color:white;
        }

        .alert-error{
            background:#dc2626;
            color:white;
        }

        .device-help{
            margin-top:10px;
            padding:12px 14px;
            border-radius:12px;
            background:rgba(255,255,255,.08);
            border:1px solid rgba(255,255,255,.12);
            text-align:center;
            font-size:13px;
            line-height:1.7;
        }

        .device-help a{
            color:#7dd3fc;
            font-weight:700;
            text-decoration:none;
        }

        .device-help a:hover{
            text-decoration:underline;
        }

        #loadingOverlay{
            position:fixed;
            inset:0;
            background:rgba(0,0,0,.6);
            display:none;
            align-items:center;
            justify-content:center;
            z-index:9999;
        }

        .loading-box{
            background:white;
            padding:25px 35px;
            border-radius:16px;
            text-align:center;
            color:#333;
            font-weight:700;
            min-width:220px;
            box-shadow:0 16px 35px rgba(0,0,0,.22);
        }

        .spinner{
            width:35px;
            height:35px;
            border:4px solid #ddd;
            border-top:4px solid #2563eb;
            border-radius:50%;
            margin:0 auto 10px;
            animation:spin 1s linear infinite;
        }

        @keyframes spin{
            to{transform:rotate(360deg);}
        }

        .guland-footer,
        header{
            position:relative;
            z-index:1;
        }

        @media(max-width:480px){
            .main-content{
                align-items:flex-start;
                padding:34px 16px 46px;
            }

            .login-card{
                padding:24px 18px;
                border-radius:18px;
            }

            .title{
                font-size:20px;
            }

            .subtitle,
            .trust-note{
                font-size:12px;
            }

            .form-row{
                font-size:13px;
            }

            .brand-logo{
                width:62px;
                height:62px;
                border-radius:16px;
            }
        }
    </style>
</head>

<body>

    <div class="page-wrapper">

        @include('components.header')

        <div class="main-content">
            <div class="login-card">

                <img src="{{ asset('images/logo.png') }}" alt="Tài Đỗ Map" class="brand-logo">

                <div class="title">Đăng nhập Tài Đỗ Map</div>
                <div class="subtitle">Cổng tài khoản chính thức của nền tảng hỗ trợ tra cứu và xử lý dữ liệu bản đồ GIS</div>

                <div class="trust-note">
                    Trang này chỉ dùng để đăng nhập tài khoản Tài Đỗ Map. Hệ thống không yêu cầu OTP ngân hàng,
                    mã ví điện tử hoặc thông tin thanh toán bí mật.
                </div>

                @if(session('success'))
                    <div class="alert alert-success" id="alertBox">
                        {{ session('success') }}
                    </div>
                @endif

                @if ($errors->any())
                    <div class="alert alert-error" id="alertBox">
                        {{ $errors->first() }}
                    </div>
                @endif

                @if(session('device_limit_reached') && session('device_manage_url'))
                    <div class="device-help">
                        Bạn đã đạt giới hạn thiết bị theo gói VIP hiện tại.<br>
                        <a href="{{ session('device_manage_url') }}">Vào quản lý thiết bị</a>
                    </div>
                @endif

                <form method="POST" action="{{ route('login') }}" onsubmit="prepareDeviceAndSubmit(event)">
                    @csrf

                    <input type="hidden" name="device_token" id="device_token">
                    <input type="hidden" name="fingerprint_hash" id="fingerprint_hash">

                    <div class="input-group">
                        <input
                            type="text"
                            name="email"
                            value="{{ old('email') }}"
                            placeholder="Email hoặc số điện thoại"
                            autocomplete="username"
                            required
                        >
                    </div>

                    <div class="input-group">
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Mật khẩu"
                            autocomplete="current-password"
                            required
                        >
                        <span class="eye" onclick="togglePassword()">👁</span>
                    </div>

                    <div class="form-row">
                        <label class="remember-label">
                            <input type="checkbox" name="remember">
                            Ghi nhớ đăng nhập
                        </label>

                        @if (Route::has('password.request'))
                            <a href="{{ route('password.request') }}" class="forgot-link">
                                Quên mật khẩu?
                            </a>
                        @endif
                    </div>

                    <button type="submit" class="login-btn">
                        Đăng nhập tài khoản
                    </button>
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
            Đang đăng nhập...
        </div>
    </div>

    <script>
        function showLoading(){
            document.getElementById('loadingOverlay').style.display = 'flex';
        }

        function togglePassword(){
            const input = document.getElementById('password');
            const eye = document.querySelector('.eye');

            if(input.type === 'password'){
                input.type = 'text';
                eye.innerHTML = '🙈';
            }else{
                input.type = 'password';
                eye.innerHTML = '👁';
            }
        }

        function getBrowserName() {
            const ua = navigator.userAgent;
            if (ua.includes('Edg')) return 'Edge';
            if (ua.includes('Chrome')) return 'Chrome';
            if (ua.includes('Firefox')) return 'Firefox';
            if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
            return 'Unknown';
        }

        function getPlatformName() {
            const ua = navigator.userAgent.toLowerCase();
            if (/android/.test(ua)) return 'Android';
            if (/iphone|ipad|ipod/.test(ua)) return 'iOS';
            if (/win/.test(ua)) return 'Windows';
            if (/mac/.test(ua)) return 'macOS';
            if (/linux/.test(ua)) return 'Linux';
            return 'Unknown';
        }

        function simpleHash(str) {
            let hash = 0, i, chr;
            if (str.length === 0) return '0';
            for (i = 0; i < str.length; i++) {
                chr = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0;
            }
            return String(hash);
        }

        function prepareDeviceAndSubmit(event) {
            const form = event.target;

            let token = localStorage.getItem('device_token');
            if (!token) {
                token = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 14);
                localStorage.setItem('device_token', token);
            }

            const rawFingerprint = [
                navigator.userAgent || '',
                navigator.language || '',
                screen.width || '',
                screen.height || '',
                Intl.DateTimeFormat().resolvedOptions().timeZone || '',
                getBrowserName(),
                getPlatformName(),
                navigator.platform || '',
            ].join('|');

            document.getElementById('device_token').value = token;
            document.getElementById('fingerprint_hash').value = simpleHash(rawFingerprint);

            showLoading();

            return true;
        }

        setTimeout(() => {
            const box = document.getElementById('alertBox');
            if(box){
                box.style.transition = 'opacity .5s ease';
                box.style.opacity = '0';
                setTimeout(() => box.remove(), 500);
            }
        }, 3000);
    </script>

</body>
</html>