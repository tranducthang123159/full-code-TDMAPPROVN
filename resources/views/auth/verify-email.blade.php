<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Xác minh Email - Hệ thống địa chính</title>
   


<style>
*{box-sizing:border-box;}

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
.verify-card{
    width:100%;
    max-width:480px;
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
    font-size:36px;
    margin-bottom:12px;
}

.title{
    text-align:center;
    font-size:20px;
    font-weight:700;
    margin-bottom:15px;
}

.text-content{
    font-size:14px;
    opacity:0.85;
    line-height:1.6;
    text-align:center;
    margin-bottom:20px;
}

.success-message{
    text-align:center;
    font-size:14px;
    margin-bottom:20px;
    color:#7CFC00;
}

.button-group{
    display:flex;
    flex-direction:column;
    gap:12px;
}

.verify-btn{
    width:100%;
    padding:13px;
    border:none;
    border-radius:14px;
    background:linear-gradient(135deg,#00c6ff,#0072ff);
    font-weight:600;
    font-size:15px;
    transition:0.3s;
    color:white;
}

.verify-btn:hover{
    transform:translateY(-2px);
    box-shadow:0 10px 20px rgba(0,114,255,0.4);
}

.logout-btn{
    width:100%;
    padding:11px;
    border-radius:14px;
    border:1px solid rgba(255,255,255,0.3);
    background:transparent;
    color:white;
    font-size:14px;
    transition:0.3s;
}

.logout-btn:hover{
    background:rgba(255,255,255,0.1);
}

/* MOBILE */
@media(max-width:480px){

    .main-content{
        align-items:flex-start;
        padding-top:40px;
    }

    .verify-card{
        padding:25px;
        border-radius:16px;
    }

    .logo{
        font-size:30px;
    }

    .title{
        font-size:18px;
    }
}
</style>
</head>
@if(auth()->user() && auth()->user()->hasVerifiedEmail())
<script>
    window.location.href = "/";
</script>
@endif
<body>
@include('components.header')

<div class="page-wrapper">

    <div class="main-content">
        <div class="verify-card">

            <div class="logo">📩</div>
            <div class="title">XÁC MINH EMAIL</div>

            <div class="text-content">
                Cảm ơn bạn đã đăng ký!  
                Vui lòng kiểm tra email và nhấn vào liên kết xác minh để kích hoạt tài khoản.
                Nếu chưa nhận được email, bạn có thể gửi lại bên dưới.
            </div>

            @if (session('status') == 'verification-link-sent')
                <div class="success-message">
                    ✅ Liên kết xác minh mới đã được gửi đến email của bạn.
                </div>
            @endif

            <div class="button-group">

                <form method="POST" action="{{ route('verification.send') }}">
                    @csrf
                    <button type="submit" class="verify-btn">
                        🔄 Gửi lại email xác minh
                    </button>
                </form>

                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button type="submit" class="logout-btn">
                        🚪 Đăng xuất
                    </button>
                </form>

            </div>

        </div>
    </div>

    {{-- Footer dùng chung --}}
    @include('components.footer')

</div>
<script>
setInterval(function(){

fetch('/email/verification-status')
.then(res => res.json())
.then(data => {

if(data.verified){
window.location = "/";
}

})

},3000);
</script>
</body>
</html>