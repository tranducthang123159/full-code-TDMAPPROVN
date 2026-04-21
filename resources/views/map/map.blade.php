@once
    <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="{{ asset('css/map.css') }}">
@endonce

<div id="map"></div>
<div id="parcelBar" class="parcel-bar"></div>

<div class="map-layer-toggle" onclick="togglePopup()">🗺</div>

<div id="mapLayerPopup" class="map-layer-popup">
    <div class="map-layer-header">
        Chọn bản đồ
        <span class="map-close-btn" onclick="closePopup()">✖</span>
    </div>

    <div class="map-layer-grid">
        <div class="map-layer-item" onclick="setBaseMap('street')">
            <i class="fa-solid fa-road"></i>
            <span>Đường phố</span>
        </div>

        <div class="map-layer-item" onclick="setBaseMap('sat')">
            <i class="fa-solid fa-satellite"></i>
            <span>Vệ tinh</span>
        </div>
    </div>
</div>

<div id="locationPanel" class="location-panel">
    <div class="panel-header">
        <span>📍 Thông tin</span>
        <button type="button" onclick="closePanel()">✖</button>
    </div>

    <div class="panel-body"></div>
</div>

@once
    <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.0/proj4.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

    <script src="{{ asset('js/map.js') }}"></script>
    <script src="{{ asset('js/common.js') }}"></script>
    <script src="{{ asset('js/dccu.js') }}"></script>
    <script src="{{ asset('js/dcmoi.js') }}"></script>
    <script src="{{ asset('js/quyhoach.js') }}"></script>
    <script src="{{ asset('js/qh-check.js') }}"></script>
    <script src="{{ asset('js/upload.js') }}"></script>
    <script src="{{ asset('js/parcel-search.js') }}"></script>
    <script src="{{ asset('js/search.js') }}"></script>
    <script src="{{ asset('js/do_kc.js') }}"></script>
    <script src="{{ asset('js/do_dt.js') }}"></script>
    <script src="{{ asset('js/upload-vip.js') }}"></script>
    <script src="{{ asset('js/splitParcel.js') }}"></script>
    <script src="{{ asset('js/parcel-info.js') }}"></script>
@endonce

<script>
    function toggleParcelInfo(el) {
        const header = el || event.currentTarget;
        const body = header.nextElementSibling;
        const arrow = header.querySelector("span:last-child");

        if (!body || !arrow) return;

        const isOpen = body.style.display === "block";

        if (isOpen) {
            body.style.display = "none";
            arrow.innerHTML = "▼";
        } else {
            body.style.display = "block";
            arrow.innerHTML = "▲";
        }
    }
</script>