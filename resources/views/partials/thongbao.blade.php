<div id="noticeOverlay">
    <div class="notice-wrap">
        <button class="notice-close" onclick="closeNotice()" aria-label="Đóng thông báo">×</button>

        <div class="notice-box">
            <div class="notice-bg">
                <div class="notice-blob blob-1"></div>
                <div class="notice-blob blob-2"></div>

                <div class="notice-card">
                    <div class="notice-accent-bar"></div>

                    <div class="notice-header">
                        <div class="notice-logo-box">🗺️</div>
                        <div class="notice-header-text">
                            <div class="notice-badge">Thông báo chính thức</div>
                            <div class="notice-site-name">tdmap.pro.vn</div>
                            <div class="notice-tagline">
                                Nền tảng GIS trực tuyến – Quản lý & khai thác bản đồ địa chính số
                            </div>
                        </div>
                    </div>

                    <div class="notice-body">
                        <p class="notice-intro">
                            <strong>tdmap.pro.vn</strong> trân trọng thông báo đến các cơ quan, đơn vị và cán bộ chuyên môn
                            trong lĩnh vực quản lý đất đai về chính sách <strong>đăng ký công cụ</strong> để được chuyển đổi
                            và sử dụng bản đồ trực tuyến trên nền tảng của chúng tôi.
                        </p>

                        <div class="notice-section-label">Đối tượng áp dụng</div>

                        <div class="notice-grid">
                            <div class="notice-item">
                                🏛️ <strong>Cơ quan quản lý đất đai</strong><br>
                                <span>Sở TN&amp;MT cấp tỉnh, Bộ phận quản lý đất đai cấp xã</span>
                            </div>

                            <div class="notice-item">
                                📋 <strong>Văn phòng đăng ký đất đai</strong><br>
                                <span>VPĐKĐĐ cấp tỉnh, cán bộ địa chính xã thụ lý hồ sơ</span>
                            </div>

                            <div class="notice-item">
                                🏗️ <strong>Đơn vị tư vấn dự án đất đai</strong><br>
                                <span>Doanh nghiệp đo đạc, lập bản đồ, kiểm kê đất đai</span>
                            </div>

                            <div class="notice-item">
                                🗂️ <strong>Cán bộ quản lý bản đồ</strong><br>
                                <span>Phụ trách lưu trữ, cập nhật, chỉnh lý bản đồ địa chính</span>
                            </div>
                        </div>

                        <div class="notice-section-label">Quyền lợi khi đăng ký</div>

                        <div class="notice-offer">
                            <div class="notice-offer-title">⚡ Chuyển đổi &amp; sử dụng bản đồ online miễn phí</div>
                            <div class="notice-offer-desc">
                                Sau khi đăng ký tài khoản công cụ trên <strong>tdmap.pro.vn</strong>, các cơ quan và cán bộ
                                sẽ được cấp quyền <strong>chuyển đổi dữ liệu bản đồ</strong> sang định dạng trực tuyến,
                                xem và khai thác bản đồ địa chính ngay trên trình duyệt, hỗ trợ hệ tọa độ VN-2000.
                            </div>
                        </div>
                    </div>

                    <div class="notice-cta">
                        @auth
                            <a href="{{ url('/dashboard') }}" class="notice-btn notice-btn-primary">
                                👋 Xin chào, {{ auth()->user()->name }}
                            </a>

                            <a href="{{ url('/') }}" class="notice-btn notice-btn-outline">
                                Vào trang chủ →
                            </a>
                        @endauth

                        @guest
                            <a href="{{ route('register') }}" class="notice-btn notice-btn-primary">
                                🔐 Đăng ký tài khoản ngay
                            </a>

                            <a href="{{ route('login') }}" class="notice-btn notice-btn-outline">
                                Đăng nhập →
                            </a>
                        @endguest
                    </div>

                    <div class="notice-note">
                        ⚠️ <strong>Lưu ý:</strong> Toàn bộ thông tin, dữ liệu và bản đồ trên
                        <strong>tdmap.pro.vn</strong> chỉ mang tính chất tham khảo.
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    #noticeOverlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(4px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    }

    #noticeOverlay.show {
        display: flex;
        animation: noticeFadeIn .25s ease;
    }

    .notice-wrap {
        position: relative;
        width: 100%;
        max-width: 820px;
        max-height: 90vh;
        overflow-y: auto;
        border-radius: 22px;
        animation: noticeZoomIn .3s ease;
    }

    .notice-close {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 42px;
        height: 42px;
        border: none;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        font-size: 24px;
        font-weight: 700;
        cursor: pointer;
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 18px rgba(0,0,0,.25);
        transition: .2s ease;
    }

    .notice-close:hover {
        transform: scale(1.08);
        background: rgba(220, 38, 38, 0.9);
    }

    .notice-box {
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 25px 60px rgba(0,0,0,.25);
    }

    .notice-bg {
        position: relative;
        background: #eef4f8;
        font-family: 'Be Vietnam Pro', sans-serif;
        color: #1a2e3e;
        overflow: hidden;
    }

    .notice-blob {
        position: absolute;
        border-radius: 50%;
        filter: blur(90px);
        opacity: .15;
        pointer-events: none;
    }

    .blob-1 {
        width: 500px;
        height: 500px;
        background: #00b8d9;
        top: -150px;
        left: -120px;
    }

    .blob-2 {
        width: 420px;
        height: 420px;
        background: #f5c518;
        bottom: -120px;
        right: -100px;
    }

    .notice-card {
        position: relative;
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
        background: #fff;
        border: 1px solid rgba(0,130,160,0.16);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,80,120,0.10), 0 4px 16px rgba(0,0,0,0.06);
    }

    .notice-accent-bar {
        height: 4px;
        background: linear-gradient(90deg, #0096b4, #b8860b, #0096b4);
    }

    .notice-header {
        padding: 36px 44px 24px;
        display: flex;
        gap: 20px;
        border-bottom: 1px solid rgba(0,130,160,0.12);
    }

    .notice-logo-box {
        width: 54px;
        height: 54px;
        border-radius: 12px;
        background: linear-gradient(135deg, #0096b4 0%, #007a94 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0,150,180,0.28);
        font-size: 22px;
        flex-shrink: 0;
    }

    .notice-badge {
        display: inline-flex;
        align-items: center;
        background: #fef9e7;
        border: 1px solid rgba(184,134,11,0.28);
        border-radius: 20px;
        padding: 3px 12px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: .08em;
        color: #b8860b;
        text-transform: uppercase;
        margin-bottom: 10px;
    }

    .notice-site-name {
        font-size: 26px;
        font-weight: 900;
        line-height: 1.1;
        color: #0f1f2e;
    }

    .notice-tagline {
        margin-top: 4px;
        font-size: 13px;
        color: #5a7a90;
    }

    .notice-body {
        padding: 28px 44px 0;
    }

    .notice-intro {
        font-size: 15.5px;
        line-height: 1.75;
        color: rgba(26,46,62,.82);
        margin-bottom: 26px;
    }

    .notice-intro strong {
        color: #007a94;
    }

    .notice-section-label {
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: .14em;
        color: #b8860b;
        text-transform: uppercase;
        margin-bottom: 14px;
    }

    .notice-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 28px;
    }

    .notice-item {
        background: #f6fafc;
        border: 1px solid rgba(0,130,160,0.14);
        border-radius: 12px;
        padding: 14px 16px;
    }

    .notice-item span {
        font-size: 12px;
        color: #5a7a90;
    }

    .notice-offer {
        background: linear-gradient(135deg, rgba(0,150,180,0.06), rgba(184,134,11,0.04));
        border: 1px solid rgba(0,130,160,.18);
        border-radius: 14px;
        padding: 22px 24px;
        margin-bottom: 28px;
    }

    .notice-offer-title {
        font-size: 15px;
        font-weight: 700;
        color: #007a94;
        margin-bottom: 6px;
    }

    .notice-offer-desc {
        font-size: 13.5px;
        line-height: 1.65;
        color: rgba(26,46,62,.78);
    }

    .notice-cta {
        padding: 24px 44px 36px;
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        align-items: center;
    }

    .notice-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 200px;
        padding: 14px 26px;
        border-radius: 999px;
        text-decoration: none;
        font-size: 16px;
        font-weight: 700;
        transition: all .25s ease;
        border: 1px solid transparent;
        white-space: nowrap;
    }

    .notice-btn:hover {
        transform: translateY(-2px);
        text-decoration: none;
    }

    .notice-btn-primary {
        background: linear-gradient(135deg, #16c5e7 0%, #0ea5d6 100%);
        color: #fff;
        box-shadow: 0 8px 20px rgba(14, 165, 214, .25);
    }

    .notice-btn-primary:hover {
        color: #fff;
        box-shadow: 0 12px 24px rgba(14, 165, 214, .35);
    }

    .notice-btn-outline {
        background: #fff;
        color: #0ea5d6;
        border: 1.5px solid rgba(14, 165, 214, .25);
        box-shadow: 0 8px 18px rgba(15, 23, 42, .06);
    }

    .notice-btn-outline:hover {
        color: #0284c7;
        border-color: rgba(2, 132, 199, .45);
    }

    .notice-note {
        margin: 0 44px 20px;
        border-top: 1px solid rgba(184,134,11,0.18);
        padding: 16px 20px;
        background: #fef9e7;
        border-left: 3px solid #b8860b;
        border-radius: 0 8px 8px 0;
        font-size: 12px;
        line-height: 1.65;
        color: rgba(26,46,62,.65);
    }

    @keyframes noticeFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes noticeZoomIn {
        from {
            opacity: 0;
            transform: scale(.96) translateY(12px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    @media (max-width: 576px) {
        .notice-wrap {
            max-width: 100%;
            max-height: 92vh;
        }

        .notice-close {
            top: 10px;
            right: 10px;
            width: 38px;
            height: 38px;
            font-size: 22px;
        }

        .notice-header,
        .notice-body,
        .notice-cta {
            padding-left: 20px;
            padding-right: 20px;
        }

        .notice-note {
            margin-left: 20px;
            margin-right: 20px;
        }

        .notice-grid {
            grid-template-columns: 1fr;
        }

        .notice-site-name {
            font-size: 22px;
        }

        .notice-cta {
            flex-direction: column;
            align-items: stretch;
        }

        .notice-btn {
            width: 100%;
            min-width: unset;
            font-size: 15px;
            padding: 13px 20px;
        }
    }
</style>

<script>
    function openNotice() {
        const overlay = document.getElementById('noticeOverlay');
        if (overlay) overlay.classList.add('show');
    }

    function closeNotice() {
        const overlay = document.getElementById('noticeOverlay');
        if (overlay) overlay.classList.remove('show');
    }

    document.addEventListener('DOMContentLoaded', function () {
        openNotice();
    });

    document.addEventListener('click', function (e) {
        const overlay = document.getElementById('noticeOverlay');
        if (e.target === overlay) {
            closeNotice();
        }
    });
</script>