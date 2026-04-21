<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tài Đỗ Map | Quản lý file bản đồ</title>
    <meta name="robots" content="noindex,nofollow,noarchive">
    <meta name="description" content="Trang quản lý file bản đồ của người dùng trên Tài Đỗ Map.">
    <link rel="icon" type="image/png" href="{{ asset('images/logo.png') }}">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html, body {
            width: 100%;
            min-height: 100vh;
            overflow-x: hidden !important;
            overflow-y: auto !important;
        }

        body {
            font-family: 'Segoe UI', sans-serif;
            background:
                radial-gradient(circle at top left, rgba(56,189,248,.10), transparent 28%),
                radial-gradient(circle at bottom right, rgba(14,165,233,.12), transparent 26%),
                linear-gradient(135deg, #0b1630 0%, #10264d 52%, #0a1b36 100%);
            color: #1f2937;
        }

        body::before {
            content: "";
            position: fixed;
            inset: 0;
            background:
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size: 40px 40px;
            pointer-events: none;
            z-index: 0;
        }

        .page-content {
            position: relative;
            z-index: 1;
            padding: 36px 0 52px;
        }

        .glass-card {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.24);
            border-radius: 28px;
            box-shadow: 0 18px 50px rgba(0,0,0,0.18);
        }

        .section-space {
            margin-bottom: 24px;
        }

        .user-card,
        .scope-card,
        .file-card {
            padding: 28px;
        }

        .trust-note {
            margin-top: 18px;
            padding: 14px 16px;
            border-radius: 18px;
            background: #f8fbff;
            border: 1px solid #e5eef9;
            color: #475569;
            font-size: 13px;
            line-height: 1.7;
        }

        .trust-note strong {
            color: #0f172a;
        }

        .trust-note a {
            color: #2563eb;
            font-weight: 700;
            text-decoration: none;
        }

        .trust-note a:hover {
            text-decoration: underline;
        }

        .user-top {
            display: flex;
            align-items: center;
            gap: 18px;
            flex-wrap: wrap;
        }

        .avatar {
            width: 74px;
            height: 74px;
            border-radius: 50%;
            background: linear-gradient(135deg,#1d4ed8,#38bdf8);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 30px;
            flex-shrink: 0;
            box-shadow: 0 12px 26px rgba(29,78,216,.28);
        }

        .welcome-title {
            margin: 0;
            font-size: 34px;
            font-weight: 800;
            line-height: 1.1;
            color: #0f172a;
        }

        .welcome-title span {
            color: #2563eb;
        }

        .user-meta {
            margin-top: 8px;
            color: #6b7280;
            font-size: 15px;
            line-height: 1.8;
        }

        .user-divider {
            border: 0;
            height: 1px;
            background: linear-gradient(to right, transparent, #dbe2ea, transparent);
            margin: 24px 0;
        }

        .stat-box {
            background: #f8fbff;
            border: 1px solid #e7eef8;
            border-radius: 20px;
            padding: 20px;
            height: 100%;
        }

        .stat-label {
            font-size: 14px;
            font-weight: 700;
            color: #6b7280;
            margin-bottom: 10px;
        }

        .stat-value {
            font-size: 32px;
            line-height: 1.1;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
        }

        .stat-sub {
            font-size: 13px;
            color: #6b7280;
            margin-top: 8px;
        }

        .vip-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px 14px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: .3px;
            white-space: nowrap;
        }

        .vip-badge.free {
            background: #eef2ff;
            color: #3b5bdb;
            border: 1px solid #c7d2fe;
        }

        .vip-badge.vip1 {
            background: #fff3cd;
            color: #b26a00;
            border: 1px solid #ffe08a;
        }

        .vip-badge.vip2 {
            background: #e6fcf5;
            color: #087f5b;
            border: 1px solid #96f2d7;
        }

        .vip-badge.vip3 {
            background: linear-gradient(135deg, #111827, #374151);
            color: #ffd43b;
            border: 1px solid rgba(255, 212, 59, .35);
        }

        .section-title {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-subtitle {
            margin: 6px 0 0;
            color: #6b7280;
            font-size: 15px;
        }

        .scope-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 14px;
            margin-top: 20px;
        }

        .scope-item {
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            padding: 16px;
            background: #fff;
        }

        .scope-province {
            font-size: 13px;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 6px;
        }

        .scope-area {
            font-size: 18px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 6px;
        }

        .scope-code {
            font-size: 13px;
            color: #6b7280;
        }

        .empty-box {
            margin-top: 18px;
            padding: 18px;
            border-radius: 18px;
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            color: #64748b;
            font-weight: 600;
        }

        .file-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 18px;
            flex-wrap: wrap;
        }

        .file-count {
            background: #eef4ff;
            color: #2563eb;
            padding: 10px 16px;
            border-radius: 999px;
            font-size: 14px;
            font-weight: 800;
            white-space: nowrap;
        }

        .table-wrap {
            overflow: auto;
            max-height: 680px;
            border-radius: 20px;
            border: 1px solid #e8edf3;
            background: #fff;
        }

        .table {
            margin-bottom: 0;
            min-width: 1280px;
        }

        .table thead th {
            position: sticky;
            top: 0;
            z-index: 3;
            background: #f8fafc !important;
            color: #111827;
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            border-bottom: 1px solid #e5e7eb;
            padding: 16px 14px;
            white-space: nowrap;
        }

        .table tbody td {
            vertical-align: middle;
            padding: 16px 14px;
            font-size: 15px;
            color: #374151;
            border-color: #eef2f7;
            white-space: nowrap;
        }

        .table tbody tr:hover {
            background: #f8fbff;
        }

        .file-id {
            font-weight: 800;
            color: #374151;
        }

        .file-name {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 280px;
        }

        .file-icon {
            width: 38px;
            height: 38px;
            border-radius: 12px;
            background: #eef4ff;
            color: #2563eb;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 17px;
        }

        .file-name-text {
            font-weight: 700;
            color: #111827;
            line-height: 1.35;
        }

        .badge-type {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px 14px;
            border-radius: 999px;
            background: #eaf4fb;
            color: #0284c7;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .35px;
            min-width: 96px;
        }

        .size-text {
            font-weight: 700;
            color: #374151;
        }

        .btn-download {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-width: 148px;
            padding: 10px 16px;
            border: none;
            border-radius: 14px;
            background: linear-gradient(135deg,#22c55e,#16a34a);
            color: #fff;
            font-size: 14px;
            font-weight: 800;
            text-decoration: none;
            box-shadow: 0 10px 22px rgba(34,197,94,.22);
            transition: .2s ease;
        }

        .btn-download:hover {
            transform: translateY(-1px);
            color: #fff;
            box-shadow: 0 14px 26px rgba(34,197,94,.30);
        }

        .table-wrap::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        .table-wrap::-webkit-scrollbar-track {
            background: #edf2f7;
            border-radius: 20px;
        }

        .table-wrap::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 20px;
        }

        @media (max-width: 992px) {
            .user-card,
            .scope-card,
            .file-card {
                padding: 20px;
            }

            .welcome-title {
                font-size: 26px;
            }

            .section-title {
                font-size: 22px;
            }
        }
    </style>
</head>

<body>
    @include('components.header')

    @php
        $vipLevel = $user->getCurrentVipLevel();
        $vipName = $user->getCurrentVipName();
        $areaLimit = $user->getAreaLimit();
        $usedAreaCount = $user->usedAreaCount();
        $remainingAreaCount = $user->remainingAreaCount();
        $areaScopes = $user->areaScopes()->orderBy('province_name')->orderBy('area_name')->get();

        $vipBadgeClass = match($vipLevel) {
            1 => 'vip-badge vip1',
            2 => 'vip-badge vip2',
            3 => 'vip-badge vip3',
            default => 'vip-badge free',
        };
    @endphp

    <div class="container-fluid px-3 px-lg-4 px-xl-5 page-content">
        <div class="row justify-content-center">
            <div class="col-12 col-xl-11">

                <div class="glass-card user-card section-space">
                    <div class="user-top">
                        <div class="avatar">
                            <i class="bi bi-person-fill"></i>
                        </div>

                        <div>
                            <h4 class="welcome-title">
                                Xin chào, <span>{{ $user->name }}</span>
                            </h4>

                            <div class="user-meta">
                                <div>
                                    <i class="bi bi-envelope me-1"></i>
                                    {{ $user->email ?: 'Chưa có email' }}
                                </div>
                                <div>
                                    <i class="bi bi-phone me-1"></i>
                                    {{ $user->phone ?: 'Chưa có số điện thoại' }}
                                </div>
                                <div>
                                    <i class="bi bi-star-fill me-1"></i>
                                    <span class="{{ $vipBadgeClass }}">{{ $vipName }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="user-divider">

                    <div class="row g-3">
                        <div class="col-md-3">
                            <div class="stat-box">
                                <div class="stat-label">
                                    <i class="bi bi-folder2-open me-1"></i>
                                    Tổng số file
                                </div>
                                <p class="stat-value">{{ count($files) }}</p>
                            </div>
                        </div>

                        <div class="col-md-3">
                            <div class="stat-box">
                                <div class="stat-label">
                                    <i class="bi bi-geo-alt me-1"></i>
                                    Địa bàn đã đăng ký
                                </div>
                                <p class="stat-value">{{ $usedAreaCount }}</p>
                                <div class="stat-sub">
                                    @if($areaLimit === -1)
                                        Gói VIP 3 không giới hạn địa bàn
                                    @else
                                        Đã dùng {{ $usedAreaCount }}/{{ $areaLimit }} địa bàn
                                    @endif
                                </div>
                            </div>
                        </div>

                        <div class="col-md-3">
                            <div class="stat-box">
                                <div class="stat-label">
                                    <i class="bi bi-arrow-repeat me-1"></i>
                                    Còn lại
                                </div>
                                <p class="stat-value">
                                    {{ $areaLimit === -1 ? '∞' : $remainingAreaCount }}
                                </p>
                                <div class="stat-sub">
                                    Số địa bàn còn có thể đăng ký thêm
                                </div>
                            </div>
                        </div>

                        <div class="col-md-3">
                            <div class="stat-box">
                                <div class="stat-label">
                                    <i class="bi bi-hdd-stack me-1"></i>
                                    Dung lượng
                                </div>
                                <p class="stat-value">
                                    {{ round($files->sum('file_size') / 1024 / 1024, 2) }}
                                </p>
                                <div class="stat-sub">
                                    MB đang sử dụng
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="trust-note">
                        <strong>Lưu ý bảo mật:</strong> Đây là khu vực riêng tư để quản lý các file bản đồ bạn đã tải lên.
                        Nút tải xuống chỉ dùng để lấy lại dữ liệu bản đồ của chính tài khoản này.
                        Xem thêm tại
                        <a href="{{ route('policy.privacy') }}">Chính sách bảo mật</a>,
                        <a href="{{ route('policy.terms') }}">Điều khoản sử dụng</a>
                        và
                        <a href="{{ route('policy.gis-data') }}">Quy định dữ liệu GIS</a>.
                    </div>
                </div>

                <div class="glass-card scope-card section-space">
                    <h5 class="section-title">
                        <i class="bi bi-map"></i>
                        Danh sách xã/phường đã đăng ký
                    </h5>
                    <p class="section-subtitle">
                        Hiển thị đầy đủ các địa bàn mà tài khoản này đang được phép tải bản đồ
                    </p>

                    @if($areaScopes->count())
                        <div class="scope-grid">
                            @foreach($areaScopes as $scope)
                                <div class="scope-item">
                                    <div class="scope-province">
                                        {{ $scope->province_name }}
                                    </div>
                                    <div class="scope-area">
                                        {{ $scope->area_name }}
                                    </div>
                                    <div class="scope-code">
                                        {{ $scope->area_level ?: 'Địa bàn' }} · Mã xã: {{ $scope->area_code }}
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    @else
                        <div class="empty-box">
                            Tài khoản này chưa đăng ký địa bàn nào.
                        </div>
                    @endif
                </div>

                <div class="glass-card file-card">
                    <div class="file-head">
                        <div>
                            <h5 class="section-title">
                                <i class="bi bi-map"></i>
                                Danh sách file bản đồ
                            </h5>
                            <p class="section-subtitle">
                                Quản lý, theo dõi và tải xuống các file bản đồ GIS của bạn
                            </p>
                        </div>

                        <div class="file-count">
                            {{ count($files) }} file
                        </div>
                    </div>

                    <div class="table-wrap">
                        <table class="table align-middle">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Tên file</th>
                                    <th>Loại</th>
                                    <th>Tỉnh/Thành</th>
                                    <th>Xã/Phường</th>
                                    <th>Mã xã</th>
                                    <th>Kích thước</th>
                                    <th>Ngày tải</th>
                                    <th>Tải xuống</th>
                                </tr>
                            </thead>

                            <tbody>
                                @forelse($files as $file)
                                    <tr>
                                        <td>
                                            <span class="file-id">{{ $file->id }}</span>
                                        </td>

                                        <td>
                                            <div class="file-name">
                                                <div class="file-icon">
                                                    <i class="bi bi-file-earmark-text"></i>
                                                </div>
                                                <div class="file-name-text">
                                                    {{ $file->file_name }}
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <span class="badge-type">{{ $file->type }}</span>
                                        </td>

                                        <td>{{ $file->province_name ?: '---' }}</td>

                                        <td>
                                            {{ $file->area_name ?: '---' }}
                                            @if($file->area_level)
                                                ({{ $file->area_level }})
                                            @endif
                                        </td>

                                        <td>{{ $file->area_code ?: '---' }}</td>

                                        <td>
                                            <span class="size-text">
                                                <i class="bi bi-hdd me-1"></i>
                                                {{ round(($file->file_size ?? 0) / 1024 / 1024, 2) }} MB
                                            </span>
                                        </td>

                                        <td>
                                            {{ optional($file->created_at)->format('d/m/Y H:i') }}
                                        </td>

                                        <td>
                                            <a
                                                href="{{ route('map.download', $file->id) }}"
                                                class="btn-download"
                                                rel="nofollow"
                                            >
                                                <i class="bi bi-download"></i>
                                                Tải file GIS
                                            </a>
                                        </td>
                                    </tr>
                                @empty
                                    <tr>
                                        <td colspan="9" class="text-center text-muted py-4">
                                            Chưa có file bản đồ nào
                                        </td>
                                    </tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    </div>

    @include('components.footer')
</body>
</html>