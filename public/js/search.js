/* =========================
SEARCH VN2000
========================= */

function searchVN() {
    let input = document.getElementById("vn_input").value.trim();

    /* tách theo dấu phẩy hoặc khoảng trắng */
    let parts = input.split(/[,\s]+/).filter(Boolean);

    if (parts.length !== 2) {
        alert("Nhập đúng dạng: X, Y");
        return;
    }

    let x = parseFloat(parts[0]);
    let y = parseFloat(parts[1]);

    if (isNaN(x) || isNaN(y)) {
        alert("Tọa độ VN2000 không hợp lệ");
        return;
    }

    /* VN2000 -> WGS84 */
    const activeKTT = Number(window.currentKTT || (typeof currentKTT !== 'undefined' ? currentKTT : 108.5)) || 108.5;
    proj4.defs(
        "VN2000",
        `+proj=tmerc +lat_0=0 +lon_0=${activeKTT} +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs`
    );

    let result = proj4("VN2000", "EPSG:4326", [y, x]);

    let lng = result[0];
    let lat = result[1];

    /* bay tới */
    map.flyTo({
        center: [lng, lat],
        zoom: 18
    });

    /* marker */
    addMarker(lat, lng);
}


/* =========================
SEARCH WGS84
========================= */

function searchWGS() {
    let input = document.getElementById("wgs_input").value.trim();

    /* tách theo dấu phẩy hoặc khoảng trắng */
    let parts = input.split(/[,\s]+/).filter(Boolean);

    if (parts.length !== 2) {
        alert("Nhập đúng dạng: Lat, Lng");
        return;
    }

    let lat = parseFloat(parts[0]);
    let lng = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lng)) {
        alert("Tọa độ WGS84 không hợp lệ");
        return;
    }

    map.flyTo({
        center: [lng, lat],
        zoom: 18
    });

    addMarker(lat, lng);
}


/* =========================
TOGGLE SEARCH PANEL
========================= */

function toggleSearchPanel() {
    let body = document.getElementById("searchBody");
    let arrow = document.getElementById("searchArrow");

    body.classList.toggle("collapsed");

    if (body.classList.contains("collapsed")) {
        arrow.innerHTML = "▼";
    } else {
        arrow.innerHTML = "▲";
    }
}

/* =========================================================
   NHẬP DANH SÁCH TỌA ĐỘ VN2000 / WGS84 LÊN MAPLIBRE
========================================================= */

window.coordImportState = window.coordImportState || {
    sourceId: "coord-import-source",
    fillId: "coord-import-fill",
    lineId: "coord-import-line",
    vertexMarkers: [],
    edgeMarkers: [],
    centerMarker: null
};

function switchCoordTab(tab) {
    const isVN = tab === "vn2000";

    const vnBody = document.getElementById("tab-body-vn2000");
    const llBody = document.getElementById("tab-body-latlng");
    const btnVN = document.getElementById("tab-vn2000");
    const btnLL = document.getElementById("tab-latlng");

    if (!vnBody || !llBody || !btnVN || !btnLL) return;

    vnBody.style.display = isVN ? "block" : "none";
    llBody.style.display = isVN ? "none" : "block";

    btnVN.classList.toggle("active", isVN);
    btnLL.classList.toggle("active", !isVN);
}

function toggleVN2000ListPanel() {
    const panel = document.getElementById("vn2000-list-panel");
    if (!panel) return;

    panel.style.display = panel.style.display === "none" || panel.style.display === "" ? "block" : "none";

    if (!panel._dragReady) {
        panel._dragReady = true;

        const header = document.getElementById("vn2000-list-header");
        let dragging = false;
        let ox = 0;
        let oy = 0;

        header.addEventListener("mousedown", function (e) {
            if (e.target.tagName === "BUTTON") return;

            dragging = true;
            const rect = panel.getBoundingClientRect();
            panel.style.left = rect.left + "px";
            panel.style.top = rect.top + "px";
            panel.style.transform = "none";

            ox = e.clientX - rect.left;
            oy = e.clientY - rect.top;
            header.style.cursor = "grabbing";
        });

        document.addEventListener("mousemove", function (e) {
            if (!dragging) return;
            panel.style.left = (e.clientX - ox) + "px";
            panel.style.top = (e.clientY - oy) + "px";
        });

        document.addEventListener("mouseup", function () {
            dragging = false;
            header.style.cursor = "grab";
        });
    }
}

function clearCoordImportMarkers() {
    const st = window.coordImportState;

    st.vertexMarkers.forEach(m => m.remove());
    st.edgeMarkers.forEach(m => m.remove());

    st.vertexMarkers = [];
    st.edgeMarkers = [];

    if (st.centerMarker) {
        st.centerMarker.remove();
        st.centerMarker = null;
    }
}

function clearCoordImportLayers() {
    const st = window.coordImportState;

    clearCoordImportMarkers();

    if (map.getLayer(st.fillId)) map.removeLayer(st.fillId);
    if (map.getLayer(st.lineId)) map.removeLayer(st.lineId);
    if (map.getSource(st.sourceId)) map.removeSource(st.sourceId);
}

function clearVN2000List() {
    clearCoordImportLayers();

    const statusEl = document.getElementById("vn2000-list-status");
    const resEl = document.getElementById("vn2000-list-result");

    if (statusEl) statusEl.textContent = "";
    if (resEl) {
        resEl.style.display = "none";
        resEl.innerHTML = "";
    }
}

function clearLatLngList() {
    clearCoordImportLayers();

    const statusEl = document.getElementById("latlng-list-status");
    const resEl = document.getElementById("latlng-list-result");

    if (statusEl) statusEl.textContent = "";
    if (resEl) {
        resEl.style.display = "none";
        resEl.innerHTML = "";
    }
}

function parseCoordList(raw, mode) {
    const lines = raw.split("\n").map(s => s.trim()).filter(Boolean);
    const points = [];

    for (const line of lines) {
        const parts = line.split(/[\s,;]+/).filter(Boolean);

        if (parts.length < 3) {
            throw new Error(`Dòng sai định dạng: "${line}"`);
        }

        const stt = parseInt(parts[0], 10);
        const a = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);

        if (!Number.isFinite(stt) || !Number.isFinite(a) || !Number.isFinite(b)) {
            throw new Error(`Giá trị không hợp lệ: "${line}"`);
        }

        if (mode === "vn2000") {
            // STT X Y  => X = Northing, Y = Easting
            const northing = a;
            const easting = b;

            const wgs = proj4("VN2000_Current", "EPSG:4326", [easting, northing]);

            points.push({
                stt,
                lat: Number(wgs[1]),
                lng: Number(wgs[0]),
                northing,
                easting
            });
        } else {
            const lat = a;
            const lng = b;

            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                throw new Error(`Tọa độ ngoài phạm vi: "${line}"`);
            }

            const vn = proj4("EPSG:4326", "VN2000_Current", [lng, lat]);

            points.push({
                stt,
                lat,
                lng,
                northing: Number(vn[1]),
                easting: Number(vn[0])
            });
        }
    }

    if (points.length < 3) {
        throw new Error("Cần ít nhất 3 điểm để tạo vùng.");
    }

    points.sort((a, b) => a.stt - b.stt);

    return points;
}

function calcPolygonStats(points) {
    const n = points.length;
    const edgeLengths = [];
    let area = 0;

    for (let i = 0; i < n; i++) {
        const a = points[i];
        const b = points[(i + 1) % n];

        const dx = b.easting - a.easting;
        const dy = b.northing - a.northing;

        edgeLengths.push(Math.sqrt(dx * dx + dy * dy));
        area += a.easting * b.northing - b.easting * a.northing;
    }

    area = Math.abs(area) / 2;

    return { edgeLengths, area };
}

function getPolygonCenter(points) {
    let sumLat = 0;
    let sumLng = 0;

    points.forEach(p => {
        sumLat += p.lat;
        sumLng += p.lng;
    });

    return {
        lat: sumLat / points.length,
        lng: sumLng / points.length
    };
}

function drawCoordImportToMap(points, styleType = "vn2000") {
    clearCoordImportLayers();

    const st = window.coordImportState;
    const isVN = styleType === "vn2000";

    const color = isVN ? "#d7263d" : "#0d6efd";
    const fillColor = isVN ? "#d7263d" : "#0d6efd";

    const ring = points.map(p => [p.lng, p.lat]);
    ring.push([points[0].lng, points[0].lat]);

    const geojson = {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "Polygon",
                    coordinates: [ring]
                },
                properties: {}
            }
        ]
    };

    map.addSource(st.sourceId, {
        type: "geojson",
        data: geojson
    });

    map.addLayer({
        id: st.fillId,
        type: "fill",
        source: st.sourceId,
        paint: {
            "fill-color": fillColor,
            "fill-opacity": 0.12
        }
    });

    map.addLayer({
        id: st.lineId,
        type: "line",
        source: st.sourceId,
        paint: {
            "line-color": color,
            "line-width": 4
        }
    });

    const { edgeLengths, area } = calcPolygonStats(points);
    const center = getPolygonCenter(points);

points.forEach((pt, i) => {
    const el = document.createElement("div");
    el.className = "coord-import-vertex";
    el.innerHTML = `<span>${pt.stt}</span>`;

    const popupHtml = `
        <div style="font-size:12px;line-height:1.7;min-width:180px;">
            <b>Điểm ${pt.stt}</b><br>
            <b>WGS84:</b> ${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)}<br>
            <b>VN2000:</b> X ${pt.northing.toFixed(3)} | Y ${pt.easting.toFixed(3)}
        </div>
    `;

    const marker = new maplibregl.Marker({
        element: el,
        anchor: "center"
    })
        .setLngLat([pt.lng, pt.lat])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setHTML(popupHtml))
        .addTo(map);

    st.vertexMarkers.push(marker);
});

    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];

        const midLat = (a.lat + b.lat) / 2;
        const midLng = (a.lng + b.lng) / 2;

        const el = document.createElement("div");
        el.className = "coord-import-edge-label";
        el.style.borderColor = color;
        el.style.color = color;
        el.textContent = `${edgeLengths[i].toFixed(2)} m`;

        const mk = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([midLng, midLat])
            .addTo(map);

        st.edgeMarkers.push(mk);
    }

    const centerEl = document.createElement("div");
    centerEl.className = "coord-import-center-label";
    centerEl.style.borderColor = color;
    centerEl.style.color = color;
    centerEl.innerHTML = `
        ${(area / 10000).toFixed(4)} ha<br>
        <span style="font-size:12px;font-weight:700;">(${area.toFixed(2)} m²)</span>
    `;

    st.centerMarker = new maplibregl.Marker({ element: centerEl, anchor: "center" })
        .setLngLat([center.lng, center.lat])
        .addTo(map);

    const bounds = new maplibregl.LngLatBounds();
    ring.forEach(c => bounds.extend(c));
    map.fitBounds(bounds, { padding: 80, maxZoom: 20 });

    return { edgeLengths, area };
}

function plotVN2000List() {
    const raw = document.getElementById("vn2000-list-input")?.value?.trim() || "";
    const statusEl = document.getElementById("vn2000-list-status");
    const resEl = document.getElementById("vn2000-list-result");

    try {
        if (!raw) throw new Error("Chưa nhập tọa độ.");

        const points = parseCoordList(raw, "vn2000");
        const { edgeLengths, area } = drawCoordImportToMap(points, "vn2000");

        if (statusEl) {
            statusEl.textContent = `✅ ${points.length} điểm | DT: ${area.toFixed(2)} m²`;
            statusEl.style.color = "#198754";
            statusEl.style.fontWeight = "700";
        }

        if (resEl) {
            let html = `
                <div style="font-weight:800;color:#15803d;margin-bottom:6px;">
                    ✅ Đã vẽ ${points.length} điểm — ${points.length} cạnh khép kín
                </div>
                <div style="font-weight:700;margin-bottom:8px;">
                    Diện tích: ${area.toFixed(2)} m² (${(area / 10000).toFixed(4)} ha)
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <thead>
                        <tr>
                            <th style="border:1px solid #86efac;padding:6px;">Cạnh</th>
                            <th style="border:1px solid #86efac;padding:6px;">Dài (m)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            edgeLengths.forEach((len, i) => {
                html += `
                    <tr>
                        <td style="border:1px solid #86efac;padding:6px;text-align:center;">${i + 1}→${(i + 1) % points.length + 1}</td>
                        <td style="border:1px solid #86efac;padding:6px;text-align:right;">${len.toFixed(3)}</td>
                    </tr>
                `;
            });

            html += "</tbody></table>";
            resEl.innerHTML = html;
            resEl.style.display = "block";
        }
    } catch (err) {
        if (statusEl) {
            statusEl.textContent = `⚠ ${err.message}`;
            statusEl.style.color = "#dc3545";
            statusEl.style.fontWeight = "700";
        }
        if (resEl) {
            resEl.style.display = "none";
            resEl.innerHTML = "";
        }
    }
}

function plotLatLngList() {
    const raw = document.getElementById("latlng-list-input")?.value?.trim() || "";
    const statusEl = document.getElementById("latlng-list-status");
    const resEl = document.getElementById("latlng-list-result");

    try {
        if (!raw) throw new Error("Chưa nhập tọa độ.");

        const points = parseCoordList(raw, "latlng");
        const { edgeLengths, area } = drawCoordImportToMap(points, "latlng");

        if (statusEl) {
            statusEl.textContent = `✅ ${points.length} điểm | DT: ${area.toFixed(2)} m²`;
            statusEl.style.color = "#198754";
            statusEl.style.fontWeight = "700";
        }

        if (resEl) {
            let html = `
                <div style="font-weight:800;color:#1d4ed8;margin-bottom:6px;">
                    ✅ Đã vẽ ${points.length} điểm — ${points.length} cạnh khép kín
                </div>
                <div style="font-weight:700;margin-bottom:8px;">
                    Diện tích: ${area.toFixed(2)} m² (${(area / 10000).toFixed(4)} ha)
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <thead>
                        <tr>
                            <th style="border:1px solid #93c5fd;padding:6px;">Cạnh</th>
                            <th style="border:1px solid #93c5fd;padding:6px;">Dài (m)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            edgeLengths.forEach((len, i) => {
                html += `
                    <tr>
                        <td style="border:1px solid #93c5fd;padding:6px;text-align:center;">${i + 1}→${(i + 1) % points.length + 1}</td>
                        <td style="border:1px solid #93c5fd;padding:6px;text-align:right;">${len.toFixed(3)}</td>
                    </tr>
                `;
            });

            html += "</tbody></table>";
            resEl.innerHTML = html;
            resEl.style.display = "block";
        }
    } catch (err) {
        if (statusEl) {
            statusEl.textContent = `⚠ ${err.message}`;
            statusEl.style.color = "#dc3545";
            statusEl.style.fontWeight = "700";
        }
        if (resEl) {
            resEl.style.display = "none";
            resEl.innerHTML = "";
        }
    }
}