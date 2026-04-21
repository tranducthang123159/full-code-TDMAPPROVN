<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tài Đỗ Map | Đăng ký tài khoản</title>
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="description" content="Trang đăng ký tài khoản chính thức của Tài Đỗ Map - nền tảng hỗ trợ tra cứu và xử lý dữ liệu bản đồ GIS.">
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
            min-height:100vh;
            display:flex;
            flex-direction:column;
            position:relative;
            z-index:1;
        }

        .main-content{
            flex:1;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:46px 20px 60px;
        }

        .register-card{
            width:100%;
            max-width:480px;
            padding:36px 30px;
            border-radius:24px;
            background:rgba(255,255,255,0.10);
            backdrop-filter:blur(18px);
            -webkit-backdrop-filter:blur(18px);
            border:1px solid rgba(255,255,255,0.14);
            box-shadow:0 30px 60px rgba(0,0,0,0.42);
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
            margin-bottom:16px;
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
            user-select:none;
            transition:.2s ease;
        }

        .eye:hover{
            opacity:1;
            transform:translateY(-50%) scale(1.08);
        }

        .is-invalid{
            border-color:#ff6b6b !important;
            box-shadow:0 0 0 4px rgba(255,107,107,.12);
        }

        .text-error{
            color:#ff9b9b;
            font-size:12px;
            margin-top:6px;
            display:block;
            font-weight:600;
        }

        .register-btn{
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
            margin-top:4px;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:10px;
            min-height:50px;
        }

        .register-btn:hover{
            transform:translateY(-2px);
            box-shadow:0 16px 28px rgba(37,99,235,.38);
        }

        .register-btn:disabled{
            opacity:.82;
            cursor:not-allowed;
            transform:none !important;
            box-shadow:0 10px 20px rgba(37,99,235,.18);
        }

        .btn-spinner{
            width:18px;
            height:18px;
            border:2px solid rgba(255,255,255,.35);
            border-top-color:#fff;
            border-radius:50%;
            animation:spin .7s linear infinite;
            display:none;
            flex-shrink:0;
        }

        @keyframes spin{
            to{ transform:rotate(360deg); }
        }

        .register-btn.loading .btn-spinner{
            display:inline-block;
        }

        .register-btn.loading .btn-text::after{
            content:" Đang xử lý...";
        }

        .register-btn.loading .default-text{
            display:none;
        }

        .form-lock{
            pointer-events:none;
            opacity:.96;
        }

        .link-text{
            margin-top:18px;
            text-align:center;
            font-size:13px;
            color:rgba(255,255,255,.86);
            line-height:1.9;
        }

        .link-text a{
            color:#67e8f9;
            text-decoration:none;
            font-weight:700;
        }

        .link-text a:hover{
            text-decoration:underline;
        }

        .footer-text{
            margin-top:10px;
            text-align:center;
            font-size:12px;
            color:rgba(255,255,255,.72);
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

            .register-card{
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
            <div class="register-card">

                <img src="{{ asset('images/logo.png') }}" alt="Tài Đỗ Map" class="brand-logo">

                <div class="title">Đăng ký tài khoản Tài Đỗ Map</div>
                <div class="subtitle">Cổng tài khoản chính thức của nền tảng hỗ trợ tra cứu và xử lý dữ liệu bản đồ GIS</div>

                <div class="trust-note">
                    Tài khoản này dùng để truy cập các chức năng bản đồ trên Tài Đỗ Map.
                    Hệ thống không yêu cầu OTP ngân hàng, mã ví điện tử hoặc thông tin thanh toán bí mật.
                </div>

                <form method="POST" action="{{ route('register') }}" id="registerForm" novalidate>
                    @csrf

                    <div class="input-group">
                        <input
                            type="text"
                            name="name"
                            placeholder="Họ và tên"
                            value="{{ old('name') }}"
                            class="@error('name') is-invalid @enderror"
                            autocomplete="name"
                            required
                        >
                        @error('name')
                            <small class="text-error">{{ $message }}</small>
                        @enderror
                    </div>

                    <div class="input-group">
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="Email (@gmail.com)"
                            value="{{ old('email') }}"
                            class="@error('email') is-invalid @enderror"
                            autocomplete="email"
                            required
                        >

                        @error('email')
                            <small class="text-error">{{ $message }}</small>
                        @enderror

                        <small id="email-error" class="text-error"></small>
                    </div>

                    <div class="input-group">
                        <input
                            type="text"
                            name="phone"
                            placeholder="Số điện thoại"
                            value="{{ old('phone') }}"
                            class="@error('phone') is-invalid @enderror"
                            autocomplete="tel"
                            required
                        >
                        @error('phone')
                            <small class="text-error">{{ $message }}</small>
                        @enderror
                    </div>

                    <div class="input-group">
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Mật khẩu"
                            class="@error('password') is-invalid @enderror"
                            autocomplete="new-password"
                            required
                        >
                        <span class="eye" onclick="togglePassword()">👁</span>

                        @error('password')
                            <small class="text-error">{{ $message }}</small>
                        @enderror
                    </div>

                    <div class="input-group">
                        <input
                            type="password"
                            id="password2"
                            name="password_confirmation"
                            placeholder="Xác nhận mật khẩu"
                            autocomplete="new-password"
                            required
                        >
                        <span class="eye" onclick="togglePassword2()">👁</span>
                    </div>

                    <button type="submit" class="register-btn" id="registerBtn">
                        <span class="btn-spinner"></span>
                        <span class="btn-text">
                            <span class="default-text">Tạo tài khoản</span>
                        </span>
                    </button>

                    <div class="link-text">
                        Đã có tài khoản?
                        <a href="{{ route('login') }}">Đăng nhập</a>
                    </div>

                  <div class="link-text">
    <a href="{{ route('policy.privacy') }}">Chính sách bảo mật</a> |
    <a href="{{ route('policy.terms') }}">Điều khoản sử dụng</a> |
    <a href="{{ route('policy.contact') }}">Liên hệ</a>
</div>

                    <div class="footer-text">
                        © {{ date('Y') }} Tài Đỗ Map
                    </div>
                </form>

            </div>
        </div>

        @include('components.footer')

    </div>

    <script>
        function togglePassword(){
            const input = document.getElementById('password');
            input.type = input.type === 'password' ? 'text' : 'password';
        }

        function togglePassword2(){
            const input = document.getElementById('password2');
            input.type = input.type === 'password' ? 'text' : 'password';
        }

        const emailInput = document.getElementById('email');
        const emailError = document.getElementById('email-error');
        const registerForm = document.getElementById('registerForm');
        const registerBtn = document.getElementById('registerBtn');

        let isSubmitting = false;

        emailInput.addEventListener('input', function () {
            const val = this.value.trim().toLowerCase();

            emailError.innerHTML = '';
            this.classList.remove('is-invalid');

            const fixes = {
                '@gmai.com':'@gmail.com',
                '@gmial.com':'@gmail.com',
                '@gmail.con':'@gmail.com',
                '@gmail.co':'@gmail.com',
            };

            for (const wrong in fixes) {
                if (val.endsWith(wrong)) {
                    emailError.innerHTML = `Sai đuôi (${wrong}) → phải là @gmail.com`;
                    this.classList.add('is-invalid');
                    return;
                }
            }

            if (val && !val.endsWith('@gmail.com')) {
                emailError.innerHTML = 'Chỉ chấp nhận @gmail.com';
                this.classList.add('is-invalid');
            }
        });

        function setLoadingState(loading) {
            if (loading) {
                registerBtn.disabled = true;
                registerBtn.classList.add('loading');
                registerForm.classList.add('form-lock');
            } else {
                registerBtn.disabled = false;
                registerBtn.classList.remove('loading');
                registerForm.classList.remove('form-lock');
            }
        }

        function validateBeforeSubmit() {
            let isValid = true;
            const emailVal = emailInput.value.trim().toLowerCase();
            const password = document.getElementById('password').value;
            const password2 = document.getElementById('password2').value;

            emailError.innerHTML = '';
            emailInput.classList.remove('is-invalid');

            if (!emailVal.endsWith('@gmail.com')) {
                emailError.innerHTML = 'Chỉ chấp nhận @gmail.com';
                emailInput.classList.add('is-invalid');
                isValid = false;
            }

            if (password !== password2) {
                alert('Mật khẩu xác nhận không khớp.');
                isValid = false;
            }

            return isValid;
        }

        registerForm.addEventListener('submit', function (e) {
            if (isSubmitting) {
                e.preventDefault();
                return false;
            }

            if (!validateBeforeSubmit()) {
                e.preventDefault();
                setLoadingState(false);
                isSubmitting = false;
                return false;
            }

            isSubmitting = true;
            setLoadingState(true);
        });

        window.addEventListener('pageshow', function (event) {
            if (event.persisted) {
                isSubmitting = false;
                setLoadingState(false);
            }
        });
    </script>

</body>
</html>