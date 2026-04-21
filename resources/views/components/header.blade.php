<link rel="stylesheet" href="{{ asset('css/loginhear.css') }}">

<style>
    /* =========================
   MENU BRAND
========================= */

.menu-brand-box{
    text-align:center;
    padding:8px 10px 18px;
    margin-bottom:10px;
    border-bottom:1px solid #ececec;
}

.menu-brand-logo{
    width:44px;
    height:44px;
    object-fit:contain;
    display:block;
    margin:0 auto 8px;
}

.menu-brand-title{
    margin:0;
    font-size:28px;
    line-height:1.2;
    font-weight:800;
    color:#e39a06;
    letter-spacing:-0.3px;
}

.menu-brand-subtitle{
    margin:6px 0 0;
    font-size:16px;
    line-height:1.35;
    font-weight:500;
    color:#2f3440;
    text-transform:uppercase;
    letter-spacing:0.4px;
}

/* responsive */
@media (max-width: 768px){
    .menu-brand-box{
        padding:6px 8px 14px;
    }

    .menu-brand-logo{
        width:40px;
        height:40px;
        margin-bottom:6px;
    }

    .menu-brand-title{
        font-size:24px;
    }

    .menu-brand-subtitle{
        font-size:14px;
    }
}

@media (max-width: 480px){
    .menu-brand-title{
        font-size:22px;
    }

    .menu-brand-subtitle{
        font-size:13px;
        letter-spacing:0.2px;
    }
}
</style>

<!-- MENU SLIDE -->
<div id="categoryMenu" class="menu-overlay">
    <div class="menu-box">
<div class="menu-brand-box">
    <img src="{{ asset('images/logo.png') }}" alt="Tài Đỗ Map" class="menu-brand-logo">
    <h2 class="menu-brand-title">Tài Đỗ Map</h2>
    <p class="menu-brand-subtitle">THÔNG TIN THẬT - GIÁ TRỊ THẬT</p>
</div>

        <div class="menu-grid">
            @guest
                <div class="menu-item">
                    <a href="{{ route('login') }}" class="menu-link">
                        👤 Đăng nhập
                    </a>
                </div>

                <div class="menu-item">
                    <a href="{{ route('register') }}" class="menu-link">
                        🧑‍🤝‍🧑 Đăng ký
                    </a>
                </div>
            @endguest

            @auth
                <div class="menu-item">
                    👋 Xin chào {{ Auth::user()->name }}
                </div>

                @role('admin')
                <div class="menu-item">
                    🛠 <a href="{{ url('/admin') }}" class="menu-link">
                        Trang quản trị admin
                    </a>
                </div>
                @endrole
            @endauth
           

            @auth
                <div class="menu-item">
                    <form method="POST" action="{{ route('logout') }}">
                        @csrf
                        <button type="submit" style="border:none;background:none;color:#dc3545;width:100%;text-align:left;">
                            🚪 Đăng xuất
                        </button>
                    </form>
                </div>
            @endauth
        </div>
    </div>
</div>
<!-- HEADER -->
<div class="top-bar">
    <a href="{{ url('/') }}" class="logo-wrap">
        <img src="{{ asset('images/logo.png') }}" class="site-logo">
        <div class="logo-text">TÀI ĐỔ </div>
    </a>
    <div class="menu-right">
      
        <span class="menu-trigger" onclick="openMenu()">☰ Danh mục</span>
    </div>
</div>




<script>
function toggleMapTools(){
    const body = document.getElementById("mapToolsBody");
    const wrapper = document.querySelector(".map-tools");
    const arrow = document.getElementById("mapArrow");

    const isCollapsed = body.classList.contains("collapsed");

    body.classList.toggle("collapsed");
    wrapper.classList.toggle("active");

    if(isCollapsed){
        arrow.style.transform = "rotate(180deg)";
        body.classList.add("opening");

        setTimeout(()=>{
            body.classList.remove("opening");
        },450);
    }else{
        arrow.style.transform = "rotate(0deg)";
    }
}
</script>
<script>
const menu = document.getElementById("categoryMenu");
const mapTools = document.querySelector(".map-tools");

function openMenu() {
    menu.classList.add("active");

    // Ẩn công cụ địa chính
    mapTools.style.display = "none";
}

function closeMenu() {
    menu.classList.remove("active");

    // Hiện lại công cụ địa chính
    mapTools.style.display = "block";
}

menu.addEventListener("click", function(e){
    if(e.target === menu){
        closeMenu();
    }
});
</script>