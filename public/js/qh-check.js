(function () {
    window.qhPanelOpen = false;
    window.qhHighlightSourceId = "qh-intersection-source";
    window.qhHighlightFillId = "qh-intersection-fill";
    window.qhHighlightLineId = "qh-intersection-line";
    window.qhDomMarkers = window.qhDomMarkers || [];
    window.qhLastExportData = null;

    const LOAIDAT_TEN = {
        CLN: "Đất trồng cây lâu năm",
        LUC: "Đất trồng lúa",
        LNK: "Đất trồng cây lâu năm khác",
        NTS: "Đất nuôi trồng thủy sản",
        ONT: "Đất ở tại nông thôn",
        ODT: "Đất ở tại đô thị",
        TMD: "Đất thương mại dịch vụ",
        SKC: "Đất sản xuất kinh doanh",
        SKX: "Đất cụm công nghiệp",
        HNK: "Đất trồng cây hàng năm khác",
        RSX: "Đất rừng sản xuất",
        RPH: "Đất rừng phòng hộ",
        RDD: "Đất rừng đặc dụng",
        NHK: "Đất trồng cây hàng năm khác",
        DGT: "Đất giao thông",
        DTL: "Đất thủy lợi",
        TON: "Đất tôn giáo",
        TIN: "Đất tín ngưỡng",
        DAT: "Đất an ninh",
        DQP: "Đất quốc phòng",
        CSD: "Đất chưa sử dụng",
        BCS: "Đất bằng chưa sử dụng",
        LMU: "Đất làm muối",
        PNK: "Đất phi nông nghiệp khác",
        CQP: "Đất công trình quốc phòng"
    };

    const QH_LABEL_COLOR = "#cc0000";

    function shouldShowQHEdgeMarkers() {
        if (typeof window.SHOW_QH_EDGE_MARKERS === "undefined") return true;
        return !!window.SHOW_QH_EDGE_MARKERS;
    }

    function setDomGroupVisible(selector, visible) {
        document.querySelectorAll(selector).forEach((el) => {
            el.style.display = visible ? "" : "none";
            el.style.visibility = visible ? "" : "hidden";
        });
    }

    function getCurrentParcelFeature() {
        return window.currentFeature || window.currentSelectedFeature || null;
    }

    function getQHCheckButton() {
        return document.getElementById("btnQHCheck") || document.getElementById("btn-qh-check");
    }

    function getQHExportButton() {
        return document.getElementById("btnExportQHPdf") || document.getElementById("btn-export-qh-pdf");
    }

    function getQHPanelRoot() {
        return document.getElementById("qhPanel") || document.getElementById("qh-panel");
    }

    function getQHPanelBody() {
        return document.getElementById("qhPanelBody") || document.getElementById("qh-panel-body");
    }

    function getQHPanelSubtitle() {
        return document.getElementById("qhPanelSubtitle") || document.getElementById("qh-panel-subtitle");
    }

    function notifyQH(message) {
        if (typeof window.showNotice === "function") {
            window.showNotice(message);
            return;
        }
        if (typeof window.showToast === "function") {
            window.showToast(message);
            return;
        }
        alert(message);
    }

    function toggleBaseParcelLabels(visible) {
        if (typeof window.toggleParcelAreaInfoLabel === "function") {
            window.toggleParcelAreaInfoLabel(visible);
        }
        if (typeof window.toggleParcelVertexLabel === "function") {
            window.toggleParcelVertexLabel(visible);
        }
        if (typeof window.toggleParcelEdgeLabel === "function") {
            window.toggleParcelEdgeLabel(visible);
        }

        setDomGroupVisible(".parcel-area-info, .areaLabel[data-label-type='parcel-area-info'], .areaLabel", visible);
        setDomGroupVisible(".vertexLabel", visible);
        setDomGroupVisible(".edgeMarker, .edgeLabel", visible);

        try {
            if (!visible) {
                if (window.edgeLabelsLayer?.clearLayers) window.edgeLabelsLayer.clearLayers();
                if (window.vertexLayer?.clearLayers) window.vertexLayer.clearLayers();
                if (window.measureLabelsLayer?.clearLayers) window.measureLabelsLayer.clearLayers();
            }
        } catch (e) {}
    }


    function ensureQHPanelStyle() {
        if (document.getElementById("qhPanelStyle")) return;

        const style = document.createElement("style");
        style.id = "qhPanelStyle";
        style.textContent = `
            #qhPanel{
                position:fixed;
                left:0;
                right:0;
                bottom:0;
                z-index:10000;
                background:#fff;
                border-top:2px solid #dee2e6;
                box-shadow:0 -4px 18px rgba(0,0,0,.13);
                display:none;
                max-height:28vh;
                overflow:hidden;
                font-family:"Segoe UI",Roboto,sans-serif;
            }
            #qhPanel.active{display:block;}

            .qh-panel-head{
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:10px;
                padding:8px 12px;
                border-bottom:1px solid #dee2e6;
                background:#f5f5f5;
                position:sticky;
                top:0;
                z-index:2;
            }

            .qh-panel-title-wrap{
                display:flex;
                align-items:center;
                gap:8px;
                min-width:0;
                flex:1 1 auto;
                overflow-x:auto;
                white-space:nowrap;
                scrollbar-width:none;
            }
            .qh-panel-title-wrap::-webkit-scrollbar{display:none;}

            .qh-panel-title{
                font-size:12px;
                font-weight:800;
                color:#1a237e;
                flex:0 0 auto;
                white-space:nowrap;
            }

            .qh-panel-sub{
                font-size:12px;
                font-weight:500;
                color:#555;
                flex:0 0 auto;
                white-space:nowrap;
            }

            .qh-panel-actions{
                display:flex;
                align-items:center;
                gap:6px;
                flex:0 0 auto;
            }

            .qh-panel-export{
                background:#6f42c1;
                color:#fff;
                border:none;
                border-radius:6px;
                padding:4px 10px;
                font-size:12px;
                font-weight:700;
                cursor:pointer;
                white-space:nowrap;
            }

            .qh-panel-export:disabled{
                opacity:.55;
                cursor:not-allowed;
            }

            .qh-panel-close{
                background:#dc3545;
                color:white;
                border:none;
                border-radius:50%;
                width:22px;
                height:22px;
                font-size:12px;
                cursor:pointer;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:0;
            }

            .qh-panel-body{
                padding:6px 10px 8px;
                display:flex;
                flex-wrap:nowrap;
                gap:5px;
                align-items:center;
                overflow-x:auto;
                overflow-y:hidden;
                white-space:nowrap;
            }
            .qh-panel-body::-webkit-scrollbar{height:8px;}
            .qh-panel-body::-webkit-scrollbar-thumb{
                background:#cbd5e1;
                border-radius:999px;
            }

            .qh-chip{
                display:flex;
                align-items:center;
                gap:5px;
                padding:3px 8px 3px 5px;
                border-radius:20px;
                background:#f5f5f5;
                border:1.5px solid #e0e0e0;
                white-space:nowrap;
                flex:0 0 auto;
            }

            .qh-swatch{
                width:14px;
                height:14px;
                border-radius:3px;
                border:1.5px solid rgba(0,0,0,.18);
                flex-shrink:0;
            }

            .qh-badge{
                font-weight:800;
                font-size:10px;
                color:#1a237e;
                flex-shrink:0;
            }

            .qh-name{
                font-size:11px;
                color:#444;
                font-weight:500;
            }

            .qh-area{
                font-size:11px;
                font-weight:700;
                color:#c62828;
                margin-left:4px;
            }

            .qh-empty{
                text-align:center;
                color:#555;
                padding:8px 12px;
                font-size:12px;
                font-weight:700;
                white-space:nowrap;
            }

            .qh-map-label{
                background:rgba(255,255,255,.92);
                border-radius:7px;
                padding:4px 8px;
                font-family:"Segoe UI",Roboto,sans-serif;
                box-shadow:0 2px 8px rgba(0,0,0,.22);
                text-align:center;
                min-width:0;
                pointer-events:none;
                line-height:1.15;
                max-width:160px;
            }

            .qh-map-code{
                display:inline-block;
                color:#fff;
                font-weight:800;
                font-size:12px;
                border-radius:4px;
                padding:1px 6px;
                margin-bottom:3px;
                letter-spacing:.5px;
            }

            .qh-map-name{
                font-size:11px;
                color:#333;
                font-weight:600;
                line-height:1.3;
                white-space:normal;
                word-break:break-word;
                overflow-wrap:anywhere;
            }

            .qh-map-area{
                font-size:11px;
                color:#c62828;
                font-weight:800;
                margin-top:2px;
                white-space:normal;
            }

            .qh-map-size{
                display:none;
            }

            .qh-edge-label{
                background:#fff;
                border-radius:4px;
                padding:1px 5px;
                font-size:11px;
                font-weight:800;
                white-space:nowrap;
                box-shadow:0 1px 3px rgba(0,0,0,.15);
                pointer-events:none;
                transform-origin:center center;
            }

            @media (max-width:768px){
                #qhPanel{max-height:34vh;}
                .qh-panel-title{font-size:12px;}
                .qh-panel-sub{font-size:11px;}
                .qh-panel-export{font-size:11px;padding:4px 8px;}
                .qh-map-label{
                    min-width:0;
                    max-width:120px;
                    padding:3px 6px;
                }
                .qh-map-code{font-size:11px;}
                .qh-map-name{font-size:10px;}
                .qh-map-area{font-size:11px;}
                .qh-map-size{font-size:9px;}
                .qh-edge-label{font-size:10px;}
            }
        `;
        document.head.appendChild(style);
    }

    function ensureQHPanel() {
        let panel = getQHPanelRoot();
        if (panel) return panel;

        panel = document.createElement("div");
        panel.id = "qhPanel";
        panel.innerHTML = `
            <div class="qh-panel-head">
                <div class="qh-panel-title-wrap">
                    <div class="qh-panel-title">🗺️ Kiểm tra Quy hoạch</div>
                    <div class="qh-panel-sub" id="qhPanelSubtitle"></div>
                </div>
                <div class="qh-panel-actions">
                    <button class="qh-panel-export" id="btnExportQHPdf" onclick="exportQHPDF()" style="display:none;">📄 Xuất PDF QH</button>
                    <button class="qh-panel-close" onclick="closeQHPanel()">✕</button>
                </div>
            </div>
            <div class="qh-panel-body" id="qhPanelBody"></div>
        `;
        document.body.appendChild(panel);
        return panel;
    }

    function clearQHDomMarkers() {
        if (!window.qhDomMarkers) {
            window.qhDomMarkers = [];
            return;
        }

        window.qhDomMarkers.forEach((m) => {
            try { m.remove(); } catch (e) {}
        });
        window.qhDomMarkers = [];
    }

    function addDomMarker(lngLat, element, anchor = "center") {
        if (!window.map || !window.maplibregl) return null;

        const marker = new maplibregl.Marker({
            element,
            anchor
        }).setLngLat(lngLat).addTo(map);

        window.qhDomMarkers.push(marker);
        return marker;
    }

    function getQHTypeInfo(props = {}) {
        const code = String(
            props.LOAIDAT ||
            props.MA_LOAIDAT ||
            props.KHLOAIDAT ||
            props.MLD ||
            props.MLOAIDAT ||
            props.LandCode ||
            props.LOAI_DAT ||
            props.loaidat ||
            ""
        ).trim();

        const name = String(
            props.TENLOAIDAT ||
            props.TEN_LOAIDAT ||
            props.TenLoaiDat ||
            props.land_name ||
            props.LandName ||
            ""
        ).trim();

        const codeUpper = code.toUpperCase();

        return {
            code: code || "—",
            name: name || LOAIDAT_TEN[codeUpper] || code || "Không xác định"
        };
    }

    function getPlanningData() {
        if (window.geo_quy_hoach && Array.isArray(window.geo_quy_hoach.features)) {
            return window.geo_quy_hoach;
        }

        try {
            const src = map.getSource("quy_hoach");
            if (src && src._data && Array.isArray(src._data.features)) {
                return src._data;
            }
        } catch (e) {}

        return null;
    }

    async function ensurePlanningDataReady() {
        const current = getPlanningData();
        if (current && current.features?.length) return current;

        if (typeof window.ensurePlanningGeoJSONLoaded === "function") {
            try {
                const loaded = await window.ensurePlanningGeoJSONLoaded();
                if (loaded && loaded.features?.length) return loaded;
            } catch (e) {
                console.warn("ensurePlanningGeoJSONLoaded lỗi:", e);
            }
        }

        return getPlanningData();
    }

    async function fetchPlanningCandidatesByApi(parcelFeature) {
        const planningMeta = window.getPlanningMeta ? window.getPlanningMeta() : null;
        if (!planningMeta?.id) return null;

        const res = await fetch(`/api/map-files/${planningMeta.id}/planning-candidates`, {
            method: "POST",
            headers: (typeof buildCsrfHeaders === "function" ? buildCsrfHeaders({
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }) : {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }),
            credentials: "same-origin",
            body: JSON.stringify({
                parcel_feature: parcelFeature,
                limit: 500
            })
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
            throw new Error(json?.message || "Không lấy được dữ liệu quy hoạch qua API");
        }

        return {
            type: "FeatureCollection",
            features: Array.isArray(json?.items) ? json.items : []
        };
    }

    function computeQHIntersections(parcelFeature, qhData = null) {
        const sourceData = qhData || getPlanningData();
        if (!sourceData || !sourceData.features || !sourceData.features.length) return [];

        let parcelTurf;
        try {
            parcelTurf = turf.feature(parcelFeature.geometry);
            if (turf.area(parcelTurf) <= 0) return [];
        } catch (e) {
            return [];
        }

        const results = [];

        sourceData.features.forEach((qf) => {
            if (!qf || !qf.geometry) return;

            try {
                const inter = turf.intersect(parcelTurf, turf.feature(qf.geometry));
                if (!inter) return;

                const area = turf.area(inter);
                if (!Number.isFinite(area) || area < 0.1) return;

                const info = getQHTypeInfo(qf.properties || {});
                const fillColor =
                    qf.properties?.fill ||
                    qf.properties?.["fill-color"] ||
                    qf.properties?.color ||
                    qf.properties?.COLOR ||
                    "#888";

                results.push({
                    code: info.code,
                    name: info.name,
                    area,
                    fillColor,
                    geom: inter
                });
            } catch (e) {}
        });

        results.sort((a, b) => b.area - a.area);
        return results;
    }

    function formatArea(m2) {
        if (!Number.isFinite(m2)) return "0.0";
        return m2 < 10 ? m2.toFixed(2) : m2.toFixed(1);
    }

    function getBoxSizeText(feature) {
        try {
            const box = turf.bbox(feature);
            const width = turf.distance(
                turf.point([box[0], box[1]]),
                turf.point([box[2], box[1]]),
                { units: "kilometers" }
            ) * 1000;

            const height = turf.distance(
                turf.point([box[0], box[1]]),
                turf.point([box[0], box[3]]),
                { units: "kilometers" }
            ) * 1000;

            return `${width.toFixed(1)} × ${height.toFixed(1)} m`;
        } catch (e) {
            return "";
        }
    }

    function getBetterCenter(feature) {
        try {
            let centerPoint = turf.centerOfMass(feature);

            try {
                if (turf.booleanPointInPolygon && !turf.booleanPointInPolygon(centerPoint, feature)) {
                    centerPoint = turf.pointOnFeature(feature);
                }
            } catch (e) {
                centerPoint = turf.pointOnFeature(feature);
            }

            return centerPoint.geometry.coordinates;
        } catch (e) {
            try {
                return turf.pointOnFeature(feature).geometry.coordinates;
            } catch (err) {
                return null;
            }
        }
    }

    function normalizeQHLabelAngle(angle) {
        let a = Number(angle) || 0;
        if (a > 90) a -= 180;
        if (a < -90) a += 180;
        return a;
    }

    function getQHEdgeLabelRotation(a, b) {
        try {
            if (
                window.map && typeof window.map.project === "function" &&
                Array.isArray(a) && Array.isArray(b) &&
                Number.isFinite(Number(a[0])) && Number.isFinite(Number(a[1])) &&
                Number.isFinite(Number(b[0])) && Number.isFinite(Number(b[1]))
            ) {
                const s1 = window.map.project([Number(a[0]), Number(a[1])]);
                const s2 = window.map.project([Number(b[0]), Number(b[1])]);
                const dx = Number(s2.x) - Number(s1.x);
                const dy = Number(s2.y) - Number(s1.y);
                if (Number.isFinite(dx) && Number.isFinite(dy) && (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6)) {
                    return normalizeQHLabelAngle(Math.atan2(dy, dx) * 180 / Math.PI);
                }
            }
        } catch (e) {}

        return normalizeQHLabelAngle((-Math.atan2(Number(b[1]) - Number(a[1]), Number(b[0]) - Number(a[0])) * 180) / Math.PI);
    }

    function getPolygonOuterRings(geometry) {
        if (!geometry) return [];

        if (geometry.type === "Polygon") {
            return Array.isArray(geometry.coordinates?.[0]) ? [geometry.coordinates[0]] : [];
        }

        if (geometry.type === "MultiPolygon") {
            return (geometry.coordinates || [])
                .map(poly => Array.isArray(poly?.[0]) ? poly[0] : null)
                .filter(Boolean);
        }

        return [];
    }

    function getCompactQHLabelItems(items) {
        const grouped = new Map();

        (items || []).forEach((it) => {
            const key = `${String(it.code).toUpperCase()}|${it.fillColor || '#888'}`;
            const current = grouped.get(key);
            if (!current) {
                grouped.set(key, {
                    code: it.code,
                    name: it.name,
                    fillColor: it.fillColor,
                    area: Number(it.area || 0),
                    geom: it.geom,
                    maxArea: Number(it.area || 0)
                });
                return;
            }

            current.area += Number(it.area || 0);
            if (Number(it.area || 0) > current.maxArea) {
                current.maxArea = Number(it.area || 0);
                current.geom = it.geom;
            }
        });

        const merged = Array.from(grouped.values()).sort((a, b) => b.area - a.area);
        const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
        const maxLabels = isMobile ? 4 : 8;
        return merged.slice(0, maxLabels);
    }

    function drawQHLabelMarkers(items) {
        (items || []).forEach((it) => {
            try {
                const coords = getBetterCenter(it.geom);
                if (!coords) return;

                const label = document.createElement("div");
                label.style.background = "rgba(255,255,255,0.88)";
                label.style.border = `2px solid ${QH_LABEL_COLOR}`;
                label.style.borderRadius = "5px";
                label.style.padding = "3px 8px";
                label.style.fontFamily = '"Times New Roman", serif';
                label.style.fontSize = "13px";
                label.style.fontWeight = "bold";
                label.style.color = QH_LABEL_COLOR;
                label.style.boxShadow = "0 2px 6px rgba(0,0,0,0.22)";
                label.style.whiteSpace = "nowrap";
                label.style.pointerEvents = "none";
                label.textContent = `${String(it.code).toUpperCase()}/${formatArea(Number(it.area || 0))} m²`;

                addDomMarker(coords, label, "center");
            } catch (e) {}
        });
    }

    function drawQHEdgeMarkers(items) {
        (items || []).forEach((it) => {
            try {
                const rings = getPolygonOuterRings(it.geom?.geometry);
                rings.forEach((ring) => {
                    for (let i = 0; i < ring.length - 1; i++) {
                        const p1 = ring[i];
                        const p2 = ring[i + 1];
                        if (!Array.isArray(p1) || !Array.isArray(p2)) continue;

                        const dist = turf.distance(
                            turf.point(p1),
                            turf.point(p2),
                            { units: "kilometers" }
                        ) * 1000;

                        if (!Number.isFinite(dist) || dist < 0.2) continue;

                        const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
                        const rot = getQHEdgeLabelRotation(p1, p2);

                        const edge = document.createElement("div");
                        edge.className = "qh-edge-label";
                        edge.style.background = "rgba(255,255,255,0.96)";
                        edge.style.border = `1.5px solid ${QH_LABEL_COLOR}`;
                        edge.style.borderRadius = "4px";
                        edge.style.padding = "1px 5px";
                        edge.style.fontSize = "11px";
                        edge.style.fontWeight = "800";
                        edge.style.lineHeight = "1";
                        edge.style.color = QH_LABEL_COLOR;
                        edge.style.whiteSpace = "nowrap";
                        edge.style.display = "inline-block";
                        edge.style.transformOrigin = "center center";
                        edge.style.transform = `rotate(${rot}deg)`;
                        edge.style.writingMode = "horizontal-tb";
                        edge.style.textOrientation = "mixed";
                        edge.textContent = `${dist.toFixed(1)} m`;

                        addDomMarker(mid, edge, "center");
                    }
                });
            } catch (e) {}
        });
    }

    function clearQHHighlight() {
        clearQHDomMarkers();

        try {
            if (map.getLayer(window.qhHighlightLineId)) map.removeLayer(window.qhHighlightLineId);
            if (map.getLayer(window.qhHighlightFillId)) map.removeLayer(window.qhHighlightFillId);
            if (map.getSource(window.qhHighlightSourceId)) map.removeSource(window.qhHighlightSourceId);
        } catch (e) {
            console.warn("clearQHHighlight lỗi:", e);
        }
    }

    function drawQHHighlight(items) {
        clearQHHighlight();

        const labelItems = getCompactQHLabelItems(items);
        const fc = {
            type: "FeatureCollection",
            features: items.map((it) => ({
                type: "Feature",
                properties: {
                    fill: it.fillColor,
                    code: it.code,
                    name: it.name,
                    area: it.area
                },
                geometry: it.geom.geometry
            }))
        };

        map.addSource(window.qhHighlightSourceId, {
            type: "geojson",
            data: fc
        });

        map.addLayer({
            id: window.qhHighlightFillId,
            type: "fill",
            source: window.qhHighlightSourceId,
            paint: {
                "fill-color": ["coalesce", ["get", "fill"], "#888"],
                "fill-opacity": 0.5
            }
        });

        map.addLayer({
            id: window.qhHighlightLineId,
            type: "line",
            source: window.qhHighlightSourceId,
            paint: {
                "line-color": ["coalesce", ["get", "fill"], "#888"],
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 1.3,
                    14, 2.2,
                    18, 3
                ],
                "line-dasharray": [2, 2]
            }
        });

        drawQHLabelMarkers(labelItems);
        if (shouldShowQHEdgeMarkers()) {
            drawQHEdgeMarkers(items);
        }
    }

    function renderQHPanel(parcelFeature, intersections) {
        ensureQHPanelStyle();
        const panel = ensureQHPanel();
        const body = getQHPanelBody();
        const sub = getQHPanelSubtitle();
        const exportBtn = getQHExportButton();

        if (!panel || !body || !sub) return;

        const p = parcelFeature?.properties || {};
        const soTo = p.SHBANDO ? Math.floor(Number(p.SHBANDO)) : "—";
        const soThua = p.SHTHUA ? Math.floor(Number(p.SHTHUA)) : "—";
        const dienTichNum = Number(p.DIENTICH || 0);
        const dienTich = dienTichNum ? dienTichNum.toFixed(1) : "—";

        sub.textContent = `Tờ ${soTo}, thửa ${soThua} — ${dienTich} m²`;

        const summaryMap = {};
        (intersections || []).forEach((it) => {
            const key = `${String(it.code).toUpperCase()}|${it.fillColor}`;
            if (!summaryMap[key]) {
                summaryMap[key] = {
                    code: it.code,
                    name: it.name,
                    fillColor: it.fillColor,
                    area: 0
                };
            }
            summaryMap[key].area += Number(it.area || 0);
        });

        const summaryItems = Object.values(summaryMap).sort((a, b) => b.area - a.area);

        window.qhLastExportData = {
            parcelFeature,
            parcelProps: p,
            soTo,
            soThua,
            dienTich: dienTichNum,
            intersections: Array.isArray(intersections) ? intersections : [],
            summaryItems,
            exportedAt: new Date().toLocaleString("vi-VN")
        };

        if (!intersections || !intersections.length) {
            body.innerHTML = `<div class="qh-empty">✅ Thửa đất <b>không dính</b> vùng quy hoạch nào.</div>`;
            if (exportBtn) {
                exportBtn.style.display = "none";
                exportBtn.disabled = true;
            }
        } else {
            body.innerHTML = summaryItems.map((s) => `
                <div class="qh-chip">
                    <div class="qh-swatch" style="background:${s.fillColor};"></div>
                    <span class="qh-badge">${String(s.code).toUpperCase()}</span>
                    <span class="qh-name">${s.name}</span>
                    <span class="qh-area">${formatArea(Number(s.area || 0))} m²</span>
                </div>
            `).join("");
            if (exportBtn) {
                exportBtn.style.display = "inline-flex";
                exportBtn.disabled = false;
            }
        }

        panel.classList.add("active");
        panel.style.display = "block";
        window.qhPanelOpen = true;
        toggleBaseParcelLabels(false);
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function loadExternalScript(src) {
        return new Promise((resolve, reject) => {
            const existed = document.querySelector(`script[src="${src}"]`);
            if (existed) {
                if (existed.getAttribute("data-loaded") === "1") {
                    resolve();
                    return;
                }
                existed.addEventListener("load", () => resolve(), { once: true });
                existed.addEventListener("error", reject, { once: true });
                return;
            }

            const s = document.createElement("script");
            s.src = src;
            s.async = true;
            s.onload = () => {
                s.setAttribute("data-loaded", "1");
                resolve();
            };
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    async function ensurePdfLibsReady() {
        if (typeof window.html2canvas !== "function") {
            await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
        }
        if (!(window.jspdf && window.jspdf.jsPDF)) {
            await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
        }
    }

    function requireProj4() {
        if (typeof window.proj4 !== "function") {
            throw new Error("Thiếu proj4. Hãy nạp proj4 trước khi xuất PDF quy hoạch.");
        }
    }

    function getOuterCoords(feature) {
        const geom = feature?.geometry;
        if (!geom) return [];
        if (geom.type === "Polygon") return geom.coordinates?.[0] || [];
        if (geom.type === "MultiPolygon") return geom.coordinates?.[0]?.[0] || [];
        return [];
    }

    function getOrderedVerticesForQH(feature) {
        const coords = getOuterCoords(feature);
        const uniqueCoordsLen = Math.max(0, coords.length - 1);
        const pts = coords.slice(0, uniqueCoordsLen).map((p, i) => ({
            raw: p,
            originalIndex: i
        }));

        if (!pts.length) return [];

        const anchorOriginalIndex = pts[0]?.originalIndex ?? 0;

        let vnPts = pts.map((p) => {
            const xy = proj4("EPSG:4326", "VN2000_Current", [p.raw[0], p.raw[1]]);
            return {
                x: xy[1],
                y: xy[0],
                lng: p.raw[0],
                lat: p.raw[1],
                originalIndex: p.originalIndex,
                _east: xy[0],
                _north: xy[1]
            };
        });

        const signedArea = vnPts.reduce((sum, cur, i) => {
            const next = vnPts[(i + 1) % vnPts.length];
            return sum + (cur._east * next._north - next._east * cur._north);
        }, 0) / 2;

        if (signedArea > 0) {
            vnPts.reverse();
        }

        let startIdx = vnPts.findIndex((p) => p.originalIndex === anchorOriginalIndex);
        if (startIdx < 0) startIdx = 0;

        return [...vnPts.slice(startIdx), ...vnPts.slice(0, startIdx)].map(({ _east, _north, ...rest }, idx) => ({
            ...rest,
            displayIndex: idx
        }));
    }

    function extractZoneRingsVN(item) {
        const rings = [];
        const geom = item?.geom?.geometry;
        if (!geom) return rings;

        const pushRing = (ring) => {
            if (!Array.isArray(ring) || ring.length < 3) return;
            let clean = ring;
            if (
                ring.length > 1 &&
                ring[0][0] === ring[ring.length - 1][0] &&
                ring[0][1] === ring[ring.length - 1][1]
            ) {
                clean = ring.slice(0, -1);
            }

            const vnPts = clean.map((p) => {
                const xy = proj4("EPSG:4326", "VN2000_Current", [p[0], p[1]]);
                return {
                    x: xy[1],
                    y: xy[0],
                    lng: p[0],
                    lat: p[1]
                };
            });

            if (vnPts.length >= 3) rings.push(vnPts);
        };

        if (geom.type === "Polygon") {
            pushRing(geom.coordinates?.[0] || []);
        } else if (geom.type === "MultiPolygon") {
            (geom.coordinates || []).forEach(poly => pushRing(poly?.[0] || []));
        }

        return rings;
    }

    function ptOnSegment(px, py, ax, ay, bx, by) {
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy;
        if (len2 < 1e-12) return null;

        const t = ((px - ax) * dx + (py - ay) * dy) / len2;
        if (t < 1e-6 || t > 1 - 1e-6) return null;

        const projX = ax + t * dx;
        const projY = ay + t * dy;
        const dist = Math.hypot(px - projX, py - projY);
        if (dist > 0.08) return null;

        return t;
    }

    function buildPerimeterPts(orderedPts, qhZones) {
        const allQHPts = [];

        qhZones.forEach((zone) => {
            ((zone.ringsVN && zone.ringsVN.length ? zone.ringsVN : (zone.vnPts ? [zone.vnPts] : [])) || []).forEach((ring) => {
                ring.forEach((p) => {
                    const dup = allQHPts.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 0.02);
                    if (!dup) {
                        allQHPts.push({
                            x: p.x,
                            y: p.y,
                            code: zone.code,
                            fillColor: zone.fillColor
                        });
                    }
                });
            });
        });

        const n = orderedPts.length;
        const perimeterPts = [];

        for (let i = 0; i < n; i++) {
            const a = orderedPts[i];
            const b = orderedPts[(i + 1) % n];

            perimeterPts.push({
                x: a.x,
                y: a.y,
                isOriginal: true,
                isQH: false
            });

            const onEdge = [];
            allQHPts.forEach((q) => {
                const t = ptOnSegment(q.y, q.x, a.y, a.x, b.y, b.x);
                if (t !== null) onEdge.push({ ...q, t });
            });

            onEdge.sort((p1, p2) => p1.t - p2.t);

            onEdge.forEach((q) => {
                perimeterPts.push({
                    x: q.x,
                    y: q.y,
                    isOriginal: false,
                    isQH: true,
                    qhCode: q.code,
                    qhColor: q.fillColor
                });
            });
        }

        const edges = perimeterPts.map((pt, i) => {
            const next = perimeterPts[(i + 1) % perimeterPts.length];
            return Math.hypot(next.x - pt.x, next.y - pt.y);
        });

        return { perimeterPts, perimEdges: edges };
    }

    function buildQHSvg(orderedPts, qhZones, soThua, dienTich, mLoaiDat, perimeterPts, perimEdges) {
        const PAD = 24;
        const W = 300;
        const H = 200;

        if (!orderedPts || orderedPts.length < 2) {
            return `<rect width="${W}" height="${H}" fill="#fff"/>`;
        }

        const allPts = orderedPts;
        const xs = allPts.map((p) => p.y);
        const ys = allPts.map((p) => p.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;
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
        const polyPts = svgPts.map((p) => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ");

        let qhPolygons = "";
        let qhLabels = "";
        qhZones.forEach((zone) => {
            if (!zone.vnPts || zone.vnPts.length < 3) return;
            const zPts = zone.vnPts.map(toSVG);
            const zPolyPts = zPts.map((p) => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ");
            const fc = zone.fillColor || "#888";
            qhPolygons += `<polygon points="${zPolyPts}" fill="${fc}" fill-opacity="0.55" stroke="${fc}" stroke-width="1.2" stroke-linejoin="round" stroke-dasharray="4 2"/>`;

            const cxZ = zPts.reduce((s, p) => s + p.sx, 0) / zPts.length;
            const cyZ = zPts.reduce((s, p) => s + p.sy, 0) / zPts.length;
            const zH = Math.max(...zPts.map((p) => p.sy)) - Math.min(...zPts.map((p) => p.sy));
            const zW = Math.max(...zPts.map((p) => p.sx)) - Math.min(...zPts.map((p) => p.sx));
            const zSize = Math.min(zH, zW);
            const autoFs = Math.max(5.5, Math.min(8.5, zSize * 0.28));
            const lblZ = `${String(zone.code).toUpperCase()}/${formatArea(Number(zone.area || 0))} m²`;
            qhLabels += `
                <text x="${cxZ.toFixed(1)}" y="${cyZ.toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
                      font-size="${autoFs.toFixed(1)}" font-family="Times New Roman,serif" fill="#fff" font-weight="bold"
                      stroke="${fc}" stroke-width="2.5" paint-order="stroke">${escapeHtml(lblZ)}</text>`;

            for (let i = 0; i < zPts.length; i++) {
                const p1 = zPts[i];
                const p2 = zPts[(i + 1) % zPts.length];
                const dist = zone.edges?.[i];
                if (!dist || dist < 0.5) continue;
                const mx = (p1.sx + p2.sx) / 2;
                const my = (p1.sy + p2.sy) / 2;
                const dx = p2.sx - p1.sx;
                const dy = p2.sy - p1.sy;
                let angle = Math.atan2(dy, dx) * 180 / Math.PI;
                if (angle > 90) angle -= 180;
                if (angle < -90) angle += 180;
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len * 7;
                const ny = dx / len * 7;
                qhLabels += `<text x="${(mx + nx).toFixed(1)}" y="${(my + ny).toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
                    font-size="6" fill="#000" font-family="Times New Roman,serif" font-style="italic" font-weight="700"
                    stroke="#fff" stroke-width="2" paint-order="stroke"
                    transform="rotate(${angle.toFixed(1)},${(mx + nx).toFixed(1)},${(my + ny).toFixed(1)})">${Number(dist).toFixed(1)}</text>`;
            }
        });

        let vertexLabels = "";
        const labelPts = perimeterPts
            ? perimeterPts.map(toSVG).map((p, i) => ({ ...p, meta: perimeterPts[i] }))
            : svgPts.map((p) => ({ ...p, meta: { isOriginal: true, isQH: false } }));

        labelPts.forEach((p, i) => {
            const meta = p.meta || {};
            const isQH = !!meta.isQH;
            const r = isQH ? 2 : 2.5;
            const fill = isQH ? (meta.qhColor || "#666") : "#000";
            const textFill = isQH ? (meta.qhColor || "#555") : "#000";
            const prev = labelPts[(i - 1 + labelPts.length) % labelPts.length];
            const next = labelPts[(i + 1) % labelPts.length];
            const cx2 = (prev.sx + next.sx) / 2;
            const cy2 = (prev.sy + next.sy) / 2;
            let dvx = p.sx - cx2;
            let dvy = p.sy - cy2;
            const dvl = Math.hypot(dvx, dvy) || 1;
            dvx = dvx / dvl * 10;
            dvy = dvy / dvl * 10;
            vertexLabels += `
                <circle cx="${p.sx.toFixed(1)}" cy="${p.sy.toFixed(1)}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="0.5"/>
                <text x="${(p.sx + dvx).toFixed(1)}" y="${(p.sy + dvy).toFixed(1)}" text-anchor="middle" dominant-baseline="middle"
                      font-size="${isQH ? 6 : 7}" font-family="Times New Roman,serif" fill="${textFill}"
                      stroke="#fff" stroke-width="1.5" paint-order="stroke">${i + 1}</text>`;
        });

        const labelParts = [mLoaiDat || "", soThua || "", `${parseFloat(dienTich || 0).toFixed(1)} m²`].filter(Boolean);
        const labelText = labelParts.join("/");
        const labelW = Math.min(labelText.length * 5.5 + 8, W - 4);
        const mainLabel = `
            <rect x="2" y="${H - 15}" width="${labelW}" height="13"
                  fill="white" fill-opacity="0.9" stroke="#cc0000" stroke-width="0.8" rx="2"/>
            <text x="5" y="${H - 5}" text-anchor="start" dominant-baseline="auto"
                  font-size="8.5" font-family="Times New Roman,serif" font-weight="bold" fill="#cc0000">${escapeHtml(labelText)}</text>`;

        return `<rect width="${W}" height="${H}" fill="white"/>
  <polygon points="${polyPts}" fill="rgba(200,230,200,0.15)" stroke="#1a5c2a" stroke-width="1.8" stroke-linejoin="round"/>
  ${qhPolygons}
  ${qhLabels}
  ${mainLabel}
  ${vertexLabels}`;
    }

    function buildQHPdfHtml(data) {
        requireProj4();

        const props = data?.parcelProps || {};
        const intersections = Array.isArray(data?.intersections) ? data.intersections : [];
        const soTo = data?.soTo ?? "—";
        const soThua = data?.soThua ?? "—";
        const dienTich = Number(data?.dienTich || 0);
        const tenChu = props.TENCHU || props.tenchu || "";
        const mLoaiDat = props.MLOAIDAT || props.KHLOAIDAT || props.LOAIDAT || props.LOAI_DAT || "";
        const diaChi = props.DIACHI || props.DCRIENG || props.diachi || "";

        const orderedPts = getOrderedVerticesForQH(data.parcelFeature);
        const edgeLengths = orderedPts.map((pt, i) => {
            const next = orderedPts[(i + 1) % orderedPts.length];
            return Math.hypot(next.x - pt.x, next.y - pt.y);
        });

        const qhZones = intersections.map((item) => {
            let geomCoords = [];
            const gtype = item?.geom?.geometry?.type;
            if (gtype === "Polygon") geomCoords = [item.geom.geometry.coordinates[0]];
            else if (gtype === "MultiPolygon") geomCoords = item.geom.geometry.coordinates.map((poly) => poly[0]);

            const ringsVN = [];
            (geomCoords || []).forEach((ring) => {
                if (!Array.isArray(ring) || ring.length < 3) return;
                let cleanRing = ring;
                if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) {
                    cleanRing = ring.slice(0, -1);
                }
                const vnRing = cleanRing.map((p) => {
                    const xy = proj4("EPSG:4326", "VN2000_Current", [p[0], p[1]]);
                    return { x: xy[1], y: xy[0], lat: p[1], lng: p[0] };
                });
                if (vnRing.length >= 3) ringsVN.push(vnRing);
            });

            const vnPts = [...ringsVN].sort((a, b) => b.length - a.length)[0] || [];
            const edges = [];
            for (let i = 0; i < vnPts.length; i++) {
                const p1 = vnPts[i];
                const p2 = vnPts[(i + 1) % vnPts.length];
                edges.push(Math.hypot(p2.x - p1.x, p2.y - p1.y));
            }

            return {
                code: item.code,
                name: item.name,
                area: item.area,
                fillColor: item.fillColor,
                ringsVN,
                vnPts,
                edges
            };
        });

        const { perimeterPts, perimEdges } = buildPerimeterPts(orderedPts, qhZones);
        const svgQH = buildQHSvg(orderedPts, qhZones, soThua, dienTich.toFixed(1), mLoaiDat, perimeterPts, perimEdges);

        const summaryMap = {};
        intersections.forEach((item) => {
            const key = `${String(item.code).toUpperCase()}|${item.fillColor}`;
            if (!summaryMap[key]) {
                summaryMap[key] = {
                    code: item.code,
                    name: item.name,
                    fillColor: item.fillColor,
                    area: 0
                };
            }
            summaryMap[key].area += item.area;
        });
        const summaryList = Object.values(summaryMap).sort((a, b) => b.area - a.area);

        const totalPts = perimeterPts.length;
        const coordFs = totalPts > 30 ? "6.5pt" : totalPts > 20 ? "7pt" : orderedPts.length > 10 ? "7.5pt" : "8.5pt";
        const thFs = totalPts > 30 ? "6.5pt" : totalPts > 20 ? "7pt" : orderedPts.length > 10 ? "7.5pt" : "9pt";
        const rowPad = totalPts > 30 ? "1px 1px" : totalPts > 20 ? "1px 2px" : "2px 3px";
        const dataRowsH = (totalPts + 1) * 18;
        const boxH = Math.min(520, Math.max(240, 52 + dataRowsH + 40));
        const infoFs = orderedPts.length > 16 ? "8.5pt" : orderedPts.length > 10 ? "9.5pt" : "10.5pt";

        let coordRows = "";
        const perimWithClose = [...perimeterPts, perimeterPts[0]];
        perimWithClose.forEach((pt, i) => {
            const isClose = i === perimWithClose.length - 1;
            const stt = isClose ? 1 : i + 1;
            const edgeVal = !isClose ? perimEdges[i].toFixed(2) : "";
            const isQH = pt.isQH;
            const rowStyle = isQH ? `style="background:${pt.qhColor}18;"` : "";
            const sttCell = isQH
                ? `<td class="ct" ${rowStyle}><i style="color:#555;">${stt}</i></td>`
                : `<td class="ct">${stt}</td>`;
            const qhTag = isQH
                ? `<span style="display:inline-block;width:7px;height:7px;background:${pt.qhColor};border-radius:1px;border:1px solid #555;margin-left:2px;vertical-align:middle;" title="${escapeHtml(pt.qhCode)}"></span>`
                : "";

            coordRows += `
                <tr ${isQH ? rowStyle : ""}>
                    ${sttCell}
                    <td class="cn" ${rowStyle}>${pt.x.toFixed(2)}</td>
                    <td class="cn" ${rowStyle}>${pt.y.toFixed(2)}</td>
                    <td class="cn" ${rowStyle}>${edgeVal}${qhTag}</td>
                </tr>
            `;
        });

        let qhRows = "";
        summaryList.forEach((s, idx) => {
            const ratio = dienTich > 0 ? ((s.area / dienTich) * 100).toFixed(1) + "%" : "";
            qhRows += `
                <tr>
                    <td style="text-align:center;border:1px solid #aaa;padding:2px 4px;">${idx + 1}</td>
                    <td style="border:1px solid #aaa;padding:2px 4px;">
                        <span style="display:inline-block;width:10px;height:10px;background:${s.fillColor};border:1px solid #555;margin-right:3px;vertical-align:middle;"></span>
                        <b>${escapeHtml(String(s.code).toUpperCase())}</b>
                    </td>
                    <td style="border:1px solid #aaa;padding:2px 4px;">${escapeHtml(s.name)}</td>
                    <td style="text-align:right;border:1px solid #aaa;padding:2px 4px;font-weight:700;color:#c00;">${formatArea(s.area)}</td>
                    <td style="text-align:right;border:1px solid #aaa;padding:2px 4px;color:#555;">${ratio}</td>
                </tr>
            `;
        });

        const nam = new Date().getFullYear();
        const ktt = window.currentKTT || "105";

        return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>PHIẾU KIỂM TRA QUY HOẠCH THỬA ĐẤT</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 794px; background: #fff; font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; }
  .a4-page { width: 794px; min-height: 1123px; padding: 18mm 14mm 14mm 20mm; background: #fff; position: relative; overflow: hidden; }
  .a4-border { border: 2px solid #111; padding: 8px 10px 10px 10px; min-height: calc(1123px - 32mm); display: flex; flex-direction: column; }
  .quoc-hieu { text-align: center; font-weight: bold; font-size: 12pt; text-transform: uppercase; margin-bottom: 1px; }
  .doc-lap   { text-align: center; font-size: 11pt; font-weight: bold; margin-bottom: 6px; }
  .tieu-de   { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 4px 0 8px 0; text-align: center; }
  .info-line { margin: 2px 0; font-size: ${infoFs}; line-height: 1.55; white-space: nowrap; overflow: hidden; }
  .dot-line  { border-bottom: 1px dotted #555; display: inline-block; min-width: 80px; }
  .line-row  { display: flex; align-items: flex-end; gap: 3px; margin: 2px 0; font-size: ${infoFs}; line-height: 1.55; white-space: nowrap; }
  .line-row .label { flex-shrink: 0; }
  .line-row .dash  { border-bottom: 1px dotted #555; flex: 1; min-width: 30px; display: inline-block; }
  .so9-10 { display: flex; gap: 0; margin-top: 6px; height: ${boxH}px; }
  .so9 { flex: 1; border: 1.5px solid #222; display: flex; flex-direction: column; overflow: hidden; }
  .so9-title  { font-size: 9.5pt; font-weight: bold; padding: 2px 5px; border-bottom: 1.5px solid #555; background: #f9f9f9; flex-shrink: 0; }
  .so9-svg    { width: 100%; flex: 1; display: block; min-height: 0; }
  .so10 { width: 52%; border: 1.5px solid #222; border-left: none; display: flex; flex-direction: column; overflow: hidden; }
  .so10-title { font-size: 9.5pt; font-weight: bold; padding: 2px 5px; border-bottom: 1.5px solid #555; text-align: center; background: #f9f9f9; flex-shrink: 0; }
  .tbl-wrap   { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
  table.coord-tbl { width: 100%; border-collapse: collapse; font-size: ${coordFs}; table-layout: fixed; height: 100%; }
  table.coord-tbl th { border: 1px solid #555; padding: 2px 2px; text-align: center; font-size: ${thFs}; background: #ececec; }
  table.coord-tbl td.ct { border: 1px solid #aaa; padding: ${rowPad}; text-align: center; vertical-align: middle; }
  table.coord-tbl td.cn { border: 1px solid #aaa; padding: ${rowPad}; text-align: right; vertical-align: middle; }
  table.coord-tbl tbody { height: 100%; }
  .note-star  { font-size: 7.5pt; color: #444; margin: 3px 4px; font-style: italic; flex-shrink: 0; }
  .qh-summary { margin-top: 8px; }
  .qh-summary-title { font-size: 10pt; font-weight: bold; margin-bottom: 4px; color: #1a237e; }
  table.qh-tbl { width: 100%; border-collapse: collapse; font-size: 9pt; }
  table.qh-tbl th { background: #1a237e; color: white; border: 1px solid #111; padding: 3px 5px; text-align: center; }
  table.qh-tbl td { font-size: 8.5pt; vertical-align: middle; }
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
    <div class="tieu-de">PHIẾU KIỂM TRA QUY HOẠCH SỬ DỤNG ĐẤT</div>

    <div class="info-line">
      1. Thửa đất số: <span class="dot-line" style="min-width:45px;">${escapeHtml(soThua)}</span>
      &nbsp;; Tờ bản đồ số: <span class="dot-line" style="min-width:45px;">${escapeHtml(soTo)}</span>
      &nbsp;; Diện tích: <span class="dot-line" style="min-width:55px;">${dienTich ? dienTich.toFixed(1) : "—"}</span> m²
    </div>
    <div class="info-line">
      &nbsp;&nbsp;&nbsp;&nbsp;Loại đất hiện trạng: <span class="dot-line" style="min-width:70px;">${escapeHtml(mLoaiDat)}</span>
    </div>
    <div class="info-line">2. Địa chỉ thửa đất: <span class="dot-line" style="min-width:280px;">${escapeHtml(diaChi)}</span></div>
    <div class="info-line">3. Tên người sử dụng đất: <span class="dot-line" style="min-width:200px;">${escapeHtml(tenChu)}</span></div>
    <div class="line-row"><span class="label">4. Đơn vị kiểm tra:</span><span class="dash"></span></div>

    <div class="so9-10">
      <div class="so9">
        <div class="so9-title">9. Sơ đồ quy hoạch thửa đất:</div>
        <svg class="so9-svg" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
          ${svgQH}
        </svg>
      </div>
      <div class="so10">
        <div class="so10-title">10. Tọa độ đỉnh thửa &amp; điểm giao cắt QH</div>
        <div class="tbl-wrap">
          <table class="coord-tbl">
            <thead>
              <tr>
                <th rowspan="2" style="width:12%">Đỉnh</th>
                <th colspan="2">Tọa độ VN-2000(**)</th>
                <th rowspan="2" style="width:18%">C (m)</th>
              </tr>
              <tr>
                <th style="width:28%">X(m)</th>
                <th style="width:28%">Y(m)</th>
              </tr>
            </thead>
            <tbody>${coordRows}</tbody>
          </table>
        </div>
        <div class="note-star">(**) VN-2000, KTT ${escapeHtml(String(ktt))}° &mdash; ■ = điểm giao cắt QH</div>
      </div>
    </div>

    <div class="qh-summary">
      <div class="qh-summary-title">📋 Tổng hợp các vùng quy hoạch giao cắt thửa đất:</div>
      <table class="qh-tbl">
        <thead>
          <tr>
            <th style="width:6%">STT</th>
            <th style="width:14%">Mã LD</th>
            <th>Tên loại đất quy hoạch</th>
            <th style="width:16%">Diện tích (m²)</th>
            <th style="width:12%">Tỷ lệ</th>
          </tr>
        </thead>
        <tbody>${qhRows}</tbody>
      </table>
    </div>

    <div class="sign-row">
      <div class="sign-box">
        <div class="sign-date">............, ngày ..... tháng ..... năm ${nam}</div>
        <div class="sign-role">Cán bộ kiểm tra</div>
        <div class="sign-note">(Ký ghi rõ họ và tên, chức vụ, đóng dấu)</div>
        <div class="sign-name">&nbsp;</div>
      </div>
      <div class="sign-box">
        <div class="sign-date">............, ngày ..... tháng ..... năm ${nam}</div>
        <div class="sign-role">Người sử dụng, quản lý đất</div>
        <div class="sign-note"><i>(Ký ghi rõ họ và tên)</i></div>
        <div class="sign-name">${escapeHtml(tenChu)}</div>
      </div>
    </div>

  </div>
</div>
</body></html>`;
    }

    function renderHtmlToPDF(htmlContent, filename) {
        return new Promise((resolve, reject) => {
            if (typeof html2canvas !== "function" || !(window.jspdf && window.jspdf.jsPDF)) {
                reject(new Error("Thiếu thư viện html2canvas hoặc jsPDF"));
                return;
            }

            const A4_W_PX = 794;
            const A4_H_PX = 1123;

            const iframe = document.createElement("iframe");
            iframe.style.cssText = [
                "position:fixed",
                "left:-9999px",
                "top:0",
                `width:${A4_W_PX}px`,
                `height:${A4_H_PX}px`,
                "border:none",
                "visibility:hidden",
                "overflow:hidden"
            ].join(";");
            document.body.appendChild(iframe);

            const iDoc = iframe.contentDocument || iframe.contentWindow.document;
            iDoc.open();
            iDoc.write(htmlContent);
            iDoc.close();

            setTimeout(() => {
                try {
                    const fixStyle = iDoc.createElement("style");
                    fixStyle.textContent =
                        `html,body{width:${A4_W_PX}px!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff!important;}` +
                        `*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}`;
                    iDoc.head.appendChild(fixStyle);

                    const target = iDoc.querySelector(".a4-page") || iDoc.body;
                    const targetH = target.scrollHeight || A4_H_PX;
                    iframe.style.height = `${targetH}px`;

                    html2canvas(target, {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: "#ffffff",
                        width: A4_W_PX,
                        height: targetH,
                        windowWidth: A4_W_PX,
                        windowHeight: targetH,
                        scrollX: 0,
                        scrollY: 0,
                        logging: false
                    }).then((canvas) => {
                        try {
                            const { jsPDF } = window.jspdf;
                            const pdf = new jsPDF({
                                orientation: "portrait",
                                unit: "mm",
                                format: "a4"
                            });

                            const pageWmm = pdf.internal.pageSize.getWidth();
                            const pageHmm = pdf.internal.pageSize.getHeight();
                            const mmPerPx = pageWmm / A4_W_PX;
                            const pageHCanvasPx = Math.round((pageHmm / mmPerPx) * 2);

                            const canvasW = canvas.width;
                            const canvasH = canvas.height;
                            const totalPages = Math.ceil(canvasH / pageHCanvasPx);

                            for (let page = 0; page < totalPages; page++) {
                                const sliceY = page * pageHCanvasPx;
                                const sliceH = Math.min(pageHCanvasPx, canvasH - sliceY);

                                const sc = document.createElement("canvas");
                                sc.width = canvasW;
                                sc.height = sliceH;

                                const ctx = sc.getContext("2d");
                                ctx.fillStyle = "#ffffff";
                                ctx.fillRect(0, 0, canvasW, sliceH);
                                ctx.drawImage(canvas, 0, sliceY, canvasW, sliceH, 0, 0, canvasW, sliceH);

                                const imgData = sc.toDataURL("image/jpeg", 0.95);
                                const sliceHmm = (sliceH / 2) * mmPerPx;

                                if (page > 0) pdf.addPage();
                                pdf.addImage(imgData, "JPEG", 0, 0, pageWmm, sliceHmm);
                            }

                            pdf.save(filename);
                            document.body.removeChild(iframe);
                            resolve();
                        } catch (err) {
                            document.body.removeChild(iframe);
                            reject(err);
                        }
                    }).catch((err) => {
                        document.body.removeChild(iframe);
                        reject(err);
                    });
                } catch (err) {
                    try { document.body.removeChild(iframe); } catch (e) {}
                    reject(err);
                }
            }, 700);
        });
    }

    window.exportQHPDF = async function exportQHPDF() {
        try {
            const data = window.qhLastExportData;
            if (!data || !data.parcelFeature) {
                alert("Vui lòng chọn thửa đất trước!");
                return;
            }
            if (!Array.isArray(data.intersections) || !data.intersections.length) {
                alert("Thửa đất không dính vùng quy hoạch nào, không cần xuất PDF.");
                return;
            }

            await ensurePdfLibsReady();
            requireProj4();

            if (typeof showLoading === "function") showLoading("Đang tạo file PDF...");
            else showToast?.("Đang tạo file PDF...");

            const html = buildQHPdfHtml(data);
            const filename = `KTQH_To${data.soTo}_Thua${data.soThua}.pdf`;
            await renderHtmlToPDF(html, filename);

            if (typeof hideLoading === "function") hideLoading();
            showToast?.("Xuất PDF quy hoạch thành công");
        } catch (e) {
            if (typeof hideLoading === "function") hideLoading();
            console.error("exportQHPDF lỗi:", e);
            alert("Lỗi xuất PDF quy hoạch: " + (e?.message || e));
        }
    };

    window.toggleQHPanel = async function toggleQHPanel() {
        if (window.qhPanelOpen) {
            closeQHPanel();
            return;
        }

        const parcelFeature = getCurrentParcelFeature();
        if (!parcelFeature || !parcelFeature.geometry) {
            notifyQH("Chưa chọn thửa đất");
            return;
        }

        if (typeof window.ensureCurrentFeatureHydrated === "function") {
            try {
                await window.ensureCurrentFeatureHydrated(window.currentFeatureLayerType || "dc_moi");
            } catch (e) {
                console.warn("Hydrate thửa để kiểm tra quy hoạch lỗi:", e);
            }
        }

        let candidateData = null;
        const planningMeta = window.getPlanningMeta ? window.getPlanningMeta() : null;

        if (!planningMeta && !getPlanningData()) {
            notifyQH("⚠️ Kiểm tra quy hoạch cần có file Quy hoạch. Bạn hãy nạp file QH trước.");
            return;
        }

        try {
            candidateData = await fetchPlanningCandidatesByApi(parcelFeature);
        } catch (apiErr) {
            console.warn("planning-candidates API lỗi, fallback full GeoJSON:", apiErr);
        }

        if (!candidateData || !candidateData.features?.length) {
            const mobileLiteOnly = typeof window.shouldForceMobileLiteApiMode === "function" &&
                window.shouldForceMobileLiteApiMode(planningMeta);

            const qhData = await ensurePlanningDataReady();
            if (mobileLiteOnly && (!qhData || !qhData.features || !qhData.features.length)) {
                notifyQH("Điện thoại đang khóa full GeoJSON. Hãy dùng API hoặc bật file lite/PMTiles để kiểm tra.");
                return;
            }
            if (!qhData || !qhData.features || !qhData.features.length) {
                notifyQH("⚠️ Kiểm tra quy hoạch cần có file Quy hoạch. Bạn hãy nạp file QH trước.");
                return;
            }
            candidateData = qhData;
        }

        const intersections = computeQHIntersections(parcelFeature, candidateData);
        renderQHPanel(parcelFeature, intersections);
        toggleBaseParcelLabels(false);

        if (intersections && intersections.length) {
            drawQHHighlight(intersections);
        } else {
            clearQHHighlight();
        }

        const btn = getQHCheckButton();
        if (btn) btn.classList.add("active");
    };

    window.closeQHPanel = function closeQHPanel() {
        const panel = getQHPanelRoot();
        if (panel) {
            panel.classList.remove("active");
            panel.style.display = "none";
        }

        clearQHHighlight();
        window.qhPanelOpen = false;

        const btn = getQHCheckButton();
        if (btn) btn.classList.remove("active");

        const exportBtn = getQHExportButton();
        if (exportBtn) {
            exportBtn.style.display = "none";
            exportBtn.disabled = true;
        }

        toggleBaseParcelLabels(true);
    };
})();