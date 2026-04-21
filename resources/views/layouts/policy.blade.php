<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title ?? 'Chính sách' }} - Tài Đỗ Map</title>
    <meta name="description" content="{{ $description ?? 'Trang chính sách và quy định sử dụng dịch vụ bản đồ GIS.' }}">

    <link rel="stylesheet" href="{{ asset('css/policy.css') }}">
</head>
<body>
    @include('components.header')

    <main class="policy-page">
        <section class="policy-hero">
            <div class="policy-hero-inner">
                <div class="policy-badge">Tài Đỗ Map • Chính sách & quy định</div>
                <h1 class="policy-title">{{ $heroTitle ?? ($title ?? 'Trang chính sách') }}</h1>
                <p class="policy-desc">
                    {{ $heroDesc ?? 'Các chính sách dưới đây giúp người dùng hiểu rõ quyền lợi, trách nhiệm và phạm vi sử dụng đối với dịch vụ bản đồ, dữ liệu địa chính, dữ liệu quy hoạch và các công cụ GIS trên hệ thống.' }}
                </p>
            </div>
        </section>

        <div class="policy-wrapper">
            <div class="policy-grid">
                <aside class="policy-sidebar">
                    <div class="policy-card policy-menu">
                        <h3>Danh mục chính sách</h3>
                        <ul>
                            <li><a href="{{ route('policy.privacy') }}">Chính sách bảo mật</a></li>
                            <li><a href="{{ route('policy.terms') }}">Điều khoản sử dụng</a></li>
                            <li><a href="{{ route('policy.payment') }}">Thanh toán & kích hoạt</a></li>
                            <li><a href="{{ route('policy.refund') }}">Chính sách hoàn tiền</a></li>
                            <li><a href="{{ route('policy.gis-data') }}">Quy định dữ liệu GIS</a></li>
                            <li><a href="{{ route('policy.contact') }}">Liên hệ & hỗ trợ</a></li>
                        </ul>
                    </div>

                    <div class="policy-card policy-contact-box">
                        <h4>Hỗ trợ khách hàng</h4>
                        <p>Nếu bạn cần chỉnh sửa dữ liệu, hỗ trợ tài khoản hoặc yêu cầu xử lý thông tin cá nhân, vui lòng liên hệ với chúng tôi.</p>
                        <p>Email: <a href="mailto:your@email.com">your@email.com</a></p>
                        <p>Điện thoại: <a href="tel:0900000000">0900 000 000</a></p>
                    </div>
                </aside>

                <section class="policy-card policy-content">
                    @yield('content')

                    <div class="policy-links">
                        <a class="policy-link-card" href="{{ route('policy.privacy') }}">
                            <strong>Chính sách bảo mật</strong>
                            <span>Bảo vệ thông tin cá nhân và dữ liệu bản đồ.</span>
                        </a>

                        <a class="policy-link-card" href="{{ route('policy.terms') }}">
                            <strong>Điều khoản sử dụng</strong>
                            <span>Quy định quyền và nghĩa vụ của người dùng.</span>
                        </a>

                        <a class="policy-link-card" href="{{ route('policy.payment') }}">
                            <strong>Thanh toán & kích hoạt</strong>
                            <span>Quy trình thanh toán, xác nhận và kích hoạt dịch vụ.</span>
                        </a>

                        <a class="policy-link-card" href="{{ route('policy.refund') }}">
                            <strong>Chính sách hoàn tiền</strong>
                            <span>Điều kiện và phạm vi xử lý hoàn phí dịch vụ.</span>
                        </a>

                        <a class="policy-link-card" href="{{ route('policy.gis-data') }}">
                            <strong>Quy định dữ liệu GIS</strong>
                            <span>Phạm vi xử lý, lưu trữ và sử dụng dữ liệu kỹ thuật.</span>
                        </a>

                        <a class="policy-link-card" href="{{ route('policy.contact') }}">
                            <strong>Liên hệ & hỗ trợ</strong>
                            <span>Thông tin chủ sở hữu, tiếp nhận hỗ trợ và phản hồi.</span>
                        </a>
                    </div>
                </section>
            </div>
        </div>
    </main>

    @include('components.footer')
</body>
</html>