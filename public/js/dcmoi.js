/* =========================
LOAD ĐỊA CHÍNH MỚI (MapLibre)
========================= */

/* =========================
HELPERS
========================= */

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function isValidDcMoiNumber(value) {
    return Number.isFinite(Number(value));
}

function isValidDcMoiCoord(coord) {
    return Array.isArray(coord) &&
        coord.length >= 2 &&
        isValidDcMoiNumber(coord[0]) &&
        isValidDcMoiNumber(coord[1]);
}

function sameDcMoiCoord(a, b) {
    return isValidDcMoiCoord(a) &&
        isValidDcMoiCoord(b) &&
        Number(a[0]) === Number(b[0]) &&
        Number(a[1]) === Number(b[1]);
}

function closeDcMoiRing(ring) {
    if (!Array.isArray(ring)) return null;

    const cleanRing = ring
        .filter(isValidDcMoiCoord)
        .map(coord => [Number(coord[0]), Number(coord[1])]);

    if (cleanRing.length < 3) return null;

    if (!sameDcMoiCoord(cleanRing[0], cleanRing[cleanRing.length - 1])) {
        cleanRing.push([...cleanRing[0]]);
    }

    if (cleanRing.length < 4) return null;

    return cleanRing;
}

function getLargestDcMoiRingIndex(rings) {
    if (!Array.isArray(rings) || !rings.length) return 0;

    let maxIndex = 0;
    let maxLength = 0;

    rings.forEach((ring, index) => {
        const len = Array.isArray(ring) ? ring.length : 0;
        if (len > maxLength) {
            maxLength = len;
            maxIndex = index;
        }
    });

    return maxIndex;
}

function normalizeDcMoiPolygonCoords(coords) {
    if (!Array.isArray(coords) || !coords.length) return null;

    const rings = coords
        .map(closeDcMoiRing)
        .filter(Boolean);

    if (!rings.length) return null;

    const largestRingIndex = getLargestDcMoiRingIndex(rings);
    if (largestRingIndex > 0) {
        const outerRing = rings[largestRingIndex];
        rings.splice(largestRingIndex, 1);
        rings.unshift(outerRing);
    }

    return rings;
}

function normalizeDcMoiMultiPolygonCoords(coords) {
    if (!Array.isArray(coords) || !coords.length) return null;

    const polygons = coords
        .map(normalizeDcMoiPolygonCoords)
        .filter(Boolean);

    return polygons.length ? polygons : null;
}

function buildDcMoiNormalizedFeature(feature, geometry) {
    return {
        ...feature,
        properties: feature.properties || {},
        geometry
    };
}

function collectNormalizedDcMoiFeatures(feature, geometry, index = 0, output = []) {
    if (!geometry || typeof geometry !== 'object') {
        return output;
    }

    const geometryType = geometry.type;

    if (geometryType === 'Polygon') {
        const polygon = normalizeDcMoiPolygonCoords(geometry.coordinates);
        if (polygon) {
            output.push(buildDcMoiNormalizedFeature(feature, {
                type: 'Polygon',
                coordinates: polygon
            }));
        } else if (Array.isArray(geometry.coordinates) && geometry.coordinates.length) {
            output.push(buildDcMoiNormalizedFeature(feature, geometry));
            console.warn('Polygon dc_moi lỗi nhẹ, giữ geometry gốc:', index);
        } else {
            console.warn('Polygon dc_moi không hợp lệ, bị bỏ:', index, feature);
        }
        return output;
    }

    if (geometryType === 'MultiPolygon') {
        const multiPolygon = normalizeDcMoiMultiPolygonCoords(geometry.coordinates);
        if (multiPolygon) {
            output.push(buildDcMoiNormalizedFeature(feature, {
                type: 'MultiPolygon',
                coordinates: multiPolygon
            }));
        } else if (Array.isArray(geometry.coordinates) && geometry.coordinates.length) {
            output.push(buildDcMoiNormalizedFeature(feature, geometry));
            console.warn('MultiPolygon dc_moi lỗi nhẹ, giữ geometry gốc:', index);
        } else {
            console.warn('MultiPolygon dc_moi không hợp lệ, bị bỏ:', index, feature);
        }
        return output;
    }

    if (geometryType === 'LineString' || geometryType === 'MultiLineString' || geometryType === 'Point' || geometryType === 'MultiPoint') {
        output.push(buildDcMoiNormalizedFeature(feature, {
            type: geometryType,
            coordinates: geometry.coordinates
        }));
        return output;
    }

    if (geometryType === 'GeometryCollection') {
        (geometry.geometries || []).forEach((child) => collectNormalizedDcMoiFeatures(feature, child, index, output));
        return output;
    }

    console.warn('Geometry dc_moi không hỗ trợ:', geometryType, feature);
    return output;
}

function normalizeDcMoiGeoJSON(data) {
    if (!data || !Array.isArray(data.features)) {
        return {
            type: 'FeatureCollection',
            features: [],
            bbox: null
        };
    }

    const originalCount = data.features.length;
    const features = [];

    data.features.forEach((feature, index) => {
        if (!feature || feature.type !== 'Feature' || !feature.geometry) {
            console.warn('Feature dc_moi lỗi hoặc thiếu geometry:', feature);
            return;
        }

        collectNormalizedDcMoiFeatures(feature, feature.geometry, index, features);
    });

    console.log('Địa chính mới gốc:', originalCount);
    console.log('Địa chính mới sau normalize:', features.length);
    console.log('Địa chính mới bị loại:', Math.max(0, originalCount - features.length));

    return {
        type: 'FeatureCollection',
        features,
        bbox: Array.isArray(data.bbox) ? data.bbox : null
    };
}

function getDcMoiBBox(data) {
    try {
        if (
            Array.isArray(data?.bbox) &&
            data.bbox.length === 4 &&
            data.bbox.every(v => Number.isFinite(Number(v)))
        ) {
            return data.bbox.map(Number);
        }

        if (typeof turf !== "undefined" && data?.features?.length) {
            return turf.bbox(data);
        }
    } catch (e) {
        console.warn("bbox dc_moi lỗi:", e);
    }

    return null;
}


function getDcMoiRenderLimit() {
    return 3000;
}

function getDcMoiViewportPaddingFactor() {
    return isMobileDevice() ? 0.12 : 0.08;
}

function walkDcMoiCoordsForBBox(coords, bbox) {
    if (!Array.isArray(coords)) return;
    if (coords.length >= 2 && isValidDcMoiCoord(coords)) {
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (lng < bbox[0]) bbox[0] = lng;
        if (lat < bbox[1]) bbox[1] = lat;
        if (lng > bbox[2]) bbox[2] = lng;
        if (lat > bbox[3]) bbox[3] = lat;
        return;
    }
    coords.forEach((part) => walkDcMoiCoordsForBBox(part, bbox));
}

function getDcMoiFeatureBBox(feature) {
    if (!feature || !feature.geometry) return null;
    if (Array.isArray(feature.__td_bbox) && feature.__td_bbox.length === 4) {
        return feature.__td_bbox;
    }

    const bbox = [Infinity, Infinity, -Infinity, -Infinity];
    walkDcMoiCoordsForBBox(feature.geometry.coordinates, bbox);

    if (!Number.isFinite(bbox[0]) || !Number.isFinite(bbox[1]) || !Number.isFinite(bbox[2]) || !Number.isFinite(bbox[3])) {
        return null;
    }

    feature.__td_bbox = bbox;
    feature.__td_center = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
    return bbox;
}

function expandDcMoiBBox(bbox, factor = getDcMoiViewportPaddingFactor()) {
    if (!Array.isArray(bbox) || bbox.length !== 4) return null;
    const width = Math.max(0.00005, Number(bbox[2]) - Number(bbox[0]));
    const height = Math.max(0.00005, Number(bbox[3]) - Number(bbox[1]));
    const padX = width * factor;
    const padY = height * factor;
    return [
        Number(bbox[0]) - padX,
        Number(bbox[1]) - padY,
        Number(bbox[2]) + padX,
        Number(bbox[3]) + padY
    ];
}

function getDcMoiViewportBBox() {
    if (!map || typeof map.getBounds !== "function") return null;
    try {
        const bounds = map.getBounds();
        return expandDcMoiBBox([
            Number(bounds.getWest()),
            Number(bounds.getSouth()),
            Number(bounds.getEast()),
            Number(bounds.getNorth())
        ]);
    } catch (e) {
        return null;
    }
}

function intersectsDcMoiBBox(a, b) {
    if (!a || !b) return false;
    return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

function cloneDcMoiFeatureCollectionMeta(data, features) {
    return {
        type: "FeatureCollection",
        features,
        bbox: Array.isArray(data?.bbox) ? data.bbox : null
    };
}

function buildDcMoiViewportFeatureCollection(data) {
    if (!data || !Array.isArray(data.features)) {
        return cloneDcMoiFeatureCollectionMeta(data, []);
    }

    const limit = getDcMoiRenderLimit();
    if (data.features.length <= limit) {
        return cloneDcMoiFeatureCollectionMeta(data, data.features);
    }

    const viewBBox = getDcMoiViewportBBox();
    if (!viewBBox) {
        return cloneDcMoiFeatureCollectionMeta(data, data.features.slice(0, limit));
    }

    const centerX = (viewBBox[0] + viewBBox[2]) / 2;
    const centerY = (viewBBox[1] + viewBBox[3]) / 2;
    const matches = [];

    for (const feature of data.features) {
        const featureBBox = getDcMoiFeatureBBox(feature);
        if (!featureBBox || !intersectsDcMoiBBox(featureBBox, viewBBox)) continue;

        const center = Array.isArray(feature.__td_center)
            ? feature.__td_center
            : [(featureBBox[0] + featureBBox[2]) / 2, (featureBBox[1] + featureBBox[3]) / 2];

        const dx = center[0] - centerX;
        const dy = center[1] - centerY;

        matches.push({
            feature,
            score: (dx * dx) + (dy * dy)
        });
    }

    if (!matches.length) {
        return cloneDcMoiFeatureCollectionMeta(data, data.features.slice(0, limit));
    }

    if (matches.length > limit) {
        matches.sort((a, b) => a.score - b.score);
    }

    return cloneDcMoiFeatureCollectionMeta(
        data,
        matches.slice(0, limit).map((item) => item.feature)
    );
}

function ensureDcMoiViewportState(data = null) {
    window.__tdParcelViewportState = window.__tdParcelViewportState || {};
    const state = window.__tdParcelViewportState["dc_moi"] || {
        fullData: null,
        lastKey: null,
        lastResult: null,
        bound: false,
        timer: null,
        controller: null,
        inflightKey: null,
        inflightPromise: null,
        requestSeq: 0
    };

    if (data) {
        state.fullData = data;
        state.lastKey = null;
    }

    window.__tdParcelViewportState["dc_moi"] = state;
    return state;
}

function renderDcMoiViewport(force = false) {
    const state = ensureDcMoiViewportState();
    if (!state.fullData || window.currentRenderModes?.["dc_moi"] !== "geojson") return;

    const viewBBox = getDcMoiViewportBBox();
    const zoomValue = Number(map?.getZoom?.() || 0);
    const key = JSON.stringify({
        bbox: viewBBox ? viewBBox.map(v => Number(v).toFixed(5)) : null,
        zoom: Number.isFinite(zoomValue) ? zoomValue.toFixed(2) : "0",
        level: window.mapResolutionState?.currentLevel || null
    });

    if (!force && state.lastKey === key) {
        return;
    }

    const renderData = buildDcMoiViewportFeatureCollection(state.fullData);
    upsertDcMoiSource("dc_moi", renderData);
    state.lastKey = key;
}

function scheduleDcMoiViewportRender(force = false) {
    const state = ensureDcMoiViewportState();
    clearTimeout(state.timer);
    state.timer = setTimeout(() => renderDcMoiViewport(force), isMobileDevice() ? 90 : 40);
}

function bindDcMoiViewportEvents() {
    const state = ensureDcMoiViewportState();
    if (state.bound || !map) return;

    const handler = () => {
        const mode = window.currentRenderModes?.["dc_moi"];
        if (mode === "viewport_api") {
            scheduleDcMoiViewportApi(false);
            return;
        }
        if (mode !== "geojson") return;
        scheduleDcMoiViewportRender(false);
    };

    map.on("moveend", handler);
    map.on("zoomend", handler);
    state.bound = true;
}

/* =========================
EVENT HANDLERS
========================= */

async function handleDcMoiClick(e) {
    if (window.splitMode) {
        showToast?.("Đang tách thửa, không đổi thửa hiện trạng", "warning");
        return;
    }

    if (!e.features || e.features.length === 0) {
        console.warn("Không có thửa tại vị trí click");
        return;
    }

    let feature = e.features[0];
    window.currentFeatureLayerType = "dc_moi";

    const fullData = window.__tdParcelViewportState?.["dc_moi"]?.fullData;
    if (fullData && typeof window.findMatchingFeatureInGeoJSON === "function") {
        const hydratedFeature = window.findMatchingFeatureInGeoJSON(feature, fullData);
        if (hydratedFeature) {
            feature = hydratedFeature;
        }
    }

    if (typeof resolveFeatureForInteraction === "function") {
        try {
            feature = await resolveFeatureForInteraction(feature, "dc_moi");
        } catch (err) {
            console.warn("hydrate dc_moi lỗi:", err);
        }
    }

    if (typeof cloneFeatureForRuntime === "function") {
        feature = cloneFeatureForRuntime(feature);
    }

    if (typeof syncVN2000ForCurrentFeature === "function") {
        syncVN2000ForCurrentFeature(feature);
    }

    window.currentFeature = feature;

    if (typeof highlightParcel === "function") {
        highlightParcel(feature);
    }

    if (typeof showParcelInfo === "function") {
        showParcelInfo(feature);
    }

    if (typeof drawParcelMeasure === "function") {
        drawParcelMeasure(feature);
    }
}

function handleDcMoiDoubleClick(e) {
    const lng = e.lngLat.lng;
    const lat = e.lngLat.lat;

    if (typeof addMarker === "function") {
        addMarker(lat, lng);
    }
}

/* =========================
UPSERT SOURCE
========================= */

function upsertDcMoiSource(sourceId, data) {
    const source = map.getSource(sourceId);

    if (source) {
        if (typeof source.setData === "function") {
            source.setData(data);
            return false;
        }

        removeDcMoiLayersAndSource();
    }

    map.addSource(sourceId, {
        type: "geojson",
        data: data,
        tolerance: 0,
        buffer: isMobileDevice() ? 256 : 128,
        promoteId: "PARCEL_UID"
    });

    return true;
}

/* =========================
VECTOR TILE / PMTILES HELPERS
========================= */

function removeDcMoiLayersAndSource() {
    ["dc_moi_fill", "dc_moi_line"].forEach((id) => {
        if (map.getLayer(id)) {
            map.removeLayer(id);
        }
    });

    if (map.getSource("dc_moi")) {
        map.removeSource("dc_moi");
    }
}

function getDcMoiMinZoom() {
    return isMobileDevice() ? 17 : 16;
}

function getDcMoiLineWidthExpression() {
    return [
        "interpolate",
        ["linear"],
        ["zoom"],
        10, 0.9,
        14, 1.6,
        18, 2.4
    ];
}

function addDcMoiLayers(sourceLayer) {

    if (!map.getLayer("dc_moi_fill")) {
        map.addLayer({
            id: "dc_moi_fill",
            type: "fill",
            source: "dc_moi",
            "source-layer": sourceLayer,
            minzoom: getDcMoiMinZoom(),
            paint: {
                "fill-color": "#ffd700",
                "fill-opacity": 0.22
            }
        });
    }

    if (!map.getLayer("dc_moi_line")) {
        map.addLayer({
            id: "dc_moi_line",
            type: "line",
            source: "dc_moi",
            "source-layer": sourceLayer,
            minzoom: getDcMoiMinZoom(),
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": "#ffd700",
                "line-width": getDcMoiLineWidthExpression()
            }
        });
    }
}

function loadDcMoiPmtiles(pmtilesUrl, sourceLayer = "parcels", meta = null) {
    if (!map) {
        console.warn("Map chưa khởi tạo");
        return;
    }

    if (typeof clearMeasure === "function") {
        clearMeasure();
    }

    if (typeof syncVN2000FromLoadedMeta === "function") {
        syncVN2000FromLoadedMeta(meta || "dc_moi");
    }

    try { map.off("click", "dc_moi_fill", handleDcMoiClick); } catch (e) {}
    try { map.off("dblclick", "dc_moi_fill", handleDcMoiDoubleClick); } catch (e) {}

    removeDcMoiLayersAndSource();

    const vectorUrl = typeof buildPmtilesSourceUrl === "function"
        ? buildPmtilesSourceUrl(pmtilesUrl)
        : `pmtiles://${pmtilesUrl}`;

    map.addSource("dc_moi", {
        type: "vector",
        url: vectorUrl,
        promoteId: "PARCEL_UID"
    });

    addDcMoiLayers(sourceLayer || "parcels");

    map.on("click", "dc_moi_fill", handleDcMoiClick);
    map.on("dblclick", "dc_moi_fill", handleDcMoiDoubleClick);

    window.currentRenderModes = window.currentRenderModes || {};
    window.currentRenderModes.dc_moi = "pmtiles";
    window.currentFeatureLayerType = "dc_moi";

    if (typeof registerLoadedMapMeta === "function") {
        registerLoadedMapMeta("dc_moi", meta || { type: "dc_moi", source_layer: sourceLayer }, "pmtiles");
    }

    if (typeof setParcelSearchSourceType === "function") {
        setParcelSearchSourceType("dc_moi");
    }

    try {
        const bbox = Array.isArray(meta?.bbox) ? meta.bbox.map(Number) : null;
        if (bbox && bbox.length === 4) {
            if (typeof focusMapNearBbox === "function") {
            focusMapNearBbox(bbox, { zoom: 17 });
        } else {
            map.jumpTo({ center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2], zoom: 17 });
        }
        }
    } catch (e) {
        console.warn("Không thể fitBounds PMTiles dc_moi:", e);
    }
}

window.loadDcMoiPmtiles = loadDcMoiPmtiles;

async function ensureDcMoiHostingArtifacts(meta = null) {
    const state = ensureDcMoiViewportState();
    const currentMeta = meta || state.meta || (typeof getLoadedMapMeta === "function" ? getLoadedMapMeta("dc_moi") : null) || window.currentMapMeta;
    const url = currentMeta?.api_urls?.prepare_hosting_artifacts;
    if (!url) return null;
    if (state.preparePromise) return state.preparePromise;

    const csrf = typeof getCsrfToken === "function"
        ? getCsrfToken()
        : (document.querySelector('meta[name="csrf-token"]')?.content || "");

    state.preparePromise = (async () => {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRF-TOKEN": csrf
            },
            credentials: "same-origin"
        });

        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) {
            throw new Error(json?.message || "Không chuẩn bị được dữ liệu hosting");
        }

        state.lastKey = null;
        state.lastResult = null;
        state.lastPrepareAt = Date.now();
        if (typeof showToast === "function") {
            showToast(json?.message || "Đã chuẩn bị lại dữ liệu hosting", "success", 1800);
        }
        return json;
    })().finally(() => { state.preparePromise = null; });

    return state.preparePromise;
}

function getDcMoiViewportApiLimit() {
    return isMobileDevice() ? 6000 : 9000;
}

async function fetchDcMoiViewportApi(force = false) {
    const state = ensureDcMoiViewportState();
    const meta = state.meta || (typeof getLoadedMapMeta === "function" ? getLoadedMapMeta("dc_moi") : null) || window.currentMapMeta;
    const apiUrl = meta?.api_urls?.parcel_viewport_features;
    if (!apiUrl || !map) return null;

    const viewBBox = getDcMoiViewportBBox();
    if (!viewBBox) return null;

    const zoomValue = Number(map?.getZoom?.() || 0);
    const key = JSON.stringify({
        bbox: viewBBox.map(v => Number(v).toFixed(5)),
        zoom: Number.isFinite(zoomValue) ? zoomValue.toFixed(2) : "0"
    });

    if (!force && state.lastKey === key) {
        return state.lastResult || null;
    }

    if (state.inflightKey === key && state.inflightPromise) {
        return state.inflightPromise;
    }

    if (state.controller && typeof state.controller.abort === "function" && state.inflightKey && state.inflightKey !== key) {
        try { state.controller.abort("viewport-changed"); } catch (e) { try { state.controller.abort(); } catch (_) {} }
    }

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const requestSeq = Number(state.requestSeq || 0) + 1;
    state.requestSeq = requestSeq;
    state.controller = controller;
    state.inflightKey = key;

    const params = new URLSearchParams({
        bbox: viewBBox.join(","),
        zoom: String(Math.round(zoomValue * 100) / 100),
        limit: String(getDcMoiViewportApiLimit())
    });

    const headers = {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest"
    };

    const requestPromise = (async () => {
        const signal = controller?.signal;
        try {
            const response = await fetch(`${apiUrl}?${params.toString()}`, {
                method: "GET",
                headers,
                credentials: "same-origin",
                signal
            });

            const json = await response.json().catch(() => null);
            if ((response.status === 409 && json?.requires_prepare) || json?.requires_prepare) {
                try {
                    await ensureDcMoiHostingArtifacts(meta);
                    setTimeout(() => scheduleDcMoiViewportApi(true), isMobileDevice() ? 260 : 120);
                    return null;
                } catch (prepareErr) {
                    throw prepareErr;
                }
            }

            if (!response.ok || !json?.success || !json?.feature_collection) {
                const err = new Error(json?.message || "Không tải được thửa theo vùng nhìn");
                try { err.responseStatus = response.status; } catch (_) {}
                throw err;
            }

            if (Number(state.requestSeq) !== requestSeq) {
                return state.lastResult || json || null;
            }

            const mustWarnZoomIn = json?.requires_zoom_in || json?.is_complete === false || json?.truncated;
            upsertDcMoiSource("dc_moi", json.feature_collection);
            state.lastKey = key;
            state.lastResult = json;
            state.meta = meta;

            if (mustWarnZoomIn && typeof showToast === "function") {
                const now = Date.now();
                if (!state.lastWarnAt || now - state.lastWarnAt > 4000 || state.lastWarnMessage !== String(json?.message || "")) {
                    showToast(json?.message || "Vùng này quá dày thửa, hãy zoom gần thêm để tải đủ toàn bộ.", "warning", 2400);
                    state.lastWarnAt = now;
                    state.lastWarnMessage = String(json?.message || "");
                }
            }

            return json;
        } catch (err) {
            const message = String(err?.message || err || "");
            const abortLike = err?.name === "AbortError"
                || err === "viewport-changed"
                || err?.message === "viewport-changed"
                || err?.reason === "viewport-changed"
                || ((signal?.aborted || Number(state.requestSeq) !== requestSeq || state.inflightKey !== key)
                    && /Failed to fetch|Load failed|Network request failed/i.test(message));
            if (abortLike) {
                if (err && typeof err === "object") {
                    try { err.__viewportAbortLike = true; } catch (_) {}
                }
                return null;
            }
            throw err;
        } finally {
            if (Number(state.requestSeq) === requestSeq) {
                state.controller = null;
            }
            if (state.inflightKey === key) {
                state.inflightKey = null;
                state.inflightPromise = null;
            }
        }
    })();

    state.inflightPromise = requestPromise;
    return requestPromise;
}

function scheduleDcMoiViewportApi(force = false) {
    const state = ensureDcMoiViewportState();
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
        fetchDcMoiViewportApi(force).catch((err) => {
            const abortLike = (typeof isViewportAbortLikeError === "function" && isViewportAbortLikeError(err))
                || err?.name === "AbortError"
                || err === "viewport-changed"
                || err?.message === "viewport-changed"
                || err?.reason === "viewport-changed";
            if (!abortLike) {
                console.warn("dc_moi viewport api lỗi:", err);
            }
        });
    }, isMobileDevice() ? 220 : 120);
}

async function loadDcMoiViewportApi(meta = null) {
    if (!map) return;

    if (typeof clearMeasure === "function") {
        clearMeasure();
    }

    if (typeof syncVN2000FromLoadedMeta === "function") {
        syncVN2000FromLoadedMeta(meta || "dc_moi");
    }

    try { map.off("click", "dc_moi_fill", handleDcMoiClick); } catch (e) {}
    try { map.off("dblclick", "dc_moi_fill", handleDcMoiDoubleClick); } catch (e) {}

    const state = ensureDcMoiViewportState();
    state.fullData = null;
    state.lastKey = null;
    state.meta = meta || state.meta || window.currentMapMeta || { type: "dc_moi" };

    const emptyData = { type: "FeatureCollection", features: [], bbox: Array.isArray(state.meta?.bbox) ? state.meta.bbox : null };
    const created = upsertDcMoiSource("dc_moi", emptyData);

    if (created) {
        map.addLayer({
            id: "dc_moi_fill",
            type: "fill",
            source: "dc_moi",
            minzoom: getDcMoiMinZoom(),
            paint: { "fill-color": "#ffd700", "fill-opacity": 0.22 }
        });

        map.addLayer({
            id: "dc_moi_line",
            type: "line",
            source: "dc_moi",
            minzoom: getDcMoiMinZoom(),
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#ffd700", "line-width": getDcMoiLineWidthExpression() }
        });
    }

    map.on("click", "dc_moi_fill", handleDcMoiClick);
    map.on("dblclick", "dc_moi_fill", handleDcMoiDoubleClick);

    window.currentRenderModes = window.currentRenderModes || {};
    window.currentRenderModes.dc_moi = "viewport_api";
    window.currentFeatureLayerType = "dc_moi";

    if (typeof registerLoadedMapMeta === "function") {
        registerLoadedMapMeta("dc_moi", state.meta, "viewport_api");
    }

    if (typeof setParcelSearchSourceType === "function") {
        setParcelSearchSourceType("dc_moi");
    }

    try {
        const bbox = Array.isArray(state.meta?.bbox) ? state.meta.bbox.map(Number) : null;
        if (bbox && bbox.length === 4) {
            if (typeof focusMapNearBbox === "function") {
                focusMapNearBbox(bbox, { zoom: 17 });
            } else {
                map.jumpTo({ center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2], zoom: 17 });
            }
        }
    } catch (e) {}

    await fetchDcMoiViewportApi(true);
    bindDcMoiViewportEvents();
}

window.loadDcMoiViewportApi = loadDcMoiViewportApi;
window.refreshDcMoiViewportApi = fetchDcMoiViewportApi;

/* =========================
MAIN LOAD
========================= */

function loadDcMoi(data) {
    if (!map) {
        console.warn("Map chưa khởi tạo");
        return;
    }

    if (typeof clearMeasure === "function") {
        clearMeasure();
    }

    if (typeof syncVN2000FromLoadedMeta === "function") {
        syncVN2000FromLoadedMeta("dc_moi");
    }

    if (!data || !data.features || !data.features.length) {
        console.warn("Không có dữ liệu địa chính mới");
        return;
    }

    console.log("Feature dc_moi đầu vào:", data.features.length);

    const safeData = normalizeDcMoiGeoJSON(data);

    if (!safeData.features.length) {
        console.warn("Không có feature polygon hợp lệ cho địa chính mới");
        return;
    }

    try {
        map.off("click", "dc_moi_fill", handleDcMoiClick);
    } catch (e) {}

    try {
        map.off("dblclick", "dc_moi_fill", handleDcMoiDoubleClick);
    } catch (e) {}

    ensureDcMoiViewportState(safeData);
    bindDcMoiViewportEvents();

    const initialRenderData = buildDcMoiViewportFeatureCollection(safeData);
    const created = upsertDcMoiSource("dc_moi", initialRenderData);

    if (created) {
        map.addLayer({
            id: "dc_moi_fill",
            type: "fill",
            source: "dc_moi",
            minzoom: getDcMoiMinZoom(),
            paint: {
                "fill-color": "#ffd700",
                "fill-opacity": 0.22
            }
        });

        map.addLayer({
            id: "dc_moi_line",
            type: "line",
            source: "dc_moi",
            minzoom: getDcMoiMinZoom(),
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": "#ffd700",
                "line-width": getDcMoiLineWidthExpression()
            }
        });
    } else {
        if (!map.getLayer("dc_moi_fill")) {
            map.addLayer({
                id: "dc_moi_fill",
                type: "fill",
                source: "dc_moi",
                minzoom: getDcMoiMinZoom(),
                paint: {
                    "fill-color": "#ffd700",
                    "fill-opacity": 0.22
                }
            });
        }

        if (!map.getLayer("dc_moi_line")) {
            map.addLayer({
                id: "dc_moi_line",
                type: "line",
                source: "dc_moi",
                minzoom: getDcMoiMinZoom(),
                paint: {
                    "line-color": "#ffd700",
                    "line-width": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        10, 0.8,
                        14, 1.5,
                        18, 2.2
                    ]
                }
            });
        }
    }

    map.on("click", "dc_moi_fill", handleDcMoiClick);
    map.on("dblclick", "dc_moi_fill", handleDcMoiDoubleClick);

    try {
        let bbox = getDcMoiBBox(safeData);

        if (
            !bbox &&
            window.currentMapMeta &&
            Array.isArray(window.currentMapMeta.bbox) &&
            window.currentMapMeta.bbox.length === 4
        ) {
            bbox = window.currentMapMeta.bbox.map(Number);
        }

        if (bbox) {
            if (typeof focusMapNearBbox === "function") {
            focusMapNearBbox(bbox, { zoom: 17 });
        } else {
            map.jumpTo({ center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2], zoom: 17 });
        }
        }
    } catch (e) {
        console.warn("Không thể fitBounds dc_moi:", e);
    }

    window.currentRenderModes = window.currentRenderModes || {};
    window.currentRenderModes.dc_moi = "geojson";
    window.currentFeatureLayerType = "dc_moi";

    scheduleDcMoiViewportRender(true);

    if (typeof setParcelSearchSourceType === "function") {
        setParcelSearchSourceType("dc_moi");
    }

    if (typeof initParcelSearch === "function") {
        try {
            const featureCount = Array.isArray(safeData?.features) ? safeData.features.length : 0;

            if (featureCount <= 10000) {
                initParcelSearch(safeData, "dc_moi");
            } else {
                console.log("Dữ liệu lớn, tìm kiếm sẽ nạp chậm hơn nếu dùng full GeoJSON:", featureCount);
                initParcelSearch(safeData, "dc_moi");
            }
        } catch (e) {
            console.warn("initParcelSearch dc_moi lỗi:", e);
        }
    }
}
