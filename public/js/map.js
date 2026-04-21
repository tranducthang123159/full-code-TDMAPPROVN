/* =========================
INIT MAP
========================= */

function getSavedUserLocationCenter() {
    try {
        const raw = localStorage.getItem("tdmap_last_user_location");
        if (!raw) return [106.7, 10.8];

        const parsed = JSON.parse(raw);
        const lng = Number(parsed?.lng);
        const lat = Number(parsed?.lat);

        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            return [lng, lat];
        }
    } catch (e) {
        console.warn("Không đọc được vị trí đã lưu:", e);
    }

    return [106.7, 10.8];
}

window.map = new maplibregl.Map({
    container: "map",
    style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
            basemap: {
                type: "raster",
                tiles: [
                    "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                ],
                tileSize: 256,
                maxzoom: 22
            }
        },
        layers: [
            {
                id: "basemap",
                type: "raster",
                source: "basemap"
            }
        ]
    },
    center: getSavedUserLocationCenter(),
    zoom: 16,
    maxZoom: 22,
    minZoom: 3,
    antialias: false,
    preserveDrawingBuffer: false,
    fadeDuration: 0,
    attributionControl: false
});

/* =========================
MAP MODE
========================= */

window.currentMapMeta = null;
window.fullLoaded = false;
window.liteLoaded = false;
window.ultraLoaded = false;
window.savedMapsCache = null;
window.isUploadingMap = false;
window.isQuickPreviewMode = false;

window.mapCache = {
    ultra: {},
    lite: {},
    full: {}
};
window.mapCachePending = window.mapCachePending || {
    ultra: {},
    lite: {},
    full: {}
};
window.mapResolutionState = window.mapResolutionState || {
    loading: false,
    currentLevel: null,
    pendingLevel: null,
    metaKey: null
};

window.__viewSavedMapLoadingIds = window.__viewSavedMapLoadingIds || new Set();
window.__viewSavedMapLastId = window.__viewSavedMapLastId || null;

window.mapMode = "pin";
window.loadedMapMetas = window.loadedMapMetas || {};
window.currentRenderModes = window.currentRenderModes || {};
window.currentFeatureLayerType = window.currentFeatureLayerType || null;
window.__pmtilesProtocolReady = false;
window.__pmtilesProtocolInstance = null;
window.__pmtilesScriptLoading = null;
window.__pmtilesReadyPollers = window.__pmtilesReadyPollers || {};
window.__pmtilesPreviewActiveId = window.__pmtilesPreviewActiveId || null;

function isViewportAbortLikeError(err) {
    const message = String(err?.message || err || "");
    const reason = String(err?.reason || "");
    return err?.name === "AbortError"
        || err === "viewport-changed"
        || message === "viewport-changed"
        || reason === "viewport-changed"
        || ((/Failed to fetch|Load failed|Network request failed/i.test(message))
            && (err?.__viewportAbortLike === true || reason === "viewport-changed"));
}
window.isViewportAbortLikeError = isViewportAbortLikeError;

function lockMapNorthUp() {
    try {
        if (typeof map.setBearing === "function") map.setBearing(0);
        if (typeof map.setPitch === "function") map.setPitch(0);
    } catch (e) {
        console.warn("Không thể đặt bản đồ về hướng Bắc:", e);
    }
}

if (map.dragRotate && typeof map.dragRotate.disable === "function") {
    map.dragRotate.disable();
}
if (map.touchZoomRotate && typeof map.touchZoomRotate.disableRotation === "function") {
    map.touchZoomRotate.disableRotation();
}
if (map.touchPitch && typeof map.touchPitch.disable === "function") {
    map.touchPitch.disable();
}
lockMapNorthUp();
map.on("load", lockMapNorthUp);
map.doubleClickZoom.enable();

function getFirstParcelLayerId() {
    const ordered = [
        "dc_moi_fill", "dc_moi_line",
        "dc_cu_fill", "dc_cu_line",
        "canh_fill", "canh_line"
    ];

    for (const id of ordered) {
        if (map.getLayer(id)) return id;
    }
    return null;
}

window.ensurePlanningLayersBelow = function ensurePlanningLayersBelow() {
    if (!map || !map.getStyle || !map.getStyle()) return;

    try {
        const beforeId = getFirstParcelLayerId();

        if (map.getLayer("quyhoach_fill") && beforeId) {
            map.moveLayer("quyhoach_fill", beforeId);
        }

        if (map.getLayer("quyhoach_line") && beforeId) {
            map.moveLayer("quyhoach_line", beforeId);
        }
    } catch (e) {
        console.warn("Không thể đưa lớp quy hoạch xuống dưới:", e);
    }
};

/* =========================
PMTILES / VECTOR TILE HELPERS
========================= */

function isPmtilesMeta(meta) {
    return !!(meta && !!meta.pmtiles_ready && (meta.pmtiles_url || meta.pmtiles_public_url || meta.render_mode === "pmtiles"));
}

function getDefaultSourceLayerForType(type) {
    const t = normalizeMapType(type);
    if (t === "quy_hoach") return "planning";
    return "parcels";
}

function buildPmtilesSourceUrl(url) {
    if (!url) return null;
    return String(url).startsWith("pmtiles://") ? String(url) : `pmtiles://${url}`;
}

function getPmtilesRawUrl(meta) {
    return meta?.pmtiles_public_url || meta?.pmtiles_url || null;
}

async function ensurePmtilesLibraryLoaded() {
    if (window.pmtiles) return window.pmtiles;
    if (window.__pmtilesScriptLoading) return window.__pmtilesScriptLoading;

    window.__pmtilesScriptLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/pmtiles@3.2.1/dist/pmtiles.js";
        script.async = true;
        script.onload = () => {
            if (window.pmtiles) {
                resolve(window.pmtiles);
                return;
            }
            reject(new Error("Không nạp được thư viện PMTiles"));
        };
        script.onerror = () => reject(new Error("Lỗi tải thư viện PMTiles"));
        document.head.appendChild(script);
    });

    return window.__pmtilesScriptLoading;
}

async function ensurePmtilesProtocolReady(meta = null) {
    await ensurePmtilesLibraryLoaded();

    if (!window.__pmtilesProtocolReady) {
        window.__pmtilesProtocolInstance = new window.pmtiles.Protocol();
        maplibregl.addProtocol("pmtiles", window.__pmtilesProtocolInstance.tile);
        window.__pmtilesProtocolReady = true;
    }

    const rawUrl = getPmtilesRawUrl(meta);
    if (rawUrl && window.__pmtilesProtocolInstance && window.pmtiles?.PMTiles) {
        try {
            window.__pmtilesProtocolInstance.add(new window.pmtiles.PMTiles(rawUrl));
        } catch (e) {
            console.warn("Không add được PMTiles instance:", e);
        }
    }
}

function stopPmtilesReadyPolling(id = null) {
    if (id) {
        const key = String(id);
        const timer = window.__pmtilesReadyPollers?.[key];
        if (timer) {
            clearTimeout(timer);
            delete window.__pmtilesReadyPollers[key];
        }
        if (String(window.__pmtilesPreviewActiveId || "") === key) {
            window.__pmtilesPreviewActiveId = null;
        }
        return;
    }

    Object.keys(window.__pmtilesReadyPollers || {}).forEach((key) => {
        clearTimeout(window.__pmtilesReadyPollers[key]);
        delete window.__pmtilesReadyPollers[key];
    });
    window.__pmtilesPreviewActiveId = null;
}

function setPmtilesWaitingStatus(meta, options = {}) {
    if (typeof showUploadMessage !== 'function') return;
    const type = normalizeMapType(meta?.type);
    const labels = { dc_cu: 'Địa chính cũ', dc_moi: 'Địa chính mới', quy_hoach: 'Quy hoạch' };
    const label = options.label || labels[type] || 'Bản đồ';
    showUploadMessage(`
        <strong>Đã hiện preview ${label}</strong><br>
        Đang build PMTiles nền để mở mượt hơn trên điện thoại.<br>
        Xong sẽ tự chuyển sang bản đồ chính.
    `, 'warning');
}

async function pollMapMetaOnce(id) {
    const res = await fetch(`/map-files/${id}/json`, {
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
    });

    const text = await res.text();
    let meta = null;
    try {
        meta = JSON.parse(text);
    } catch (e) {
        throw new Error('Server trả dữ liệu không hợp lệ');
    }

    meta = sanitizeMapMetaForRuntime(meta);
    if (!meta?.success) {
        throw new Error(meta?.message || 'Không đọc được file');
    }

    return meta;
}

function startSavedMapPmtilesPolling(id, options = {}) {
    if (!id) return false;
    const key = String(id);
    const intervalMs = Number(options.intervalMs || (isMobileUA() ? 7000 : 3500));
    const maxAttempts = Number(options.maxAttempts || (isMobileUA() ? 180 : 90));

    if (window.__pmtilesReadyPollers?.[key]) {
        return true;
    }

    let attempts = 0;
    window.__pmtilesPreviewActiveId = id;

    const tick = async () => {
        attempts += 1;

        try {
            const meta = await pollMapMetaOnce(id);
            registerLoadedMapMeta(normalizeMapType(meta.type), meta, isPmtilesMeta(meta) ? 'pmtiles' : 'geojson');

            if (isPmtilesMeta(meta)) {
                stopPmtilesReadyPolling(id);
                if (String(window.__pmtilesPreviewActiveId || key) !== key && !options.forceSwitch) {
                    return;
                }
                if (typeof viewSavedMap === 'function') {
                    await viewSavedMap(id, {
                        closeSavedPanel: false,
                        silent: true,
                        fromPmtilesPoll: true,
                        autoSwitchPmtiles: false
                    });
                    if (typeof showUploadMessage === 'function') {
                        showUploadMessage(`
                            <strong>Đã chuyển sang PMTiles</strong><br>
                            Bản đồ đang chạy ở chế độ tối ưu cho điện thoại.
                        `, 'success');
                    }
                }
                return;
            }
        } catch (err) {
            console.warn('poll PMTiles lỗi:', err);
        }

        if (attempts >= maxAttempts) {
            stopPmtilesReadyPolling(id);
            return;
        }

        window.__pmtilesReadyPollers[key] = setTimeout(tick, intervalMs);
    };

    window.__pmtilesReadyPollers[key] = setTimeout(tick, intervalMs);
    return true;
}

window.stopPmtilesReadyPolling = stopPmtilesReadyPolling;
window.startSavedMapPmtilesPolling = startSavedMapPmtilesPolling;

function registerLoadedMapMeta(type, meta, renderMode = null) {
    const t = normalizeMapType(type);
    if (!t || !meta) return;
    window.loadedMapMetas[t] = { ...meta };
    if (renderMode) {
        window.currentRenderModes[t] = renderMode;
    }
}

function getLoadedMapMeta(type) {
    const t = normalizeMapType(type);
    if (!t) return null;
    return window.loadedMapMetas?.[t] || null;
}

window.getCurrentParcelMeta = function getCurrentParcelMeta() {
    const byLayer = getLoadedMapMeta(window.currentFeatureLayerType);
    if (byLayer) return byLayer;

    const currentType = normalizeMapType(window.currentMapMeta?.type);
    if (currentType === "dc_moi" || currentType === "dc_cu") {
        return window.currentMapMeta;
    }

    return getLoadedMapMeta("dc_moi") || getLoadedMapMeta("dc_cu") || window.currentMapMeta || null;
};

window.getPlanningMeta = function getPlanningMeta() {
    return getLoadedMapMeta("quy_hoach") || (normalizeMapType(window.currentMapMeta?.type) === "quy_hoach" ? window.currentMapMeta : null);
};

function scoreFeatureMatch(targetFeature, candidateFeature) {
    const targetProps = targetFeature?.properties || {};
    const candidateProps = candidateFeature?.properties || {};

    const directKeys = [
        "PARCEL_UID", "parcel_uid", "uid", "UID", "OBJECTID", "OBJECTID_1", "OBJECTID12", "FID", "fid", "ID", "id", "gid", "GID"
    ];

    let score = 0;

    directKeys.forEach((key) => {
        const a = targetProps[key] ?? targetFeature?.id;
        const b = candidateProps[key] ?? candidateFeature?.id;
        if (a !== undefined && b !== undefined && String(a).trim() !== "" && String(a).trim() === String(b).trim()) {
            score += 100;
        }
    });

    const compareKeys = ["SHBANDO", "SHTHUA", "SOTOCU", "TENCHU", "KHLOAIDAT"];
    compareKeys.forEach((key) => {
        const a = String(targetProps[key] ?? "").trim().toLowerCase();
        const b = String(candidateProps[key] ?? "").trim().toLowerCase();
        if (a && b && a === b) score += 10;
    });

    if (score === 0 && targetFeature?.geometry && candidateFeature?.geometry && typeof turf !== "undefined") {
        try {
            const targetCenter = turf.pointOnFeature(targetFeature);
            const candidateCenter = turf.pointOnFeature(candidateFeature);
            const d = turf.distance(targetCenter, candidateCenter, { units: "meters" });
            if (Number.isFinite(d) && d <= 0.5) score += 25;
            else if (Number.isFinite(d) && d <= 2) score += 10;
        } catch (e) {}
    }

    return score;
}

window.findMatchingFeatureInGeoJSON = function findMatchingFeatureInGeoJSON(feature, geojson) {
    if (!feature || !Array.isArray(geojson?.features) || !geojson.features.length) return null;

    let best = null;
    let bestScore = 0;

    for (const candidate of geojson.features) {
        const score = scoreFeatureMatch(feature, candidate);
        if (score > bestScore) {
            bestScore = score;
            best = candidate;
        }
    }

    return bestScore > 0 ? best : null;
};

window.ensureGeoJSONDataLoaded = async function ensureGeoJSONDataLoaded(typeOrMeta, level = "full") {
    let meta = null;

    if (typeof typeOrMeta === "string") {
        meta = getLoadedMapMeta(typeOrMeta) || (normalizeMapType(window.currentMapMeta?.type) === normalizeMapType(typeOrMeta) ? window.currentMapMeta : null);
    } else {
        meta = typeOrMeta;
    }

    meta = sanitizeMapMetaForRuntime(meta);
    if (typeof fetchGeoJSONCached !== "function") return null;

    if (level === "lite" && meta?.lite_url) {
        return await fetchGeoJSONCached(meta.lite_url, "lite");
    }

    if (!meta?.full_url) {
        return null;
    }

    if (shouldBlockFullGeoJsonLoad(meta, level)) {
        return null;
    }

    return await fetchGeoJSONCached(meta.full_url, level);
};

window.ensurePlanningGeoJSONLoaded = async function ensurePlanningGeoJSONLoaded() {
    if (window.geo_quy_hoach?.features?.length) return window.geo_quy_hoach;

    let meta = window.getPlanningMeta ? window.getPlanningMeta() : null;
    meta = sanitizeMapMetaForRuntime(meta);
    if (typeof fetchGeoJSONCached !== "function" || !meta) return null;

    if (shouldForceMobileLiteApiMode(meta)) {
        if (!meta?.lite_url) return null;
        const liteGeojson = await fetchGeoJSONCached(meta.lite_url, "lite");
        window.geo_quy_hoach = liteGeojson;
        return liteGeojson;
    }

    if (!meta?.full_url || shouldBlockFullGeoJsonLoad(meta, "full")) return null;

    const geojson = await fetchGeoJSONCached(meta.full_url, "full");
    window.geo_quy_hoach = geojson;
    return geojson;
};

window.resolveFeatureForInteraction = async function resolveFeatureForInteraction(feature, layerType = null) {
    if (!feature) return feature;

    const type = normalizeMapType(layerType || window.currentFeatureLayerType || window.currentMapMeta?.type || "");
    const renderMode = window.currentRenderModes?.[type] || window.currentMapMeta?.render_mode || "geojson";

    if (renderMode !== "pmtiles") {
        return feature;
    }

    let meta = getLoadedMapMeta(type) || (normalizeMapType(window.currentMapMeta?.type) === type ? window.currentMapMeta : null);
    meta = sanitizeMapMetaForRuntime(meta);
    if (!meta) return feature;

    try {
        const hydrated = await resolveFeatureViaApi(meta, feature);
        return hydrated || feature;
    } catch (apiErr) {
        console.warn("Hydrate thửa qua API lỗi:", apiErr);
    }

    if (shouldForceMobileLiteApiMode(meta)) return feature;
    if (!meta?.full_url || shouldBlockFullGeoJsonLoad(meta, "full")) return feature;

    try {
        const fullGeojson = await window.ensureGeoJSONDataLoaded(meta, "full");
        const matched = window.findMatchingFeatureInGeoJSON(feature, fullGeojson);
        return matched || feature;
    } catch (e) {
        console.warn("Không hydrate được feature từ full GeoJSON:", e);
        return feature;
    }
};

window.ensureCurrentFeatureHydrated = async function ensureCurrentFeatureHydrated(layerType = null) {
    if (!window.currentFeature) return null;
    let hydrated = await window.resolveFeatureForInteraction(window.currentFeature, layerType || window.currentFeatureLayerType);
    if (hydrated) {
        if (typeof cloneFeatureForRuntime === "function") {
            hydrated = cloneFeatureForRuntime(hydrated);
        }
        if (typeof syncVN2000ForCurrentFeature === "function") {
            syncVN2000ForCurrentFeature(hydrated);
        }
        window.currentFeature = hydrated;
    }
    return hydrated;
};

/* =========================
BASEMAP SWITCH
========================= */

function setBaseMap(type) {
    let tiles = [];

    if (type === "street") {
        tiles = [
            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
        ];
    } else if (type === "sat") {
        tiles = [
            "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        ];
    } else if (type === "topo") {
        tiles = [
            "https://tile.opentopomap.org/{z}/{x}/{y}.png"
        ];
    }

    const source = map.getSource("basemap");
    if (source && tiles.length) {
        source.setTiles(tiles);
    }
}

/* =========================
UPLOAD MAP
========================= */

function getTypeLabel(type) {
    const t = normalizeMapType(type);

    if (t === "dc_cu") return "Địa chính cũ";
    if (t === "dc_moi") return "Địa chính mới";
    if (t === "quy_hoach") return "Quy hoạch";
    if (t === "canh") return "Canh";
    return "Bản đồ";
}

function getMapResolutionMetaKey(meta) {
    if (!meta) return null;
    return [
        normalizeMapType(meta?.type || ""),
        meta?.id || meta?.pmtiles_public_url || meta?.pmtiles_url || meta?.full_url || meta?.lite_url || meta?.ultra_lite_url || "local"
    ].join("__");
}

function getMapLevelRank(level) {
    const ranks = {
        ultra: 1,
        lite: 2,
        viewport_api: 3,
        full: 4,
        pmtiles: 5
    };
    return ranks[level] || 0;
}

function resetMapResolutionRuntimeState(options = {}) {
    if (options.clearMeta !== false) {
        window.currentMapMeta = null;
    }

    window.fullLoaded = false;
    window.liteLoaded = false;
    window.ultraLoaded = false;
    window.mapResolutionState = {
        loading: false,
        currentLevel: null,
        pendingLevel: null,
        metaKey: null
    };
}

function setCurrentMapResolutionLevel(meta, level) {
    if (!window.mapResolutionState) {
        resetMapResolutionRuntimeState({ clearMeta: false });
    }

    window.mapResolutionState.metaKey = getMapResolutionMetaKey(meta);
    window.mapResolutionState.currentLevel = level || null;
    window.mapResolutionState.pendingLevel = null;
}

function clearMapResolutionState() {
    resetMapResolutionRuntimeState({ clearMeta: true });
}

function clearMapCache() {
    window.mapCache = {
        ultra: {},
        lite: {},
        full: {}
    };
    window.mapCachePending = {
        ultra: {},
        lite: {},
        full: {}
    };
}

function focusMapNearBbox(bbox, options = {}) {
    if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(v => Number.isFinite(Number(v)))) {
        return;
    }

    const center = [
        (Number(bbox[0]) + Number(bbox[2])) / 2,
        (Number(bbox[1]) + Number(bbox[3])) / 2
    ];

    const targetZoom = Number(options.zoom || 17);

    try {
        const currentCenter = map.getCenter?.();
        const currentZoom = Number(map.getZoom?.());
        if (
            currentCenter &&
            Number.isFinite(currentZoom) &&
            Math.abs(Number(currentCenter.lng) - center[0]) < 0.000001 &&
            Math.abs(Number(currentCenter.lat) - center[1]) < 0.000001 &&
            Math.abs(currentZoom - targetZoom) < 0.05
        ) {
            return;
        }
    } catch (e) {}

    map.easeTo({
        center,
        zoom: targetZoom,
        duration: Number(options.duration ?? 350)
    });
}

window.focusMapNearBbox = focusMapNearBbox;

function isMobileUA() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function isHeavyMobileMap(meta) {
    return isMobileUA() && Number(meta?.feature_count || 0) >= 12000;
}

function shouldUseParcelViewportApi(meta) {
    if (!meta) return false;
    const type = normalizeMapType(meta?.type || "");
    if (type !== "dc_cu" && type !== "dc_moi") return false;
    if (!meta?.api_urls?.parcel_viewport_features) return false;
    if (isPmtilesMeta(meta)) return false;

    const featureCount = Number(meta?.feature_count || 0);
    if (isMobileUA()) return true;
    return Number.isFinite(featureCount) && featureCount >= 25000;
}

function shouldForceMobileLiteApiMode(meta) {
    if (!meta || !isMobileUA()) return false;

    const type = normalizeMapType(meta?.type || "");
    const featureCount = Number(meta?.feature_count || 0);
    if (!Number.isFinite(featureCount) || featureCount <= 0) return false;

    if (type === "quy_hoach") {
        return featureCount >= 45000 && !isPmtilesMeta(meta) && !meta?.lite_url;
    }

    return featureCount >= 70000 && !isPmtilesMeta(meta) && !meta?.lite_url;
}

function sanitizeMapMetaForRuntime(meta) {
    if (!meta || typeof meta !== "object") return meta;

    const safeMeta = { ...meta };

    if (shouldForceMobileLiteApiMode(safeMeta)) {
        safeMeta.mobile_lite_only = true;
        safeMeta.mobile_full_geojson_blocked = true;
        safeMeta.full_url = null;
        safeMeta.ultra_lite_url = null;
    }

    return safeMeta;
}

function shouldBlockFullGeoJsonLoad(meta, level = "full") {
    if (!meta) return false;
    if (level !== "full") return false;
    if (shouldUseParcelViewportApi(meta)) return true;
    if (shouldForceMobileLiteApiMode(meta)) return true;

    const featureCount = Number(meta?.feature_count || 0);
    if (!Number.isFinite(featureCount) || featureCount <= 0) return false;

    return isMobileUA() && featureCount >= 20000 && !isPmtilesMeta(meta);
}

function getMapApiBase(meta) {
    if (!meta?.id) return null;
    return `/api/map-files/${meta.id}`;
}

function getFeatureResolvePayload(feature) {
    const props = feature?.properties || {};
    let bbox = null;
    let center = null;

    try {
        if (typeof turf !== "undefined" && feature?.geometry) {
            bbox = turf.bbox(feature);
            const c = turf.pointOnFeature(feature)?.geometry?.coordinates;
            if (Array.isArray(c) && c.length >= 2) center = c;
        }
    } catch (e) {}

    return {
        feature_uid: props.PARCEL_UID || props.parcel_uid || props.uid || props.UID || props.OBJECTID || props.FID || props.ID || props.id || null,
        properties: {
            SHBANDO: props.SHBANDO ?? null,
            SOTOCU: props.SOTOCU ?? null,
            SHTHUA: props.SHTHUA ?? null,
            TENCHU: props.TENCHU ?? null,
            KHLOAIDAT: props.KHLOAIDAT ?? null
        },
        bbox,
        center,
        geometry: feature?.geometry || null
    };
}

async function resolveFeatureViaApi(meta, feature) {
    const apiBase = getMapApiBase(meta);
    if (!apiBase) return null;

    const res = await fetch(`${apiBase}/parcel-feature-resolve`, {
        method: 'POST',
        headers: (typeof buildCsrfHeaders === 'function' ? buildCsrfHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }) : {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }),
        credentials: 'same-origin',
        body: JSON.stringify(getFeatureResolvePayload(feature))
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success || !json?.feature) {
        throw new Error(json?.message || 'Không hydrate được thửa đất từ API');
    }

    return json.feature;
}

async function previewLocalMap(file, type) {
    const frontendType = normalizeFrontendType(type);
    const sizeMb = (file?.size || 0) / 1024 / 1024;
    const quickPreview = sizeMb > (isMobileUA() ? 8 : 3);

    window.isQuickPreviewMode = quickPreview;

    if (quickPreview) {
        showToast?.("File lớn: bỏ preview local để tránh sập tab, sẽ mở bản đồ từ dữ liệu đã lưu.", "warning", 2600);
        return {
            rendered: false,
            skipped: true,
            reason: "quick-preview-disabled"
        };
    }

    try {
        const localGeojson = await parseLocalGeoJSON(file);
        const normalizedGeojson = normalizeGeoJSON(localGeojson);
        const geoMeta = (typeof buildGeoMetaFromGeoJSON === "function")
            ? buildGeoMetaFromGeoJSON(normalizedGeojson)
            : null;

        if (typeof validateGeoJSONAreaCodeLocal === "function") {
            const areaCheck = validateGeoJSONAreaCodeLocal(normalizedGeojson);
            if (!areaCheck?.ok) {
                throw new Error(areaCheck?.message || "Dữ liệu không trùng khớp mã xã đã chọn");
            }
        }

        if (geoMeta && typeof getUploadFileCacheKey === "function") {
            const cacheKey = getUploadFileCacheKey(file, type);
            window.uploadGeoMetaCache = window.uploadGeoMetaCache || {};
            window.uploadGeoMetaCache[cacheKey] = geoMeta;
        }

        renderMapByType(frontendType, normalizedGeojson);
        registerLoadedMapMeta(frontendType, {
            type: frontendType,
            full_url: null,
            lite_url: null,
            ultra_lite_url: null,
            bbox: geoMeta?.bbox || normalizedGeojson?.bbox || null,
            detected_area_code: geoMeta?.detected_area_code || null
        }, "geojson");

        window.fullLoaded = true;
        window.liteLoaded = true;
        window.ultraLoaded = true;

        return {
            rendered: true,
            skipped: false,
            reason: null,
            meta: geoMeta || null
        };
    } finally {
        setTimeout(() => {
            window.isQuickPreviewMode = false;
        }, 0);
    }
}

function removeMapByType(type) {
    const frontendType = normalizeFrontendType(type);

    const configs = {
        dc_cu: {
            source: "dc_cu",
            layers: ["dc_cu_fill", "dc_cu_line"]
        },
        dc_moi: {
            source: "dc_moi",
            layers: ["dc_moi_fill", "dc_moi_line"]
        },
        quy_hoach: {
            source: "quy_hoach",
            layers: ["quyhoach_fill", "quyhoach_line"]
        },
        canh: {
            source: "canh",
            layers: ["canh_fill", "canh_line"]
        }
    };

    const cfg = configs[frontendType];
    if (!cfg) return;

    cfg.layers.forEach(id => {
        if (map.getLayer(id)) {
            map.removeLayer(id);
        }
    });

    if (map.getSource(cfg.source)) {
        map.removeSource(cfg.source);
    }

    if (frontendType === "dc_cu") window.geo_dc_cu = null;
    if (frontendType === "dc_moi") window.geo_dc_moi = null;
    if (frontendType === "quy_hoach") window.geo_quy_hoach = null;
    if (frontendType === "canh") window.geo_canh = null;

    if (window.currentRenderModes && window.currentRenderModes[frontendType]) {
        delete window.currentRenderModes[frontendType];
    }

    if (window.loadedMapMetas && window.loadedMapMetas[frontendType]) {
        delete window.loadedMapMetas[frontendType];
    }
}

async function saveJobsSilently(jobs) {
    let successCount = 0;
    let failCount = 0;
    const failedTypes = [];
    let needReloadSavedMaps = false;

    try {
        setLoadMapButtonLoading(true, "Đang lưu nền...");

        for (const job of jobs) {
            try {
                const data = await uploadOnly(job.file, job.type);
                successCount++;
                needReloadSavedMaps = true;

                console.log("Đã lưu nền:", job.type, data);
            } catch (err) {
                failCount++;
                failedTypes.push(getTypeLabel(job.type));

                console.error("Lưu nền lỗi:", job.type, err);

                showToast?.(
                    `${getTypeLabel(job.type)} lưu thất bại: ${err.message || "Lỗi không xác định"}`,
                    "error",
                    3200
                );
            }
        }

        if (typeof loadMyAreaScopes === "function") {
            try {
                await loadMyAreaScopes();
            } catch (err) {
                console.error("loadMyAreaScopes lỗi:", err);
            }
        }

        if (
            needReloadSavedMaps &&
            document.getElementById("savedMapPanel")?.classList.contains("active")
        ) {
            try {
                loadSavedMaps(true);
            } catch (err) {
                console.error("loadSavedMaps lỗi:", err);
            }
        }

        if (successCount > 0 && failCount === 0) {
            showUploadMessage(`
                <strong>Đã hiển thị và lưu xong</strong><br>
                ${successCount} file đã được lưu vào hệ thống
            `, "success");
        } else if (successCount > 0) {
            showUploadMessage(`
                <strong>Đã hiển thị bản đồ</strong><br>
                Lưu thành công ${successCount}/${jobs.length} file.<br>
                Lỗi: ${failedTypes.join(", ")}
            `, "warning");
        } else {
            showUploadMessage(`
                <strong>Map đã hiển thị nhưng lưu thất bại</strong><br>
                ${failedTypes.join(", ") || "Không file nào được lưu vào hệ thống"}
            `, "error");
        }
    } finally {
        window.isUploadingMap = false;
        unlockLoadMapButton();
    }
}

async function loadMap() {
    if (window.isUploadingMap) {
        showUploadMessage("Hệ thống đang xử lý dữ liệu...", "warning");
        return;
    }

    if (!window.uploadPolicy?.isLogin) {
        showUploadMessage("Bạn cần đăng nhập để upload bản đồ", "warning");
        return;
    }

    if (!window.uploadPolicy?.canUploadMap) {
        showUploadMessage("Tài khoản hiện không có quyền upload. Hãy gia hạn VIP.", "error");
        return;
    }

    const provinceCode = document.getElementById("provinceSelect")?.value || "";
    const areaCode = document.getElementById("areaSelect")?.value || "";

    if (!provinceCode) {
        showUploadMessage("Bạn phải chọn Tỉnh / Thành phố", "warning");
        return;
    }

    if (!areaCode) {
        showUploadMessage("Bạn phải chọn Xã / Phường", "warning");
        return;
    }

    const dc_cu = document.getElementById("dc_cu")?.files?.[0];
    const dc_moi = document.getElementById("dc_moi")?.files?.[0];
    const quy_hoach = document.getElementById("quy_hoach")?.files?.[0];

    const jobs = [];
    if (dc_cu) jobs.push({ file: dc_cu, type: "dc_cu" });
    if (dc_moi) jobs.push({ file: dc_moi, type: "dc_moi" });
    if (quy_hoach) jobs.push({ file: quy_hoach, type: "quy_hoach" });

    if (!jobs.length) {
        showUploadMessage("Chọn ít nhất 1 file để tải lên", "warning");
        return;
    }

    window.isUploadingMap = true;
    showLoading?.();
    lockLoadMapButton();

    clearMapResolutionState();
    clearMapCache();

    let successCount = 0;

    try {
        for (const job of jobs) {
            const label = getTypeLabel(job.type);
            const sizeMb = (job.file?.size || 0) / 1024 / 1024;
            const shouldUseServerRender = isMobileUA() || sizeMb > (isMobileUA() ? 8 : 12);

            setLoadMapButtonLoading(true, `Đang lưu ${label}...`);
            const saved = await uploadOnly(job.file, job.type);
            console.log("Đã lưu xong:", saved);

            if (typeof kickOffDeferredArtifactBuild === "function" && saved && !saved.pmtiles_ready) {
                kickOffDeferredArtifactBuild(saved);
            }

            setLoadMapButtonLoading(true, `Đang hiển thị ${label}...`);

            if (shouldUseServerRender && saved?.id) {
                await viewSavedMap(saved.id, { closeSavedPanel: false, silent: true, autoSwitchPmtiles: true });
            } else {
                const previewResult = await previewLocalMap(job.file, job.type);
                if ((!previewResult || previewResult.skipped) && saved?.id) {
                    await viewSavedMap(saved.id, { closeSavedPanel: false, silent: true, autoSwitchPmtiles: true });
                }
            }

            successCount++;

            if (typeof syncMapToggles === "function") {
                syncMapToggles();
            }
        }

        hideLoading?.();

        if (typeof loadMyAreaScopes === "function") {
            try {
                await loadMyAreaScopes();
            } catch (err) {
                console.error("loadMyAreaScopes lỗi:", err);
            }
        }

        if (document.getElementById("savedMapPanel")?.classList.contains("active")) {
            try {
                loadSavedMaps(true);
            } catch (err) {
                console.error("loadSavedMaps lỗi:", err);
            }
        }

        showUploadMessage(`
            <strong>Đã lưu và hiển thị thành công</strong><br>
            ${successCount} file đã được lưu vào hệ thống
        `, "success");
    } catch (err) {
        console.error("loadMap error:", err);

        hideLoading?.();

        showUploadMessage(`
            <strong>Không thể lưu bản đồ nên không hiển thị</strong><br>
            ${err.message || "Lỗi không xác định"}
        `, "error");
    } finally {
        window.isUploadingMap = false;
        unlockLoadMapButton();
        hideLoading?.();
    }
}

/* =========================
CLICK MAP
========================= */

let marker = null;
let markerPopup = null;

map.on("click", function (e) {
    if (window.splitMode) {
        return;
    }

    let features = [];

    if (map.getLayer("dc_moi_fill")) {
        features = map.queryRenderedFeatures(e.point, {
            layers: ["dc_moi_fill"]
        });
    }

    if (features.length > 0) {
        return;
    }

    let lng = e.lngLat.lng;
    let lat = e.lngLat.lat;

    if (window.mapMode === "pin") {
        addMarker(lat, lng);
    }

    if (window.mapMode === "dt" && typeof addDTPoint === "function") {
        addDTPoint(lng, lat);
    }

    if (window.mapMode === "kc" && typeof addKCPoint === "function") {
        addKCPoint(lng, lat);
    }
});

/* =========================
DOUBLE CLICK MAP
========================= */

map.on("dblclick", function () {
    if (
        window.mapMode === "dt" &&
        typeof dtPoints !== "undefined" &&
        dtPoints.length > 2 &&
        typeof drawDT === "function"
    ) {
        dtPoints.push(dtPoints[0]);
        drawDT();
    }
});

/* =========================
OPEN GOOGLE DIRECTIONS
========================= */

function openGoogleDirections(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, "_blank");
}

/* =========================
COPY COORD
========================= */

function showCopyToast(text) {
    if (typeof showToast === "function") {
        showToast(text, "success", 1800);
        return;
    }

    alert(text);
}

function copyWGS84(lat, lng) {
    const text = `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;

    navigator.clipboard.writeText(text)
        .then(() => {
            showCopyToast("Đã copy WGS84: " + text);
        })
        .catch(() => {
            alert("Không copy được tọa độ WGS84");
        });
}

function copyVN2000(x, y) {
    if (!x || !y) {
        alert("Không có tọa độ VN2000 để copy");
        return;
    }

    const text = `${x}, ${y}`;

    navigator.clipboard.writeText(text)
        .then(() => {
            showCopyToast("Đã copy VN2000: " + text);
        })
        .catch(() => {
            alert("Không copy được tọa độ VN2000");
        });
}

/* giữ tương thích code cũ */
function copyCoordinates(lat, lng) {
    copyWGS84(lat, lng);
}

/* =========================
AUTO FILL VN2000 INPUT
========================= */

function formatVN2000ForInput(x, y) {
    if (!x || !y) return "";
    return `${x}, ${y}`;
}

function setVNInputValue(value) {
    const input = document.getElementById("vn_input");
    if (!input) return;

    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

function updateVNInputHint(x, y) {
    const input = document.getElementById("vn_input");
    if (!input) return;

    input.placeholder = `Gợi ý: X,Y (vd: ${x}, ${y})`;
}

function autoFillVN2000ToInput(x, y) {
    const value = formatVN2000ForInput(x, y);
    if (!value) return;

    setVNInputValue(value);
    updateVNInputHint(x, y);
}

/* =========================
ADD MARKER
========================= */

function addMarker(lat, lng) {
    if (marker) {
        marker.remove();
        marker = null;
    }

    if (markerPopup) {
        markerPopup.remove();
        markerPopup = null;
    }

    let el = document.createElement("div");
    el.className = "marker";

    marker = new maplibregl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);

    window.marker = marker;

    markerPopup = new maplibregl.Popup({
        offset: 28,
        closeOnClick: false
    })
        .setLngLat([lng, lat])
        .setHTML(`
            <div class="gm-popup">
                <div class="gm-popup-head">📍 Vị trí đã ghim</div>
                <div class="gm-popup-loading">Đang lấy thông tin vị trí...</div>
            </div>
        `)
        .addTo(map);

    window.markerPopup = markerPopup;

    getAddress(lat, lng);
}

/* =========================
GET ADDRESS + VN2000
========================= */

function getAddress(lat, lng) {
    fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lng)
        .then(res => res.json())
        .then(data => {
            let address = data.display_name || "Không rõ địa chỉ";

            if (typeof syncVN2000FromLoadedMeta === "function") {
                syncVN2000FromLoadedMeta();
            }

            let vnX = "";
            let vnY = "";

            if (typeof proj4 !== "undefined" && typeof currentKTT !== "undefined") {
                let result = proj4(
                    proj4.defs("EPSG:4326"),
                    proj4.defs("VN2000_Current"),
                    [lng, lat]
                );

                vnX = result[1].toFixed(3);
                vnY = result[0].toFixed(3);

                autoFillVN2000ToInput(vnX, vnY);
            }

            let html = `
                <div class="gm-popup">
                    <div class="gm-popup-head">📍 Vị trí đã ghim</div>
                    <div class="gm-popup-body">
                        <div class="gm-popup-row">
                            <span class="gm-popup-label">Địa chỉ:</span><br>
                            ${address}
                        </div>

                        <div class="gm-popup-row">
                            <span class="gm-popup-label">WGS84:</span><br>
                            <span class="gm-popup-coord">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
                        </div>

                        <div class="gm-popup-row">
                            <span class="gm-popup-label">VN2000:</span><br>
                            <span class="gm-popup-coord">${vnX}, ${vnY}</span>
                        </div>

                        <div class="gm-popup-actions">
                            <button class="gm-popup-btn primary" onclick="openGoogleDirections(${lat}, ${lng})">
                                🧭 Chỉ đường
                            </button>
                            <button class="gm-popup-btn gray" onclick="copyWGS84(${lat}, ${lng})">
                                📋 Copy WGS84
                            </button>
                            <button class="gm-popup-btn gray" onclick="copyVN2000('${vnX}', '${vnY}')">
                                📐 Copy VN2000
                            </button>
                        </div>
                    </div>
                </div>
            `;

            if (markerPopup) {
                markerPopup.setHTML(html);
            }

            const pin = document.getElementById("pinContent");
            if (pin) {
                pin.innerHTML = `
                    <div>🏠 ${address}</div>
                    <div>🌍 WGS84: ${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
                    <div>📐 VN2000: ${vnX}, ${vnY}</div>
                `;
            }
        })
        .catch(err => {
            console.error("Lỗi lấy địa chỉ:", err);

            if (markerPopup) {
                markerPopup.setHTML(`
                    <div class="gm-popup">
                        <div class="gm-popup-head">📍 Vị trí đã ghim</div>
                        <div class="gm-popup-body">
                            <div class="gm-popup-row">
                                <span class="gm-popup-label">WGS84:</span><br>
                                <span class="gm-popup-coord">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
                            </div>

                            <div class="gm-popup-actions">
                                <button class="gm-popup-btn primary" onclick="openGoogleDirections(${lat}, ${lng})">
                                    🧭 Chỉ đường
                                </button>
                                <button class="gm-popup-btn gray" onclick="copyWGS84(${lat}, ${lng})">
                                    📋 Copy WGS84
                                </button>
                            </div>

                            <div class="gm-popup-row" style="margin-top:10px;">
                                Không lấy được địa chỉ.
                            </div>
                        </div>
                    </div>
                `);
            }
        });
}

/* =========================
USER LOCATION
========================= */

let userLocationMarker = null;
let userLocationWatchId = null;
let userLocationHasCentered = false;

window.userLocationMarker = window.userLocationMarker || null;

function saveLastUserLocation(lat, lng) {
    try {
        localStorage.setItem("tdmap_last_user_location", JSON.stringify({
            lat: Number(lat),
            lng: Number(lng),
            updated_at: Date.now()
        }));
    } catch (e) {
        console.warn("Không lưu được vị trí gần nhất:", e);
    }
}

function ensureUserLocationStyles() {
    if (document.getElementById("userLocationMarkerStyle")) return;

    const style = document.createElement("style");
    style.id = "userLocationMarkerStyle";
    style.textContent = `
        .user-location-marker{
            position: relative;
            width: 24px;
            height: 24px;
            pointer-events: none;
        }
        .user-location-marker .pulse{
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: rgba(33, 150, 243, 0.22);
            animation: tdmap-user-pulse 1.8s ease-out infinite;
        }
        .user-location-marker .dot{
            position: absolute;
            left: 50%;
            top: 50%;
            width: 14px;
            height: 14px;
            margin-left: -7px;
            margin-top: -7px;
            border-radius: 50%;
            background: #1e88e5;
            border: 3px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.28);
        }
        @keyframes tdmap-user-pulse{
            0%{ transform: scale(0.65); opacity: 1; }
            100%{ transform: scale(1.9); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

function createUserLocationElement() {
    ensureUserLocationStyles();

    const el = document.createElement("div");
    el.className = "user-location-marker";
    el.innerHTML = `<span class="pulse"></span><span class="dot"></span>`;
    return el;
}

function updateUserLocationMarker(lat, lng, options = {}) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;

    if (!userLocationMarker) {
        userLocationMarker = new maplibregl.Marker({
            element: createUserLocationElement(),
            anchor: "center"
        })
            .setLngLat([lng, lat])
            .addTo(map);

        window.userLocationMarker = userLocationMarker;
    } else {
        userLocationMarker.setLngLat([lng, lat]);
    }

    saveLastUserLocation(lat, lng);

    const shouldCenter = !!options.center;
    const zoom = Number.isFinite(Number(options.zoom)) ? Number(options.zoom) : 18;

    if (shouldCenter) {
        map.easeTo({
            center: [lng, lat],
            zoom: Math.max(map.getZoom() || 0, zoom),
            duration: Number.isFinite(Number(options.duration)) ? Number(options.duration) : 800
        });
        userLocationHasCentered = true;
    }
}

function startUserLocationWatch() {
    if (!navigator.geolocation || userLocationWatchId !== null) return;

    userLocationWatchId = navigator.geolocation.watchPosition(function (pos) {
        const lat = Number(pos?.coords?.latitude);
        const lng = Number(pos?.coords?.longitude);

        updateUserLocationMarker(lat, lng, {
            center: false
        });
    }, function (err) {
        console.warn("Theo dõi vị trí thất bại:", err);
    }, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
    });
}

function stopUserLocationWatch() {
    if (!navigator.geolocation || userLocationWatchId === null) return;

    navigator.geolocation.clearWatch(userLocationWatchId);
    userLocationWatchId = null;
}

function locateUserPosition(options = {}) {
    const silent = !!options.silent;
    const shouldCenter = options.center !== false;
    const zoom = Number.isFinite(Number(options.zoom)) ? Number(options.zoom) : 18;
    const duration = Number.isFinite(Number(options.duration)) ? Number(options.duration) : 800;
    const watch = options.watch !== false;

    if (!navigator.geolocation) {
        if (!silent) alert("Trình duyệt không hỗ trợ GPS");
        return;
    }

    navigator.geolocation.getCurrentPosition(function (pos) {
        const lat = Number(pos?.coords?.latitude);
        const lng = Number(pos?.coords?.longitude);

        updateUserLocationMarker(lat, lng, {
            center: shouldCenter,
            zoom: zoom,
            duration: duration
        });

        if (watch) {
            startUserLocationWatch();
        }
    }, function (err) {
        console.warn("Không lấy được vị trí hiện tại:", err);

        if (!silent) {
            if (err?.code === 1) {
                alert("Bạn chưa cấp quyền vị trí cho trình duyệt");
            } else {
                alert("Không lấy được vị trí");
            }
        }
    }, {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000
    });
}

function autoLocateOnPageOpen() {
    locateUserPosition({
        center: !userLocationHasCentered,
        zoom: 18,
        duration: 900,
        silent: true,
        watch: true
    });
}

map.on("load", function () {
    setTimeout(autoLocateOnPageOpen, 250);
});

window.addEventListener("beforeunload", stopUserLocationWatch);

/* =========================
PANEL
========================= */

function openPanel() {
    document.getElementById("locationPanel")?.classList.add("active");
}

function closePanel() {
    document.getElementById("locationPanel")?.classList.remove("active");

    const pin = document.getElementById("pinContent");
    if (pin) pin.innerHTML = "";
}

/* =========================
GPS
========================= */

function locateMe() {
    locateUserPosition({
        center: true,
        zoom: 18,
        duration: 800,
        silent: false,
        watch: true
    });
}

function startGPS() {
    locateMe();
}

/* =========================
RELOAD MAP
========================= */

function reloadMap() {
    location.reload();
}

/* =========================
CLEAR MARKER
========================= */

function clearMarker() {
    if (marker) {
        marker.remove();
        marker = null;
    }

    if (markerPopup) {
        markerPopup.remove();
        markerPopup = null;
    }

    window.marker = null;
    window.markerPopup = null;

    const pin = document.getElementById("pinContent");
    if (pin) pin.innerHTML = "";

    const vnInput = document.getElementById("vn_input");
    if (vnInput) {
        vnInput.value = "";
        vnInput.placeholder = "Gợi ý: nhập X,Y hoặc dán từ ghim bản đồ";
    }
}

/* =========================
POPUP LAYER
========================= */

function togglePopup() {
    let popup = document.getElementById("mapLayerPopup");
    if (!popup) return;

    popup.style.display = popup.style.display === "block" ? "none" : "block";
}

function closePopup() {
    let popup = document.getElementById("mapLayerPopup");
    if (popup) popup.style.display = "none";
}

/* =========================
MODE SWITCH
========================= */

function startPin() {
    window.mapMode = "pin";
}

function startKC() {
    window.mapMode = "kc";
}

function startDT() {
    window.mapMode = "dt";
}

/* =========================
BẢN ĐỒ ĐÃ LƯU
========================= */

function toggleSavedMaps(force) {
    const panel = document.getElementById("savedMapPanel");
    const backdrop = document.getElementById("savedMapBackdrop");
    if (!panel) return;

    const willOpen = typeof force === "boolean"
        ? force
        : !panel.classList.contains("active");

    panel.classList.toggle("active", willOpen);
    if (backdrop) backdrop.classList.toggle("active", willOpen);

    if (willOpen) {
        loadSavedMaps();
    }
}

function normalizeMapType(type) {
    const mapTypes = {
        dcmoi: "dc_moi",
        dccu: "dc_cu",
        quyhoach: "quy_hoach",
        dc_moi: "dc_moi",
        dc_cu: "dc_cu",
        quy_hoach: "quy_hoach",
        canh: "canh"
    };

    return mapTypes[String(type || "").trim().toLowerCase()] || String(type || "").trim().toLowerCase();
}

function renderMapByType(type, geojson) {
    if (!geojson) return;

    const normalized = normalizeMapType(type);

    if (normalized === "dc_cu") {
        window.geo_dc_cu = geojson;
        registerLoadedMapMeta(normalized, window.currentMapMeta || { type: normalized, bbox: geojson?.bbox || null }, "geojson");
        window.currentRenderModes[normalized] = "geojson";
        if (typeof loadDcCu === "function") loadDcCu(geojson);
        return;
    }

    if (normalized === "dc_moi") {
        window.geo_dc_moi = geojson;
        registerLoadedMapMeta(normalized, window.currentMapMeta || { type: normalized, bbox: geojson?.bbox || null }, "geojson");
        window.currentRenderModes[normalized] = "geojson";
        if (typeof loadDcMoi === "function") loadDcMoi(geojson);
        return;
    }

    if (normalized === "quy_hoach") {
        window.geo_quy_hoach = geojson;
        registerLoadedMapMeta(normalized, window.currentMapMeta || { type: normalized, bbox: geojson?.bbox || null }, "geojson");
        window.currentRenderModes[normalized] = "geojson";
        if (typeof loadQuyHoach === "function") loadQuyHoach(geojson);
        return;
    }

    if (normalized === "canh") {
        window.geo_canh = geojson;
        if (typeof loadCanh === "function") loadCanh(geojson);
        return;
    }

    throw new Error("Không tìm thấy hàm xử lý loại bản đồ: " + type);
}

function getTypeIcon(type) {
    const t = normalizeMapType(type);
    if (t === "dc_cu") return "🟥";
    if (t === "quy_hoach") return "🟪";
    if (t === "dc_moi") return "🟨";
    return "🗺️";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function buildGroupHTML(title, files) {
    if (!files.length) return "";

    const cards = files.map(file => `
        <div class="gm-map-card" onclick="viewSavedMap(${file.id})">
            <div class="gm-thumb">${getTypeIcon(file.type)}</div>
            <div class="gm-map-name">${escapeHtml(file.file_name)}</div>
            <div class="gm-map-meta">
                <div>${escapeHtml(file.province_name || "")}</div>
                <div>${escapeHtml(file.area_name || "")}${file.area_level ? " (" + escapeHtml(file.area_level) + ")" : ""}</div>
                <div>${formatFileSize(file.file_size)}</div>
            </div>
            <div class="gm-card-actions">
                <button class="gm-delete-btn" onclick="event.stopPropagation(); deleteSavedMap(${file.id})">
                    Xóa
                </button>
            </div>
        </div>
    `).join("");

    return `
        <div class="gm-group">
            <div class="gm-group-title">${title}</div>
            <div class="gm-scroll-row">
                ${cards}
            </div>
        </div>
    `;
}

function fillSavedAreaFilter(data) {
    const select = document.getElementById("savedAreaFilter");
    if (!select) return;

    const selected = select.value || "";
    const scopes = Array.isArray(data.area_scopes) ? data.area_scopes : [];

    select.innerHTML = `<option value="">-- Chọn xã/phường đã đăng ký --</option>`;

    scopes.forEach(scope => {
        const opt = document.createElement("option");
        opt.value = scope.area_code;
        opt.textContent = `${scope.area_name} (${scope.area_level || "Địa bàn"}) - ${scope.province_name}`;
        if (String(selected) === String(scope.area_code)) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });

    if (!selected && scopes.length > 0) {
        select.value = scopes[0].area_code;
    }
}

function renderSavedMapsFromCache() {
    const list = document.getElementById("savedMapList");
    const select = document.getElementById("savedAreaFilter");
    const data = window.savedMapsCache;

    if (!list || !data) return;

    const selectedAreaCode = select?.value || "";
    const files = Array.isArray(data.files) ? data.files : [];

    let filteredFiles = files;

    if (selectedAreaCode) {
        filteredFiles = files.filter(file => String(file.area_code) === String(selectedAreaCode));
    }

    if (!filteredFiles.length) {
        list.innerHTML = `<div class="saved-map-empty">Địa bàn này chưa có file nào</div>`;
        return;
    }
 const dcMoi = filteredFiles.filter(f => normalizeMapType(f.type) === "dc_moi");
    const dcCu = filteredFiles.filter(f => normalizeMapType(f.type) === "dc_cu");
    const qh = filteredFiles.filter(f => normalizeMapType(f.type) === "quy_hoach");
   

    list.innerHTML =
     buildGroupHTML("ĐC mới", dcMoi)+
        buildGroupHTML("ĐC cũ", dcCu) +
        buildGroupHTML("QH", qh);
       
}

function loadSavedMaps(forceReload = false) {
    const list = document.getElementById("savedMapList");
    if (!list) return;

    if (!forceReload && window.savedMapsCache) {
        fillSavedAreaFilter(window.savedMapsCache);
        renderSavedMapsFromCache();
        return;
    }

    list.innerHTML = `<div class="saved-map-empty">Đang tải dữ liệu...</div>`;

    fetch("/my-files-json", {
        headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "same-origin"
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                list.innerHTML = `<div class="saved-map-empty">Không tải được dữ liệu</div>`;
                return;
            }

            window.savedMapsCache = data;
            fillSavedAreaFilter(data);
            renderSavedMapsFromCache();
        })
        .catch(err => {
            console.error("Lỗi loadSavedMaps:", err);
            list.innerHTML = `<div class="saved-map-empty">Không tải được danh sách file</div>`;
        });
}

async function deleteSavedMap(id) {
    const csrf = typeof getCsrfToken === 'function' ? getCsrfToken() : (document.querySelector('meta[name="csrf-token"]')?.content || '');

    if (!confirm("Bạn có chắc muốn xóa file này không?")) {
        return;
    }

    try {
        const res = await fetch(`/map-files/${id}`, {
            method: "DELETE",
            headers: (typeof buildCsrfHeaders === "function" ? buildCsrfHeaders({
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }) : {
                "X-CSRF-TOKEN": csrf,
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }),
            credentials: "same-origin"
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || "Xóa file thất bại");
        }

        showUploadMessage(`
            <strong>Đã xóa file</strong><br>
            ${data.message}
        `, "success");

        loadSavedMaps(true);
    } catch (err) {
        console.error("deleteSavedMap error:", err);
        showUploadMessage(`
            <strong>Xóa thất bại</strong><br>
            ${err.message || "Lỗi không xác định"}
        `, "error");
    }
}

async function fetchGeoJSONCached(url, level = "full") {
    if (!url) return null;

    if (!window.mapCache[level]) {
        window.mapCache[level] = {};
    }

    if (!window.mapCachePending[level]) {
        window.mapCachePending[level] = {};
    }

    if (window.mapCache[level][url]) {
        return window.mapCache[level][url];
    }

    if (window.mapCachePending[level][url]) {
        return window.mapCachePending[level][url];
    }

    window.mapCachePending[level][url] = fetch(url, {
        headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "same-origin",
        cache: "default"
    })
        .then(async (res) => {
            const text = await res.text();

            if (!res.ok) {
                throw new Error(`Không tải được dữ liệu bản đồ (HTTP ${res.status})`);
            }

            let data = null;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("GeoJSON lỗi tại URL:", url);
                console.error("Response:", text);
                throw new Error("File bản đồ không phải JSON hợp lệ");
            }

            if (!data || data.type !== "FeatureCollection") {
                console.warn("GeoJSON không chuẩn FeatureCollection:", data);
            }

            if (isMobileUA() && level !== "ultra") {
                window.mapCache[level] = { [url]: data };
            } else {
                window.mapCache[level][url] = data;
            }
            return data;
        })
        .finally(() => {
            delete window.mapCachePending[level][url];
        });

    return window.mapCachePending[level][url];
}

async function viewSavedMap(id, options = {}) {
    if (!id) throw new Error("Không tìm thấy ID bản đồ");
    if (window.__viewSavedMapLoadingIds?.has(id)) {
        return null;
    }
    window.__viewSavedMapLoadingIds?.add(id);
    window.__viewSavedMapLastId = id;

    const loading = document.getElementById("loading");
    if (loading) loading.style.display = "flex";

    const closeSavedPanel = options.closeSavedPanel !== false;
    const silent = !!options.silent;

    try {
        const res = await fetch(`/map-files/${id}/json`, {
            headers: {
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            credentials: "same-origin"
        });

        const text = await res.text();
        let meta = null;

        try {
            meta = JSON.parse(text);
        } catch (e) {
            console.error("Response không phải JSON:", text);
            throw new Error("Server trả dữ liệu không hợp lệ");
        }

        meta = sanitizeMapMetaForRuntime(meta);

        if (!meta.success) {
            throw new Error(meta.message || "Không đọc được file");
        }

        const type = normalizeMapType(meta.type);
        const shouldAutoSwitchPmtiles = options.autoSwitchPmtiles !== false;
        if (!options.fromPmtilesPoll && String(window.__pmtilesPreviewActiveId || "") && String(window.__pmtilesPreviewActiveId || "") !== String(id)) {
            stopPmtilesReadyPolling(window.__pmtilesPreviewActiveId);
        }

        window.currentMapMeta = meta;
        registerLoadedMapMeta(type, meta, isPmtilesMeta(meta) ? "pmtiles" : "geojson");

        const metaKey = getMapResolutionMetaKey(meta);
        if (!window.mapResolutionState || window.mapResolutionState.metaKey !== metaKey) {
            window.mapResolutionState = {
                loading: false,
                currentLevel: null,
                pendingLevel: null,
                metaKey
            };
        }

        window.fullLoaded = false;
        window.liteLoaded = false;
        window.ultraLoaded = false;

        if (isPmtilesMeta(meta)) {
            stopPmtilesReadyPolling(id);
            window.__pmtilesPreviewActiveId = null;
            await ensurePmtilesProtocolReady(meta);

            const rawUrl = getPmtilesRawUrl(meta);
            const sourceLayer = meta.source_layer || getDefaultSourceLayerForType(type);

            if (!rawUrl) {
                throw new Error("Không tìm thấy URL PMTiles");
            }

            if (type === "dc_moi") {
                if (typeof loadDcMoiPmtiles !== "function") {
                    throw new Error("Thiếu hàm loadDcMoiPmtiles");
                }
                loadDcMoiPmtiles(rawUrl, sourceLayer, meta);
            } else if (type === "dc_cu") {
                if (typeof loadDcCuPmtiles !== "function") {
                    throw new Error("Thiếu hàm loadDcCuPmtiles");
                }
                loadDcCuPmtiles(rawUrl, sourceLayer, meta);
            } else if (type === "quy_hoach") {
                if (typeof loadQuyHoachPmtiles !== "function") {
                    throw new Error("Thiếu hàm loadQuyHoachPmtiles");
                }
                loadQuyHoachPmtiles(rawUrl, sourceLayer, meta);
            } else {
                throw new Error("Loại bản đồ chưa hỗ trợ PMTiles: " + type);
            }

            markLoadedFlags("full");
            setCurrentMapResolutionLevel(meta, "pmtiles");
        } else {
            const picked = chooseInitialMapSource(meta);

            if (picked?.level === "viewport_api") {
                if (type === "dc_moi") {
                    if (typeof loadDcMoiViewportApi !== "function") {
                        throw new Error("Thiếu hàm loadDcMoiViewportApi");
                    }
                    await loadDcMoiViewportApi(meta);
                } else if (type === "dc_cu") {
                    if (typeof loadDcCuViewportApi !== "function") {
                        throw new Error("Thiếu hàm loadDcCuViewportApi");
                    }
                    await loadDcCuViewportApi(meta);
                } else {
                    throw new Error("Viewport API hiện chỉ hỗ trợ địa chính");
                }

                markLoadedFlags("viewport_api");
                setCurrentMapResolutionLevel(meta, "viewport_api");
            } else if (!picked.url) {
                if (shouldBlockFullGeoJsonLoad(meta, "full")) {
                    throw new Error("Dữ liệu quá lớn cho điện thoại và chưa có file PMTiles/lite an toàn để mở.");
                }
                throw new Error("Không tìm thấy URL dữ liệu phù hợp");
            }

            if (picked?.level !== "viewport_api") {
                const geojson = await fetchGeoJSONCached(picked.url, picked.level);
                renderMapByType(type, geojson);
                markLoadedFlags(picked.level);
                setCurrentMapResolutionLevel(meta, picked.level);
            }

            if (shouldAutoSwitchPmtiles && meta?.id && picked?.level !== "viewport_api") {
                window.__pmtilesPreviewActiveId = id;
                setPmtilesWaitingStatus(meta);
                startSavedMapPmtilesPolling(id, {
                    intervalMs: isMobileUA() ? 7000 : 3500,
                    maxAttempts: isMobileUA() ? 180 : 90
                });
            }
        }

        if (typeof syncMapToggles === "function") {
            syncMapToggles();
        }

        if (closeSavedPanel) {
            toggleSavedMaps(false);
        }

        if (meta.bbox && meta.bbox.length === 4) {
            focusMapNearBbox(meta.bbox, { zoom: 17 });
        }
    } catch (err) {
        if (isViewportAbortLikeError(err)) {
            return false;
        }
        console.error("Lỗi viewSavedMap:", err);
        if (!silent) {
            alert(err?.message || String(err) || "Lỗi khi load file từ database");
        }
        throw err;
    } finally {
        if (loading) loading.style.display = "none";
        window.__viewSavedMapLoadingIds?.delete(id);
    }
}

async function updateMapResolutionByZoom() {
    if (!window.currentMapMeta) return;
    if (isPmtilesMeta(window.currentMapMeta)) return;

    const meta = sanitizeMapMetaForRuntime(window.currentMapMeta);
    const type = normalizeMapType(meta.type);
    const desired = chooseInitialMapSource(meta);
    const metaKey = getMapResolutionMetaKey(meta);

    if (!window.mapResolutionState) {
        window.mapResolutionState = {
            loading: false,
            currentLevel: null,
            pendingLevel: null,
            metaKey
        };
    }

    if (window.mapResolutionState.metaKey !== metaKey) {
        window.mapResolutionState.loading = false;
        window.mapResolutionState.currentLevel = null;
        window.mapResolutionState.pendingLevel = null;
        window.mapResolutionState.metaKey = metaKey;
    }

    if (!desired?.level) {
        return;
    }

    const currentLevel = window.mapResolutionState.currentLevel
        || (window.fullLoaded ? "full" : (window.liteLoaded ? "lite" : (window.ultraLoaded ? "ultra" : null)));

    if (currentLevel === desired.level) {
        return;
    }

    if (window.mapResolutionState.loading) {
        window.mapResolutionState.pendingLevel = desired.level;
        return;
    }

    window.mapResolutionState.loading = true;

    try {
        if (desired.level === "viewport_api") {
            if (type === "dc_moi" && typeof refreshDcMoiViewportApi === "function") {
                await refreshDcMoiViewportApi(true);
            } else if (type === "dc_cu" && typeof refreshDcCuViewportApi === "function") {
                await refreshDcCuViewportApi(true);
            }
            markLoadedFlags(desired.level);
            setCurrentMapResolutionLevel(meta, desired.level);
        } else {
            const geojson = await fetchGeoJSONCached(desired.url, desired.level);
            renderMapByType(type, geojson);
            markLoadedFlags(desired.level);
            setCurrentMapResolutionLevel(meta, desired.level);
        }
    } catch (e) {
        if (!isViewportAbortLikeError(e)) {
            console.error("Lỗi updateMapResolutionByZoom:", e);
        }
    } finally {
        const pendingLevel = window.mapResolutionState.pendingLevel;
        window.mapResolutionState.loading = false;
        window.mapResolutionState.pendingLevel = null;

        if (pendingLevel && pendingLevel !== window.mapResolutionState.currentLevel) {
            setTimeout(() => {
                updateMapResolutionByZoom();
            }, 0);
        }
    }
}

async function ensureFullMapLoaded() {
    if (!window.currentMapMeta || window.fullLoaded) return;
    if (isPmtilesMeta(window.currentMapMeta)) return;
    if (shouldForceMobileLiteApiMode(window.currentMapMeta)) return;

    try {
        if (shouldBlockFullGeoJsonLoad(window.currentMapMeta, "full")) return;
        const type = normalizeMapType(window.currentMapMeta.type);
        const fullGeojson = await fetchGeoJSONCached(window.currentMapMeta.full_url, "full");
        renderMapByType(type, fullGeojson);
        window.fullLoaded = true;
        window.liteLoaded = true;
        window.ultraLoaded = true;
        setCurrentMapResolutionLevel(window.currentMapMeta, "full");
    } catch (e) {
        console.error("Lỗi ensureFullMapLoaded:", e);
    }
}

map.on("zoomend", updateMapResolutionByZoom);

function collectCoordinates(geometry, bounds) {
    if (!geometry || !bounds) return;

    const type = geometry.type;
    const coordinates = geometry.coordinates;

    if (!type || !coordinates) return;

    if (type === "Point") {
        bounds.extend(coordinates);
        return;
    }

    if (type === "MultiPoint" || type === "LineString") {
        coordinates.forEach(coord => bounds.extend(coord));
        return;
    }

    if (type === "MultiLineString" || type === "Polygon") {
        coordinates.forEach(part => {
            part.forEach(coord => bounds.extend(coord));
        });
        return;
    }

    if (type === "MultiPolygon") {
        coordinates.forEach(polygon => {
            polygon.forEach(ring => {
                ring.forEach(coord => bounds.extend(coord));
            });
        });
    }
}

function syncMapToggles() {
    const dcMoi = document.getElementById("toggle_dc_moi");
    const dcCu = document.getElementById("toggle_dc_cu");
    const qh = document.getElementById("toggle_qh");
    const canh = document.getElementById("toggle_canh");

    if (dcMoi) dcMoi.checked = true;
    if (dcCu) dcCu.checked = true;
    if (qh) qh.checked = true;

    if (canh) {
        canh.checked = typeof window.canhVisible !== "undefined"
            ? window.canhVisible
            : true;
    }
}

function formatFileSize(bytes) {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/* =========================
TOGGLE HIỆN / ẨN LAYER
========================= */

function toggleMapGroup(type) {
    if (type === "dc_moi") {
        setLayerVisibility(
            ["dc_moi_fill", "dc_moi_line"],
            document.getElementById("toggle_dc_moi")?.checked ?? true
        );
    }

    if (type === "dc_cu") {
        setLayerVisibility(
            ["dc_cu_fill", "dc_cu_line"],
            document.getElementById("toggle_dc_cu")?.checked ?? true
        );
    }

    if (type === "quy_hoach") {
        setLayerVisibility(
            ["quyhoach_fill", "quyhoach_line"],
            document.getElementById("toggle_qh")?.checked ?? true
        );
    }

    if (type === "canh") {
        if (typeof toggleCanhVisibility === "function") {
            toggleCanhVisibility(
                document.getElementById("toggle_canh")?.checked ?? true
            );
        }
    }
}

/* =========================
SET VISIBILITY
========================= */

function setLayerVisibility(layerIds, isVisible) {
    layerIds.forEach(function (id) {
        if (map.getLayer(id)) {
            map.setLayoutProperty(
                id,
                "visibility",
                isVisible ? "visible" : "none"
            );
        } else {
            console.warn("Layer không tồn tại:", id);
        }
    });
}

function chooseInitialMapSource(meta) {
    meta = sanitizeMapMetaForRuntime(meta);
    const type = normalizeMapType(meta.type);
    const z = map.getZoom();
    const heavyMobile = isHeavyMobileMap(meta);
    const featureCount = Number(meta?.feature_count || 0);
    const mobile = isMobileUA();
    const isParcelLayer = type === "dc_cu" || type === "dc_moi";
    const extremeMobile = mobile && Number.isFinite(featureCount) && featureCount >= (type === "quy_hoach" ? 90000 : 120000);

    if (isParcelLayer) {
        if (shouldUseParcelViewportApi(meta)) {
            return { url: meta?.api_urls?.parcel_viewport_features || null, level: "viewport_api" };
        }

        if (mobile) {
            if (z >= 17 && meta.full_url && featureCount <= 12000 && !shouldBlockFullGeoJsonLoad(meta, "full")) {
                return { url: meta.full_url, level: "full" };
            }
            if (meta.lite_url) {
                return { url: meta.lite_url, level: "lite" };
            }
            if (meta.full_url && featureCount <= 8000 && !shouldBlockFullGeoJsonLoad(meta, "full")) {
                return { url: meta.full_url, level: "full" };
            }
            if (meta.ultra_lite_url) {
                return { url: meta.ultra_lite_url, level: "ultra" };
            }
            return { url: null, level: null };
        }

        if (z >= 17 && meta.full_url && !shouldBlockFullGeoJsonLoad(meta, "full")) {
            return { url: meta.full_url, level: "full" };
        }
        if (meta.lite_url) {
            return { url: meta.lite_url, level: "lite" };
        }
        if (meta.ultra_lite_url) {
            return { url: meta.ultra_lite_url, level: "ultra" };
        }
        if (meta.full_url && !shouldBlockFullGeoJsonLoad(meta, "full")) {
            return { url: meta.full_url, level: "full" };
        }
        return { url: null, level: null };
    }

    if (heavyMobile || shouldForceMobileLiteApiMode(meta)) {
        if (mobile) {
            if (meta.lite_url) return { url: meta.lite_url, level: "lite" };
            if (extremeMobile && meta.ultra_lite_url) return { url: meta.ultra_lite_url, level: "ultra" };
            if (meta.ultra_lite_url) return { url: meta.ultra_lite_url, level: "ultra" };
            if (meta.full_url && Number(meta?.feature_count || 0) <= 15000 && !shouldBlockFullGeoJsonLoad(meta, "full")) {
                return { url: meta.full_url, level: "full" };
            }
            return { url: null, level: null };
        }

        if (meta.ultra_lite_url) return { url: meta.ultra_lite_url, level: "ultra" };
        if (meta.lite_url) return { url: meta.lite_url, level: "lite" };
        if (meta.full_url && Number(meta?.feature_count || 0) <= 15000) return { url: meta.full_url, level: "full" };
        return { url: null, level: null };
    }

    if (type === "quy_hoach") {
        if (z >= 17 && meta.full_url && !shouldBlockFullGeoJsonLoad(meta, "full")) {
            return { url: meta.full_url, level: "full" };
        }
        if (z >= 14 && meta.lite_url) {
            return { url: meta.lite_url, level: "lite" };
        }
        if (mobile && meta.lite_url) {
            return { url: meta.lite_url, level: "lite" };
        }
        if (meta.ultra_lite_url) {
            return { url: meta.ultra_lite_url, level: "ultra" };
        }
        if (meta.lite_url) {
            return { url: meta.lite_url, level: "lite" };
        }
        if (meta.full_url && !shouldBlockFullGeoJsonLoad(meta, "full")) {
            return { url: meta.full_url, level: "full" };
        }
        return { url: null, level: null };
    }

    if (z >= 17 && meta.full_url && !shouldBlockFullGeoJsonLoad(meta, "full")) {
        return { url: meta.full_url, level: "full" };
    }

    if (z >= 15 && meta.lite_url) {
        return { url: meta.lite_url, level: "lite" };
    }

    if (mobile && meta.lite_url) {
        return { url: meta.lite_url, level: "lite" };
    }

    if (meta.ultra_lite_url) {
        return { url: meta.ultra_lite_url, level: "ultra" };
    }

    if (meta.lite_url) {
        return { url: meta.lite_url, level: "lite" };
    }

    if (meta.full_url && !shouldBlockFullGeoJsonLoad(meta, "full")) {
        return { url: meta.full_url, level: "full" };
    }

    return { url: null, level: null };
}

function markLoadedFlags(level) {
    window.fullLoaded = level === "full";
    window.liteLoaded = level === "full" || level === "lite";
    window.ultraLoaded = level === "full" || level === "lite" || level === "ultra";
}

function setLoadMapButtonLoading(isLoading, text = "Load Map") {
    const btn = document.getElementById("loadMapBtn");
    if (!btn) return;

    const textEl = btn.querySelector(".load-btn-text");

    btn.disabled = isLoading;
    btn.classList.toggle("is-loading", isLoading);

    if (textEl) {
        textEl.textContent = text;
    }
}

function lockLoadMapButton() {
    setLoadMapButtonLoading(true, "Đang tải...");
}

function unlockLoadMapButton() {
    setLoadMapButtonLoading(false, "Load Map");
}