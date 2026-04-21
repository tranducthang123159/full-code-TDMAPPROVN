<footer class="guland-footer">
    <div class="footer-container">

        <div class="footer-col">
            <h4>HỖ TRỢ NHANH  </h4>
            <p>Quét Mã QR Liên Hệ Trực Tiếp Zalo</p>
            <div class="qr-box">
<img src="{{ asset('images/zalo.jpg') }}" alt="Zalo">
                <div class="store-links">
                    <!-- <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="App Store">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play"> -->
                </div>
            </div>
        </div>

        <div class="footer-col">
            <h4>HỖ TRỢ</h4>
            <ul>
                <li><a href="{{ route('policy.terms') }}">Điều khoản thỏa thuận</a></li>
                <li><a href="{{ route('policy.privacy') }}">Chính sách bảo mật</a></li>
                <li><a href="{{ route('policy.gis-data') }}">Quy chế hoạt động</a></li>
                 <li><a href="{{ route('policy.contact') }}">Giải quyết khiếu nại</a></li>
            </ul>
        </div>

        <div class="footer-col">
            <h4>VỀ TÀI ĐỔ MAP</h4>
           <ul>
           
                <li><a href="{{ route('policy.payment') }}">Thanh toán và kích hoạt</a></li>
                <li><a href="{{ route('policy.refund') }}">Chính sách hoàn tiền</a></li>
                <li><a href="{{ route('policy.contact') }}">Liên hệ hỗ trợ</a></li>
           </ul>
        </div>

        <div class="footer-col">
            <h4>MẠNG XÃ HỘI</h4>
            <div class="social">
                <a href="https://www.facebook.com/taisky990" class="fb">f</a>
                <a href="https://www.youtube.com/@tdmap990" class="yt">▶</a>
            </div>

            <h4 style="margin-top:20px;">CHỨNG NHẬN</h4>
            <!-- <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/B%C3%B4%CC%89_C%C3%B4ng_Th%C6%B0%C6%A1ng_Logo.svg/2560px-B%C3%B4%CC%89_C%C3%B4ng_Th%C6%B0%C6%A1ng_Logo.svg.png"
                alt="Bộ Công Thương"
                class="cert"
            > -->
        </div>

    </div>

<div class="footer-bottom">
    <div class="logo">
        <span>TÀI ĐỖ MAP</span>
        <img src="{{ asset('images/logo.ico') }}" alt="Tài Đỗ Map" class="site-logo">
    </div>
    <p>Email: tdmap990@gmail.com - Hotline: 0944739248</p>
</div>
</footer>

<style>
    .guland-footer{
        background:#f2f2f2;
        padding:50px 20px 30px;
        font-family:'Segoe UI', sans-serif;
        margin-top:50px;
    }

    .footer-container{
        max-width:1200px;
        margin:auto;
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:40px;
    }

    .footer-col h4{
        font-size:16px;
        margin-bottom:15px;
        font-weight:700;
        color:#222;
    }

    .footer-col ul{
        list-style:none;
        padding:0;
        margin:0;
    }

    .footer-col ul li{
        margin-bottom:8px;
    }

    .footer-col ul li a{
        text-decoration:none;
        font-size:14px;
        color:#444;
        cursor:pointer;
        transition:0.2s;
        display:inline-block;
    }

    .footer-col ul li a:hover{
        color:#0072ff;
        transform:translateX(3px);
    }

    .qr-box{
        display:flex;
        gap:15px;
        align-items:flex-start;
    }

    .qr-box > img{
        width:110px;
        border-radius:8px;
        background:#fff;
        padding:4px;
    }

    .store-links img{
        width:130px;
        margin-bottom:10px;
        display:block;
    }

    .social{
        display:flex;
        gap:10px;
    }

    .social a{
        width:40px;
        height:40px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-weight:bold;
        cursor:pointer;
        text-decoration:none;
    }

    .fb{background:#1877f2;}
    .yt{background:red;}

    .cert{
        width:150px;
        margin-top:10px;
    }

    .footer-bottom{
        text-align:center;
        margin-top:40px;
        border-top:1px solid #ddd;
        padding-top:20px;
    }

    .footer-bottom .logo{
        font-size:36px;
        font-weight:800;
        color:#d4a017;
    }
    .footer-bottom .logo .site-logo{
       width: 5%;
       height: 0%;
    }
    .footer-bottom .logo{
    display:flex;
    align-items:center;
    justify-content:center;
}

.footer-bottom .logo .site-logo{
    width:auto;
    height:1em;
    padding: 4px;
}
    .footer-bottom p{
        margin:10px 0;
        color:#444;
    }

    @media(max-width:992px){
        .footer-container{
            grid-template-columns:repeat(2,1fr);
        }
    }

    @media(max-width:600px){
        .footer-container{
            grid-template-columns:1fr;
        }

        .qr-box{
            flex-direction:column;
        }
    }
</style>