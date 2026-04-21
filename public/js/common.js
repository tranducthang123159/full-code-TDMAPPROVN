let currentKTT = Number(window.currentKTT) || 108.5;
let measureMarkers = [];
let parcelVertexMarkers = [];

window.canhVisible = true;
window.currentOrderedParcelVertices = [];
window.currentParcelVertexFeature = null;
window.currentParcelVertexSelectedIndex = -1;
window.parcelVertexInteractive = false;
window.onParcelVertexClick = null;
window.currentFeature = null;

/* =========================
VN2000
========================= */

function updateVN2000(ktt) {
    currentKTT = Number(ktt) || 108.5;
    window.currentKTT = currentKTT;

    const p7 = "+towgs84=-191.90441429,-39.30318279,-111.45032835,0.00928836,-0.01975479,0.00427372,0.252906278";
    const def = `+proj=tmerc +lat_0=0 +lon_0=${currentKTT} +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 ${p7} +units=m +no_defs`;

    proj4.defs("VN2000_Current", def);
}

function cloneFeatureForRuntime(feature) {
    if (!feature || typeof feature !== "object") return feature;

    try {
        return JSON.parse(JSON.stringify(feature));
    } catch (e) {
        console.warn("Không clone được feature runtime, dùng bản gốc:", e);
        return feature;
    }
}

window.cloneFeatureForRuntime = cloneFeatureForRuntime;

function parseKTTValue(value) {
    if (value == null || value === "") return null;

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const normalized = String(value).trim().replace(/,/g, ".");
    const match = normalized.match(/\d+(?:\.\d+)?/);
    if (!match) return null;

    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
}

function extractKTTFromObject(obj) {
    if (!obj || typeof obj !== "object") return null;

    const candidates = [
        obj.ktt,
        obj.KTT,
        obj.kinh_truc,
        obj.kinhTruc,
        obj.central_meridian,
        obj.centralMeridian,
        obj.lon_0,
        obj.lon0,
        obj.longitude_origin,
        obj.longitudeOrigin
    ];

    for (const candidate of candidates) {
        const parsed = parseKTTValue(candidate);
        if (parsed != null) return parsed;
    }

    return null;
}

function getRuntimeMapMeta(typeOrMeta = null) {
    try {
        if (typeOrMeta && typeof typeOrMeta === "object") {
            return typeOrMeta;
        }

        if (typeof typeOrMeta === "string" && typeof window.getLoadedMapMeta === "function") {
            const found = window.getLoadedMapMeta(typeOrMeta);
            if (found) return found;
        }

        if (window.currentFeatureLayerType && typeof window.getLoadedMapMeta === "function") {
            const byLayer = window.getLoadedMapMeta(window.currentFeatureLayerType);
            if (byLayer) return byLayer;
        }

        if (window.currentMapMeta && typeof window.currentMapMeta === "object") {
            return window.currentMapMeta;
        }
    } catch (e) {
        console.warn("Lỗi lấy meta bản đồ runtime:", e);
    }

    return null;
}

function syncVN2000FromLoadedMeta(typeOrMeta = null, feature = null) {
    const meta = getRuntimeMapMeta(typeOrMeta);

    const ktt =
        extractKTTFromObject(meta) ||
        extractKTTFromObject(meta?.properties) ||
        extractKTTFromObject(feature?.properties) ||
        extractKTTFromObject(window) ||
        currentKTT;

    updateVN2000(ktt);
    return currentKTT;
}

function syncVN2000ForCurrentFeature(feature = null) {
    return syncVN2000FromLoadedMeta(window.currentFeatureLayerType || null, feature || window.currentFeature || null);
}

window.syncVN2000FromLoadedMeta = syncVN2000FromLoadedMeta;
window.syncVN2000ForCurrentFeature = syncVN2000ForCurrentFeature;

updateVN2000(currentKTT);

function toVN2000(coord) {
    const r = proj4(
        proj4.defs("EPSG:4326"),
        proj4.defs("VN2000_Current"),
        [Number(coord[0]), Number(coord[1])]
    );

    return {
        x: Number(r[0]),
        y: Number(r[1])
    };
}

function fromVN2000(point) {
    const r = proj4(
        proj4.defs("VN2000_Current"),
        proj4.defs("EPSG:4326"),
        [Number(point.x), Number(point.y)]
    );

    return [Number(r[0]), Number(r[1])];
}

function distVN2000(a, b) {
    const dx = Number(b.x) - Number(a.x);
    const dy = Number(b.y) - Number(a.y);
    return Math.sqrt(dx * dx + dy * dy);
}

function areaVN2000(points) {
    if (!Array.isArray(points) || points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }

    return Math.abs(area) / 2;
}

function polygonSignedAreaVN2000(points) {
    if (!Array.isArray(points) || points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }

    return area / 2;
}


function getCookieValue(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(new RegExp("(?:^|; )" + escaped + "=([^;]*)"));
    return match ? match[1] : "";
}

function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')?.content?.trim();
    if (meta) return meta;

    const globalToken = window.Laravel?.csrfToken || window.csrfToken || "";
    if (globalToken) return String(globalToken).trim();

    const cookieToken = getCookieValue("XSRF-TOKEN");
    if (cookieToken) {
        try {
            return decodeURIComponent(cookieToken);
        } catch (e) {
            return cookieToken;
        }
    }

    return "";
}

function buildCsrfHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    const token = getCsrfToken();

    if (token) {
        headers["X-CSRF-TOKEN"] = token;
        headers["X-XSRF-TOKEN"] = token;
    }

    return headers;
}

window.getCsrfToken = getCsrfToken;
window.buildCsrfHeaders = buildCsrfHeaders;

/* =========================
TOAST
========================= */

function showToast(message, type = "info", timeout = 2200) {
    let box = document.getElementById("appToast");

    if (!box) {
        box = document.createElement("div");
        box.id = "appToast";
        box.style.position = "fixed";
        box.style.top = "20px";
        box.style.right = "20px";
        box.style.zIndex = "99999";
        box.style.minWidth = "240px";
        box.style.maxWidth = "360px";
        box.style.padding = "12px 14px";
        box.style.borderRadius = "10px";
        box.style.color = "#fff";
        box.style.fontSize = "14px";
        box.style.fontWeight = "600";
        box.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
        box.style.transition = "all 0.25s ease";
        box.style.opacity = "0";
        box.style.transform = "translateY(-10px)";
        document.body.appendChild(box);
    }

    if (type === "success") {
        box.style.background = "#16a34a";
    } else if (type === "warning") {
        box.style.background = "#f59e0b";
    } else if (type === "error") {
        box.style.background = "#dc2626";
    } else {
        box.style.background = "#2563eb";
    }

    box.innerText = message;
    box.style.opacity = "1";
    box.style.transform = "translateY(0)";

    clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
        box.style.opacity = "0";
        box.style.transform = "translateY(-10px)";
    }, timeout);
}

/* =========================
HELPER HÌNH HỌC
========================= */

function isValidLngLat(coord) {
    return Array.isArray(coord) &&
        coord.length >= 2 &&
        Number.isFinite(Number(coord[0])) &&
        Number.isFinite(Number(coord[1])) &&
        Math.abs(Number(coord[0])) <= 180 &&
        Math.abs(Number(coord[1])) <= 90;
}

function sanitizeParcelCoordsWithIndex(rawCoords) {
    if (!Array.isArray(rawCoords)) return [];

    const indexed = [];

    for (let i = 0; i < rawCoords.length; i++) {
        const c = rawCoords[i];
        if (!isValidLngLat(c)) continue;

        indexed.push({
            lng: Number(c[0]),
            lat: Number(c[1]),
            originalIndex: i
        });
    }

    if (indexed.length > 1) {
        const first = indexed[0];
        const last = indexed[indexed.length - 1];
        if (first.lng === last.lng && first.lat === last.lat) {
            indexed.pop();
        }
    }

    const noDup = [];
    const tolerance = 1e-10;

    for (const p of indexed) {
        if (!noDup.length) {
            noDup.push(p);
            continue;
        }

        const last = noDup[noDup.length - 1];
        const dx = Math.abs(p.lng - last.lng);
        const dy = Math.abs(p.lat - last.lat);

        if (dx > tolerance || dy > tolerance) {
            noDup.push(p);
        }
    }

    if (noDup.length > 2) {
        const first = noDup[0];
        const last = noDup[noDup.length - 1];
        const dx = Math.abs(first.lng - last.lng);
        const dy = Math.abs(first.lat - last.lat);

        if (dx <= tolerance && dy <= tolerance) {
            noDup.pop();
        }
    }

    if (noDup.length < 3) return [];

    return noDup.map(p => {
        const vn = toVN2000([p.lng, p.lat]);
        return {
            lng: p.lng,
            lat: p.lat,
            x: vn.x,
            y: vn.y,
            originalIndex: p.originalIndex
        };
    });
}

function sanitizeParcelCoords(rawCoords) {
    return sanitizeParcelCoordsWithIndex(rawCoords).map(p => [p.lng, p.lat]);
}

function getPolygonRingAreaMeters(ring) {
    const clean = sanitizeParcelCoordsWithIndex(ring);
    if (clean.length < 3) return 0;
    return areaVN2000(clean);
}

/* =========================
LẤY RING THỬA
========================= */

function getParcelCoords(feature) {
    if (!feature || !feature.geometry) return [];

    const geometry = feature.geometry;

    if (geometry.type === "Polygon") {
        return sanitizeParcelCoords(geometry.coordinates?.[0] || []);
    }

    if (geometry.type === "MultiPolygon") {
        const polygons = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];

        let bestRing = [];
        let bestArea = 0;

        polygons.forEach(polygon => {
            const ring = polygon?.[0] || [];
            const area = getPolygonRingAreaMeters(ring);

            if (area > bestArea) {
                bestArea = area;
                bestRing = sanitizeParcelCoords(ring);
            }
        });

        return bestRing;
    }

    return [];
}

function getParcelCoordsWithIndex(feature) {
    if (!feature || !feature.geometry) return [];

    const geometry = feature.geometry;

    if (geometry.type === "Polygon") {
        return sanitizeParcelCoordsWithIndex(geometry.coordinates?.[0] || []);
    }

    if (geometry.type === "MultiPolygon") {
        const polygons = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];

        let bestRing = [];
        let bestArea = 0;

        polygons.forEach(polygon => {
            const ring = polygon?.[0] || [];
            const area = getPolygonRingAreaMeters(ring);

            if (area > bestArea) {
                bestArea = area;
                bestRing = sanitizeParcelCoordsWithIndex(ring);
            }
        });

        return bestRing;
    }

    return [];
}

/* =========================
THỨ TỰ ĐỈNH GIỐNG FILE HTML
========================= */

function getOrderedParcelVertices(feature) {
    if (!feature || !feature.geometry) return [];

    const pts = getParcelCoordsWithIndex(feature);
    if (!Array.isArray(pts) || pts.length < 3) return [];

    const anchorOriginalIndex = pts[0]?.originalIndex ?? 0;

    let vnPts = pts.map((p) => ({
        // Theo mẫu xuất của bạn:
        // X = northing, Y = easting
        x: Number(p.y),
        y: Number(p.x),
        exportX: Number(p.y),
        exportY: Number(p.x),
        lng: Number(p.lng),
        lat: Number(p.lat),
        originalIndex: p.originalIndex,

        // giữ riêng để tính chiều quay
        _east: Number(p.x),
        _north: Number(p.y)
    }));

    // signed area trong hệ VN2000:
    // > 0 là ngược chiều kim đồng hồ (CCW)
    const signedArea = vnPts.reduce((sum, cur, i) => {
        const next = vnPts[(i + 1) % vnPts.length];
        return sum + (cur._east * next._north - next._east * cur._north);
    }, 0) / 2;

    // Ép về chiều kim đồng hồ nhưng vẫn giữ mốc đỉnh đầu để số đỉnh không bị nhảy.
    if (signedArea > 0) {
        vnPts.reverse();
    }

    let startIdx = vnPts.findIndex((p) => p.originalIndex === anchorOriginalIndex);
    if (startIdx < 0) startIdx = 0;

    const ordered = [
        ...vnPts.slice(startIdx),
        ...vnPts.slice(0, startIdx)
    ].map(({ _east, _north, ...rest }, idx) => ({
        ...rest,
        displayIndex: idx
    }));

    window.currentOrderedParcelVertices = ordered;
    return ordered;
}

/* =========================
TÂM THỬA
========================= */

function getFeatureCenter(feature) {
    try {
        if (typeof turf !== "undefined") {
            const centerPoint = turf.pointOnFeature(feature);
            const point = centerPoint?.geometry?.coordinates;

            if (isValidLngLat(point)) {
                return point;
            }
        }
    } catch (e) {
        console.warn("turf.pointOnFeature lỗi:", e);
    }

    const coords = getParcelCoords(feature);
    if (!coords.length) return null;

    const vnPoints = coords.map(c => toVN2000(c));
    let area2 = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < vnPoints.length; i++) {
        const j = (i + 1) % vnPoints.length;
        const cross = vnPoints[i].x * vnPoints[j].y - vnPoints[j].x * vnPoints[i].y;
        area2 += cross;
        cx += (vnPoints[i].x + vnPoints[j].x) * cross;
        cy += (vnPoints[i].y + vnPoints[j].y) * cross;
    }

    if (Math.abs(area2) > 1e-9) {
        cx /= (3 * area2);
        cy /= (3 * area2);
        return fromVN2000({ x: cx, y: cy });
    }

    let sumX = 0;
    let sumY = 0;
    coords.forEach(([x, y]) => {
        sumX += x;
        sumY += y;
    });

    return [sumX / coords.length, sumY / coords.length];
}

/* =========================
MIDPOINT CẠNH
========================= */

function getOffsetMidpointVN2000(vnPoints, i, offsetMeters = 0.35) {
    const a = vnPoints[i];
    const b = vnPoints[(i + 1) % vnPoints.length];

    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (!len) {
        return fromVN2000({ x: midX, y: midY });
    }

    const signedArea = polygonSignedAreaVN2000(vnPoints);

    let nx, ny;
    if (signedArea > 0) {
        nx = dy / len;
        ny = -dx / len;
    } else {
        nx = -dy / len;
        ny = dx / len;
    }

    return fromVN2000({
        x: midX + nx * offsetMeters,
        y: midY + ny * offsetMeters
    });
}

function getSegmentMidpointLngLat(a, b) {
    const ax = Array.isArray(a) ? Number(a[0]) : Number(a?.lng ?? a?.x);
    const ay = Array.isArray(a) ? Number(a[1]) : Number(a?.lat ?? a?.y);
    const bx = Array.isArray(b) ? Number(b[0]) : Number(b?.lng ?? b?.x);
    const by = Array.isArray(b) ? Number(b[1]) : Number(b?.lat ?? b?.y);

    if (
        Number.isFinite(ax) && Number.isFinite(ay) &&
        Number.isFinite(bx) && Number.isFinite(by)
    ) {
        return [(ax + bx) / 2, (ay + by) / 2];
    }

    return null;
}

/* =========================
LABEL UI
========================= */

function normalizeLabelAngle(angle) {
    let a = Number(angle) || 0;
    if (a > 90) a -= 180;
    if (a < -90) a += 180;
    return a;
}

function getSegmentDisplayAngle(a, b, mapInstance = null) {
    const m = mapInstance || window.map || null;

    const aLng = Array.isArray(a) ? Number(a[0]) : Number(a?.lng);
    const aLat = Array.isArray(a) ? Number(a[1]) : Number(a?.lat);
    const bLng = Array.isArray(b) ? Number(b[0]) : Number(b?.lng);
    const bLat = Array.isArray(b) ? Number(b[1]) : Number(b?.lat);

    try {
        if (
            m && typeof m.project === "function" &&
            Number.isFinite(aLng) && Number.isFinite(aLat) &&
            Number.isFinite(bLng) && Number.isFinite(bLat) &&
            Math.abs(aLng) <= 180 && Math.abs(bLng) <= 180 &&
            Math.abs(aLat) <= 90 && Math.abs(bLat) <= 90
        ) {
            const s1 = m.project([aLng, aLat]);
            const s2 = m.project([bLng, bLat]);
            const dx = Number(s2.x) - Number(s1.x);
            const dy = Number(s2.y) - Number(s1.y);

            if (Number.isFinite(dx) && Number.isFinite(dy) && (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6)) {
                return normalizeLabelAngle(Math.atan2(dy, dx) * 180 / Math.PI);
            }
        }
    } catch (e) {}

    if (Number.isFinite(aLng) && Number.isFinite(aLat) && Number.isFinite(bLng) && Number.isFinite(bLat)) {
        return normalizeLabelAngle((-Math.atan2(bLat - aLat, bLng - aLng) * 180) / Math.PI);
    }

    const ax = Number(a?.x);
    const ay = Number(a?.y);
    const bx = Number(b?.x);
    const by = Number(b?.y);

    if (Number.isFinite(ax) && Number.isFinite(ay) && Number.isFinite(bx) && Number.isFinite(by)) {
        return normalizeLabelAngle((-Math.atan2(by - ay, bx - ax) * 180) / Math.PI);
    }

    return 0;
}

window.normalizeLabelAngle = window.normalizeLabelAngle || normalizeLabelAngle;
window.getSegmentDisplayAngle = window.getSegmentDisplayAngle || getSegmentDisplayAngle;

function createEdgeLabel(text, angle) {
    const wrap = document.createElement("div");
    wrap.className = "edgeMarker";
    wrap.style.pointerEvents = "none";

    const inner = document.createElement("div");
    inner.className = "edgeLabel";
    inner.innerText = text;

    inner.style.display = "inline-block";
    inner.style.background = "#ffffff";
    inner.style.border = "1.5px solid #dc3545";
    inner.style.borderRadius = "4px";
    inner.style.padding = "2px 5px";
    inner.style.fontSize = "11px";
    inner.style.fontWeight = "800";
    inner.style.lineHeight = "1";
    inner.style.color = "#dc3545";
    inner.style.whiteSpace = "nowrap";
    inner.style.boxShadow = "0 1px 3px rgba(0,0,0,0.15)";
    inner.style.transformOrigin = "center center";
    inner.style.transform = `rotate(${normalizeLabelAngle(angle)}deg)`;
    inner.style.writingMode = "horizontal-tb";
    inner.style.textOrientation = "mixed";

    wrap.appendChild(inner);
    return wrap;
}

function createVertexLabel(text, index, clickable = false) {
    const el = document.createElement("div");
    el.className = "vertexLabel";
    el.id = `v-label-${index}`;
    el.innerHTML = text;

    if (clickable) {
        el.classList.add("clickable");
        el.style.cursor = "pointer";
        el.style.pointerEvents = "auto";
    }

    return el;
}

function createAreaLabel(area, perimeter) {
    const el = document.createElement("div");
    el.className = "areaLabel parcel-area-info";
    el.dataset.labelType = "parcel-area-info";

    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

    el.dataset.area = Number(area || 0);
    el.dataset.perimeter = Number(perimeter || 0);
    el.dataset.mobile = isMobile ? "1" : "0";

    el.style.background = "rgba(255,255,255,0.95)";
    el.style.borderRadius = "10px";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.16)";
    el.style.textAlign = "center";
    el.style.whiteSpace = "nowrap";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.justifyContent = "center";
    el.style.alignItems = "center";
    el.style.transformOrigin = "center center";
    el.style.transition = "transform 0.15s ease";
    el.style.border = "1px solid rgba(0,0,0,0.06)";

    updateAreaLabelByZoom(el);

    return el;
}

function updateAreaLabelByZoom(el) {
    if (!el) return;

    const zoom = map && typeof map.getZoom === "function" ? map.getZoom() : 18;
    const area = Number(el.dataset.area || 0);
    const perimeter = Number(el.dataset.perimeter || 0);
    const isMobile = el.dataset.mobile === "1";

    let scale = 1;

    if (zoom <= 14) scale = 0.55;
    else if (zoom <= 15) scale = 0.60;
    else if (zoom <= 16) scale = 0.66;
    else if (zoom <= 17) scale = 0.72;
    else if (zoom <= 18) scale = 0.78;
    else if (zoom <= 19) scale = 0.84;
    else scale = 0.90;

    const padY = 2;
    const padX = 5;
    const titleSize = isMobile ? 7 : 8;
    const subSize = isMobile ? 6 : 7;
    const minW = isMobile ? 70 : 78;
    const maxW = isMobile ? 86 : 94;

    el.style.padding = `${padY}px ${padX}px`;
    el.style.minWidth = `${minW}px`;
    el.style.maxWidth = `${maxW}px`;
    el.style.lineHeight = "1.05";
    el.style.borderRadius = "7px";
    el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.10)";
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;

    el.innerHTML = `
        <div style="font-size:${titleSize}px;font-weight:800;color:#111827;">
            ${area.toFixed(1)} m²
        </div>
        <div style="font-size:${subSize}px;font-weight:600;color:#6b7280;margin-top:1px;">
            ${perimeter.toFixed(1)} m
        </div>
    `;
}
window.showParcelAreaInfoLabel = typeof window.showParcelAreaInfoLabel === "boolean"
    ? window.showParcelAreaInfoLabel
    : true;

window.toggleParcelAreaInfoLabel = function toggleParcelAreaInfoLabel(visible = true) {
    window.showParcelAreaInfoLabel = !!visible;
    document.querySelectorAll('.parcel-area-info, .areaLabel[data-label-type="parcel-area-info"]').forEach((el) => {
        el.style.display = visible ? '' : 'none';
        el.style.visibility = visible ? '' : 'hidden';
    });
};

/* =========================
ẨN / HIỆN LABEL
========================= */

function setMeasureMarkerVisible(marker, visible) {
    if (!marker) return;

    let el = null;
    if (typeof marker.getElement === "function") {
        el = marker.getElement();
    } else if (marker._element) {
        el = marker._element;
    }

    if (el) {
        el.style.display = visible ? "" : "none";
    }
}

function syncCanhToggleState() {
    const checkbox = document.getElementById("toggle_canh");
    if (checkbox) {
        window.canhVisible = checkbox.checked;
    }
}

function toggleCanhVisibility(forceValue = null) {
    if (typeof forceValue === "boolean") {
        window.canhVisible = forceValue;
    } else {
        syncCanhToggleState();
    }

    measureMarkers.forEach(marker => {
        setMeasureMarkerVisible(marker, window.canhVisible);
    });

    parcelVertexMarkers.forEach(marker => {
        setMeasureMarkerVisible(marker, window.canhVisible);
    });
}

/* =========================
CLEAR
========================= */

function clearMeasure() {
    measureMarkers.forEach(m => {
        if (m && typeof m.remove === "function") m.remove();
    });

    parcelVertexMarkers.forEach(m => {
        if (m && typeof m.remove === "function") m.remove();
    });

    measureMarkers = [];
    parcelVertexMarkers = [];
    window.currentOrderedParcelVertices = [];
    window.currentParcelVertexFeature = null;
    window.currentParcelVertexSelectedIndex = -1;
}

/* =========================
HIGHLIGHT THỬA
========================= */

function removeParcelHighlight() {
    try {
        const layerIds = [
            "parcelHighlightLine",
            "parcelHighlightLineBg",
            "parcelHighlightFill"
        ];

        layerIds.forEach(id => {
            if (map.getLayer(id)) {
                map.removeLayer(id);
            }
        });

        if (map.getSource("parcelHighlight")) {
            map.removeSource("parcelHighlight");
        }
    } catch (e) {
        console.warn("Lỗi removeParcelHighlight:", e);
    }
}

function highlightParcel(feature) {
    if (!feature || !feature.geometry || !map) return;

    try {
        removeParcelHighlight();

        map.addSource("parcelHighlight", {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: [feature]
            }
        });

        map.addLayer({
            id: "parcelHighlightFill",
            type: "fill",
            source: "parcelHighlight",
            paint: {
                "fill-color": "#60a5fa",
                "fill-opacity": 0.10
            }
        });

        map.addLayer({
            id: "parcelHighlightLineBg",
            type: "line",
            source: "parcelHighlight",
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": "#ffffff",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 4,
                    14, 6,
                    18, 8
                ],
                "line-opacity": 0.95
            }
        });

        map.addLayer({
            id: "parcelHighlightLine",
            type: "line",
            source: "parcelHighlight",
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": "#ff0000",
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10, 2.5,
                    14, 4,
                    18, 6
                ],
                "line-opacity": 1
            }
        });

        moveHighlightToTop();
    } catch (e) {
        console.error("Lỗi highlightParcel:", e);
    }
}

function moveHighlightToTop() {
    try {
        if (map.getLayer("parcelHighlightFill")) map.moveLayer("parcelHighlightFill");
        if (map.getLayer("parcelHighlightLineBg")) map.moveLayer("parcelHighlightLineBg");
        if (map.getLayer("parcelHighlightLine")) map.moveLayer("parcelHighlightLine");
    } catch (e) {
        console.warn("Không move được highlight layer:", e);
    }
}

/* =========================
ĐỈNH THỬA - TƯƠNG TÁC
========================= */

function clearParcelVertexMarkers() {
    parcelVertexMarkers.forEach(m => {
        if (m && typeof m.remove === "function") m.remove();
    });
    parcelVertexMarkers = [];
}

function setParcelVertexClickHandler(handler) {
    window.onParcelVertexClick = typeof handler === "function" ? handler : null;
}

function setParcelVertexInteractive(enabled = true) {
    window.parcelVertexInteractive = !!enabled;
}

function clearParcelVertexSelection() {
    window.currentParcelVertexSelectedIndex = -1;
    document.querySelectorAll(".vertexLabel.selected").forEach(el => {
        el.classList.remove("selected");
    });
}

function highlightParcelVertex(index, selected = true) {
    document.querySelectorAll(".vertexLabel.selected").forEach(el => {
        el.classList.remove("selected");
    });

    if (!selected || index < 0) {
        window.currentParcelVertexSelectedIndex = -1;
        return;
    }

    const el = document.getElementById(`v-label-${index}`);
    if (el) {
        el.classList.add("selected");
        window.currentParcelVertexSelectedIndex = index;
    }
}

function drawParcelVertices(feature, interactive = false) {
    clearParcelVertexMarkers();

    const ordered = getOrderedParcelVertices(feature);
    window.currentParcelVertexFeature = feature;

    if (!ordered.length || ordered.length < 3) return ordered;

    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
    const maxVertexLabels = isMobile ? 12 : 40;
    const vertexStep = Math.max(1, Math.ceil(ordered.length / maxVertexLabels));

    ordered.forEach((pt, i) => {
        if (ordered.length > maxVertexLabels && i % vertexStep !== 0) return;

        const clickable = interactive || !!window.onParcelVertexClick;
        const el = createVertexLabel(i + 1, i, clickable);

        const marker = new maplibregl.Marker({
            element: el,
            anchor: "center"
        }).setLngLat([pt.lng, pt.lat]).addTo(map);

        if (clickable) {
            const markerEl = marker.getElement();
            markerEl.style.pointerEvents = "auto";
            markerEl.addEventListener("click", (evt) => {
                evt.stopPropagation();
                if (typeof window.onParcelVertexClick === "function") {
                    window.onParcelVertexClick(i, pt.originalIndex, pt, ordered, feature);
                }
            });
        }

        parcelVertexMarkers.push(marker);
        setMeasureMarkerVisible(marker, window.canhVisible);
    });

    return ordered;
}

function redrawParcelVertices(feature = window.currentParcelVertexFeature, interactive = window.parcelVertexInteractive) {
    if (!feature) return [];
    return drawParcelVertices(feature, interactive);
}

/* =========================
CHÈN ĐIỂM MỚI TRÊN CẠNH
========================= */

function insertParcelVertexAtEdge(feature, fromDisplayIndex, toDisplayIndex, distanceFromFirstMeters) {
    if (!feature || !feature.geometry) return null;

    const ordered = getOrderedParcelVertices(feature);
    if (!ordered.length) return null;

    const p1 = ordered[fromDisplayIndex];
    const p2 = ordered[toDisplayIndex];

    if (!p1 || !p2) return null;

    const totalDist = Math.sqrt(
        Math.pow(p2.exportY - p1.exportY, 2) +
        Math.pow(p2.exportX - p1.exportX, 2)
    );

    const dist = Number(distanceFromFirstMeters);

    if (!Number.isFinite(dist) || dist <= 0 || dist >= totalDist) {
        showToast("Khoảng cách chèn điểm không hợp lệ.", "warning");
        return null;
    }

    const ratio = dist / totalDist;
    const newRealX = p1.exportY + (p2.exportY - p1.exportY) * ratio;
    const newRealY = p1.exportX + (p2.exportX - p1.exportX) * ratio;
    const newLngLat = fromVN2000({ x: newRealX, y: newRealY });

    const geom = feature.geometry;
    const isPolygon = geom.type === "Polygon";
    const isMultiPolygon = geom.type === "MultiPolygon";

    if (!isPolygon && !isMultiPolygon) return null;

    let ring = [];

    if (isPolygon) {
        ring = [...(geom.coordinates?.[0] || [])];
    } else {
        ring = [...(geom.coordinates?.[0]?.[0] || [])];
    }

    if (ring.length < 4) return null;

    const idx1 = p1.originalIndex;
    const idx2 = p2.originalIndex;

    const newPoint = [newLngLat[0], newLngLat[1]];
    const newRing = [];
    let inserted = false;

    for (let i = 0; i < ring.length - 1; i++) {
        newRing.push(ring[i]);

        const nextIndex = i + 1;
        const isForward = idx1 === i && idx2 === nextIndex;
        const isWrap = idx1 === ring.length - 2 && idx2 === 0;

        if (isForward || isWrap) {
            newRing.push(newPoint);
            inserted = true;
        }
    }

    if (!inserted) {
        const retryRing = [];
        for (let i = 0; i < ring.length - 1; i++) {
            retryRing.push(ring[i]);

            const nextIndex = i + 1;
            const isBackward = idx2 === i && idx1 === nextIndex;
            const isWrapBack = idx2 === ring.length - 2 && idx1 === 0;

            if (isBackward || isWrapBack) {
                retryRing.push(newPoint);
                inserted = true;
            }
        }

        if (inserted) {
            retryRing.push(retryRing[0]);
            if (isPolygon) {
                feature.geometry.coordinates = [retryRing];
            } else {
                feature.geometry.coordinates[0][0] = retryRing;
            }

            return {
                lng: newLngLat[0],
                lat: newLngLat[1],
                x: newRealX,
                y: newRealY
            };
        }
    }

    if (!inserted) {
        showToast("Không xác định được cạnh để chèn điểm.", "error");
        return null;
    }

    if (newRing.length) newRing.push(newRing[0]);

    if (isPolygon) {
        feature.geometry.coordinates = [newRing];
    } else {
        feature.geometry.coordinates[0][0] = newRing;
    }

    return {
        lng: newLngLat[0],
        lat: newLngLat[1],
        x: newRealX,
        y: newRealY
    };
}

/* =========================
TÍNH CẠNH C(m)
========================= */

function getOrderedVertexEdgeLength(ordered, index) {
    if (!Array.isArray(ordered) || !ordered.length) return 0;

    const cur = ordered[index];
    const next = ordered[(index + 1) % ordered.length];

    return Math.sqrt(
        Math.pow(next.exportY - cur.exportY, 2) +
        Math.pow(next.exportX - cur.exportX, 2)
    );
}

/* =========================
VẼ ĐO THỬA
========================= */

function drawParcelMeasure(feature, options = {}) {
    if (!feature) return;

    window.currentFeature = feature;
    highlightParcel(feature);

    syncCanhToggleState();
    clearMeasure();

    const ordered = getOrderedParcelVertices(feature);

    if (!ordered.length || ordered.length < 3) {
        console.warn("Không có tọa độ thửa hợp lệ");
        return;
    }

    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

    const maxEdgeLabels = isMobile ? 10 : 30;
    const minEdgeDistance = isMobile ? 2.5 : 1.2;
    const edgeStep = Math.max(1, Math.ceil(ordered.length / maxEdgeLabels));

    const ptsVN = ordered.map(p => ({
        x: p.exportY,
        y: p.exportX
    }));

    drawParcelVertices(feature, !!options.interactiveVertices || !!window.parcelVertexInteractive);

    let perimeter = 0;
    let drawnEdgeLabels = 0;

    for (let i = 0; i < ptsVN.length; i++) {
        const p1 = ptsVN[i];
        const p2 = ptsVN[(i + 1) % ptsVN.length];

        const dist = distVN2000(p1, p2);
        perimeter += dist;

        if (dist < minEdgeDistance) continue;
        if (i % edgeStep !== 0) continue;
        if (drawnEdgeLabels >= maxEdgeLabels) continue;

        const mid = getSegmentMidpointLngLat(ordered[i], ordered[(i + 1) % ordered.length]) ||
            getOffsetMidpointVN2000(ptsVN, i, 0);

        const angle = getSegmentDisplayAngle(ordered[i], ordered[(i + 1) % ordered.length]);
        const el = createEdgeLabel(`${dist.toFixed(2)} m`, angle);

        const m = new maplibregl.Marker({
            element: el,
            anchor: "center"
        }).setLngLat(mid).addTo(map);

        measureMarkers.push(m);
        setMeasureMarkerVisible(m, window.canhVisible);
        drawnEdgeLabels++;
    }

    const p = feature.properties || {};
    let area = Number(p.DIENTICH || 0);
    if (!area || area <= 0) {
        area = areaVN2000(ptsVN);
    }

    const center = getFeatureCenter(feature);
    if (!center) return;

    const areaEl = createAreaLabel(area, perimeter);

    const areaMarker = new maplibregl.Marker({
        element: areaEl,
        anchor: "center"
    }).setLngLat(center).addTo(map);

    measureMarkers.push(areaMarker);
    setMeasureMarkerVisible(areaMarker, window.canhVisible);

    if (typeof window.toggleParcelAreaInfoLabel === "function") {
        window.toggleParcelAreaInfoLabel(window.showParcelAreaInfoLabel !== false);
    }

    moveHighlightToTop();
}

/* =========================
XUẤT TXT TỌA ĐỘ - CÓ C(m)
========================= */

function exportCoordinates() {
    if (!window.currentFeature) {
        showToast("Chưa chọn thửa!", "warning");
        return;
    }

    if (typeof syncVN2000ForCurrentFeature === "function") {
        syncVN2000ForCurrentFeature(window.currentFeature);
    }

    const ordered = getOrderedParcelVertices(window.currentFeature);

    if (!ordered.length) {
        showToast("Không có tọa độ thửa", "warning");
        return;
    }

    let text = "STT\tX(m)\tY(m)\tC(m)\n";

    for (let i = 0; i < ordered.length; i++) {
        const cur = ordered[i];
        const canh = getOrderedVertexEdgeLength(ordered, i);

        text += `${i + 1}\t${cur.exportX.toFixed(3)}\t${cur.exportY.toFixed(3)}\t${canh.toFixed(3)}\n`;
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    const p = window.currentFeature.properties || {};
    a.download = `ToaDo_To_${p.SHBANDO || ""}_Thua_${p.SHTHUA || ""}.txt`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    showToast("Đã xuất file tọa độ đúng mẫu có C(m).", "success");
}

function buildParcelSketchSVG(feature, ordered, width = 260, height = 220) {
    if (!feature || !ordered || !ordered.length) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`;
    }

    const pts = ordered.map(p => ({
        x: p.exportY,
        y: p.exportX,
        lng: p.lng,
        lat: p.lat
    }));

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    });

    const pad = 20;
    const drawW = width - pad * 2;
    const drawH = height - pad * 2;

    const dataW = Math.max(1, maxX - minX);
    const dataH = Math.max(1, maxY - minY);
    const scale = Math.min(drawW / dataW, drawH / dataH);

    function toSvg(px, py) {
        const x = pad + (px - minX) * scale;
        const y = height - pad - (py - minY) * scale;
        return { x, y };
    }

    const polyPoints = pts.map(p => {
        const s = toSvg(p.x, p.y);
        return `${s.x},${s.y}`;
    }).join(" ");

    let lines = `<polygon points="${polyPoints}" fill="#dff3ea" stroke="#111" stroke-width="1.2"/>`;

    for (let i = 0; i < pts.length; i++) {
        const cur = pts[i];
        const next = pts[(i + 1) % pts.length];
        const s1 = toSvg(cur.x, cur.y);
        const s2 = toSvg(next.x, next.y);

        const mx = (s1.x + s2.x) / 2;
        const my = (s1.y + s2.y) / 2;

        const canh = getOrderedVertexEdgeLength(ordered, i);
        const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x) * 180 / Math.PI;

        lines += `
            <circle cx="${s1.x}" cy="${s1.y}" r="1.8" fill="#111"/>
            <text x="${s1.x + 3}" y="${s1.y - 3}" font-size="8" font-family="Times New Roman">${i + 1}</text>
            <text x="${mx}" y="${my}" font-size="7" font-family="Times New Roman"
                text-anchor="middle"
                transform="rotate(${angle}, ${mx}, ${my})">${canh.toFixed(2)}</text>
        `;
    }

    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <rect x="0" y="0" width="${width}" height="${height}" fill="#fff"/>
            ${lines}
        </svg>
    `;
}

/* =========================
XUẤT PDF
========================= */


async function exportParcelPDF() {
    const feature = window.currentFeature || window.currentSelectedFeature;
    if (!feature) {
        alert("Vui lòng chọn thửa đất trước!");
        return;
    }

    if (typeof syncVN2000ForCurrentFeature === "function") {
        syncVN2000ForCurrentFeature(feature);
    }

    try {
        await ensurePdfLibsLoaded();
        const props = feature.properties || {};
        const soTo = Math.floor(Number(props.SHBANDO)) || "-";
        const soThua = Math.floor(Number(props.SHTHUA)) || "-";
        const dienTich = props.DIENTICH ? Number(props.DIENTICH).toFixed(1) : "-";
        const tenChu = props.TENCHU || "";
        const mLoaiDat = _getLoaiDatForParcelPdf(props);
        const diaChi = props.DIACHI || props.DCRIENG || "";
        const ordered = getOrderedParcelVertices(feature);

        _openParcelKQDDWindow({
            soTo,
            soThua,
            dienTich,
            tenChu,
            mLoaiDat,
            diaChi,
            orderedPts: ordered,
            isParcel: true
        });
    } catch (error) {
        console.error("exportParcelPDF error:", error);
        alert("Lỗi xuất PDF: " + (error?.message || error));
    }
}

function _getLoaiDatForParcelPdf(props) {
    if (!props) return "";
    return (
        props.MLOAIDAT ||
        props.LOAIDAT ||
        props.MLD ||
        props.KHLOAIDAT ||
        props.MA_LOAIDAT ||
        props.LandCode ||
        props.LOAI_DAT ||
        props.loaidat ||
        ""
    ).toString().trim();
}

function _openParcelKQDDWindow({ soTo, soThua, dienTich, tenChu, mLoaiDat, diaChi, orderedPts, isParcel, edgeLengths }) {
    if (!Array.isArray(orderedPts) || orderedPts.length < 2) {
        alert("Không có dữ liệu tọa độ thửa để xuất PDF.");
        return;
    }

    if (!edgeLengths) {
        edgeLengths = [];
        for (let i = 0; i < orderedPts.length; i++) {
            const p1 = orderedPts[i], p2 = orderedPts[(i + 1) % orderedPts.length];
            edgeLengths.push(Math.hypot(p2.x - p1.x, p2.y - p1.y));
        }
    }

    const svgContent = _buildParcelKQDDSvg(orderedPts, edgeLengths, soThua, dienTich, mLoaiDat, isParcel);

    let coordRows = "";
    const ptsWithClose = [...orderedPts, orderedPts[0]];
    ptsWithClose.forEach((pt, i) => {
        const isClose = (i === ptsWithClose.length - 1);
        coordRows += `<tr>
          <td class="ct">${isClose ? 1 : i + 1}</td>
          <td class="cn">${Number(pt.x).toFixed(2)}</td>
          <td class="cn">${Number(pt.y).toFixed(2)}</td>
          ${!isClose ? `<td class="cn">${edgeLengths[i] ? Number(edgeLengths[i]).toFixed(2) : ""}</td>` : `<td class="cn"></td>`}
        </tr>`;
    });
    for (let i = 0; i < 6; i++) {
        coordRows += `<tr class="empty-row"><td class="ct"></td><td class="cn"></td><td class="cn"></td><td class="cn"></td></tr>`;
    }

    const now = new Date();
    const nam = now.getFullYear();
    const title = isParcel
        ? `PHIẾU XÁC NHẬN KẾT QUẢ ĐO ĐẠC HIỆN TRẠNG THỬA ĐẤT`
        : `PHIẾU XÁC NHẬN KẾT QUẢ ĐO ĐẠC DIỆN TÍCH`;
    const ktt = currentKTT || "105";

    const nPts = orderedPts.length;
    const dataRowsH = (nPts + 1) * 20;
    const boxH = Math.min(400, Math.max(220, 52 + dataRowsH + 80 + 22));

    const infoFs = nPts > 16 ? '8.5pt' : nPts > 10 ? '9.5pt' : '10.5pt';
    const coordFs = nPts > 16 ? '7pt' : nPts > 10 ? '7.5pt' : '8.5pt';
    const thFs = nPts > 16 ? '7pt' : nPts > 10 ? '7.5pt' : '9pt';
    const rowPad = nPts > 16 ? '1px 1px' : nPts > 10 ? '1px 2px' : '2px 3px';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 794px;
    background: #fff;
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    color: #000;
  }
  .a4-page {
    width: 794px;
    min-height: 1123px;
    padding: 18mm 14mm 14mm 20mm;
    background: #fff;
    position: relative;
    overflow: hidden;
  }
  .a4-border {
    border: 2px solid #111;
    padding: 8px 10px 10px 10px;
    min-height: calc(1123px - 32mm);
    display: flex;
    flex-direction: column;
  }
  .quoc-hieu { text-align: center; font-weight: bold; font-size: 12pt; text-transform: uppercase; margin-bottom: 1px; }
  .doc-lap   { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 6px; }
  .tieu-de   { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 4px 0 8px 0; text-align: center; }
  .info-line { margin: 2px 0; font-size: ${infoFs}; line-height: 1.55; white-space: nowrap; overflow: hidden; }
  .line-row { display: flex; align-items: flex-end; gap: 3px; margin: 2px 0; font-size: ${infoFs}; line-height: 1.55; white-space: nowrap; }
  .line-row .label { flex-shrink: 0; }
  .line-row .dash { border-bottom: 1px dotted #555; flex: 1; min-width: 30px; display: inline-block; }
  .dot-line  { border-bottom: 1px dotted #555; display: inline-block; min-width: 80px; }
  .so9-10 { display: flex; gap: 0; margin-top: 6px; height: ${boxH}px; }
  .so9 {
    flex: 1;
    border: 1.5px solid #222;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .so9-title  { font-size: 9.5pt; font-weight: bold; padding: 2px 5px; border-bottom: 1.5px solid #555; background: #f9f9f9; flex-shrink: 0; }
  .so9-svg    { width: 100%; flex: 1; display: block; min-height: 0; }
  .so10 { width: 52%; border: 1.5px solid #222; border-left: none; display: flex; flex-direction: column; overflow: hidden; }
  .so10-title { font-size: 9.5pt; font-weight: bold; padding: 2px 5px; border-bottom: 1.5px solid #555; text-align: center; background: #f9f9f9; flex-shrink: 0; }
  .tbl-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
  table.coord-tbl { width: 100%; border-collapse: collapse; font-size: ${coordFs}; table-layout: fixed; height: 100%; }
  table.coord-tbl thead { flex-shrink: 0; }
  table.coord-tbl th { border: 1px solid #555; padding: 2px 2px; text-align: center; font-size: ${thFs}; background: #ececec; }
  table.coord-tbl td.ct { border: 1px solid #aaa; padding: ${rowPad}; text-align: center; vertical-align: middle; }
  table.coord-tbl td.cn { border: 1px solid #aaa; padding: ${rowPad}; text-align: right; vertical-align: middle; }
  table.coord-tbl tr.empty-row { height: auto; }
  table.coord-tbl tbody { height: 100%; }
  .note-star { font-size: 7.5pt; color: #444; margin: 3px 4px; font-style: italic; flex-shrink: 0; }
  .sign-row  { display: flex; justify-content: space-between; margin-top: 8px; font-size: 9.5pt; }
  .sign-box  { width: 46%; text-align: center; }
  .sign-date { font-style: italic; }
  .sign-role { font-weight: bold; margin-top: 2px; }
  .sign-note { font-size: 8.5pt; font-style: italic; margin-top: 2px; }
  .sign-name { margin-top: 24px; font-style: italic; }
</style>
</head><body>
<div class="a4-page">
  <div class="a4-border">

    <div class="quoc-hieu">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="doc-lap">Độc lập - Tự do - Hạnh phúc</div>
    <div class="tieu-de">${title}</div>

    <div class="info-line">
      1. Thửa đất số: <span class="dot-line" style="min-width:45px;">${soThua}</span>
      &nbsp;; Tờ bản đồ số: <span class="dot-line" style="min-width:45px;">${soTo}</span>
      &nbsp;; diện tích: <span class="dot-line" style="min-width:55px;">${dienTich}</span> m²
    </div>
    <div class="info-line">
      &nbsp;&nbsp;&nbsp;&nbsp;loại đất: <span class="dot-line" style="min-width:70px;">${mLoaiDat}</span>
      &nbsp;; hình thức sử dụng: <span class="dot-line" style="min-width:90px;">Sử dụng riêng</span>
    </div>
    <div class="info-line">2. Địa chỉ thửa đất: <span class="dot-line" style="min-width:280px;">${diaChi}</span></div>
    <div class="info-line">3. Tên người sử dụng đất, người quản lý đất: <span class="dot-line" style="min-width:180px;">${tenChu}</span></div>
    <div class="line-row"><span class="label">4. Địa chỉ người sử dụng đất, người quản lý đất:</span><span class="dash"></span></div>
    <div class="info-line">5. Giấy chứng nhận hoặc quyết định giao đất, cho thuê đất, cho phép chuyển mục đích sử dụng đất hoặc giấy tờ về quyền sử dụng đất (giấy tờ):</div>
    <div class="line-row" style="margin-top:0;"><span class="label">&nbsp;&nbsp;&nbsp;&nbsp;Số GCN / Quyết định:</span><span class="dash"></span></div>
    <div class="line-row"><span class="label">&nbsp;&nbsp;&nbsp;- Loại giấy tờ:</span><span class="dash"></span></div>
    <div class="info-line">&nbsp;&nbsp;&nbsp;- Diện tích trên giấy tờ: <span class="dot-line" style="min-width:50px;"></span> m² ; loại đất trên giấy tờ: <span class="dot-line" style="min-width:65px;"></span></div>
    <div class="line-row"><span class="label">6. Tình hình thay đổi ranh giới thửa đất so với khi có giấy tờ:</span><span class="dash"></span></div>
    <div class="info-line">7. Đo đạc theo dự án (công trình): Theo nhu cầu của hộ gia đình, cá nhân.</div>
    <div class="line-row"><span class="label">8. Đơn vị đo đạc:</span><span class="dash"></span></div>

    <div class="so9-10">
      <div class="so9">
        <div class="so9-title">9. Sơ đồ thửa đất:</div>
        <svg class="so9-svg" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
          ${svgContent}
        </svg>
      </div>
      <div class="so10">
        <div class="so10-title">10. Tọa độ đỉnh thửa, kích thước cạnh</div>
        <div class="tbl-wrap">
          <table class="coord-tbl">
            <thead>
              <tr>
                <th rowspan="2" style="width:13%">Đỉnh</th>
                <th colspan="2">Tọa độ đỉnh thửa(**)</th>
                <th rowspan="2" style="width:17%">C (m)</th>
              </tr>
              <tr>
                <th style="width:28%">X(m)</th>
                <th style="width:28%">Y(m)</th>
              </tr>
            </thead>
            <tbody>${coordRows}</tbody>
          </table>
        </div>
        <div class="note-star">(**) Hệ tọa độ VN-2000, KTT ${ktt}°</div>
      </div>
    </div>

    <div class="sign-row">
      <div class="sign-box">
        <div class="sign-date">............, ngày ..... tháng ..... năm ${nam}</div>
        <div class="sign-role">Cán bộ đo đạc</div>
        <div class="sign-note">(Ký ghi rõ họ và tên, chức vụ, đóng dấu)</div>
        <div class="sign-name">&nbsp;</div>
      </div>
      <div class="sign-box">
        <div class="sign-date">............, ngày ..... tháng ..... năm ${nam}</div>
        <div class="sign-role">Người sử dụng, quản lý đất</div>
        <div class="sign-note">Tôi ký tên dưới đây xác nhận các thông tin về thửa đất nêu ở Phiếu này là đúng với hiện trạng sử dụng, quản lý đất</div>
        <div class="sign-note"><i>(Ký ghi rõ họ và tên, chức vụ, đóng dấu)</i></div>
        <div class="sign-name">${tenChu}</div>
      </div>
    </div>

  </div>
</div>
</body></html>`;

    _renderParcelHtmlToPDF(html, `KQDD_To${soTo}_Thua${soThua}.pdf`);
}

function _renderParcelHtmlToPDF(htmlContent, filename) {
    if (typeof showLoading === 'function') showLoading('Đang tạo file PDF...');

    const A4_W_PX = 794;
    const A4_H_PX = 1123;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = [
        'position:fixed',
        'left:-9999px',
        'top:0',
        'width:' + A4_W_PX + 'px',
        'height:' + A4_H_PX + 'px',
        'border:none',
        'visibility:hidden',
        'overflow:hidden'
    ].join(';');
    document.body.appendChild(iframe);

    const cleanup = function () {
        try {
            if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
        } catch (_) {}
        if (typeof hideLoading === 'function') hideLoading();
    };

    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
    iDoc.open();
    iDoc.write(htmlContent);
    iDoc.close();

    setTimeout(function () {
        const fixStyle = iDoc.createElement('style');
        fixStyle.textContent =
            'html,body{width:' + A4_W_PX + 'px!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff!important;}' +
            '*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}';
        iDoc.head.appendChild(fixStyle);

        const target = iDoc.querySelector('.a4-page') || iDoc.body;
        const targetW = A4_W_PX;
        const targetH = target.scrollHeight || A4_H_PX;
        iframe.style.height = targetH + 'px';

        html2canvas(target, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
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
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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

                    const sc = document.createElement('canvas');
                    sc.width = canvasW;
                    sc.height = sliceH;
                    const ctx = sc.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvasW, sliceH);
                    ctx.drawImage(canvas, 0, sliceY, canvasW, sliceH, 0, 0, canvasW, sliceH);

                    const imgData = sc.toDataURL('image/jpeg', 0.95);
                    const sliceH_mm = (sliceH / 2) * mmPerPx;

                    if (page > 0) pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, 0, pageW_mm, sliceH_mm);
                }

                pdf.save(filename);
            } catch (e) {
                console.error('jsPDF error:', e);
                alert('Lỗi tạo PDF: ' + e.message);
            }
            cleanup();
        }).catch(function (err) {
            console.error('html2canvas error:', err);
            alert('Lỗi render PDF: ' + err.message);
            cleanup();
        });
    }, 800);
}

function _buildParcelKQDDSvg(orderedPts, edgeLengths, soThua, dienTich, mLoaiDat, isParcel) {
    const PAD = 28;
    const W = 300, H = 200;
    if (!orderedPts || orderedPts.length < 2) {
        return `<rect width="${W}" height="${H}" fill="#fff"/>`;
    }

    const xs = orderedPts.map(p => Number(p.y));
    const ys = orderedPts.map(p => Number(p.x));
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const usableW = W - PAD * 2;
    const usableH = H - PAD * 2;
    const scale = Math.min(usableW / rangeX, usableH / rangeY);
    const drawW = rangeX * scale, drawH = rangeY * scale;
    const offX = (W - drawW) / 2;
    const offY = (H - drawH) / 2;

    const toSVG = (pt) => ({
        sx: offX + (Number(pt.y) - minX) * scale,
        sy: H - offY - (Number(pt.x) - minY) * scale
    });

    const svgPts = orderedPts.map(toSVG);
    const polyPts = svgPts.map(p => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ');
    const fillColor = isParcel ? 'rgba(180,220,180,0.35)' : 'rgba(220,180,180,0.35)';
    const strokeColor = isParcel ? '#1a5c2a' : '#8b1a1a';

    let edgeLabels = '';
    for (let i = 0; i < svgPts.length; i++) {
        const p1 = svgPts[i], p2 = svgPts[(i + 1) % svgPts.length];
        const dist = edgeLengths[i];
        if (!dist || dist < 0.3) continue;
        const mx = (p1.sx + p2.sx) / 2;
        const my = (p1.sy + p2.sy) / 2;
        const dx = p2.sx - p1.sx, dy = p2.sy - p1.sy;
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle > 90) angle -= 180;
        if (angle < -90) angle += 180;
        const nx = -dy / Math.hypot(dx, dy) * 8;
        const ny = dx / Math.hypot(dx, dy) * 8;
        edgeLabels += `<text x="${(mx + nx).toFixed(1)}" y="${(my + ny).toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
          font-size="7.5" fill="#333" font-family="Times New Roman,serif" font-style="italic"
          transform="rotate(${angle.toFixed(1)},${(mx + nx).toFixed(1)},${(my + ny).toFixed(1)})"
          >${Number(dist).toFixed(2)}</text>`;
    }

    let vertexLabels = '';
    svgPts.forEach((p, i) => {
        const prev = svgPts[(i - 1 + svgPts.length) % svgPts.length];
        const next = svgPts[(i + 1) % svgPts.length];
        const cx = (prev.sx + next.sx) / 2;
        const cy = (prev.sy + next.sy) / 2;
        let dx = p.sx - cx, dy = p.sy - cy;
        const len = Math.hypot(dx, dy) || 1;
        dx = dx / len * 11; dy = dy / len * 11;
        vertexLabels += `
          <circle cx="${p.sx.toFixed(1)}" cy="${p.sy.toFixed(1)}" r="3" fill="#000" stroke="none"/>
          <text x="${(p.sx + dx).toFixed(1)}" y="${(p.sy + dy).toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
            font-size="8" font-family="Times New Roman,serif" fill="#000">${i + 1}</text>`;
    });

    const cx = svgPts.reduce((s, p) => s + p.sx, 0) / svgPts.length;
    const cy = svgPts.reduce((s, p) => s + p.sy, 0) / svgPts.length;
    const infoLabel = isParcel
        ? `<text x="${cx.toFixed(1)}" y="${(cy - 4).toFixed(1)}" text-anchor="middle" font-size="8.5" font-family="Times New Roman,serif" fill="#cc0000" font-weight="bold">${soThua}</text>
           <text x="${cx.toFixed(1)}" y="${(cy + 7).toFixed(1)}" text-anchor="middle" font-size="7.5" font-family="Times New Roman,serif" fill="#cc0000" font-weight="bold">${dienTich} m²</text>`
        : `<text x="${cx.toFixed(1)}" y="${(cy - 4).toFixed(1)}" text-anchor="middle" font-size="8" font-family="Times New Roman,serif" fill="#000">Vùng đo</text>
           <text x="${cx.toFixed(1)}" y="${(cy + 8).toFixed(1)}" text-anchor="middle" font-size="8.5" font-family="Times New Roman,serif" fill="#8b1a1a" font-weight="bold">${dienTich} m²</text>`;

    const parts = [mLoaiDat || '', soThua || '', (parseFloat(dienTich || 0)).toFixed(1) + ' m²'].filter(Boolean);
    const lbl = parts.join('/');
    const boxW = Math.min(lbl.length * 5.5 + 8, W - 4);
    const cornerLabel = isParcel ? `
        <rect x="2" y="${H - 15}" width="${boxW}" height="13"
          fill="white" fill-opacity="0.9" stroke="#cc0000" stroke-width="0.8" rx="2"/>
        <text x="5" y="${H - 5}" text-anchor="start" dominant-baseline="auto"
          font-size="8.5" font-family="Times New Roman,serif" font-weight="bold" fill="#cc0000"
          >${lbl}</text>` : '';

    return `<rect width="${W}" height="${H}" fill="white"/>
  <polygon points="${polyPts}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5" stroke-linejoin="round"/>
  ${edgeLabels}
  ${vertexLabels}
  ${infoLabel}
  ${cornerLabel}`;
}


function loadScriptOnce(src, checkFn) {
    return new Promise((resolve, reject) => {
        try {
            if (typeof checkFn === "function" && checkFn()) {
                resolve(true);
                return;
            }

            const existed = Array.from(document.scripts || []).find(s => s.src === src);
            if (existed) {
                const done = () => {
                    if (typeof checkFn !== "function" || checkFn()) resolve(true);
                    else reject(new Error("Tải thư viện xong nhưng chưa sẵn sàng: " + src));
                };
                existed.addEventListener("load", done, { once: true });
                existed.addEventListener("error", () => reject(new Error("Không tải được thư viện: " + src)), { once: true });

                setTimeout(() => {
                    if (typeof checkFn !== "function" || checkFn()) resolve(true);
                }, 150);
                return;
            }

            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = () => {
                if (typeof checkFn !== "function" || checkFn()) resolve(true);
                else reject(new Error("Thư viện chưa khởi tạo xong: " + src));
            };
            script.onerror = () => reject(new Error("Không tải được thư viện: " + src));
            document.head.appendChild(script);
        } catch (err) {
            reject(err);
        }
    });
}
function clearSelectedParcel() {
    try {
        // xóa nhãn cạnh, nhãn đỉnh, diện tích, chu vi
        if (typeof clearMeasure === "function") {
            clearMeasure();
        }

        // bỏ highlight thửa đang chọn
        if (typeof removeParcelHighlight === "function") {
            removeParcelHighlight();
        }

        // bỏ chọn đỉnh nếu đang có
        if (typeof clearParcelVertexSelection === "function") {
            clearParcelVertexSelection();
        }

        // reset dữ liệu thửa đang chọn
        window.currentFeature = null;
        window.currentSelectedFeature = null;
        window.currentParcelVertexFeature = null;
        window.currentOrderedParcelVertices = [];
        window.currentParcelVertexSelectedIndex = -1;

        // ẩn popup nếu có
        if (window.markerPopup && typeof window.markerPopup.remove === "function") {
            window.markerPopup.remove();
            window.markerPopup = null;
        }

        // xóa marker ghim nếu có
        if (window.marker && typeof window.marker.remove === "function") {
            window.marker.remove();
            window.marker = null;
        }

        // reset info thửa nếu có box hiển thị
        const infoBox = document.getElementById("parcelInfo");
        if (infoBox) {
            infoBox.innerHTML = "";
            infoBox.style.display = "none";
        }

        if (typeof showToast === "function") {
            showToast("Đã xóa thửa đang chọn.", "success");
        }
    } catch (err) {
        console.error("clearSelectedParcel error:", err);
    }
}

window.clearSelectedParcel = clearSelectedParcel;
async function ensurePdfLibsLoaded() {
    await loadScriptOnce(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
        () => !!(window.jspdf && window.jspdf.jsPDF)
    );

    await loadScriptOnce(
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
        () => !!window.html2canvas
    );
}