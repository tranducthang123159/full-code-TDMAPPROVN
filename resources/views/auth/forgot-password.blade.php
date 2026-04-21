<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Quên mật khẩu - Hệ thống địa chính</title>


<style>
*{box-sizing:border-box;}
    html, body{
            width:100%;
            min-height:100vh;
            overflow-x:hidden !important;
            overflow-y:auto !important;
        }
body{
    margin:0;
    min-height:100vh;
    font-family:'Segoe UI', sans-serif;
    background:
    linear-gradient(rgba(10,25,47,0.88), rgba(10,25,47,0.88)),
   url('https://cdn.thuvienphapluat.vn/uploads/tintuc/2023/04/04/ban-do-dia-chinh.jpg');
    background-size:cover;
    background-position:center;
}

/* GRID overlay */
body::before{
    content:"";
    position:fixed;
    inset:0;
    background-image:
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size:40px 40px;
    pointer-events:none;
}

/* WRAPPER */
.page-wrapper{
    min-height:100vh;
    display:flex;
    flex-direction:column;
}

/* MAIN */
.main-content{
    flex:1;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:40px 20px;
}

/* CARD */
.forgot-card{
    width:100%;
    max-width:440px;
    padding:40px;
    border-radius:20px;
    background:rgba(255,255,255,0.08);
    backdrop-filter:blur(20px);
    box-shadow:0 30px 60px rgba(0,0,0,0.5);
    color:white;
    animation:fadeIn 0.6s ease;
}

@keyframes fadeIn{
    from{opacity:0; transform:translateY(20px);}
    to{opacity:1; transform:translateY(0);}
}

.logo{
    text-align:center;
    font-size:34px;
    margin-bottom:10px;
}

.title{
    text-align:center;
    font-size:20px;
    font-weight:700;
}

.subtitle{
    text-align:center;
    font-size:13px;
    opacity:0.75;
    margin-bottom:25px;
    line-height:1.5;
}

.input-group{
    margin-bottom:15px;
}

.input-group input{
    width:100%;
    padding:12px;
    border-radius:12px;
    border:1px solid rgba(255,255,255,0.2);
    background:rgba(255,255,255,0.1);
    color:white;
    font-size:14px;
}

.input-group input:focus{
    outline:none;
    border-color:#00c6ff;
    box-shadow:0 0 8px rgba(0,198,255,0.6);
}

.forgot-btn{
    width:100%;
    padding:13px;
    border:none;
    border-radius:14px;
    background:linear-gradient(135deg,#00c6ff,#0072ff);
    font-weight:600;
    font-size:15px;
    transition:0.3s;
}

.forgot-btn:hover{
    transform:translateY(-2px);
    box-shadow:0 10px 20px rgba(0,114,255,0.4);
}

.status-message{
    text-align:center;
    font-size:14px;
    margin-bottom:15px;
    color:#7CFC00;
}

.link-text{
    margin-top:18px;
    text-align:center;
    font-size:13px;
}

/* MOBILE */
@media(max-width:480px){

    .main-content{
        align-items:flex-start;
        padding-top:40px;
    }

    .forgot-card{
        padding:25px;
        border-radius:16px;
    }

    .logo{
        font-size:28px;
    }

    .title{
        font-size:18px;
    }

    .subtitle{
        font-size:12px;
    }
}
</style>
</head>

<body>

@include('components.header')

<div class="page-wrapper">

    <div class="main-content">
        <div class="forgot-card">

            <div class="logo">📧</div>
            <div class="title">QUÊN MẬT KHẨU</div>
            <div class="subtitle">
                Nhập email của bạn. Hệ thống sẽ gửi liên kết đặt lại mật khẩu.
            </div>

            @if (session('status'))
                <div class="status-message">
                    {{ session('status') }}
                </div>
            @endif

            <form method="POST" action="{{ route('password.email') }}">
                @csrf

                <div class="input-group">
                    <input type="email"
                           name="email"
                           value="{{ old('email') }}"
                           placeholder="Nhập email của bạn"
                           required autofocus>
                </div>

                <button type="submit" class="forgot-btn">
                    📩 Gửi liên kết đặt lại mật khẩu
                </button>

                <div class="link-text">
                    <a href="{{ route('login') }}" style="color:#00c6ff;text-decoration:none;">
                        ← Quay lại đăng nhập
                    </a>
                </div>
            </form>

        </div>
    </div>

    {{-- Footer dùng chung --}}
    @include('components.footer')

</div>

</body>
</html>