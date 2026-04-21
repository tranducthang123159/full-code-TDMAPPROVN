/* =========================
PARCEL SEARCH SYSTEM - API FIRST
========================= */

let parcelList = [];
let filteredParcelList = [];
let parcelEventsInitialized = false;
let parcelSearchSourceType = "dc_moi";
let parcelSearchLoading = false;
let parcelSearchRemoteItems = [];
let parcelSearchRemoteMode = false;

const PARCEL_RENDER_LIMIT = 100;

/* =========================
UTILS
========================= */

function safeLower(value) {
    return (value ?? "").toString().toLowerCase().trim();
}

function debounce(fn, delay = 250) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function setParcelSearchSourceType(type) {
    parcelSearchSourceType = normalizeMapType(type || parcelSearchSourceType || "dc_moi");
}

function getParcelSearchMeta() {
    const currentType = normalizeMapType(parcelSearchSourceType || window.currentFeatureLayerType || "dc_moi");
    return (window.loadedMapMetas && window.loadedMapMetas[currentType])
        || (normalizeMapType(window.currentMapMeta?.type) === currentType ? window.currentMapMeta : null)
        || (currentType !== "dc_moi" ? ((window.loadedMapMetas && window.loadedMapMetas.dc_moi) || null) : null)
        || (currentType !== "dc_cu" ? ((window.loadedMapMetas && window.loadedMapMetas.dc_cu) || null) : null)
        || null;
}

function getParcelSearchFilters() {
    return {
        shbando: safeLower(document.getElementById("searchTo")?.value),
        sotocu: safeLower(document.getElementById("searchToCu")?.value),
        shthua: safeLower(document.getElementById("searchThua")?.value),
        tenchu: safeLower(document.getElementById("searchChu")?.value)
    };
}

function hasParcelKeyword(filters) {
    return !!(filters.shbando || filters.sotocu || filters.shthua || filters.tenchu);
}

function isHeavyParcelSearch(meta) {
    return !!(meta?.id && (
        isMobileUA?.() ||
        Number(meta?.feature_count || 0) >= 10000 ||
        typeof isPmtilesMeta === "function" && isPmtilesMeta(meta)
    ));
}

async function fetchParcelSearchApi(meta, filters) {
    if (!meta?.id) return null;

    const params = new URLSearchParams();
    if (filters.shbando) params.set("shbando", filters.shbando);
    if (filters.sotocu) params.set("sotocu", filters.sotocu);
    if (filters.shthua) params.set("shthua", filters.shthua);
    if (filters.tenchu) params.set("tenchu", filters.tenchu);
    params.set("limit", String(PARCEL_RENDER_LIMIT));

    const res = await fetch(`/api/map-files/${meta.id}/parcel-search?${params.toString()}`, {
        headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        },
        credentials: "same-origin"
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Không tìm kiếm được thửa đất qua API");
    }

    return json;
}

async function resolveRemoteParcelFeature(meta, item) {
    if (!meta?.id) throw new Error("Thiếu map file id");

    const payload = {
        feature_uid: item?.feature_uid || null,
        properties: {
            SHBANDO: item?.shbando ?? null,
            SOTOCU: item?.sotocu ?? null,
            SHTHUA: item?.shthua ?? null,
            TENCHU: item?.tenchu ?? null
        },
        bbox: Array.isArray(item?.bbox) ? item.bbox : null,
        center: Array.isArray(item?.centroid) ? item.centroid : null
    };

    const res = await fetch(`/api/map-files/${meta.id}/parcel-feature-resolve`, {
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
        body: JSON.stringify(payload)
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success || !json?.feature) {
        throw new Error(json?.message || "Không lấy được hình học thửa đất");
    }

    return json.feature;
}

async function ensureParcelSearchData() {
    if (parcelList.length || parcelSearchLoading) return parcelList.length > 0;

    const container = document.getElementById("parcelList");
    const meta = getParcelSearchMeta();

    if (!meta) {
        if (container) {
            container.innerHTML = `<div class="parcel-empty">Chưa có dữ liệu thửa đất để tìm kiếm</div>`;
        }
        return false;
    }

    if (isHeavyParcelSearch(meta)) {
        parcelSearchRemoteMode = true;
        initParcelEvents();
        renderInitialParcelList();
        return true;
    }

    if (!meta?.full_url || typeof fetchGeoJSONCached !== "function") {
        if (meta?.id) {
            parcelSearchRemoteMode = true;
            initParcelEvents();
            renderInitialParcelList();
            return true;
        }
        if (container) {
            container.innerHTML = `<div class="parcel-empty">Chưa có dữ liệu thửa đất để tìm kiếm</div>`;
        }
        return false;
    }

    parcelSearchLoading = true;
    if (container) {
        container.innerHTML = `<div class="parcel-empty">Đang nạp dữ liệu tìm kiếm...</div>`;
    }

    try {
        const geojson = await fetchGeoJSONCached(meta.full_url, "full");
        initParcelSearch(geojson, normalizeMapType(meta.type));
        parcelSearchRemoteMode = false;
        return parcelList.length > 0;
    } catch (err) {
        console.error("ensureParcelSearchData lỗi:", err);
        if (container) {
            container.innerHTML = `<div class="parcel-empty">Không tải được dữ liệu tìm kiếm</div>`;
        }
        return false;
    } finally {
        parcelSearchLoading = false;
    }
}

/* =========================
LOAD DATA
========================= */

function initParcelSearch(data, type = null) {
    if (type) {
        setParcelSearchSourceType(type);
    }

    parcelList = Array.isArray(data?.features) ? data.features : [];
    filteredParcelList = [];
    parcelSearchRemoteItems = [];

    initParcelEvents();
    renderInitialParcelList();
}

/* =========================
INITIAL RENDER
========================= */

function renderInitialParcelList() {
    const container = document.getElementById("parcelList");
    if (!container) return;

    const meta = getParcelSearchMeta();

    if (parcelSearchRemoteMode || isHeavyParcelSearch(meta)) {
        container.innerHTML = `
            <div class="parcel-empty">
                Dữ liệu lớn đang dùng tìm kiếm qua API.<br>
                Hãy nhập tờ, thửa hoặc tên chủ để tìm nhanh.
            </div>
        `;
        return;
    }

    if (!parcelList.length) {
        container.innerHTML = `<div class="parcel-empty">Không có dữ liệu thửa đất</div>`;
        return;
    }

    if (parcelList.length > PARCEL_RENDER_LIMIT) {
        container.innerHTML = `
            <div class="parcel-empty">
                Có <b>${parcelList.length.toLocaleString()}</b> thửa đất.<br>
                Hãy nhập điều kiện tìm kiếm để hiển thị kết quả nhanh hơn.
            </div>
        `;
        return;
    }

    filteredParcelList = parcelList.slice(0, PARCEL_RENDER_LIMIT);
    renderParcelList(filteredParcelList, parcelList.length);
}

/* =========================
RENDER LIST
========================= */

function renderParcelList(list = [], totalMatched = 0) {
    const container = document.getElementById("parcelList");
    if (!container) return;

    if (!list.length) {
        container.innerHTML = `<div class="parcel-empty">Không tìm thấy thửa phù hợp</div>`;
        return;
    }

    let html = "";

    if (totalMatched > list.length) {
        html += `
            <div class="parcel-result-info">
                Tìm thấy <b>${totalMatched.toLocaleString()}</b> kết quả,
                đang hiển thị <b>${list.length}</b> kết quả đầu tiên.
            </div>
        `;
    } else {
        html += `
            <div class="parcel-result-info">
                Tìm thấy <b>${list.length.toLocaleString()}</b> kết quả.
            </div>
        `;
    }

    for (let i = 0; i < list.length; i++) {
        const f = list[i];
        const p = f?.properties || f || {};

        html += `
        <div class="parcel-row" onclick="selectParcel(${i}, true)">
            <div><b>Tờ mới:</b> ${p.SHBANDO ?? p.shbando ?? ""}</div>
         
            <div><b>Thửa:</b> ${p.SHTHUA ?? p.shthua ?? ""}</div>
               <div><b>Tờ cũ:</b> ${p.SOTOCU ?? p.sotocu ?? ""}</div>
            <div><b>Chủ:</b> ${p.TENCHU ?? p.tenchu ?? ""}</div>
        </div>
        `;
    }

    container.innerHTML = html;
}

/* =========================
FILTER
========================= */

async function filterParcel() {
    const filters = getParcelSearchFilters();
    const hasKeyword = hasParcelKeyword(filters);
    const meta = getParcelSearchMeta();

    if (!parcelList.length && !parcelSearchRemoteMode) {
        const ready = await ensureParcelSearchData();
        if (!ready) {
            return;
        }
    }

    if (!hasKeyword) {
        renderInitialParcelList();
        return;
    }

    if (parcelSearchRemoteMode || isHeavyParcelSearch(meta)) {
        const container = document.getElementById("parcelList");
        if (container) {
            container.innerHTML = `<div class="parcel-empty">Đang tìm kiếm qua API...</div>`;
        }

        try {
            const json = await fetchParcelSearchApi(meta, filters);
            parcelSearchRemoteItems = Array.isArray(json?.items) ? json.items : [];
            filteredParcelList = parcelSearchRemoteItems;
            renderParcelList(parcelSearchRemoteItems, Number(json?.total_matched || parcelSearchRemoteItems.length));
        } catch (err) {
            console.error("filterParcel API lỗi:", err);
            if (container) {
                container.innerHTML = `<div class="parcel-empty">${err.message || "Không tìm kiếm được dữ liệu"}</div>`;
            }
        }
        return;
    }

    const result = [];
    let totalMatched = 0;

    for (let i = 0; i < parcelList.length; i++) {
        const f = parcelList[i];
        const p = f?.properties || {};

        const shbando = safeLower(p.SHBANDO);
        const sotocu = safeLower(p.SOTOCU);
        const shthua = safeLower(p.SHTHUA);
        const tenchu = safeLower(p.TENCHU);

        const match =
            (!filters.shbando || shbando.includes(filters.shbando)) &&
            (!filters.sotocu || sotocu.includes(filters.sotocu)) &&
            (!filters.shthua || shthua.includes(filters.shthua)) &&
            (!filters.tenchu || tenchu.includes(filters.tenchu));

        if (match) {
            totalMatched++;

            if (result.length < PARCEL_RENDER_LIMIT) {
                result.push(f);
            }
        }
    }

    filteredParcelList = result;
    renderParcelList(filteredParcelList, totalMatched);
}

/* =========================
EVENTS
========================= */

function initParcelEvents() {
    if (parcelEventsInitialized) return;
    parcelEventsInitialized = true;

    const debouncedFilter = debounce(() => {
        Promise.resolve(filterParcel()).catch((err) => {
            console.error("filterParcel lỗi:", err);
        });
    }, 300);

    document.getElementById("searchTo")?.addEventListener("input", debouncedFilter);
    document.getElementById("searchToCu")?.addEventListener("input", debouncedFilter);
    document.getElementById("searchThua")?.addEventListener("input", debouncedFilter);
    document.getElementById("searchChu")?.addEventListener("input", debouncedFilter);
}

/* =========================
SELECT PARCEL
========================= */

async function selectParcel(i, isFiltered = false) {
    if (window.splitMode) {
        showToast?.("Đang tách thửa, hãy hoàn tất hoặc đóng tách thửa trước", "warning");
        return;
    }

    const meta = getParcelSearchMeta();

    if (parcelSearchRemoteMode || isHeavyParcelSearch(meta)) {
        const feature = filteredParcelList[i] || parcelSearchRemoteItems[i];
        if (!feature) return;

        try {
            const resolved = await resolveRemoteParcelFeature(meta, feature);
            window.currentFeatureLayerType = parcelSearchSourceType;
            window.currentFeature = resolved;
            highlightParcel(resolved);
            showParcelInfo(resolved);
            drawParcelMeasure(resolved);

            const bbox = turf.bbox(resolved);
            map.fitBounds(
                [
                    [bbox[0], bbox[1]],
                    [bbox[2], bbox[3]]
                ],
                { padding: isMobileUA?.() ? 20 : 40, maxZoom: 18 }
            );
        } catch (err) {
            console.error("resolveRemoteParcelFeature lỗi:", err);
            showToast?.(err.message || "Không mở được thửa đất", "error");
        }
        return;
    }

    const sourceList = isFiltered ? filteredParcelList : parcelList;
    const feature = sourceList[i];

    if (!feature) return;

    window.currentFeatureLayerType = parcelSearchSourceType;
    window.currentFeature = feature;
    highlightParcel(feature);
    showParcelInfo(feature);
    drawParcelMeasure(feature);

    const bbox = turf.bbox(feature);

    map.fitBounds(
        [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]]
        ],
        { padding: 40 }
    );
}

/* =========================
TOGGLE UPLOAD
========================= */

function toggleUpload() {
    let body = document.getElementById("uploadBody");
    let arrow = document.getElementById("uploadArrow");

    if (!body || !arrow) return;

    body.classList.toggle("hide");
    arrow.innerHTML = body.classList.contains("hide") ? "▲" : "▼";
}

/* =========================
TOGGLE PARCEL PANEL
========================= */

async function openParcelPanelAndPrepare() {
    initParcelEvents();

    const body = document.getElementById("parcelBody");
    const arrow = document.getElementById("parcelArrow");
    if (!body || !arrow) return;

    body.classList.remove("collapsed");
    arrow.innerHTML = "▲";

    try {
        await ensureParcelSearchData();
    } catch (err) {
        console.warn("openParcelPanelAndPrepare lỗi:", err);
    }
}

function toggleParcelPanel() {
    let body = document.getElementById("parcelBody");
    let arrow = document.getElementById("parcelArrow");

    if (!body || !arrow) return;

    const willOpen = body.classList.contains("collapsed");
    body.classList.toggle("collapsed");
    arrow.innerHTML = body.classList.contains("collapsed") ? "▼" : "▲";

    if (willOpen) {
        initParcelEvents();
        Promise.resolve(ensureParcelSearchData()).catch((err) => {
            console.warn("toggleParcelPanel ensureParcelSearchData lỗi:", err);
        });
    }
}

function bootstrapParcelSearchUi() {
    initParcelEvents();

    ["searchTo", "searchToCu", "searchThua", "searchChu"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el || el.dataset.parcelSearchBound === "1") return;
        el.dataset.parcelSearchBound = "1";
        el.addEventListener("focus", () => {
            Promise.resolve(ensureParcelSearchData()).catch(() => {});
        }, { passive: true });
        el.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                Promise.resolve(filterParcel()).catch((err) => {
                    console.error("filterParcel Enter lỗi:", err);
                });
            }
        });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapParcelSearchUi, { once: true });
} else {
    bootstrapParcelSearchUi();
}

window.openParcelPanelAndPrepare = openParcelPanelAndPrepare;
