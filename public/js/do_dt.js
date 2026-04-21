/* =========================
MEASURE AREA
========================= */

let dtPoints = [];
let dtMarkers = [];
let dtGPSWatch = null;
let dtInfoMarker = null;

let dtActive = false;
let dtClosed = false;

/* =========================
START
========================= */

function startDT() {

    if (!dtActive) {

        /* tắt đo khoảng cách */
        if (typeof kcActive !== "undefined") kcActive = false;
        if (typeof clearKC === "function") clearKC();

        dtActive = true;
        dtClosed = false;
        mapMode = "dt";

        if (typeof showExportPDF === "function") showExportPDF();
        if (typeof showMeasureToast === "function") {
            showMeasureToast("Đang bật đo diện tích...", true);

            setTimeout(() => {
                showMeasureToast("✔ Đo diện tích đã bật<br>Chạm lại để tắt", false);
            }, 1200);
        }

    } else {

        if (typeof showMeasureToast === "function") {
            showMeasureToast("Đang tắt đo diện tích...", true);
        }

        setTimeout(() => {
            dtActive = false;
            dtClosed = false;

            if (typeof hideExportPDF === "function") hideExportPDF();

            mapMode = "pin";

            if (typeof showMeasureToast === "function") {
                showMeasureToast("✔ Đã tắt đo diện tích", false);
            }
        }, 1200);
    }
}

/* =========================
ADD POINT
========================= */

function addDTPoint(lng, lat, options = {}) {

    if (!dtActive) return null;

    /* nếu đã khép rồi thì không cho thêm nữa */
    if (dtClosed) return null;

    const isGps = !!options.isGps;
    let point = [lng, lat];

    /* snap vào điểm cũ */
    if (typeof measureFindNearestPoint === "function") {
        const snapped = measureFindNearestPoint({ lng, lat }, dtPoints);
        if (snapped) {
            point = snapped.point;
        }
    }

    /* nếu đã có từ 3 điểm, click gần điểm đầu thì tự khép */
    if (dtPoints.length >= 3) {
        const first = dtPoints[0];

        let closeToFirst = false;

        if (typeof measurePixelDistance === "function") {
            const closePx = (typeof MEASURE_CLOSE_PIXEL !== "undefined") ? MEASURE_CLOSE_PIXEL : 22;

            closeToFirst = measurePixelDistance(
                { lng: point[0], lat: point[1] },
                { lng: first[0], lat: first[1] }
            ) <= closePx;
        }

        if (closeToFirst) {
            dtClosed = true;
            drawDT(true);
            return null;
        }
    }

    /* tránh trùng điểm liên tiếp */
    const last = dtPoints[dtPoints.length - 1];
    if (last && typeof measureIsSamePoint === "function" && measureIsSamePoint(last, point)) {
        return null;
    }

    dtPoints.push(point);

    const pointIndex = dtPoints.length;

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

    dtMarkers.push(marker);

    if (isGps && typeof flashMeasureMarker === "function") {
        flashMeasureMarker(el);
    }

    drawDT(false);

    return {
        point: point,
        index: pointIndex,
        marker: marker
    };
}

/* =========================
DRAW
========================= */

function drawDT(forceClose = false) {

    if (dtPoints.length < 2) {

        if (map.getLayer("dt_line")) map.removeLayer("dt_line");
        if (map.getSource("dt_line")) map.removeSource("dt_line");

        if (map.getLayer("dt_poly")) map.removeLayer("dt_poly");
        if (map.getSource("dt_poly")) map.removeSource("dt_poly");

        if (map.getLayer("dt_label")) map.removeLayer("dt_label");
        if (map.getSource("dt_label")) map.removeSource("dt_label");

        if (dtInfoMarker) {
            dtInfoMarker.remove();
            dtInfoMarker = null;
        }

        return;
    }

    const isClosed = forceClose || dtClosed;
    const lineCoords = isClosed && dtPoints.length >= 3
        ? [...dtPoints, dtPoints[0]]
        : dtPoints;

    /* =========================
    LINE
    ========================= */
    let line = {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: lineCoords
        }
    };

    if (map.getLayer("dt_line")) map.removeLayer("dt_line");
    if (map.getSource("dt_line")) map.removeSource("dt_line");

    map.addSource("dt_line", { type: "geojson", data: line });

    map.addLayer({
        id: "dt_line",
        type: "line",
        source: "dt_line",
        paint: {
            "line-color": "#ff0000",
            "line-width": 3
        }
    });

    /* =========================
    POLYGON
    ========================= */
    if (map.getLayer("dt_poly")) map.removeLayer("dt_poly");
    if (map.getSource("dt_poly")) map.removeSource("dt_poly");

    if (dtPoints.length >= 3) {
        let polygon = {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [[...dtPoints, dtPoints[0]]]
            }
        };

        map.addSource("dt_poly", { type: "geojson", data: polygon });

        map.addLayer({
            id: "dt_poly",
            type: "fill",
            source: "dt_poly",
            paint: {
                "fill-color": "#ff0000",
                "fill-opacity": 0.15
            }
        });
    }

    /* =========================
    LABEL CẠNH
    ========================= */
    let labels = [];

    if (map.getLayer("dt_label")) map.removeLayer("dt_label");
    if (map.getSource("dt_label")) map.removeSource("dt_label");

    for (let i = 1; i < dtPoints.length; i++) {
        let p1 = dtPoints[i - 1];
        let p2 = dtPoints[i];

        let mid = [
            (p1[0] + p2[0]) / 2,
            (p1[1] + p2[1]) / 2
        ];

        let d = turf.distance(
            turf.point(p1),
            turf.point(p2),
            { units: "meters" }
        );

        let angle = Math.atan2(
            p2[1] - p1[1],
            p2[0] - p1[0]
        ) * 180 / Math.PI;

        if (angle > 90 || angle < -90) angle += 180;

        labels.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: mid
            },
            properties: {
                text: d.toFixed(2) + " m",
                angle: angle
            }
        });
    }

    /* cạnh cuối nối về điểm đầu */
    if (isClosed && dtPoints.length >= 3) {
        let p1 = dtPoints[dtPoints.length - 1];
        let p2 = dtPoints[0];

        let mid = [
            (p1[0] + p2[0]) / 2,
            (p1[1] + p2[1]) / 2
        ];

        let d = turf.distance(
            turf.point(p1),
            turf.point(p2),
            { units: "meters" }
        );

        let angle = Math.atan2(
            p2[1] - p1[1],
            p2[0] - p1[0]
        ) * 180 / Math.PI;

        if (angle > 90 || angle < -90) angle += 180;

        labels.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: mid
            },
            properties: {
                text: d.toFixed(2) + " m",
                angle: angle
            }
        });
    }

    map.addSource("dt_label", {
        type: "geojson",
        data: {
            type: "FeatureCollection",
            features: labels
        }
    });

    map.addLayer({
        id: "dt_label",
        type: "symbol",
        source: "dt_label",
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

    /* =========================
    AREA INFO
    ========================= */
    if (dtPoints.length >= 3) {
        let poly = turf.polygon([[...dtPoints, dtPoints[0]]]);
        let area = turf.area(poly);
        let center = turf.center(poly).geometry.coordinates;

        if (dtInfoMarker) {
            dtInfoMarker.remove();
            dtInfoMarker = null;
        }

        let el = document.createElement("div");
        el.className = "measure-info";
        el.innerHTML = "📐 " + area.toFixed(2) + " m²";

        dtInfoMarker = new maplibregl.Marker({
            element: el,
            anchor: "center"
        })
            .setLngLat(center)
            .addTo(map);
    }
}

/* =========================
FINISH / CLOSE MANUAL
========================= */

function finishDT() {
    if (dtPoints.length >= 3) {
        dtClosed = true;
        drawDT(true);
    }
}

/* =========================
CLEAR
========================= */

function clearDT() {

    dtPoints = [];
    dtClosed = false;

    dtMarkers.forEach(m => m.remove());
    dtMarkers = [];

    if (map.getLayer("dt_line")) map.removeLayer("dt_line");
    if (map.getSource("dt_line")) map.removeSource("dt_line");

    if (map.getLayer("dt_poly")) map.removeLayer("dt_poly");
    if (map.getSource("dt_poly")) map.removeSource("dt_poly");

    if (map.getLayer("dt_label")) map.removeLayer("dt_label");
    if (map.getSource("dt_label")) map.removeSource("dt_label");

    if (dtInfoMarker) {
        dtInfoMarker.remove();
        dtInfoMarker = null;
    }

}

/* =========================
GPS AREA
========================= */

function startDTGPS() {

    if (!navigator.geolocation) {
        alert("Trình duyệt không hỗ trợ GPS");
        return;
    }

    const nextPoint = dtPoints.length + 1;
    showMeasureToast("Đang lấy GPS cho điểm " + nextPoint + "...", true);

    navigator.geolocation.getCurrentPosition(function (pos) {

        let lat = pos.coords.latitude;
        let lng = pos.coords.longitude;

        map.flyTo({
            center: [lng, lat],
            zoom: 18
        });

        const result = addDTPoint(lng, lat, { isGps: true });

        if (result) {
            let accuracyText = "";
            if (Number.isFinite(pos.coords.accuracy)) {
                accuracyText = "<br>Sai số ±" + pos.coords.accuracy.toFixed(1) + " m";
            }

            showMeasureToast("📍 Đã đo GPS điểm " + result.index + accuracyText, false);
        } else {
            showMeasureToast("Điểm GPS bị trùng hoặc vùng đo đã khép", false);
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

/* =========================
UNDO
========================= */

function undoDT() {

    if (dtPoints.length === 0) return;

    /* nếu đã khép thì mở lại trước */
    if (dtClosed) {
        dtClosed = false;
        drawDT(false);
        return;
    }

    dtPoints.pop();

    let marker = dtMarkers.pop();
    if (marker) marker.remove();

    if (dtPoints.length < 2) {

        if (map.getLayer("dt_line")) map.removeLayer("dt_line");
        if (map.getSource("dt_line")) map.removeSource("dt_line");

        if (map.getLayer("dt_poly")) map.removeLayer("dt_poly");
        if (map.getSource("dt_poly")) map.removeSource("dt_poly");

        if (map.getLayer("dt_label")) map.removeLayer("dt_label");
        if (map.getSource("dt_label")) map.removeSource("dt_label");

        if (dtInfoMarker) {
            dtInfoMarker.remove();
            dtInfoMarker = null;
        }

        return;
    }

    drawDT(false);
}

/* =========================
UNDO BUTTON
========================= */

function undoMeasures() {
    if (mapMode === "kc" && typeof undoKC === "function") {
        undoKC();
    }

    if (mapMode === "dt") {
        undoDT();
    }
}

/* =========================
CLEAR BUTTON
========================= */

function clearMeasures() {

    if (typeof clearKC === "function") clearKC();
    clearDT();

    if (typeof kcActive !== "undefined") kcActive = false;
    dtActive = false;
    dtClosed = false;

    mapMode = "pin";

    if (typeof showMeasureToast === "function") {
        showMeasureToast("✔ Đã xóa toàn bộ đo", false);
    }
}