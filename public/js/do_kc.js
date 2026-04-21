/* =========================
MEASURE DISTANCE
========================= */

let kcPoints = [];
let kcMarkers = [];
let kcGPSWatch = null;

let kcTotalDistance = 0;
let kcInfoMarker = null;

let kcActive = false;

/* =========================
MEASURE SNAP HELPERS
========================= */

const MEASURE_SNAP_PIXEL = 18;
const MEASURE_CLOSE_PIXEL = 22;

function measurePixelDistance(lngLat1, lngLat2) {
    const p1 = map.project(lngLat1);
    const p2 = map.project(lngLat2);

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;

    return Math.sqrt(dx * dx + dy * dy);
}

function measureFindNearestPoint(targetLngLat, points, snapPx = MEASURE_SNAP_PIXEL) {
    if (!points || !points.length) return null;

    let nearest = null;
    let min = Infinity;

    points.forEach(p => {
        const d = measurePixelDistance(
            { lng: targetLngLat.lng, lat: targetLngLat.lat },
            { lng: p[0], lat: p[1] }
        );

        if (d < min) {
            min = d;
            nearest = p;
        }
    });

    if (min <= snapPx) {
        return {
            point: nearest,
            distancePx: min
        };
    }

    return null;
}

function measureIsSamePoint(p1, p2, toleranceMeters = 0.05) {
    if (!p1 || !p2) return false;

    const d = turf.distance(
        turf.point(p1),
        turf.point(p2),
        { units: "meters" }
    );

    return d <= toleranceMeters;
}

/* =========================
START MEASURE
========================= */

function startKC() {

    if (!kcActive) {

        /* tắt đo diện tích */
        dtActive = false;
        clearDT();

        kcActive = true;
        mapMode = "kc";

        showExportPDF();
        showMeasureToast("Đang bật đo khoảng cách...", true);

        setTimeout(() => {
            showMeasureToast("✔ Đo khoảng cách đã bật<br>Chạm lại để tắt", false);
        }, 1200);

    } else {

        showMeasureToast("Đang tắt đo...", true);

        setTimeout(() => {
            kcActive = false;
            hideExportPDF();

            mapMode = "pin";

            showMeasureToast("✔ Đã tắt đo", false);
        }, 1200);
    }
}

function showMeasureToast(text, loading) {
    let toast = document.getElementById("measureToast");
    let icon = document.getElementById("toastIcon");
    let txt = document.getElementById("toastText");

    txt.innerHTML = text;

    if (loading) {
        icon.innerHTML = "";
        icon.className = "toast-loading";
    } else {
        icon.className = "toast-success";
        icon.innerHTML = "✔";
    }

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


function createMeasureMarkerElement(index, isGps = false) {
    const el = document.createElement("div");
    el.className = "measure-marker" + (isGps ? " gps" : "");
    el.innerHTML = `<span class="measure-marker-number">${index}</span>`;
    return el;
}

function flashMeasureMarker(el) {
    if (!el) return;
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");

    setTimeout(() => {
        el.classList.remove("flash");
    }, 900);
}

/* =========================
ADD POINT
========================= */

function addKCPoint(lng, lat, options = {}) {

    const isGps = !!options.isGps;
    let point = [lng, lat];

    /* snap vào điểm cũ */
    const snapped = measureFindNearestPoint({ lng, lat }, kcPoints);
    if (snapped) {
        point = snapped.point;
    }

    /* tránh trùng điểm liên tiếp */
    const last = kcPoints[kcPoints.length - 1];
    if (last && measureIsSamePoint(last, point)) {
        return null;
    }

    kcPoints.push(point);

    const pointIndex = kcPoints.length;

    let el;
    if (typeof createMeasureMarkerElement === "function") {
        el = createMeasureMarkerElement(pointIndex, isGps);
    } else {
        el = document.createElement("div");
        el.className = "measure-marker";
        el.innerHTML = `<span class="measure-marker-number">${pointIndex}</span>`;
    }

    let marker = new maplibregl.Marker({
        element: el,
        anchor: "center"
    })
        .setLngLat(point)
        .addTo(map);

    kcMarkers.push(marker);

    if (isGps) {
        flashMeasureMarker(el);
    }

    drawKC();

    return {
        point: point,
        index: pointIndex,
        marker: marker
    };
}

/* =========================
DRAW LINE
========================= */

function drawKC() {

    if (kcPoints.length < 2) {

        if (map.getLayer("kc_line")) map.removeLayer("kc_line");
        if (map.getSource("kc_line")) map.removeSource("kc_line");

        if (map.getLayer("kc_label")) map.removeLayer("kc_label");
        if (map.getSource("kc_label")) map.removeSource("kc_label");

        if (kcInfoMarker) {
            kcInfoMarker.remove();
            kcInfoMarker = null;
        }

        return;
    }

    /* LINE */
    let geo = {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: kcPoints
        }
    };

    if (map.getLayer("kc_line")) map.removeLayer("kc_line");
    if (map.getSource("kc_line")) map.removeSource("kc_line");

    map.addSource("kc_line", { type: "geojson", data: geo });

    map.addLayer({
        id: "kc_line",
        type: "line",
        source: "kc_line",
        paint: {
            "line-color": "#ff0000",
            "line-width": 3
        }
    });

    /* EDGE LABEL */
    let labels = [];

    for (let i = 1; i < kcPoints.length; i++) {
        let p1 = kcPoints[i - 1];
        let p2 = kcPoints[i];

        let mid = [
            (p1[0] + p2[0]) / 2,
            (p1[1] + p2[1]) / 2
        ];

        let d = turf.distance(
            turf.point(p1),
            turf.point(p2),
            { units: "meters" }
        );

        let text = d.toFixed(2) + " m";

        let angle = Math.atan2(
            p2[1] - p1[1],
            p2[0] - p1[0]
        ) * 180 / Math.PI;

        if (angle > 90 || angle < -90) angle += 180;

        labels.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: mid },
            properties: { text: text, angle: angle }
        });
    }

    if (map.getLayer("kc_label")) map.removeLayer("kc_label");
    if (map.getSource("kc_label")) map.removeSource("kc_label");

    map.addSource("kc_label", {
        type: "geojson",
        data: {
            type: "FeatureCollection",
            features: labels
        }
    });

    map.addLayer({
        id: "kc_label",
        type: "symbol",
        source: "kc_label",
        layout: {
            "text-field": ["get", "text"],
            "text-size": 14,
            "text-rotate": ["get", "angle"],
            "text-allow-overlap": true,
            "text-ignore-placement": true
        },
        paint: {
            "text-color": "#ff0000",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2
        }
    });

    /* TOTAL DISTANCE */
    let total = 0;

    for (let i = 1; i < kcPoints.length; i++) {
        let d = turf.distance(
            turf.point(kcPoints[i - 1]),
            turf.point(kcPoints[i]),
            { units: "meters" }
        );

        total += d;
    }

    kcTotalDistance = total;

    /* AREA (IF POLYGON) */
    let area = 0;

    if (kcPoints.length >= 3) {
        let poly = turf.polygon([[...kcPoints, kcPoints[0]]]);
        area = turf.area(poly);
    }

    /* INFO BOX */
    let last = kcPoints[kcPoints.length - 1];

    if (kcInfoMarker) {
        kcInfoMarker.remove();
    }

    let el = document.createElement("div");
    el.className = "measure-info";
    el.innerHTML =
        "📏 " + total.toFixed(2) + " m" +
        (area > 0 ? "<br>📐 " + area.toFixed(2) + " m²" : "");

    kcInfoMarker = new maplibregl.Marker({
        element: el,
        anchor: "top"
    })
        .setLngLat(last)
        .addTo(map);
}

/* =========================
GPS AUTO ADD POINT
========================= */

function startKCGPS() {

    if (!navigator.geolocation) {
        alert("Trình duyệt không hỗ trợ GPS");
        return;
    }

    const nextPoint = kcPoints.length + 1;
    showMeasureToast("Đang lấy GPS cho điểm " + nextPoint + "...", true);

    navigator.geolocation.getCurrentPosition(function (pos) {

        let lat = pos.coords.latitude;
        let lng = pos.coords.longitude;

        map.flyTo({
            center: [lng, lat],
            zoom: 18
        });

        const result = addKCPoint(lng, lat, { isGps: true });

        if (result) {
            let accuracyText = "";
            if (Number.isFinite(pos.coords.accuracy)) {
                accuracyText = "<br>Sai số ±" + pos.coords.accuracy.toFixed(1) + " m";
            }

            showMeasureToast("📍 Đã đo GPS điểm " + result.index + accuracyText, false);
        } else {
            showMeasureToast("Điểm GPS bị trùng với điểm trước", false);
        }

    }, function (err) {
        alert("Không lấy được GPS");
        console.error(err);
    }, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
    });
}



function clearKC() {

    kcPoints = [];

    kcMarkers.forEach(m => m.remove());
    kcMarkers = [];

    if (map.getLayer("kc_line")) map.removeLayer("kc_line");
    if (map.getSource("kc_line")) map.removeSource("kc_line");

    if (map.getLayer("kc_label")) map.removeLayer("kc_label");
    if (map.getSource("kc_label")) map.removeSource("kc_label");

    if (kcInfoMarker) {
        kcInfoMarker.remove();
        kcInfoMarker = null;
    }

    if (kcGPSWatch) {
        navigator.geolocation.clearWatch(kcGPSWatch);
        kcGPSWatch = null;
    }
}

/* =========================
EXPORT PDF
========================= */


/* =========================
START GPS
========================= */

function startGPS() {
    const isKCOn = mapMode === "kc" || kcActive === true;
    const isDTOn = mapMode === "dt" || dtActive === true;

    if (isKCOn) {
        startKCGPS();
        return;
    }

    if (isDTOn) {
        startDTGPS();
        return;
    }

    if (typeof showMeasureToast === "function") {
        showMeasureToast("❌ Bạn phải bật Đo KC hoặc Đo DT trước khi dùng Đo GPS", false);
    } else {
        alert("Bạn phải bật Đo KC hoặc Đo DT trước khi dùng Đo GPS");
    }
}
/* =========================
UNDO KC
========================= */

function undoKC() {

    if (kcPoints.length === 0) return;

    kcPoints.pop();

    let marker = kcMarkers.pop();
    if (marker) marker.remove();

    if (kcPoints.length >= 2) {
        drawKC();
    } else {

        if (map.getLayer("kc_line")) map.removeLayer("kc_line");
        if (map.getSource("kc_line")) map.removeSource("kc_line");

        if (map.getLayer("kc_label")) map.removeLayer("kc_label");
        if (map.getSource("kc_label")) map.removeSource("kc_label");

        if (kcInfoMarker) {
            kcInfoMarker.remove();
            kcInfoMarker = null;
        }
    }
}
/* =========================
EXPORT TXT + PDF
========================= */

function getMeasureExportMode() {
    if (mapMode === "dt" || dtActive) return "dt";
    return "kc";
}

function getMeasureExportPoints() {
    const mode = getMeasureExportMode();

    if (mode === "dt") {
        let pts = [...dtPoints];

        if (pts.length >= 2) {
            const first = pts[0];
            const last = pts[pts.length - 1];

            if (measureIsSamePoint(first, last)) {
                pts = pts.slice(0, -1);
            }
        }

        return pts;
    }

    return [...kcPoints];
}

function ensureVN2000ExportDef() {
    const activeKTT = Number(window.currentKTT || (typeof currentKTT !== 'undefined' ? currentKTT : 108.5)) || 108.5;
    proj4.defs(
        "VN2000",
        `+proj=tmerc +lat_0=0 +lon_0=${activeKTT} +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs`
    );
}

function showExportPDF() {
    const btnTxt = document.getElementById("exportTXTBtn");
    const btnPdf = document.getElementById("exportMeasurePDF");

    if (btnTxt) btnTxt.style.display = "inline-flex";
    if (btnPdf) btnPdf.style.display = "inline-flex";
}

function hideExportPDF() {
    const btnTxt = document.getElementById("exportTXTBtn");
    const btnPdf = document.getElementById("exportMeasurePDF");

    if (btnTxt) btnTxt.style.display = "none";
    if (btnPdf) btnPdf.style.display = "none";
}

function exportTXT() {
    let points = getMeasureExportPoints();

    if (!points || points.length === 0) {
        alert("Chưa có dữ liệu đo!");
        return;
    }

    ensureVN2000ExportDef();

    let content = "\uFEFFBẢNG TỌA ĐỘ ĐO ĐẠC\n";
    content += "STT\tX(m)\tY(m)\tZ(m)\n";

    points.forEach((p, i) => {
        let result = proj4("EPSG:4326", "VN2000", [p[0], p[1]]);
        let x = result[1].toFixed(3);
        let yv = result[0].toFixed(3);

        content += `${i + 1}\t${x}\t${yv}\t0.000\n`;
    });

    let blob = new Blob([content], { type: "text/plain;charset=utf-8;" });

    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = getMeasureExportMode() === "dt"
        ? "toa_do_do_dien_tich.txt"
        : "toa_do_do_khoang_cach.txt";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportMeasurePDF() {
    const mode = getMeasureExportMode();
    let points = getMeasureExportPoints();

    if (mode === "kc" && points.length < 2) {
        alert("Cần ít nhất 2 điểm để xuất PDF đo khoảng cách!");
        return;
    }

    if (mode === "dt" && points.length < 3) {
        alert("Cần ít nhất 3 điểm để xuất PDF đo diện tích!");
        return;
    }

    ensureVN2000ExportDef();

    const vnPts = points.map(p => {
        const xy = proj4("EPSG:4326", "VN2000", [p[0], p[1]]);
        return {
            x: xy[1],
            y: xy[0],
            lng: p[0],
            lat: p[1]
        };
    });

    let edgeLengths = [];
    let totalDistance = 0;

    for (let i = 0; i < vnPts.length - 1; i++) {
        const p1 = vnPts[i];
        const p2 = vnPts[i + 1];
        const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        edgeLengths.push(len);
        totalDistance += len;
    }

    let area = 0;

    if (mode === "dt") {
        const lastLen = Math.hypot(
            vnPts[0].x - vnPts[vnPts.length - 1].x,
            vnPts[0].y - vnPts[vnPts.length - 1].y
        );
        edgeLengths.push(lastLen);

        let sum = 0;
        for (let i = 0; i < vnPts.length; i++) {
            const j = (i + 1) % vnPts.length;
            sum += vnPts[i].y * vnPts[j].x - vnPts[j].y * vnPts[i].x;
        }
        area = Math.abs(sum / 2);
    }

    _openMeasurePDFWindow({
        mode,
        orderedPts: vnPts,
        edgeLengths,
        totalDistance,
        area
    });
}

function _escapePdfHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function _getMeasurePdfMeta(mode, totalDistance, area) {
    const src =
        window.currentParcelPdfMeta ||
        window.selectedParcelPdfMeta ||
        window.currentParcelMeta ||
        {};

    return {
        soThua: src.soThua || src.SHTHUA || "",
        toBanDo: src.toBanDo || src.SHBANDO || src.SOTOCU || "",
        loaiDat: src.loaiDat || src.KHLOAIDAT || "",
        diaChi: src.diaChi || src.address || "",
        mucDich: src.mucDich || "",
        dienTichGiay: src.dienTichGiay || src.DIENTICH || "",
        dienTichDo: mode === "dt" ? area.toFixed(2) : "",
        tongChieuDai: totalDistance.toFixed(2),
        ghiChu: src.ghiChu || "",
        nguoiDo: src.nguoiDo || "",
        nguoiXacNhan: src.nguoiXacNhan || ""
    };
}

function _openMeasurePDFWindow({ mode, orderedPts, edgeLengths, totalDistance, area }) {
    const isArea = mode === "dt";
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();

    const meta = _getMeasurePdfMeta(mode, totalDistance, area);

    const title = isArea
        ? "PHIẾU XÁC NHẬN KẾT QUẢ ĐO ĐẠC DIỆN TÍCH"
        : "PHIẾU XÁC NHẬN KẾT QUẢ ĐO ĐẠC KHOẢNG CÁCH";

    let coordRows = "";

    if (isArea) {
        const ptsWithClose = [...orderedPts, orderedPts[0]];

        ptsWithClose.forEach((pt, i) => {
            const isClose = i === ptsWithClose.length - 1;
            coordRows += `
                <tr>
                    <td class="center">${isClose ? 1 : i + 1}</td>
                    <td class="right">${pt.x.toFixed(2)}</td>
                    <td class="right">${pt.y.toFixed(2)}</td>
                    <td class="right">${!isClose && edgeLengths[i] ? edgeLengths[i].toFixed(2) : ""}</td>
                </tr>
            `;
        });
    } else {
        orderedPts.forEach((pt, i) => {
            coordRows += `
                <tr>
                    <td class="center">${i + 1}</td>
                    <td class="right">${pt.x.toFixed(2)}</td>
                    <td class="right">${pt.y.toFixed(2)}</td>
                    <td class="right">${edgeLengths[i] ? edgeLengths[i].toFixed(2) : ""}</td>
                </tr>
            `;
        });
    }

    const minRows = 6;
    const currentRows = isArea ? orderedPts.length + 1 : orderedPts.length;
    for (let i = currentRows; i < minRows; i++) {
        coordRows += `
            <tr>
                <td class="center">&nbsp;</td>
                <td class="right">&nbsp;</td>
                <td class="right">&nbsp;</td>
                <td class="right">&nbsp;</td>
            </tr>
        `;
    }

    const svgContent = _buildMeasureSvg({
        orderedPts,
        edgeLengths,
        mode,
        totalDistance,
        area
    });

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
    * { box-sizing: border-box; }
    html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        font-family: "Times New Roman", Times, serif;
        color: #000;
    }

    .page {
        width: 794px;
        min-height: 1123px;
        margin: 0 auto;
        padding: 26px;
        background: #fff;
    }

    .frame {
        min-height: 1065px;
        border: 1.6px solid #111;
        padding: 10px 12px 14px 12px;
    }

    .top {
        text-align: center;
        line-height: 1.2;
        margin-bottom: 4px;
    }

    .qh {
        font-size: 11pt;
        font-weight: 700;
        text-transform: uppercase;
    }

    .dl {
        font-size: 10.5pt;
        font-weight: 700;
    }

.title {
    text-align: center;
    margin: 10px 0 8px 0;
    font-size: 12pt;
    font-weight: 700;
    text-transform: uppercase;
}

    .line {
        font-size: 9.6pt;
        line-height: 1.45;
        margin: 1px 0;
    }

    .dot {
        display: inline-block;
        border-bottom: 1px dotted #444;
        min-width: 80px;
        line-height: 1.1;
        padding: 0 2px;
    }

    .dot.w120 { min-width: 120px; }
    .dot.w160 { min-width: 160px; }
    .dot.w220 { min-width: 220px; }
    .dot.w320 { min-width: 320px; }

    .main-grid {
        display: grid;
        grid-template-columns: 41% 59%;
        margin-top: 8px;
        border: 1px solid #555;
        border-bottom: none;
    }

    .left-box, .right-box {
        min-height: 320px;
        border-bottom: 1px solid #555;
    }

    .left-box {
        border-right: 1px solid #555;
        display: flex;
        flex-direction: column;
    }

    .right-box {
        display: flex;
        flex-direction: column;
    }

    .box-title {
        font-size: 9pt;
        font-weight: 700;
        text-align: center;
        padding: 4px 6px;
        border-bottom: 1px solid #555;
    }

    .svg-wrap {
        flex: 1;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .svg-wrap svg {
        width: 100%;
        height: 100%;
        display: block;
    }

    .table-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 8.4pt;
    }

    thead th {
        border: 1px solid #555;
        padding: 4px 3px;
        text-align: center;
        font-weight: 700;
    }

    tbody td {
        border: 1px solid #777;
        padding: 4px 4px;
        height: 28px;
    }

    .center { text-align: center; }
    .right { text-align: right; }

    .table-note {
        font-size: 7pt;
        font-style: italic;
        color: #444;
        padding: 3px 4px 0 4px;
    }

    .sign-row {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        font-size: 9pt;
    }

    .sign-box {
        width: 44%;
        text-align: center;
        line-height: 1.35;
    }

    .sign-date {
        font-style: italic;
    }

    .sign-role {
        font-weight: 700;
    }

    .sign-note {
        font-style: italic;
        font-size: 8pt;
    }

    .sign-space {
        height: 52px;
    }

    .foot-note {
        margin-top: 4px;
        font-size: 7.8pt;
        font-style: italic;
        text-align: center;
        color: #333;
    }
</style>
</head>
<body>
<div class="page">
    <div class="frame">
        <div class="top">
            <div class="qh">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div class="dl">Độc lập - Tự do - Hạnh phúc</div>
        </div>

        <div class="title">${title}</div>

        <div class="line">1. Thửa đất số: <span class="dot w120">${_escapePdfHtml(meta.soThua)}</span> &nbsp;&nbsp; Tờ bản đồ số: <span class="dot w120">${_escapePdfHtml(meta.toBanDo)}</span></div>
        <div class="line">2. Loại đất: <span class="dot w220">${_escapePdfHtml(meta.loaiDat)}</span></div>
        <div class="line">3. Địa chỉ thửa đất: <span class="dot w320">${_escapePdfHtml(meta.diaChi)}</span></div>
        <div class="line">4. Mục đích sử dụng đất, nguồn gốc: <span class="dot w320">${_escapePdfHtml(meta.mucDich)}</span></div>
        <div class="line">5. Diện tích theo giấy tờ: <span class="dot w120">${_escapePdfHtml(meta.dienTichGiay)}</span> m²</div>
        <div class="line">6. ${isArea ? "Diện tích đo được" : "Tổng chiều dài đo được"}: <span class="dot w120">${isArea ? meta.dienTichDo : meta.tongChieuDai}</span> ${isArea ? "m²" : "m"}</div>
        <div class="line">7. Tình hình thực địa và ghi chú: <span class="dot w320">${_escapePdfHtml(meta.ghiChu)}</span></div>
        <div class="line">8. Đề nghị xác nhận: <span class="dot w320"></span></div>

        <div class="main-grid">
            <div class="left-box">
                <div class="box-title">9. Sơ đồ ${isArea ? "thửa đất" : "đo khoảng cách"}</div>
                <div class="svg-wrap">
                    <svg viewBox="0 0 320 280" xmlns="http://www.w3.org/2000/svg">
                        ${svgContent}
                    </svg>
                </div>
            </div>

            <div class="right-box">
                <div class="box-title">10. Tọa độ điểm ${isArea ? "thửa" : "đo"}, kích thước cạnh</div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th rowspan="2" style="width:14%;">Điểm</th>
                                <th colspan="2">Tọa độ VN2000</th>
                                <th rowspan="2" style="width:18%;">Cạnh</th>
                            </tr>
                            <tr>
                                <th style="width:29%;">X(m)</th>
                                <th style="width:29%;">Y(m)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${coordRows}
                        </tbody>
                    </table>
                    <div class="table-note">(Hệ tọa độ VN2000; kích thước cạnh tính theo mét)</div>
                </div>
            </div>
        </div>

        <div class="sign-row">
            <div class="sign-box">
                <div class="sign-date">Ngày ${dd} tháng ${mm} năm ${yyyy}</div>
                <div class="sign-role">Người đo</div>
                <div class="sign-note">(Ký, ghi rõ họ tên)</div>
                <div class="sign-space"></div>
                <div>${_escapePdfHtml(meta.nguoiDo)}</div>
            </div>

            <div class="sign-box">
                <div class="sign-date">Ngày ${dd} tháng ${mm} năm ${yyyy}</div>
                <div class="sign-role">Người xác nhận</div>
                <div class="sign-note">(Ký, ghi rõ họ tên)</div>
                <div class="sign-space"></div>
                <div>${_escapePdfHtml(meta.nguoiXacNhan)}</div>
            </div>
        </div>

        <div class="foot-note">Biểu mẫu xuất từ hệ thống đo đạc bản đồ</div>
    </div>
</div>
</body>
</html>`;

    _renderHtmlToPDF(
        html,
        isArea ? "phieu_do_dien_tich.pdf" : "phieu_do_khoang_cach.pdf"
    );
}

function _buildMeasureSvg({ orderedPts, edgeLengths, mode, totalDistance, area }) {
    const W = 320;
    const H = 280;
    const PAD = 34;

    if (!orderedPts || !orderedPts.length) {
        return `<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>`;
    }

    const xs = orderedPts.map(p => p.y);
    const ys = orderedPts.map(p => p.x);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const rangeX = Math.max(maxX - minX, 1);
    const rangeY = Math.max(maxY - minY, 1);

    const usableW = W - PAD * 2;
    const usableH = H - PAD * 2;

    const scale = Math.min(usableW / rangeX, usableH / rangeY);

    const drawW = rangeX * scale;
    const drawH = rangeY * scale;

    const offX = (W - drawW) / 2;
    const offY = (H - drawH) / 2;

    const toSVG = (pt) => ({
        sx: offX + (pt.y - minX) * scale,
        sy: H - offY - (pt.x - minY) * scale
    });

    const svgPts = orderedPts.map(toSVG);
    const linePts = svgPts.map(p => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ");

    let edgesSvg = "";
    const edgeCount = mode === "dt" ? orderedPts.length : orderedPts.length - 1;

    for (let i = 0; i < edgeCount; i++) {
        const p1 = svgPts[i];
        const p2 = mode === "dt" ? svgPts[(i + 1) % svgPts.length] : svgPts[i + 1];

        if (!p1 || !p2) continue;

        const dist = edgeLengths[i];
        if (!dist || dist <= 0) continue;

        const mx = (p1.sx + p2.sx) / 2;
        const my = (p1.sy + p2.sy) / 2;
        const dx = p2.sx - p1.sx;
        const dy = p2.sy - p1.sy;
        const len = Math.hypot(dx, dy) || 1;

        const nx = (-dy / len) * 10;
        const ny = (dx / len) * 10;

        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle > 90) angle -= 180;
        if (angle < -90) angle += 180;

        edgesSvg += `
            <text x="${(mx + nx).toFixed(1)}"
                  y="${(my + ny).toFixed(1)}"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  font-size="10"
                  font-family="Times New Roman, serif"
                  fill="#222"
                  transform="rotate(${angle.toFixed(1)}, ${(mx + nx).toFixed(1)}, ${(my + ny).toFixed(1)})">
                  ${dist.toFixed(2)}
            </text>
        `;
    }

    let vertexSvg = "";
    svgPts.forEach((p, i) => {
        vertexSvg += `
            <circle cx="${p.sx.toFixed(1)}" cy="${p.sy.toFixed(1)}" r="2.8" fill="#7b1e1e"/>
            <text x="${(p.sx + 10).toFixed(1)}"
                  y="${(p.sy - 10).toFixed(1)}"
                  font-size="10"
                  font-family="Times New Roman, serif"
                  fill="#111">${i + 1}</text>
        `;
    });

    const cx = svgPts.reduce((s, p) => s + p.sx, 0) / svgPts.length;
    const cy = svgPts.reduce((s, p) => s + p.sy, 0) / svgPts.length;

    const centerInfo = mode === "dt"
        ? `
            <text x="${cx.toFixed(1)}" y="${(cy - 2).toFixed(1)}"
                text-anchor="middle"
                font-size="12"
                font-family="Times New Roman, serif"
                fill="#7b1e1e"
                font-weight="700">${area.toFixed(2)} m²</text>
        `
        : `
            <text x="${cx.toFixed(1)}" y="${(cy - 2).toFixed(1)}"
                text-anchor="middle"
                font-size="12"
                font-family="Times New Roman, serif"
                fill="#0d47a1"
                font-weight="700">${totalDistance.toFixed(2)} m</text>
        `;

    if (mode === "dt") {
        return `
            <rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>
            <polygon points="${linePts}"
                     fill="#f4dcdc"
                     stroke="#7b1e1e"
                     stroke-width="2"
                     stroke-linejoin="round"/>
            ${edgesSvg}
            ${vertexSvg}
            ${centerInfo}
        `;
    }

    return `
        <rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>
        <polyline points="${linePts}"
                  fill="none"
                  stroke="#0d47a1"
                  stroke-width="2.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"/>
        ${edgesSvg}
        ${vertexSvg}
        ${centerInfo}
    `;
}

function _renderHtmlToPDF(htmlContent, filename) {
    if (typeof showLoading === "function") {
        showLoading("Đang tạo file PDF...");
    }

    const A4_W_PX = 794;
    const A4_H_PX = 1123;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = [
        "position:fixed",
        "left:-9999px",
        "top:0",
        "width:" + A4_W_PX + "px",
        "height:" + A4_H_PX + "px",
        "border:none",
        "visibility:hidden",
        "overflow:hidden"
    ].join(";");

    document.body.appendChild(iframe);

    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
    iDoc.open();
    iDoc.write(htmlContent);
    iDoc.close();

    setTimeout(function () {
        const fixStyle = iDoc.createElement("style");
        fixStyle.textContent =
            "html,body{width:" + A4_W_PX + "px!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff!important;}" +
            "*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}";
        iDoc.head.appendChild(fixStyle);

        const target = iDoc.querySelector(".page") || iDoc.body;
        const targetW = A4_W_PX;
        const targetH = target.scrollHeight || A4_H_PX;

        iframe.style.height = targetH + "px";

        html2canvas(target, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: targetW,
            height: targetH,
            windowWidth: A4_W_PX,
            windowHeight: targetH,
            scrollX: 0,
            scrollY: 0,
            logging: false
        }).then(function (canvas) {
            try {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: "portrait",
                    unit: "mm",
                    format: "a4"
                });

                const pageW_mm = pdf.internal.pageSize.getWidth();
                const pageH_mm = pdf.internal.pageSize.getHeight();

                const mmPerPx = pageW_mm / A4_W_PX;
                const pageH_cpx = Math.round((pageH_mm / mmPerPx) * 2);

                const canvasW = canvas.width;
                const canvasH = canvas.height;
                const totalPages = Math.ceil(canvasH / pageH_cpx);

                for (let page = 0; page < totalPages; page++) {
                    const sliceY = page * pageH_cpx;
                    const sliceH = Math.min(pageH_cpx, canvasH - sliceY);

                    const sc = document.createElement("canvas");
                    sc.width = canvasW;
                    sc.height = sliceH;

                    const ctx = sc.getContext("2d");
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvasW, sliceH);
                    ctx.drawImage(canvas, 0, sliceY, canvasW, sliceH, 0, 0, canvasW, sliceH);

                    const imgData = sc.toDataURL("image/jpeg", 0.95);
                    const sliceH_mm = (sliceH / 2) * mmPerPx;

                    if (page > 0) pdf.addPage();
                    pdf.addImage(imgData, "JPEG", 0, 0, pageW_mm, sliceH_mm);
                }

                pdf.save(filename);
            } catch (e) {
                console.error("jsPDF error:", e);
                alert("Lỗi tạo PDF: " + e.message);
            }

            document.body.removeChild(iframe);

            if (typeof hideLoading === "function") {
                hideLoading();
            }
        }).catch(function (err) {
            console.error("html2canvas error:", err);
            alert("Lỗi render PDF: " + err.message);

            document.body.removeChild(iframe);

            if (typeof hideLoading === "function") {
                hideLoading();
            }
        });
    }, 700);
}

/* =========================
MOBILE BUTTON FIX
========================= */

function bindMobileMenuButtons() {
    const menuRight = document.getElementById("menuRight");
    const exportTXTBtn = document.getElementById("exportTXTBtn");
    const exportMeasurePDFBtn = document.getElementById("exportMeasurePDF");
    const menuTriggerBtn = document.getElementById("menuTriggerBtn");

    function stopAll(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    function bindTap(el, handler) {
        if (!el) return;

        let touchMoved = false;

        el.addEventListener("touchstart", function (e) {
            touchMoved = false;
            e.stopPropagation();
        }, { passive: true });

        el.addEventListener("touchmove", function () {
            touchMoved = true;
        }, { passive: true });

        el.addEventListener("touchend", function (e) {
            if (touchMoved) return;
            stopAll(e);
            handler();
        }, { passive: false });

        el.addEventListener("click", function (e) {
            stopAll(e);
            handler();
        }, false);
    }

    if (menuRight) {
        ["touchstart", "touchmove", "touchend", "click", "pointerdown", "pointerup"].forEach(function (evt) {
            menuRight.addEventListener(evt, function (e) {
                e.stopPropagation();
            }, { passive: false });
        });
    }

    bindTap(exportTXTBtn, function () {
        exportTXT();
    });

    bindTap(exportMeasurePDFBtn, function () {
        exportMeasurePDF();
    });

    bindTap(menuTriggerBtn, function () {
        if (typeof openMenu === "function") {
            openMenu();
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindMobileMenuButtons);
} else {
    bindMobileMenuButtons();
}