@php
    $authUser = auth()->user();
    $vipLevel = $authUser?->getCurrentVipLevel() ?? -1;

    $vipLabel = match($vipLevel) {
        1 => 'VIP 1',
        2 => 'VIP 2',
        3 => 'VIP 3',
        0 => 'FREE',
        default => 'KHÁCH',
    };

    $vipClass = match($vipLevel) {
        1 => 'vip-badge vip1',
        2 => 'vip-badge vip2',
        3 => 'vip-badge vip3',
        0 => 'vip-badge free',
        default => 'vip-badge guest',
    };

    $areaLimit = match($vipLevel) {
        1 => 1,
        2 => 6,
        3 => -1,
        default => 0,
    };

    $canUploadMap = auth()->check() && $vipLevel > 0;

    $vipDesc = match($vipLevel) {
        1 => 'Được dùng tối đa 1 địa bàn. Mỗi địa bàn chỉ 1 file cho mỗi loại: Địa chính cũ / Địa chính mới / Quy hoạch.',
        2 => 'Được dùng tối đa 6 địa bàn. Mỗi địa bàn chỉ 1 file cho mỗi loại: Địa chính cũ / Địa chính mới / Quy hoạch.',
        3 => 'Không giới hạn địa bàn. Mỗi địa bàn chỉ 1 file cho mỗi loại và được thay file cũ bằng file mới.',
        0 => 'Tài khoản FREE hoặc hết VIP không được upload bản đồ.',
        default => 'Đăng nhập và nâng cấp VIP để upload bản đồ theo địa bàn.',
    };
@endphp

<link rel="stylesheet" href="{{ asset('css/header.css') }}">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

<style>
.coord-import-launch {
    display: flex;
    justify-content: flex-start;
}

.coord-import-btn {
    width: 100%;
    justify-content: center;
    font-weight: 700;
    background: linear-gradient(135deg, #0f9d8a, #0b7d6d);
    color: #fff;
    border: none;
    border-radius: 12px;
    padding: 10px 14px;
}

.coord-list-panel {
    position: fixed;
    top: 90px;
    left: 50%;
    transform: translateX(-50%);
    width: min(540px, calc(100vw - 24px));
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    box-shadow: 0 20px 45px rgba(0, 0, 0, .18);
    z-index: 9999;
    overflow: hidden;
}

.coord-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #d7263d, #b81f34);
    color: #fff;
    padding: 14px 16px;
    font-weight: 800;
    cursor: grab;
}

.coord-list-header button {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 50%;
    background: rgba(255,255,255,.16);
    color: #fff;
    font-size: 18px;
    cursor: pointer;
}

.coord-tab-bar {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
}

.coord-tab-bar button {
    flex: 1;
    border: none;
    background: #f8fafc;
    color: #666;
    border-radius: 0;
    padding: 12px 10px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
}

.coord-tab-bar button.active {
    background: #fff;
    color: #d7263d;
    border-bottom: 3px solid #d7263d;
}

#tab-latlng.active {
    color: #0d6efd;
    border-bottom-color: #0d6efd;
}

.coord-tab-body {
    padding: 14px 16px 16px;
}

.coord-help {
    font-size: 12px;
    color: #555;
    line-height: 1.6;
    margin-bottom: 10px;
}

.coord-help span {
    color: #888;
}

.coord-help i {
    color: #d7263d;
}

#latlng-list-input,
#vn2000-list-input {
    width: 100%;
    resize: vertical;
    min-height: 170px;
    border: 1.5px solid #d1d5db;
    border-radius: 10px;
    padding: 10px 12px;
    font-family: monospace;
    font-size: 13px;
    outline: none;
}

.coord-action-row {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 10px;
}

.btn-draw-vn,
.btn-draw-wgs,
.btn-clear-coord {
    border: none;
    border-radius: 10px;
    padding: 10px 14px;
    font-weight: 700;
    cursor: pointer;
}

.btn-draw-vn {
    background: #d7263d;
    color: #fff;
}

.btn-draw-wgs {
    background: #0d6efd;
    color: #fff;
}

.btn-clear-coord {
    background: #e9ecef;
    color: #495057;
}

.coord-result-box {
    margin-top: 12px;
    max-height: 180px;
    overflow: auto;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 12px;
    border: 1px solid #86efac;
    background: #f0fdf4;
}

.coord-result-box.result-wgs {
    border-color: #93c5fd;
    background: #eff6ff;
}

.coord-import-center-label {
    background: rgba(255,255,255,.96);
    border: 2px solid #d7263d;
    border-radius: 8px;
    padding: 6px 10px;
    text-align: center;
    font-weight: 800;
    color: #d7263d;
    box-shadow: 0 4px 10px rgba(0,0,0,.12);
    white-space: nowrap;
}

.coord-import-edge-label {
    background: #fff;
    border: 1.5px solid #d7263d;
    border-radius: 6px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 800;
    color: #d7263d;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0,0,0,.12);
}

.coord-import-vertex {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #0d6efd;
    color: #fff;
    border: 2px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    box-shadow: 0 3px 8px rgba(0,0,0,.25);
}

@media (max-width: 768px) {
    .coord-list-panel {
        top: 72px;
        width: calc(100vw - 16px);
    }

    .coord-action-row {
        flex-direction: column;
        align-items: stretch;
    }

    .coord-action-row button {
        width: 100%;
        justify-content: center;
    }
}


    .lock-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        margin-left: 6px;
        font-size: 12px;
        color: #dc3545;
        font-weight: 700;
        vertical-align: middle;
    }

    .lock-badge i {
        font-size: 11px;
    }

    .toolbox-lock {
        display: block;
        font-size: 11px;
        color: #dc3545;
        font-weight: 700;
        line-height: 1;
        margin-top: 2px;
    }

    .protected-btn {
        position: relative;
    }

    .protected-btn i.fa-lock {
        color: #dc3545;
        font-size: 11px;
        margin-left: 4px;
    }

    .protected-upload label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
    }

    .protected-upload .upload-lock {
        color: #dc3545;
        font-size: 12px;
        font-weight: 700;
    }

    .upload-protected-title {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .upload-protected-title .fa-lock {
        color: #dc3545;
        font-size: 14px;
    }

    .protected-btn .tool-lock {
        position: absolute;
        top: 6px;
        right: 8px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        color: #dc3545;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        line-height: 1;
        pointer-events: none;
    }

    .protected-btn span {
        display: block;
        margin-top: 4px;
    }

    .vip-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .4px;
        line-height: 1;
        white-space: nowrap;
    }

    .vip-badge.guest {
        background: #f1f3f5;
        color: #6c757d;
        border: 1px solid #dee2e6;
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
        box-shadow: 0 4px 12px rgba(0, 0, 0, .18);
    }

    .user-vip-box {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 10px;
        padding: 10px 12px;
        border-radius: 14px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        font-size: 13px;
        font-weight: 600;
    }

    .user-vip-box .vip-text {
        color: #495057;
    }

    .vip-info-box {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 12px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        font-size: 13px;
        line-height: 1.6;
        transition: all .2s ease;
    }

    .vip-info-box strong {
        display: block;
        margin-bottom: 4px;
        color: #212529;
    }

    .vip-login-note {
        font-size: 12px;
        color: #dc3545;
        font-weight: 700;
    }

    .menu-item-vip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
    }

    .vip-status-error {
        background: #fff5f5 !important;
        border: 1px solid #ffc9c9 !important;
        color: #c92a2a !important;
    }

    .vip-status-warning {
        background: #fff9db !important;
        border: 1px solid #ffe066 !important;
        color: #8f5b00 !important;
    }

    .vip-status-success {
        background: #ebfbee !important;
        border: 1px solid #b2f2bb !important;
        color: #2b8a3e !important;
    }

    .area-select-wrap {
        margin-top: 12px;
        padding: 12px;
        border: 1px solid #e9ecef;
        border-radius: 12px;
        background: #fafafa;
    }

    .area-scope-box {
        margin-top: 10px;
        font-size: 13px;
        line-height: 1.6;
        color: #495057;
    }

    .area-scope-list {
        margin: 8px 0 0;
        padding-left: 18px;
    }

    .area-scope-list li {
        margin-bottom: 4px;
    }

    .area-locked-note {
        margin-top: 8px;
        font-size: 12px;
        font-weight: 700;
        color: #c92a2a;
    }

    .disabled-upload-note {
        margin-top: 10px;
        font-size: 12px;
        font-weight: 700;
        color: #c92a2a;
    }

    .upgrade-vip-box {
        margin-top: 12px;
        padding: 12px;
        border-radius: 12px;
        background: #fff4e6;
        border: 1px solid #ffd8a8;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
    }

    .upgrade-vip-text {
        font-size: 13px;
        font-weight: 700;
        color: #9c4f00;
    }

    .upgrade-vip-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 8px 14px;
        border-radius: 999px;
        background: linear-gradient(135deg, #ff922b, #f76707);
        color: #fff !important;
        text-decoration: none;
        font-size: 13px;
        font-weight: 800;
        box-shadow: 0 8px 20px rgba(247, 103, 7, .22);
    }

    .upgrade-vip-btn:hover {
        color: #fff !important;
        opacity: .95;
    }

    .area-search-hidden {
        display: none !important;
    }

    .gm-area-filter {
        padding: 12px 12px 8px;
        border-top: 1px solid #e9ecef;
        margin-top: 10px;
    }

    .gm-area-label {
        display: block;
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #374151;
    }

    .gm-area-select {
        width: 100%;
        border: 1px solid #d0d7de;
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 14px;
        outline: none;
        background: #fff;
    }

    body.logged-in .lock-badge,
    body.logged-in .upload-lock,
    body.logged-in .tool-lock,
    body.logged-in .protected-btn i.fa-lock {
        display: none !important;
    }
</style>

<div id="categoryMenu" class="menu-overlay">
    <div class="menu-box">
        <div class="text-center mb-3">
            <a href="{{ url('/') }}" class="menu-logo-wrap">
                <img src="{{ asset('images/logo.png') }}" alt="Tài Đỗ Map" class="site-logo">
                <h2 class="menu-logo logo">Tài Đỗ </h2>
            </a>
            <p>THÔNG TIN THẬT - GIÁ TRỊ THẬT</p>
        </div>

        <div class="menu-grid">
            @guest
                <div class="menu-item">
                    <a href="{{ route('login') }}" class="menu-link">👤 Đăng nhập</a>
                </div>

                <div class="menu-item">
                    <a href="{{ route('register') }}" class="menu-link">🧑‍🤝‍🧑 Đăng ký</a>
                </div>
            @endguest

            @auth
                <div class="menu-item">
                    👋 Xin chào {{ Auth::user()->name }}

                    <div class="user-vip-box">
                        <span class="vip-text">Gói hiện tại</span>
                        <span class="{{ $vipClass }}">{{ $vipLabel }}</span>
                    </div>
                </div>

                @role('admin')
                <div class="menu-item">
                    🛠 <a href="{{ url('/admin') }}" class="menu-link">Trang quản trị admin</a>
                </div>
                @endrole
            @endauth

            <a href="{{ url('/my-files') }}">
                <div class="menu-item">🏠 Thông tin người dùng</div>
            </a>

            <a href="{{ route('vip.payment') }}" style="text-decoration:none;color:inherit;">
                <div class="menu-item">
                    <div class="menu-item-vip">
                        <span>⭐ Nạp tiền VIP</span>
                    </div>
                </div>
            </a>

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

<div class="top-bar">
    <a href="{{ url('/') }}" class="logo-wrap">
        <img src="{{ asset('images/logo.png') }}" class="site-logo">
        <div class="logo-text">TÀI ĐỖ</div>
    </a>

       
    

<div class="menu-right" id="menuRight">
    <button id="exportTXTBtn" type="button" class="export-btn">
        📍 Xuất tọa độ
    </button>

    <button id="exportMeasurePDF" type="button" class="export-btn">
        📄 Xuất PDF
    </button>

    <button type="button" class="menu-trigger" id="menuTriggerBtn">
        ☰ Danh mục
    </button>
</div>
</div>

<div class="map-tools">
    <div class="map-tools-header" onclick="toggleMapTools()">
        <span>🗺 Công cụ địa chính & quy hoạch</span>
        <span id="mapArrow">▲</span>
    </div>

    <div class="map-tools-body" id="mapToolsBody">
        <div class="container-fluid p-2">
            <div class="card shadow-sm">
                <div class="card-body">

                    <h6 class="mb-3 d-flex justify-content-between align-items-center" onclick="toggleUpload()" style="cursor:pointer">
                        <span class="upload-protected-title">
                            Tải dữ liệu bản đồ
                            @guest
                                <i class="fa-solid fa-lock"></i>
                                <span class="lock-badge">Đăng nhập</span>
                            @else
                                <span class="{{ $vipClass }}">{{ $vipLabel }}</span>
                            @endguest
                        </span>
                        <span id="uploadArrow">▲</span>
                    </h6>

                    <div id="uploadBody">
                        <div class="area-select-wrap">
                            <div class="row g-2">
                                <div class="col-md-6">
                                    <label class="form-label small">Tỉnh / Thành phố</label>
                                    <select id="provinceSelect" class="form-select form-select-sm" {{ $canUploadMap ? '' : 'disabled' }}>
                                        <option value="">-- Chọn tỉnh / thành --</option>
                                    </select>
                                </div>

                                <div class="col-md-6">
                                    <label class="form-label small">Xã / Phường / Đặc khu</label>

                                    <input
                                        type="text"
                                        id="areaSearchInput"
                                        class="form-control form-control-sm mb-2"
                                        placeholder="Nhập tên xã/phường để tìm nhanh..."
                                        {{ $canUploadMap ? '' : 'disabled' }}
                                    >

                                    <select id="areaSelect" class="form-select form-select-sm" {{ $canUploadMap ? '' : 'disabled' }}>
                                        <option value="">-- Chọn xã / phường --</option>
                                    </select>
                                </div>
                            </div>

                            <div id="areaScopeBox" class="area-scope-box">
                                Đang tải thông tin địa bàn...
                            </div>

                            <div id="upgradeVipBox" class="upgrade-vip-box" style="display:none;">
                                <div class="upgrade-vip-text">
                                    Bạn đã dùng hết số địa bàn của gói hiện tại.
                                </div>
                                <a href="{{ route('vip.payment') }}" class="upgrade-vip-btn">
                                    Nâng cấp VIP
                                </a>
                            </div>

                            @if(!$canUploadMap)
                                <div class="disabled-upload-note">
                                    Tài khoản hiện không có quyền upload. Hãy nâng cấp hoặc gia hạn VIP.
                                </div>
                            @endif
                        </div>

                        <div class="row g-2 mt-2">
                            <div class="col-md-4 protected-upload">
                                <label class="form-label small">
                                    <span>Địa chính cũ</span>
                                    @guest
                                        <span class="upload-lock"><i class="fa-solid fa-lock"></i></span>
                                    @endguest
                                </label>
                                <input type="file" class="form-control form-control-sm" id="dc_cu" {{ $canUploadMap ? '' : 'disabled' }}>
                            </div>

                            <div class="col-md-4 protected-upload">
                                <label class="form-label small">
                                    <span>Địa chính mới</span>
                                    @guest
                                        <span class="upload-lock"><i class="fa-solid fa-lock"></i></span>
                                    @endguest
                                </label>
                                <input type="file" class="form-control form-control-sm" id="dc_moi" {{ $canUploadMap ? '' : 'disabled' }}>
                            </div>

                            <div class="col-md-4 protected-upload">
                                <label class="form-label small">
                                    <span>Quy hoạch</span>
                                    @guest
                                        <span class="upload-lock"><i class="fa-solid fa-lock"></i></span>
                                    @endguest
                                </label>
                                <input type="file" class="form-control form-control-sm" id="quy_hoach" {{ $canUploadMap ? '' : 'disabled' }}>
                            </div>
                        </div>

                        <div id="vipUploadStatus" class="vip-info-box">
                            <strong>Quyền upload hiện tại: {{ $vipLabel }}</strong>
                            {{ $vipDesc }}
                        </div>
                    </div>

                    <hr>
                    <div class="row g-2 mb-3">
                        <div class="col-md-2 col-4">
                            <button id="loadMapBtn" class="btn btn-primary btn-sm w-100 load-map-btn" onclick="loadMap()">
                                <span class="load-btn-inner">
                                    <span class="load-btn-spinner"></span>
                                    <span class="load-btn-text">Load Map</span>
                                </span>
                            </button>
                        </div>
                        <hr>
                    </div>

                    <div class="parcel-panel">
                        <div class="parcel-header" onclick="toggleParcelPanel()">
                            <span>🔎 Tra cứu thửa đất</span>
                            <span id="parcelArrow">▼</span>
                        </div>

                        <div id="parcelBody" class="parcel-body collapsed">
                            <div class="parcel-filter">
                                <input id="searchTo" placeholder="Tìm Tờ Mới">
                                <input id="searchThua" placeholder="Tìm Thửa">
                                <input id="searchToCu" placeholder="Tờ Tờ cũ">
                                <input id="searchChu" placeholder="Tìm Chủ">
                            </div>

                            <div id="parcelList"></div>
                        </div>
                    </div>

                    <hr>

                    <div class="search-panel">
                        <div class="search-header" onclick="toggleSearchPanel()">
                            <span>📍 Tìm tọa độ</span>
                            <span id="searchArrow">▲</span>
                        </div>

                        <div id="searchBody" class="search-body collapsed">
                            <div class="search-grid">
                            <div class="search-card">
    <div class="search-title">📍 VN2000</div>
    <div class="search-row">
        <input id="vn_input" placeholder="Gợi ý: X,Y (vd: 605203.173, 1484875.196)">
    </div>
    <button class="search-btn" onclick="searchVN()">🔎 VN</button>
</div>
                                <div class="search-card">
                                    <div class="search-title">🌍 WGS84</div>
                                    <div class="search-row">
                                        <input id="wgs_input" placeholder="Lat, Lng (vd: 12.68, 108.03)">
                                    </div>
                                    <button class="search-btn" onclick="searchWGS()">🔎 WGS</button>
                                </div>

<div class="coord-import-launch mt-2">
    <button type="button" class="search-btn coord-import-btn" onclick="toggleVN2000ListPanel()">
        📋 Nhập VN2000/WGS84
    </button>
</div>

                            </div>
                        </div>
                    </div>

                    <hr>

                </div>
            </div>
        </div>
    </div>
</div>


<div id="vn2000-list-panel" class="coord-list-panel" style="display:none;">
    <div id="vn2000-list-header" class="coord-list-header">
        <span>📋 Nhập Tọa Độ Lên Bản Đồ</span>
        <button type="button" onclick="toggleVN2000ListPanel()">✕</button>
    </div>

    <div class="coord-tab-bar">
        <button id="tab-vn2000" onclick="switchCoordTab('vn2000')" class="active">
            📐 VN2000 (danh sách)
        </button>
        <button id="tab-latlng" onclick="switchCoordTab('latlng')">
            🌐 WGS84 (danh sách)
        </button>
    </div>

    <div id="tab-body-vn2000" class="coord-tab-body">
        <div class="coord-help">
            Nhập mỗi điểm một dòng: <b>STT X Y</b>
            <span>(X = Northing, Y = Easting, đơn vị m)</span><br>
            <i>Ví dụ: 1 1456789.12 567890.45</i>
        </div>

        <textarea id="vn2000-list-input" rows="8"
            placeholder="1 1456789.12 567890.45&#10;2 1456750.00 567920.00&#10;3 1456710.50 567870.30"></textarea>

        <div class="coord-action-row">
            <button type="button" class="btn-draw-vn" onclick="plotVN2000List()">🗺️ Vẽ lên bản đồ</button>
            <button type="button" class="btn-clear-coord" onclick="clearVN2000List()">✖ Xóa lớp</button>
            <span id="vn2000-list-status"></span>
        </div>

        <div id="vn2000-list-result" class="coord-result-box" style="display:none;"></div>
    </div>

    <div id="tab-body-latlng" class="coord-tab-body" style="display:none;">
        <div class="coord-help">
            Nhập mỗi điểm một dòng: <b>STT Lat Lng</b>
            <span>(WGS84, độ thập phân)</span><br>
            <i>Ví dụ: 1 12.6672 108.0381</i>
        </div>

        <textarea id="latlng-list-input" rows="8"
            placeholder="1 12.6672 108.0381&#10;2 12.6650 108.0400&#10;3 12.6630 108.0370"></textarea>

        <div class="coord-action-row">
            <button type="button" class="btn-draw-wgs" onclick="plotLatLngList()">🗺️ Vẽ lên bản đồ</button>
            <button type="button" class="btn-clear-coord" onclick="clearLatLngList()">✖ Xóa lớp</button>
            <span id="latlng-list-status"></span>
        </div>

        <div id="latlng-list-result" class="coord-result-box result-wgs" style="display:none;"></div>
    </div>
</div>

<div id="loginPopup" class="login-popup">
    <div class="popup-box">
        <div class="popup-icon">
            <i class="fa-solid fa-lock"></i>
        </div>

        <h5>Yêu cầu đăng nhập</h5>
        <p>Bạn cần đăng nhập để sử dụng chức năng này.</p>

        <div class="popup-buttons">
            <a href="/login" class="btn-login">Đăng nhập</a>
            <a href="/register" class="btn-register">Đăng ký</a>
        </div>

        <hr>

        <button class="btn btn-secondary" onclick="closeLoginPopup()">Đóng</button>
    </div>
</div>



<div class="map-toolbox">
    <div class="toolbox-menu" id="toolboxMenu">
        <button onclick="map.zoomIn()">
            <i class="fa-solid fa-plus"></i>
            <span>Zoom</span>
        </button>

        <button onclick="map.zoomOut()">
            <i class="fa-solid fa-minus"></i>
            <span>Thu</span>
        </button>

        <button onclick="locateMe()">
            <i class="fa-solid fa-location-crosshairs"></i>
            <span>GPS vị trí</span>
        </button>

        <button onclick="clearMarker()">
            <i class="fa-solid fa-trash"></i>
            <span>Xóa Ghim</span>
        </button>

        <button class="protected-btn" onclick="requireLogin(startKC)">
            <i class="fa-solid fa-ruler"></i>
            <span>Đo KC</span>
            @guest
                <small class="tool-lock"><i class="fa-solid fa-lock"></i></small>
            @endguest
        </button>

        <button class="protected-btn" onclick="requireLogin(startDT)">
            <i class="fa-solid fa-draw-polygon"></i>
            <span>Đo DT</span>
            @guest
                <small class="tool-lock"><i class="fa-solid fa-lock"></i></small>
            @endguest
        </button>

        <button class="protected-btn" onclick="requireLogin(startGPS)">
            <i class="fa-solid fa-location-dot"></i>
            <span>Đo GPS</span>
            @guest
                <small class="tool-lock"><i class="fa-solid fa-lock"></i></small>
            @endguest
        </button>

        <button class="protected-btn" onclick="requireLogin(undoMeasures)">
            <i class="fa-solid fa-rotate-left"></i>
            <span>Undo</span>
            @guest
                <small class="tool-lock"><i class="fa-solid fa-lock"></i></small>
            @endguest
        </button>

        <button class="protected-btn" onclick="requireLogin(clearMeasures)">
            <i class="fa-solid fa-broom"></i>
            <span>Xóa đo</span>
            @guest
                <small class="tool-lock"><i class="fa-solid fa-lock"></i></small>
            @endguest
        </button>

        <button onclick="reloadMap()">
            <i class="fa-solid fa-rotate-right"></i>
            <span>Load</span>
        </button>

        <button onclick="clearSelectedParcel()">
    <i class="fa-solid fa-eraser"></i>
    <span>Xóa thửa</span>
</button>
    </div>

    <button class="toolbox-main" onclick="toggleToolbox()">
        <i class="fa-solid fa-bars"></i>
    </button>
</div>

<div id="measureToast" class="measure-toast">
    <div class="toast-icon" id="toastIcon"></div>
    <div class="toast-text" id="toastText"></div>
</div>

<div id="savedMapBtn" class="saved-map-btn" onclick="toggleSavedMaps()">
    <i class="fa-solid fa-layer-group"></i>
</div>

<div id="savedMapBackdrop" class="saved-map-backdrop" onclick="toggleSavedMaps(false)"></div>

<div id="savedMapPanel" class="gm-sheet">
    <div class="gm-sheet-handle"></div>

    <div class="gm-sheet-header">
        <div>
            <div class="gm-sheet-title">Bản đồ đã lưu</div>
            <div class="gm-sheet-subtitle">Chọn lớp bản đồ để mở nhanh</div>
        </div>
        <button type="button" class="gm-sheet-close" onclick="toggleSavedMaps(false)">×</button>
    </div>

    <div class="gm-layer-chips">
        <label class="gm-chip">
            <input type="checkbox" id="toggle_dc_cu" checked onchange="toggleMapGroup('dc_cu')">
            <span>ĐC cũ</span>
        </label>

        <label class="gm-chip">
            <input type="checkbox" id="toggle_qh" checked onchange="toggleMapGroup('quy_hoach')">
            <span>QH</span>
        </label>

        <label class="gm-chip">
            <input type="checkbox" id="toggle_dc_moi" checked onchange="toggleMapGroup('dc_moi')">
            <span>ĐC mới</span>
        </label>

        <label class="gm-chip">
            <input type="checkbox" id="toggle_canh" checked onchange="toggleMapGroup('canh')">
            <span>Canh</span>
        </label>
    </div>

    <div class="gm-area-filter">
        <label class="gm-area-label">Địa bàn đã đăng ký</label>
        <select id="savedAreaFilter" class="gm-area-select" onchange="renderSavedMapsFromCache()">
            <option value="">-- Chọn xã/phường đã đăng ký --</option>
        </select>
    </div>

    <div id="savedMapList" class="gm-sheet-body">
        <div class="saved-map-empty">Đang tải dữ liệu...</div>
    </div>

    <div class="gm-sheet-footer">
        <button class="gm-footer-btn primary" type="button" onclick="toggleSavedMaps(false)">Đóng</button>
    </div>
</div>

<script>
    let isLogin = {{ auth()->check() ? 'true' : 'false' }};
    let currentVip = {{ auth()->check() ? $vipLevel : -1 }};
    window.isLogin = isLogin;
    window.currentVip = currentVip;

    window.uploadPolicy = {
        isLogin: {{ auth()->check() ? 'true' : 'false' }},
        currentVip: {{ auth()->check() ? $vipLevel : -1 }},
        canUploadMap: {{ $canUploadMap ? 'true' : 'false' }},
        areaLimit: {{ $areaLimit }},
    };

    window.currentAreaOptions = [];

    const menu = document.getElementById("categoryMenu");
    const mapTools = document.querySelector(".map-tools");

    function showLoginPopup() {
        document.getElementById("loginPopup").style.display = "flex";
    }

    function closeLoginPopup() {
        document.getElementById("loginPopup").style.display = "none";
    }

    function requireLogin(callback) {
        if (!isLogin) {
            showLoginPopup();
            return false;
        }

        if (typeof callback === "function") {
            callback();
        }

        return true;
    }

    function toggleToolbox() {
        let menuTool = document.getElementById("toolboxMenu");
        if (menuTool) {
            menuTool.classList.toggle("active");
        }
    }

    function toggleMapTools() {
        const body = document.getElementById("mapToolsBody");
        const wrapper = document.querySelector(".map-tools");
        const arrow = document.getElementById("mapArrow");

        if (!body || !wrapper || !arrow) return;

        const isCollapsed = body.classList.contains("collapsed");

        body.classList.toggle("collapsed");
        wrapper.classList.toggle("active");

        if (isCollapsed) {
            arrow.style.transform = "rotate(180deg)";
            body.classList.add("opening");

            setTimeout(() => {
                body.classList.remove("opening");
            }, 450);
        } else {
            arrow.style.transform = "rotate(0deg)";
        }
    }

    function toggleSearchPanel() {
        const body = document.getElementById("searchBody");
        const arrow = document.getElementById("searchArrow");
        if (!body || !arrow) return;

        body.classList.toggle("collapsed");
        arrow.innerHTML = body.classList.contains("collapsed") ? "▲" : "▼";
    }

    function toggleUpload() {
        const body = document.getElementById("uploadBody");
        const arrow = document.getElementById("uploadArrow");
        if (!body || !arrow) return;

        body.classList.toggle("collapsed");
        arrow.innerHTML = body.classList.contains("collapsed") ? "▲" : "▼";
    }

    function showExportPDF() {
        let btn = document.getElementById("exportPDFBtn");
        if (btn) btn.style.display = "block";
    }

    function hideExportPDF() {
        let btn = document.getElementById("exportPDFBtn");
        if (btn) btn.style.display = "none";
    }

    function openMenu() {
        menu?.classList.add("active");
        if (mapTools) mapTools.style.display = "none";
    }

    function closeMenu() {
        menu?.classList.remove("active");
        if (mapTools) mapTools.style.display = "block";
    }

    async function fetchJSON(url) {
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        });

        const data = await res.json();

        if (!res.ok || data.success === false) {
            throw new Error(data.message || 'Lỗi tải dữ liệu');
        }

        return data;
    }

    function renderAreaOptions(areaItems, selectedAreaCode = '') {
        const areaSelect = document.getElementById('areaSelect');
        if (!areaSelect) return;

        areaSelect.innerHTML = '<option value="">-- Chọn xã / phường --</option>';

        (areaItems || []).forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.area_code;
            opt.textContent = `${item.area_name} (${item.area_level})`;
            opt.dataset.provinceCode = item.province_code;
            opt.dataset.provinceName = item.province_name;
            opt.dataset.areaName = item.area_name;
            opt.dataset.areaLevel = item.area_level;

            if (selectedAreaCode && String(selectedAreaCode) === String(item.area_code)) {
                opt.selected = true;
            }

            areaSelect.appendChild(opt);
        });
    }

    function filterAreaOptions(keyword) {
        const q = String(keyword || '').trim().toLowerCase();

        if (!q) {
            renderAreaOptions(window.currentAreaOptions || []);
            return;
        }

        const filtered = (window.currentAreaOptions || []).filter(item => {
            const name = String(item.area_name || '').toLowerCase();
            const level = String(item.area_level || '').toLowerCase();
            const code = String(item.area_code || '').toLowerCase();
            const province = String(item.province_name || '').toLowerCase();

            return (
                name.includes(q) ||
                level.includes(q) ||
                code.includes(q) ||
                province.includes(q)
            );
        });

        renderAreaOptions(filtered);
    }

    async function loadProvinceOptions() {
        const provinceSelect = document.getElementById('provinceSelect');
        if (!provinceSelect || !window.uploadPolicy.canUploadMap) return;

        const res = await fetchJSON('/api/dvhc/provinces');

        provinceSelect.innerHTML = '<option value="">-- Chọn tỉnh / thành --</option>';

        (res.data || []).forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.province_code;
            opt.textContent = item.province_name;
            provinceSelect.appendChild(opt);
        });
    }

    async function loadAreaOptions(provinceCode, selectedAreaCode = '') {
        const areaSelect = document.getElementById('areaSelect');
        const areaSearchInput = document.getElementById('areaSearchInput');

        if (!areaSelect) return;

        if (!provinceCode) {
            window.currentAreaOptions = [];
            areaSelect.innerHTML = '<option value="">-- Chọn xã / phường --</option>';
            if (areaSearchInput) areaSearchInput.value = '';
            return;
        }

        const res = await fetchJSON('/api/dvhc/areas?province_code=' + encodeURIComponent(provinceCode));
        window.currentAreaOptions = res.data || [];

        renderAreaOptions(window.currentAreaOptions, selectedAreaCode);

        if (areaSearchInput && !areaSearchInput.classList.contains('area-search-hidden')) {
            areaSearchInput.value = '';
        }
    }

    async function loadMyAreaScopes() {
        const box = document.getElementById('areaScopeBox');
        const provinceSelect = document.getElementById('provinceSelect');
        const areaSelect = document.getElementById('areaSelect');
        const areaSearchInput = document.getElementById('areaSearchInput');
        const upgradeVipBox = document.getElementById('upgradeVipBox');

        if (!box) return;

        if (upgradeVipBox) {
            upgradeVipBox.style.display = 'none';
        }

        if (!window.uploadPolicy.isLogin) {
            box.innerHTML = 'Bạn cần đăng nhập để dùng upload theo địa bàn.';
            return;
        }

        if (!window.uploadPolicy.canUploadMap) {
            box.innerHTML = 'Tài khoản hiện không có quyền upload. Địa bàn đang bị khóa.';
            if (provinceSelect) provinceSelect.disabled = true;
            if (areaSelect) areaSelect.disabled = true;
            if (areaSearchInput) areaSearchInput.disabled = true;
            return;
        }

        const res = await fetchJSON('/api/my-area-scopes');
        const scopes = res.scopes || [];
        const vipName = res.vip_name || 'VIP';
        const areaLimit = res.area_limit;

        let html = `<strong>${vipName}</strong><br>`;

        if (areaLimit === -1) {
            html += `Bạn được dùng toàn bộ địa bàn.<br>`;
        } else {
            html += `Đã dùng ${res.used_area_count}/${areaLimit} địa bàn.<br>`;
        }

        if (scopes.length) {
            html += `<ul class="area-scope-list">`;
            scopes.forEach(item => {
                html += `<li>${item.province_name} - ${item.area_name} (${item.area_level})</li>`;
            });
            html += `</ul>`;
        } else {
            html += `Bạn chưa đăng ký địa bàn nào.`;
        }

        box.innerHTML = html;

        if (res.vip_level == 1 && scopes.length >= 1) {
            const first = scopes[0];

            if (provinceSelect) {
                provinceSelect.value = first.province_code;
                provinceSelect.disabled = true;
            }

            await loadAreaOptions(first.province_code, first.area_code);

            if (areaSelect) {
                areaSelect.value = first.area_code;
                areaSelect.disabled = true;
            }

            if (areaSearchInput) {
                areaSearchInput.value = '';
                areaSearchInput.disabled = true;
                areaSearchInput.classList.add('area-search-hidden');
            }

            if (upgradeVipBox) {
                upgradeVipBox.style.display = 'flex';
            }

            box.innerHTML += `<div class="area-locked-note">VIP 1 đã khóa vào đúng 1 địa bàn này.</div>`;
            return;
        }

        if (provinceSelect && window.uploadPolicy.canUploadMap) provinceSelect.disabled = false;
        if (areaSelect && window.uploadPolicy.canUploadMap) areaSelect.disabled = false;

        if (areaSearchInput && window.uploadPolicy.canUploadMap) {
            areaSearchInput.disabled = false;
            areaSearchInput.classList.remove('area-search-hidden');
        }

        if (areaLimit !== -1 && Number(res.used_area_count) >= Number(areaLimit)) {
            if (upgradeVipBox) {
                upgradeVipBox.style.display = 'flex';
            }
        }
    }

    document.addEventListener("DOMContentLoaded", async function () {
        document.getElementById("mapToolsBody")?.classList.add("collapsed");

        const inputs = ["dc_cu", "dc_moi", "quy_hoach"];

        inputs.forEach(function (id) {
            let el = document.getElementById(id);

            if (el) {
                el.addEventListener("click", function (e) {
                    if (!isLogin) {
                        e.preventDefault();
                        showLoginPopup();
                        return;
                    }

                    if (!window.uploadPolicy.canUploadMap) {
                        e.preventDefault();

                        const box = document.getElementById("vipUploadStatus");
                        if (box) {
                            box.classList.remove("vip-status-error", "vip-status-warning", "vip-status-success");
                            box.classList.add("vip-status-error");
                            box.innerHTML = `
                                <strong>Không có quyền upload</strong><br>
                                Tài khoản FREE hoặc đã hết hạn VIP không thể tải bản đồ.
                            `;
                        }
                        return;
                    }

                    if (el.disabled || el.dataset.locked === "1") {
                        e.preventDefault();

                        const labelMap = {
                            dc_cu: "Địa chính cũ",
                            dc_moi: "Địa chính mới",
                            quy_hoach: "Quy hoạch"
                        };

                        const label = labelMap[id] || id;
                        const box = document.getElementById("vipUploadStatus");

                        if (box) {
                            box.classList.remove("vip-status-error", "vip-status-warning", "vip-status-success");
                            box.classList.add("vip-status-warning");
                            box.innerHTML = `
                                <strong>Không thể tải file</strong><br>
                                Bạn không thể tải thêm file cho mục ${label}.<br>
                                Vui lòng kiểm tra địa bàn hoặc nâng cấp VIP.
                            `;
                        }
                    }
                });
            }
        });

        const provinceSelect = document.getElementById('provinceSelect');
        const areaSearchInput = document.getElementById('areaSearchInput');

        if (areaSearchInput) {
            areaSearchInput.addEventListener('input', function () {
                filterAreaOptions(this.value);
            });
        }

        try {
            if (provinceSelect && window.uploadPolicy.canUploadMap) {
                await loadProvinceOptions();
            }

            await loadMyAreaScopes();

            if (provinceSelect && window.uploadPolicy.canUploadMap) {
                provinceSelect.addEventListener('change', async function () {
                    await loadAreaOptions(this.value);
                });
            }

            if (typeof refreshUploadInputsByVip === "function") {
                refreshUploadInputsByVip();
            }
        } catch (err) {
            console.error(err);
            const box = document.getElementById('areaScopeBox');
            if (box) {
                box.innerHTML = 'Không tải được dữ liệu địa bàn. Kiểm tra route /api/dvhc/provinces và /api/my-area-scopes';
            }
        }
    });

    if (menu) {
        menu.addEventListener("click", function (e) {
            if (e.target === menu) {
                closeMenu();
            }
        });
    }
</script>