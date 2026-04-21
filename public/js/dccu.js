/* =========================
LOAD ĐỊA CHÍNH CŨ
========================= */

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

/* =========================
HELPERS
========================= */

function isValidNumber(value) {
    return Number.isFinite(Number(value));
}

function isValidCoord(coord) {
    return Array.isArray(coord) &&
        coord.length >= 2 &&
        isValidNumber(coord[0]) &&
        isValidNumber(coord[1]);
}

function sameCoord(a, b) {
    return isValidCoord(a) &&
        isValidCoord(b) &&
        Number(a[0]) === Number(b[0]) &&
        Number(a[1]) === Number(b[1]);
}

function closeRing(ring) {
    if (!Array.isArray(ring)) return null;

    const cleanRing = ring
        .filter(isValidCoord)
        .map(coord => [Number(coord[0]), Number(coord[1])]);

    if (cleanRing.length < 3) return null;

    if (!sameCoord(cleanRing[0], cleanRing[cleanRing.length - 1])) {
        cleanRing.push([...cleanRing[0]]);
    }

    if (cleanRing.length < 4) return null;

    return cleanRing;
}

function getLargestRingIndex(rings) {
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

function normalizePolygonCoords(coords) {
    if (!Array.isArray(coords) || !coords.length) return null;

    const rings = coords
        .map(closeRing)
        .filter(Boolean);

    if (!rings.length) return null;

    const largestRingIndex = getLargestRingIndex(rings);
    if (largestRingIndex > 0) {
        const outerRing = rings[largestRingIndex];
        rings.splice(largestRingIndex, 1);
        rings.unshift(outerRing);
    }

    return rings;
}

function normalizeMultiPolygonCoords(coords) {
    if (!Array.isArray(coords) || !coords.length) return null;

    const polygons = coords
        .map(normalizePolygonCoords)
        .filter(Boolean);

    return polygons.length ? polygons : null;
}

function buildDcCuNormalizedFeature(feature, geometry) {
    return {
        ...feature,
        properties: feature.properties || {},
        geometry
    };
}

function collectNormalizedDcCuFeatures(feature, geometry, index = 0, output = []) {
    if (!geometry || typeof geometry !== 'object') {
        return output;
    }

    const geometryType = geometry.type;

    if (geometryType === 'Polygon') {
        const polygon = normalizePolygonCoords(geometry.coordinates);
        if (polygon) {
            output.push(buildDcCuNormalizedFeature(feature, {
                type: 'Polygon',
                coordinates: polygon
            }));
        } else if (Array.isArray(geometry.coordinates) && geometry.coordinates.length) {
            output.push(buildDcCuNormalizedFeature(feature, geometry));
            console.warn('Polygon dc_cu lỗi nhẹ, giữ geometry gốc:', index);
        } else {
            console.warn('Polygon dc_cu không hợp lệ, bị bỏ:', index, feature);
        }
        return output;
    }

    if (geometryType === 'MultiPolygon') {
        const multiPolygon = normalizeMultiPolygonCoords(geometry.coordinates);
        if (multiPolygon) {
            output.push(buildDcCuNormalizedFeature(feature, {
                type: 'MultiPolygon',
                coordinates: multiPolygon
            }));
        } else if (Array.isArray(geometry.coordinates) && geometry.coordinates.length) {
            output.push(buildDcCuNormalizedFeature(feature, geometry));
            console.warn('MultiPolygon dc_cu lỗi nhẹ, giữ geometry gốc:', index);
        } else {
            console.warn('MultiPolygon dc_cu không hợp lệ, bị bỏ:', index, feature);
        }
        return output;
    }

    if (geometryType === 'LineString' || geometryType === 'MultiLineString' || geometryType === 'Point' || geometryType === 'MultiPoint') {
        output.push(buildDcCuNormalizedFeature(feature, {
            type: geometryType,
            coordinates: geometry.coordinates
        }));
        return output;
    }

    if (geometryType === 'GeometryCollection') {
        (geometry.geometries || []).forEach((child) => collectNormalizedDcCuFeatures(feature, child, index, output));
        return output;
    }

    console.warn('Geometry dc_cu không hỗ trợ:', geometryType, feature);
    return output;
}

function normalizeDcCuGeoJSON(data) {
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
            console.warn('Feature dc_cu lỗi hoặc thiếu geometry:', feature);
            return;
        }

        collectNormalizedDcCuFeatures(feature, feature.geometry, index, features);
    });

    if (window.TDMAP_DEBUG) console.log('Địa chính cũ gốc:', originalCount);
    if (window.TDMAP_DEBUG) console.log('Địa chính cũ sau normalize:', features.length);
    if (window.TDMAP_DEBUG) console.log('Địa chính cũ bị loại:', Math.max(0, originalCount - features.length));

    return {
        type: 'FeatureCollection',
        features,
        bbox: Array.isArray(data.bbox) ? data.bbox : null
    };
}

function getDcCuBBox(data) {
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
        console.warn("bbox dc_cu lỗi:", e);
    }

    return null;
}


function getDcCuRenderLimit() {
    return 3000;
}

function getDcCuViewportPaddingFactor() {
    return isMobileDevice() ? 0.12 : 0.08;
}

function walkDcCuCoordsForBBox(coords, bbox) {
    if (!Array.isArray(coords)) return;
    if (coords.length >= 2 && isValidCoord(coords)) {
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (lng < bbox[0]) bbox[0] = lng;
        if (lat < bbox[1]) bbox[1] = lat;
        if (lng > bbox[2]) bbox[2] = lng;
        if (lat > bbox[3]) bbox[3] = lat;
        return;
    }
    coords.forEach((part) => walkDcCuCoordsForBBox(part, bbox));
}

function getDcCuFeatureBBox(feature) {
    if (!feature || !feature.geometry) return null;
    if (Array.isArray(feature.__td_bbox) && feature.__td_bbox.length === 4) {
        return feature.__td_bbox;
    }

    const bbox = [Infinity, Infinity, -Infinity, -Infinity];
    walkDcCuCoordsForBBox(feature.geometry.coordinates, bbox);

    if (!Number.isFinite(bbox[0]) || !Number.isFinite(bbox[1]) || !Number.isFinite(bbox[2]) || !Number.isFinite(bbox[3])) {
        return null;
    }

    feature.__td_bbox = bbox;
    feature.__td_center = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
    return bbox;
}

function expandDcCuBBox(bbox, factor = getDcCuViewportPaddingFactor()) {
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

function getDcCuViewportBBox() {
    if (!map || typeof map.getBounds !== "function") return null;
    try {
        const bounds = map.getBounds();
        return expandDcCuBBox([
            Number(bounds.getWest()),
            Number(bounds.getSouth()),
            Number(bounds.getEast()),
            Number(bounds.getNorth())
        ]);
    } catch (e) {
        return null;
    }
}

function intersectsDcCuBBox(a, b) {
    if (!a || !b) return false;
    return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

function cloneDcCuFeatureCollectionMeta(data, features) {
    return {
        type: "FeatureCollection",
        features,
        bbox: Array.isArray(data?.bbox) ? data.bbox : null
    };
}

function buildDcCuViewportFeatureCollection(data) {
    if (!data || !Array.isArray(data.features)) {
        return cloneDcCuFeatureCollectionMeta(data, []);
    }

    const limit = getDcCuRenderLimit();
    if (data.features.length <= limit) {
        return cloneDcCuFeatureCollectionMeta(data, data.features);
    }

    const viewBBox = getDcCuViewportBBox();
    if (!viewBBox) {
        return cloneDcCuFeatureCollectionMeta(data, data.features.slice(0, limit));
    }

    const centerX = (viewBBox[0] + viewBBox[2]) / 2;
    const centerY = (viewBBox[1] + viewBBox[3]) / 2;
    const matches = [];

    for (const feature of data.features) {
        const featureBBox = getDcCuFeatureBBox(feature);
        if (!featureBBox || !intersectsDcCuBBox(featureBBox, viewBBox)) continue;

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
        return cloneDcCuFeatureCollectionMeta(data, data.features.slice(0, limit));
    }

    if (matches.length > limit) {
        matches.sort((a, b) => a.score - b.score);
    }

    return cloneDcCuFeatureCollectionMeta(
        data,
        matches.slice(0, limit).map((item) => item.feature)
    );
}

function ensureDcCuViewportState(data = null) {
    window.__tdParcelViewportState = window.__tdParcelViewportState || {};
    const state = window.__tdParcelViewportState["dc_cu"] || {
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

    window.__tdParcelViewportState["dc_cu"] = state;
    return state;
}

function renderDcCuViewport(force = false) {
    const state = ensureDcCuViewportState();
    if (!state.fullData || window.currentRenderModes?.["dc_cu"] !== "geojson") return;

    const viewBBox = getDcCuViewportBBox();
    const zoomValue = Number(map?.getZoom?.() || 0);
    const key = JSON.stringify({
        bbox: viewBBox ? viewBBox.map(v => Number(v).toFixed(5)) : null,
        zoom: Number.isFinite(zoomValue) ? zoomValue.toFixed(2) : "0",
        level: window.mapResolutionState?.currentLevel || null
    });

    if (!force && state.lastKey === key) {
        return;
    }

    const renderData = buildDcCuViewportFeatureCollection(state.fullData);
    upsertDcCuSource("dc_cu", renderData);
    state.lastKey = key;
}

function scheduleDcCuViewportRender(force = false) {
    const state = ensureDcCuViewportState();
    clearTimeout(state.timer);
    state.timer = setTimeout(() => renderDcCuViewport(force), isMobileDevice() ? 90 : 40);
}

function bindDcCuViewportEvents() {
    const state = ensureDcCuViewportState();
    if (state.bound || !map) return;

    const handler = () => {
        const mode = window.currentRenderModes?.["dc_cu"];
        if (mode === "viewport_api") {
            scheduleDcCuViewportApi(false);
            return;
        }
        if (mode !== "geojson") return;
        scheduleDcCuViewportRender(false);
    };

    map.on("moveend", handler);
    map.on("zoomend", handler);
    state.bound = true;
}

/* =========================
EVENT HANDLERS
========================= */

async function handleDcCuClick(e) {
    if (window.splitMode) {
        showToast?.("Đang tách thửa, không đổi thửa hiện trạng", "warning");
        return;
    }

    if (!e.features || e.features.length === 0) {
        console.warn("Không có thửa tại vị trí click");
        return;
    }

    let feature = e.features[0];
    window.currentFeatureLayerType = "dc_cu";

    const fullData = window.__tdParcelViewportState?.["dc_cu"]?.fullData;
    if (fullData && typeof window.findMatchingFeatureInGeoJSON === "function") {
        const hydratedFeature = window.findMatchingFeatureInGeoJSON(feature, fullData);
        if (hydratedFeature) {
            feature = hydratedFeature;
        }
    }

    if (typeof resolveFeatureForInteraction === "function") {
        try {
            feature = await resolveFeatureForInteraction(feature, "dc_cu");
        } catch (err) {
            console.warn("hydrate dc_cu lỗi:", err);
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

function handleDcCuDoubleClick(e) {
    const lng = e.lngLat.lng;
    const lat = e.lngLat.lat;

    if (typeof addMarker === "function") {
        addMarker(lat, lng);
    }
}

/* =========================
UPSERT SOURCE
========================= */

function upsertDcCuSource(sourceId, data) {
    const source = map.getSource(sourceId);

    if (source) {
        if (typeof source.setData === "function") {
            source.setData(data);
            return false;
        }

        removeDcCuLayersAndSource();
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

function removeDcCuLayersAndSource() {
    ["dc_cu_fill", "dc_cu_line"].forEach((id) => {
        if (map.getLayer(id)) {
            map.removeLayer(id);
        }
    });

    if (map.getSource("dc_cu")) {
        map.removeSource("dc_cu");
    }
}

function getDcCuMinZoom() {
    return isMobileDevice() ? 17 : 16;
}

function getDcCuLineWidthExpression() {
    return [
        "interpolate",
        ["linear"],
        ["zoom"],
        10, 0.9,
        14, 1.6,
        18, 2.4
    ];
}

function addDcCuLayers(sourceLayer) {

    if (!map.getLayer("dc_cu_fill")) {
        map.addLayer({
            id: "dc_cu_fill",
            type: "fill",
            source: "dc_cu",
            "source-layer": sourceLayer,
            minzoom: getDcCuMinZoom(),
            paint: {
                "fill-color": "#49cbf3",
                "fill-opacity": 0.18
            }
        });
    }

    if (!map.getLayer("dc_cu_line")) {
        map.addLayer({
            id: "dc_cu_line",
            type: "line",
            source: "dc_cu",
            "source-layer": sourceLayer,
            minzoom: getDcCuMinZoom(),
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": "#49cbf3",
                "line-width": getDcCuLineWidthExpression()
            }
        });
    }
}

function loadDcCuPmtiles(pmtilesUrl, sourceLayer = "parcels", meta = null) {
    if (!map) {
        console.warn("Map chưa khởi tạo");
        return;
    }

    if (typeof clearMeasure === "function") {
        clearMeasure();
    }

    if (typeof syncVN2000FromLoadedMeta === "function") {
        syncVN2000FromLoadedMeta(meta || "dc_cu");
    }

    try { map.off("click", "dc_cu_fill", handleDcCuClick); } catch (e) {}
    try { map.off("dblclick", "dc_cu_fill", handleDcCuDoubleClick); } catch (e) {}

    removeDcCuLayersAndSource();

    const vectorUrl = typeof buildPmtilesSourceUrl === "function"
        ? buildPmtilesSourceUrl(pmtilesUrl)
        : `pmtiles://${pmtilesUrl}`;

    map.addSource("dc_cu", {
        type: "vector",
        url: vectorUrl,
        promoteId: "PARCEL_UID"
    });

    addDcCuLayers(sourceLayer || "parcels");

    map.on("click", "dc_cu_fill", handleDcCuClick);
    map.on("dblclick", "dc_cu_fill", handleDcCuDoubleClick);

    window.currentRenderModes = window.currentRenderModes || {};
    window.currentRenderModes.dc_cu = "pmtiles";
    window.currentFeatureLayerType = "dc_cu";

    if (typeof registerLoadedMapMeta === "function") {
        registerLoadedMapMeta("dc_cu", meta || { type: "dc_cu", source_layer: sourceLayer }, "pmtiles");
    }

    if (typeof setParcelSearchSourceType === "function") {
        setParcelSearchSourceType("dc_cu");
    }

    try {
        const bbox = Array.isArray(meta?.bbox) ? meta.bbox.map(Number) : null;
        if (bbox && bbox.length === 4) {
            map.fitBounds(
                [
                    [bbox[0], bbox[1]],
                    [bbox[2], bbox[3]]
                ],
                {
                    padding: isMobileDevice() ? 10 : 20,
                    duration: 0,
                    maxZoom: 17
                }
            );
        }
    } catch (e) {
        console.warn("Không thể fitBounds PMTiles dc_cu:", e);
    }
}

window.loadDcCuPmtiles = loadDcCuPmtiles;

async function ensureDcCuHostingArtifacts(meta = null) {
    const state = ensureDcCuViewportState();
    const currentMeta = meta || state.meta || (typeof getLoadedMapMeta === "function" ? getLoadedMapMeta("dc_cu") : null) || window.currentMapMeta;
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

function getDcCuViewportApiLimit() {
    return isMobileDevice() ? 6000 : 9000;
}

async function fetchDcCuViewportApi(force = false) {
    const state = ensureDcCuViewportState();
    const meta = state.meta || (typeof getLoadedMapMeta === "function" ? getLoadedMapMeta("dc_cu") : null) || window.currentMapMeta;
    const apiUrl = meta?.api_urls?.parcel_viewport_features;
    if (!apiUrl || !map) return null;

    const viewBBox = getDcCuViewportBBox();
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
        limit: String(getDcCuViewportApiLimit())
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
                    await ensureDcCuHostingArtifacts(meta);
                    setTimeout(() => scheduleDcCuViewportApi(true), isMobileDevice() ? 260 : 120);
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
            upsertDcCuSource("dc_cu", json.feature_collection);
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

function scheduleDcCuViewportApi(force = false) {
    const state = ensureDcCuViewportState();
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
        fetchDcCuViewportApi(force).catch((err) => {
            const abortLike = (typeof isViewportAbortLikeError === "function" && isViewportAbortLikeError(err))
                || err?.name === "AbortError"
                || err === "viewport-changed"
                || err?.message === "viewport-changed"
                || err?.reason === "viewport-changed";
            if (!abortLike) {
                console.warn("dc_cu viewport api lỗi:", err);
            }
        });
    }, isMobileDevice() ? 220 : 120);
}

async function loadDcCuViewportApi(meta = null) {
    if (!map) return;

    if (typeof clearMeasure === "function") {
        clearMeasure();
    }

    if (typeof syncVN2000FromLoadedMeta === "function") {
        syncVN2000FromLoadedMeta(meta || "dc_cu");
    }

    try { map.off("click", "dc_cu_fill", handleDcCuClick); } catch (e) {}
    try { map.off("dblclick", "dc_cu_fill", handleDcCuDoubleClick); } catch (e) {}

    const state = ensureDcCuViewportState();
    state.fullData = null;
    state.lastKey = null;
    state.meta = meta || state.meta || window.currentMapMeta || { type: "dc_cu" };

    const emptyData = { type: "FeatureCollection", features: [], bbox: Array.isArray(state.meta?.bbox) ? state.meta.bbox : null };
    const created = upsertDcCuSource("dc_cu", emptyData);

    if (created) {
        map.addLayer({
            id: "dc_cu_fill",
            type: "fill",
            source: "dc_cu",
            minzoom: getDcCuMinZoom(),
            paint: { "fill-color": "#49cbf3", "fill-opacity": 0.18 }
        });

        map.addLayer({
            id: "dc_cu_line",
            type: "line",
            source: "dc_cu",
            minzoom: getDcCuMinZoom(),
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#49cbf3", "line-width": getDcCuLineWidthExpression() }
        });
    }

    map.on("click", "dc_cu_fill", handleDcCuClick);
    map.on("dblclick", "dc_cu_fill", handleDcCuDoubleClick);

    window.currentRenderModes = window.currentRenderModes || {};
    window.currentRenderModes.dc_cu = "viewport_api";
    window.currentFeatureLayerType = "dc_cu";

    if (typeof registerLoadedMapMeta === "function") {
        registerLoadedMapMeta("dc_cu", state.meta, "viewport_api");
    }

    if (typeof setParcelSearchSourceType === "function") {
        setParcelSearchSourceType("dc_cu");
    }

    try {
        const bbox = Array.isArray(state.meta?.bbox) ? state.meta.bbox.map(Number) : null;
        if (bbox && bbox.length === 4) {
            map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {
                padding: isMobileDevice() ? 10 : 20,
                duration: 0,
                maxZoom: 17
            });
        }
    } catch (e) {}

    await fetchDcCuViewportApi(true);
    bindDcCuViewportEvents();
}

window.loadDcCuViewportApi = loadDcCuViewportApi;
window.refreshDcCuViewportApi = fetchDcCuViewportApi;

/* =========================
MAIN LOAD
========================= */

function loadDcCu(data) {
    if (!map) {
        console.warn("Map chưa khởi tạo");
        return;
    }

    if (typeof clearMeasure === "function") {
        clearMeasure();
    }

    if (typeof syncVN2000FromLoadedMeta === "function") {
        syncVN2000FromLoadedMeta("dc_cu");
    }

    if (!data || !data.features || !data.features.length) {
        console.warn("Không có dữ liệu địa chính cũ");
        return;
    }

    if (window.TDMAP_DEBUG) console.log("Feature dc_cu đầu vào:", data.features.length);

    const safeData = normalizeDcCuGeoJSON(data);

    if (!safeData.features.length) {
        console.warn("Không có feature polygon hợp lệ cho địa chính cũ");
        return;
    }

    /* remove event cũ */
    try {
        map.off("click", "dc_cu_fill", handleDcCuClick);
    } catch (e) {}

    try {
        map.off("dblclick", "dc_cu_fill", handleDcCuDoubleClick);
    } catch (e) {}

    ensureDcCuViewportState(safeData);
    bindDcCuViewportEvents();

    const initialRenderData = buildDcCuViewportFeatureCollection(safeData);
    const created = upsertDcCuSource("dc_cu", initialRenderData);

    if (created) {
        map.addLayer({
            id: "dc_cu_fill",
            type: "fill",
            source: "dc_cu",
            minzoom: getDcCuMinZoom(),
            paint: {
                "fill-color": "#49cbf3",
                "fill-opacity": 0.18
            }
        });

        map.addLayer({
            id: "dc_cu_line",
            type: "line",
            source: "dc_cu",
            minzoom: getDcCuMinZoom(),
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": "#49cbf3",
                "line-width": getDcCuLineWidthExpression()
            }
        });
    } else {
        if (!map.getLayer("dc_cu_fill")) {
            map.addLayer({
                id: "dc_cu_fill",
                type: "fill",
                source: "dc_cu",
                minzoom: getDcCuMinZoom(),
                paint: {
                    "fill-color": "#49cbf3",
                    "fill-opacity": 0.18
                }
            });
        }

        if (!map.getLayer("dc_cu_line")) {
            map.addLayer({
                id: "dc_cu_line",
                type: "line",
                source: "dc_cu",
                minzoom: getDcCuMinZoom(),
                paint: {
                    "line-color": "#49cbf3",
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

    map.on("click", "dc_cu_fill", handleDcCuClick);
    map.on("dblclick", "dc_cu_fill", handleDcCuDoubleClick);

    try {
        let bbox = getDcCuBBox(safeData);

        if (
            !bbox &&
            window.currentMapMeta &&
            Array.isArray(window.currentMapMeta.bbox) &&
            window.currentMapMeta.bbox.length === 4
        ) {
            bbox = window.currentMapMeta.bbox.map(Number);
        }

        if (bbox) {
            map.fitBounds(
                [
                    [bbox[0], bbox[1]],
                    [bbox[2], bbox[3]]
                ],
                {
                    padding: isMobileDevice() ? 10 : 20,
                    duration: 0,
                    maxZoom: 17
                }
            );
        }
    } catch (e) {
        console.warn("Không thể fitBounds dc_cu:", e);
    }

    window.currentRenderModes = window.currentRenderModes || {};
    window.currentRenderModes.dc_cu = "geojson";
    window.currentFeatureLayerType = "dc_cu";

    scheduleDcCuViewportRender(true);

    if (typeof setParcelSearchSourceType === "function") {
        setParcelSearchSourceType("dc_cu");
    }

    if (typeof initParcelSearch === "function") {
        try {
            initParcelSearch(safeData, "dc_cu");
        } catch (e) {
            console.warn("initParcelSearch dc_cu lỗi:", e);
        }
    }
}