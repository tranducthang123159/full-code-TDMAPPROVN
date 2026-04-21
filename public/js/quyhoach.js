/* =========================
LOAD QUY HOẠCH (MapLibre)
========================= */

/* =========================
HELPERS
========================= */

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function isValidQuyHoachNumber(value) {
    return Number.isFinite(Number(value));
}

function isValidQuyHoachCoord(coord) {
    return Array.isArray(coord) &&
        coord.length >= 2 &&
        isValidQuyHoachNumber(coord[0]) &&
        isValidQuyHoachNumber(coord[1]);
}

function sameQuyHoachCoord(a, b) {
    return isValidQuyHoachCoord(a) &&
        isValidQuyHoachCoord(b) &&
        Number(a[0]) === Number(b[0]) &&
        Number(a[1]) === Number(b[1]);
}

function closeQuyHoachRing(ring) {
    if (!Array.isArray(ring)) return null;

    const cleanRing = ring
        .filter(isValidQuyHoachCoord)
        .map(coord => [Number(coord[0]), Number(coord[1])]);

    if (cleanRing.length < 3) return null;

    if (!sameQuyHoachCoord(cleanRing[0], cleanRing[cleanRing.length - 1])) {
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

function normalizeQuyHoachPolygonCoords(coords) {
    if (!Array.isArray(coords) || !coords.length) return null;

    const rings = coords
        .map(closeQuyHoachRing)
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

function normalizeQuyHoachMultiPolygonCoords(coords) {
    if (!Array.isArray(coords) || !coords.length) return null;

    const polygons = coords
        .map(normalizeQuyHoachPolygonCoords)
        .filter(Boolean);

    return polygons.length ? polygons : null;
}

function normalizeQuyHoachOpacity(value) {
    const num = Number(value);

    if (!Number.isFinite(num)) return 0.25;
    if (num < 0) return 0.25;
    if (num > 1) return 1;

    return num;
}

function buildQuyHoachNormalizedFeature(feature, geometry) {
    const properties = feature.properties || {};

    return {
        ...feature,
        properties: {
            ...properties,
            fill: properties.fill || '#ff0000',
            'fill-opacity': normalizeQuyHoachOpacity(properties['fill-opacity'])
        },
        geometry
    };
}

function collectNormalizedQuyHoachFeatures(feature, geometry, index = 0, output = []) {
    if (!geometry || typeof geometry !== 'object') {
        return output;
    }

    const geometryType = geometry.type;

    if (geometryType === 'Polygon') {
        const polygon = normalizeQuyHoachPolygonCoords(geometry.coordinates);
        if (polygon) {
            output.push(buildQuyHoachNormalizedFeature(feature, {
                type: 'Polygon',
                coordinates: polygon
            }));
        } else {
            console.warn('Polygon quy hoạch không hợp lệ, bị bỏ:', index, feature);
        }
        return output;
    }

    if (geometryType === 'MultiPolygon') {
        const multiPolygon = normalizeQuyHoachMultiPolygonCoords(geometry.coordinates);
        if (multiPolygon) {
            output.push(buildQuyHoachNormalizedFeature(feature, {
                type: 'MultiPolygon',
                coordinates: multiPolygon
            }));
        } else {
            console.warn('MultiPolygon quy hoạch không hợp lệ, bị bỏ:', index, feature);
        }
        return output;
    }

    if (geometryType === 'LineString' || geometryType === 'MultiLineString' || geometryType === 'Point' || geometryType === 'MultiPoint') {
        output.push(buildQuyHoachNormalizedFeature(feature, {
            type: geometryType,
            coordinates: geometry.coordinates
        }));
        return output;
    }

    if (geometryType === 'GeometryCollection') {
        (geometry.geometries || []).forEach((child) => collectNormalizedQuyHoachFeatures(feature, child, index, output));
        return output;
    }

    console.warn('Geometry quy hoạch không hỗ trợ:', geometryType, feature);
    return output;
}

function normalizeQuyHoachGeoJSON(data) {
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
            console.warn('Feature quy hoạch lỗi hoặc thiếu geometry:', feature);
            return;
        }

        collectNormalizedQuyHoachFeatures(feature, feature.geometry, index, features);
    });

    console.log('Quy hoạch gốc:', originalCount);
    console.log('Quy hoạch sau normalize:', features.length);
    console.log('Quy hoạch bị loại:', Math.max(0, originalCount - features.length));

    return {
        type: 'FeatureCollection',
        features,
        bbox: Array.isArray(data.bbox) ? data.bbox : null
    };
}

function getQuyHoachBBox(data) {
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
        console.warn("bbox quy hoạch lỗi:", e);
    }

    return null;
}

/* =========================
EVENT HANDLER
========================= */


/* =========================
UPSERT SOURCE
========================= */

function upsertQuyHoachSource(sourceId, data) {
    const source = map.getSource(sourceId);

    if (source) {
        if (typeof source.setData === "function") {
            source.setData(data);
            return false;
        }

        removeQuyHoachLayersAndSource();
    }

    map.addSource(sourceId, {
        type: "geojson",
        data: data,
        tolerance: 0,
        buffer: isMobileDevice() ? 256 : 128
    });

    return true;
}

/* =========================
VECTOR TILE / PMTILES HELPERS
========================= */

function removeQuyHoachLayersAndSource() {
    ["quyhoach_fill", "quyhoach_line"].forEach((id) => {
        if (map.getLayer(id)) {
            map.removeLayer(id);
        }
    });

    if (map.getSource("quy_hoach")) {
        map.removeSource("quy_hoach");
    }
}

function getQuyHoachMinZoom() {
    return isMobileDevice() ? 15 : 16;
}

function getQuyHoachLineWidthExpression() {
    return [
        "interpolate",
        ["linear"],
        ["zoom"],
        10, 0.6,
        14, 1.0,
        18, 1.8
    ];
}

function addQuyHoachLayers(sourceLayer) {

    if (!map.getLayer("quyhoach_fill")) {
        map.addLayer({
            id: "quyhoach_fill",
            type: "fill",
            source: "quy_hoach",
            "source-layer": sourceLayer,
            minzoom: getQuyHoachMinZoom(),
            paint: {
                "fill-color": [
                    "coalesce",
                    ["get", "fill"],
                    "#ff0000"
                ],
                "fill-opacity": [
                    "coalesce",
                    ["to-number", ["get", "fill-opacity"]],
                    0.25
                ]
            }
        });
    }

    if (!map.getLayer("quyhoach_line")) {
        map.addLayer({
            id: "quyhoach_line",
            type: "line",
            source: "quy_hoach",
            "source-layer": sourceLayer,
            minzoom: getQuyHoachMinZoom(),
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": "#333333",
                "line-width": getQuyHoachLineWidthExpression()
            }
        });
    }

    if (typeof window.ensurePlanningLayersBelow === "function") {
        window.ensurePlanningLayersBelow();
    }
}

function loadQuyHoachPmtiles(pmtilesUrl, sourceLayer = "planning", meta = null) {
    if (!map) {
        console.warn("Map chưa khởi tạo");
        return;
    }

    if (typeof closeQHPanel === "function") {
        closeQHPanel();
    }

    if (typeof clearMeasure === "function") {
        clearMeasure();
    }

    removeQuyHoachLayersAndSource();

    const vectorUrl = typeof buildPmtilesSourceUrl === "function"
        ? buildPmtilesSourceUrl(pmtilesUrl)
        : `pmtiles://${pmtilesUrl}`;

    map.addSource("quy_hoach", {
        type: "vector",
        url: vectorUrl
    });

    addQuyHoachLayers(sourceLayer || "planning");

    window.currentRenderModes = window.currentRenderModes || {};
    window.currentRenderModes.quy_hoach = "pmtiles";

    if (typeof registerLoadedMapMeta === "function") {
        registerLoadedMapMeta("quy_hoach", meta || { type: "quy_hoach", source_layer: sourceLayer }, "pmtiles");
    }

    try {
        const bbox = Array.isArray(meta?.bbox) ? meta.bbox.map(Number) : null;
        if (bbox && bbox.length === 4) {
            if (typeof focusMapNearBbox === "function") {
            focusMapNearBbox(bbox, { zoom: 16 });
        } else {
            map.jumpTo({ center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2], zoom: 16 });
        }
        }
    } catch (e) {
        console.warn("Không thể fitBounds PMTiles quy hoạch:", e);
    }
}

window.loadQuyHoachPmtiles = loadQuyHoachPmtiles;

/* =========================
MAIN LOAD
========================= */

function loadQuyHoach(data) {
    if (!map) {
        console.warn("Map chưa khởi tạo");
        return;
    }

    if (typeof closeQHPanel === "function") {
        closeQHPanel();
    }

    if (typeof clearMeasure === "function") {
        clearMeasure();
    }
    if (typeof clearMeasure === "function") {
        clearMeasure();
    }

    if (!data || !data.features || !data.features.length) {
        console.warn("Không có dữ liệu quy hoạch");
        return;
    }

    console.log("Feature quy hoạch đầu vào:", data.features.length);

    const safeData = normalizeQuyHoachGeoJSON(data);
    window.geo_quy_hoach = safeData;
    window.currentRenderModes = window.currentRenderModes || {};
    window.currentRenderModes.quy_hoach = "geojson";
    if (!safeData.features.length) {
        console.warn("Không có feature polygon hợp lệ của quy hoạch");
        return;
    }

    /* gỡ event cũ */
    // try {
    //     map.off("click", "quyhoach_fill", handleQuyHoachClick);
    // } catch (e) {}

    const created = upsertQuyHoachSource("quy_hoach", safeData);

    if (created) {
        map.addLayer({
            id: "quyhoach_fill",
            type: "fill",
            source: "quy_hoach",
            minzoom: getQuyHoachMinZoom(),
            paint: {
                "fill-color": [
                    "coalesce",
                    ["get", "fill"],
                    "#ff0000"
                ],
                "fill-opacity": [
                    "coalesce",
                    ["to-number", ["get", "fill-opacity"]],
                    0.25
                ]
            }
        });

        map.addLayer({
            id: "quyhoach_line",
            type: "line",
            source: "quy_hoach",
            minzoom: getQuyHoachMinZoom(),
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": "#333333",
                "line-width": getQuyHoachLineWidthExpression()
            }
        });
    } else {
        if (!map.getLayer("quyhoach_fill")) {
            map.addLayer({
                id: "quyhoach_fill",
                type: "fill",
                source: "quy_hoach",
                minzoom: 16,
                paint: {
                    "fill-color": [
                        "coalesce",
                        ["get", "fill"],
                        "#ff0000"
                    ],
                    "fill-opacity": [
                        "coalesce",
                        ["to-number", ["get", "fill-opacity"]],
                        0.25
                    ]
                }
            });
        }

        if (!map.getLayer("quyhoach_line")) {
            map.addLayer({
                id: "quyhoach_line",
                type: "line",
                source: "quy_hoach",
                minzoom: 16,
                paint: {
                    "line-color": "#333333",
                    "line-width": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        10, 0.5,
                        14, 0.9,
                        18, 1.5
                    ]
                }
            });
        }
    }

    // map.on("click", "quyhoach_fill", handleQuyHoachClick);

    if (typeof window.ensurePlanningLayersBelow === "function") {
        window.ensurePlanningLayersBelow();
    }

    try {
        let bbox = getQuyHoachBBox(safeData);

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
            focusMapNearBbox(bbox, { zoom: 16 });
        } else {
            map.jumpTo({ center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2], zoom: 16 });
        }
        }
    } catch (e) {
        console.warn("Không thể fitBounds cho quy hoạch:", e);
    }
}