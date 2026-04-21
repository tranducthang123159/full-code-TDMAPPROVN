/* =========================
UPLOAD FILE + LOAD GEOJSON
========================= */

window.geo_dc_cu = window.geo_dc_cu || null;
window.geo_dc_moi = window.geo_dc_moi || null;
window.geo_quy_hoach = window.geo_quy_hoach || null;
window.uploadGeoMetaCache = window.uploadGeoMetaCache || {};

function normalizeUploadType(type) {
    const mapType = {
        dc_cu: "dccu",
        dc_moi: "dcmoi",
        quy_hoach: "quyhoach",
        dccu: "dccu",
        dcmoi: "dcmoi",
        quyhoach: "quyhoach"
    };
    return mapType[type] || type;
}

function normalizeFrontendType(type) {
    const mapType = {
        dccu: "dc_cu",
        dcmoi: "dc_moi",
        quyhoach: "quy_hoach",
        dc_cu: "dc_cu",
        dc_moi: "dc_moi",
        quy_hoach: "quy_hoach"
    };
    return mapType[type] || type;
}

function getTypeLabel(type) {
    const labels = {
        dc_cu: "Địa chính cũ",
        dc_moi: "Địa chính mới",
        quy_hoach: "Quy hoạch",
        dccu: "Địa chính cũ",
        dcmoi: "Địa chính mới",
        quyhoach: "Quy hoạch"
    };
    return labels[type] || type;
}

function setVipStatusBox(html, type = "normal") {
    const box = document.getElementById("vipUploadStatus");
    if (!box) return;

    box.classList.remove("vip-status-error", "vip-status-warning", "vip-status-success");

    if (type === "error") box.classList.add("vip-status-error");
    if (type === "warning") box.classList.add("vip-status-warning");
    if (type === "success") box.classList.add("vip-status-success");

    box.innerHTML = html;
}

function showUploadMessage(message, type = "normal") {
    setVipStatusBox(message, type);
}

function showLoading() {
    const loading = document.getElementById("loading");
    if (loading) loading.style.display = "flex";
}

function hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) loading.style.display = "none";
}

function normalizeGeoJSON(geoData) {
    return geoData;
}

function getUploadFileCacheKey(file, type) {
    return [
        normalizeUploadType(type),
        file?.name || "",
        file?.size || 0,
        file?.lastModified || 0
    ].join("__");
}

function shouldSkipLocalPreview(file) {
    const sizeMb = (file?.size || 0) / 1024 / 1024;
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
    return isMobile || sizeMb > 3;
}

/* =========================
READ LOCAL GEOJSON
========================= */

function validateGeoJSONStructure(geojson) {
    if (
        !geojson ||
        geojson.type !== "FeatureCollection" ||
        !Array.isArray(geojson.features)
    ) {
        throw new Error("File không đúng định dạng GeoJSON");
    }

    return geojson;
}

async function parseLocalGeoJSONWithWorker(file) {
    return await new Promise((resolve, reject) => {
        const worker = new Worker("/js/geoWorker.js");

        worker.onmessage = function (e) {
            worker.terminate();

            if (e.data?.success) {
                try {
                    resolve(validateGeoJSONStructure(e.data.data));
                } catch (err) {
                    reject(err);
                }
            } else {
                reject(new Error(e.data?.error || "File không hợp lệ"));
            }
        };

        worker.onerror = function () {
            worker.terminate();
            reject(new Error("Không thể đọc file bằng worker"));
        };

        worker.postMessage(file);
    });
}

async function parseLocalGeoJSON(file) {
    if (!file) {
        throw new Error("Không tìm thấy file");
    }

    if (window.Worker) {
        try {
            return await parseLocalGeoJSONWithWorker(file);
        } catch (e) {
            console.warn("Worker đọc file lỗi, chuyển sang đọc thường:", e);
        }
    }

    const raw = await file.text();

    let geojson = null;
    try {
        geojson = JSON.parse(raw);
    } catch (e) {
        throw new Error("File không phải JSON hợp lệ");
    }

    return validateGeoJSONStructure(geojson);
}

/* =========================
LOCAL META
========================= */

function extractAreaCodeFromGeoJSONLocal(geojson) {
    const possibleKeys = [
        "Maxa",
        "maxa",
        "MAXA",
        "ma_xa",
        "ma_xaphuong",
        "ma_phuong",
        "ma_dvhc",
        "ma_donvi",
        "ma_don_vi",
        "ma_xa_phuong",
        "xa_id",
        "ward_code",
        "commune_code",
        "madvhc"
    ];

    const foundCodes = new Set();

    for (const feature of geojson?.features || []) {
        const props = feature?.properties || {};
        if (!props || typeof props !== "object") continue;

        for (const key of possibleKeys) {
            const value = props[key];
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                foundCodes.add(String(value).trim().replace(/\s+/g, ""));
                break;
            }
        }
    }

    const arr = Array.from(foundCodes).filter(Boolean);

    if (arr.length === 1) return arr[0];
    if (arr.length > 1) return "__MULTI_AREA__";
    return null;
}

function computeBBoxLocal(geojson) {
    let minLng = null;
    let minLat = null;
    let maxLng = null;
    let maxLat = null;

    function walk(item) {
        if (!Array.isArray(item)) return;

        if (
            item.length >= 2 &&
            typeof item[0] === "number" &&
            typeof item[1] === "number"
        ) {
            const lng = item[0];
            const lat = item[1];

            minLng = minLng === null ? lng : Math.min(minLng, lng);
            minLat = minLat === null ? lat : Math.min(minLat, lat);
            maxLng = maxLng === null ? lng : Math.max(maxLng, lng);
            maxLat = maxLat === null ? lat : Math.max(maxLat, lat);
            return;
        }

        for (const sub of item) {
            walk(sub);
        }
    }

    for (const feature of geojson?.features || []) {
        walk(feature?.geometry?.coordinates);
    }

    if (minLng === null) return null;

    return [minLng, minLat, maxLng, maxLat];
}

function buildGeoMetaFromGeoJSON(geojson) {
    return {
        feature_count: Array.isArray(geojson?.features) ? geojson.features.length : 0,
        bbox: computeBBoxLocal(geojson),
        detected_area_code: extractAreaCodeFromGeoJSONLocal(geojson)
    };
}

function isMobileUploadUA() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function normalizeAreaCodeValue(value) {
    return String(value ?? "").trim().replace(/\s+/g, "");
}

function getSelectedAreaCodeForUpload() {
    return normalizeAreaCodeValue(document.getElementById("areaSelect")?.value || "");
}

function validateDetectedAreaCode(detectedAreaCode, selectedAreaCode = null) {
    const selected = normalizeAreaCodeValue(selectedAreaCode || getSelectedAreaCodeForUpload());
    const detected = normalizeAreaCodeValue(detectedAreaCode);

    if (!selected) {
        return {
            ok: false,
            reason: "missing-selected-area",
            detected_area_code: detected || null,
            message: "Bạn phải chọn Xã / Phường trước khi upload"
        };
    }

    if (!detectedAreaCode) {
        return {
            ok: false,
            reason: "area-not-found",
            detected_area_code: null,
            message: "Không tìm thấy mã xã trong file GeoJSON"
        };
    }

    if (detectedAreaCode === "__MULTI_AREA__") {
        return {
            ok: false,
            reason: "multi-area",
            detected_area_code: detectedAreaCode,
            message: "File chứa nhiều mã xã khác nhau"
        };
    }

    if (!detected || detected !== selected) {
        return {
            ok: false,
            reason: "area-mismatch",
            detected_area_code: detected || null,
            selected_area_code: selected,
            message: "File không đúng mã xã đã chọn"
        };
    }

    return {
        ok: true,
        reason: null,
        detected_area_code: detected,
        selected_area_code: selected,
        message: "Mã xã hợp lệ"
    };
}

function validateGeoJSONAreaCodeLocal(geojson, selectedAreaCode = null) {
    const detectedAreaCode = extractAreaCodeFromGeoJSONLocal(geojson);
    return validateDetectedAreaCode(detectedAreaCode, selectedAreaCode);
}

async function ensureLocalAreaCodeMatchesSelection(file, type, options = {}) {
    const selectedAreaCode = normalizeAreaCodeValue(options.selectedAreaCode || getSelectedAreaCodeForUpload());
    if (!selectedAreaCode) {
        throw new Error("Bạn phải chọn Xã / Phường trước khi upload");
    }

    const cacheKey = getUploadFileCacheKey(file, type);
    window.uploadGeoMetaCache = window.uploadGeoMetaCache || {};

    let meta = window.uploadGeoMetaCache[cacheKey] || null;
    const sizeMb = (file?.size || 0) / 1024 / 1024;
    const allowLocalRead = options.forceRead === true || (!meta && sizeMb <= (isMobileUploadUA() ? 8 : 20));

    if (!meta && allowLocalRead) {
        const geojson = normalizeGeoJSON(await parseLocalGeoJSON(file));
        meta = buildGeoMetaFromGeoJSON(geojson);
        window.uploadGeoMetaCache[cacheKey] = meta;
    }

    if (!meta) {
        return {
            ok: true,
            checked: false,
            skipped: true,
            reason: "local-check-skipped",
            message: "Bỏ qua kiểm tra mã xã cục bộ, máy chủ sẽ kiểm tra lại"
        };
    }

    const result = validateDetectedAreaCode(meta.detected_area_code, selectedAreaCode);
    if (!result.ok) {
        throw new Error(result.message || "Dữ liệu không trùng khớp mã xã đã chọn");
    }

    return {
        ...result,
        checked: true,
        skipped: false,
        meta
    };
}

window.normalizeAreaCodeValue = normalizeAreaCodeValue;
window.getSelectedAreaCodeForUpload = getSelectedAreaCodeForUpload;
window.validateDetectedAreaCode = validateDetectedAreaCode;
window.validateGeoJSONAreaCodeLocal = validateGeoJSONAreaCodeLocal;
window.ensureLocalAreaCodeMatchesSelection = ensureLocalAreaCodeMatchesSelection;

/* =========================
ERROR NORMALIZE
========================= */

function normalizeUploadErrorMessage(message) {
    message = String(message || "Lỗi không xác định");

    if (
        message.includes("file không đúng mã xã đã chọn") ||
        message.includes("không tìm thấy mã xã trong file GeoJSON") ||
        message.includes("file chứa nhiều mã xã khác nhau") ||
        message.includes("Dữ liệu không hợp lệ") ||
        message.includes("Dữ liệu không trùng khớp")
    ) {
        return "Dữ liệu không trùng khớp mã xã đã chọn";
    }

    if (
        message.includes("AbortError") ||
        message.includes("timeout") ||
        message.includes("Hosting phản hồi quá chậm")
    ) {
        return "Hosting phản hồi quá chậm, upload bị timeout";
    }

    if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError") ||
        message.includes("Load failed")
    ) {
        return "Không kết nối được máy chủ hoặc upload bị gián đoạn";
    }

    if (
        message.includes("413") ||
        message.includes("Payload Too Large")
    ) {
        return "File quá lớn, hosting đang từ chối upload";
    }

    if (
        message.includes("419")
    ) {
        return "Phiên đăng nhập đã hết hạn, hãy tải lại trang";
    }

    if (
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("504") ||
        message.includes("524")
    ) {
        return "Hosting đang xử lý quá chậm hoặc máy chủ bị lỗi tạm thời";
    }

    return message;
}

/* =========================
UPLOAD ONLY
========================= */


async function getAreaTicket(provinceCode, areaCode) {
    const csrf = typeof getCsrfToken === "function" ? getCsrfToken() : (document.querySelector('meta[name="csrf-token"]')?.content || "");

    const response = await fetch("/upload-map-ticket", {
        method: "POST",
        headers: (typeof buildCsrfHeaders === "function" ? buildCsrfHeaders({
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        }) : {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrf,
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        }),
        credentials: "same-origin",
        body: JSON.stringify({
            province_code: provinceCode,
            area_code: areaCode
        })
    });

    let data = {};
    try {
        data = await response.json();
    } catch (e) {
        throw new Error("Không đọc được phản hồi lấy area_ticket");
    }

    if (!response.ok || !data.success || !data.area_ticket) {
        throw new Error(data.message || "Không lấy được vé xác thực địa bàn");
    }

    return data.area_ticket;
}

async function uploadOnly(file, type) {
    const backendType = normalizeUploadType(type);
    const csrf = typeof getCsrfToken === "function" ? getCsrfToken() : (document.querySelector('meta[name="csrf-token"]')?.content || "");

    const provinceCode = document.getElementById("provinceSelect")?.value || "";
    const areaCode = document.getElementById("areaSelect")?.value || "";

    if (typeof ensureLocalAreaCodeMatchesSelection === "function") {
        await ensureLocalAreaCodeMatchesSelection(file, type, {
            forceRead: !shouldSkipLocalPreview(file)
        });
    }

    if (!window.uploadPolicy?.canUploadMap) {
        throw new Error("Tài khoản hiện không có quyền upload. Vui lòng gia hạn VIP.");
    }

    if (!provinceCode) {
        throw new Error("Bạn phải chọn Tỉnh / Thành phố trước khi upload");
    }

    if (!areaCode) {
        throw new Error("Bạn phải chọn Xã / Phường trước khi upload");
    }

    const areaTicket = await getAreaTicket(provinceCode, areaCode);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", backendType);
    formData.append("province_code", provinceCode);
    formData.append("area_code", areaCode);
    formData.append("area_ticket", areaTicket);

    // Bật chế độ lưu nhanh: server ưu tiên save file + summary + lite/ultra,
    // còn PMTiles và parcel index sẽ build sau ở request nền riêng.
    formData.append("fast_mode", "1");

    const controller = new AbortController();

    // Tăng timeout theo dung lượng file để tránh host save chậm bị cắt ngang
    const sizeMb = (file?.size || 0) / 1024 / 1024;

    let timeoutMs = 300000;
    if (sizeMb > 10) timeoutMs = 600000;
    if (sizeMb > 25) timeoutMs = 900000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res;

    try {
        res = await fetch("/upload-map", {
            method: "POST",
            headers: (typeof buildCsrfHeaders === "function" ? buildCsrfHeaders({
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }) : {
                "X-CSRF-TOKEN": csrf,
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            }),
            credentials: "same-origin",
            body: formData,
            signal: controller.signal
        });
    } catch (err) {
        console.error("uploadOnly fetch lỗi:", {
            name: err?.name,
            message: err?.message,
            type,
            fileName: file?.name,
            fileSize: file?.size
        });

        if (err.name === "AbortError") {
            throw new Error("Hosting phản hồi quá chậm, upload bị timeout");
        }

        throw new Error("Không kết nối được máy chủ hoặc upload bị gián đoạn");
    } finally {
        clearTimeout(timeoutId);
    }

    const text = await res.text();

    let data = null;
    try {
        data = JSON.parse(text);
    } catch (e) {
        if (res.status === 413) {
            throw new Error("File quá lớn, hosting đang từ chối upload");
        }

        if (!res.ok) {
            throw new Error(`Upload lỗi HTTP ${res.status}`);
        }

        throw new Error("upload-map đang trả HTML hoặc text, không phải JSON");
    }

    if (!res.ok || !data.success) {
        let message = data?.message || `Upload lỗi HTTP ${res.status}`;
        message = normalizeUploadErrorMessage(message);
        throw new Error(message);
    }

    return data;
}

window.__artifactPollers = window.__artifactPollers || {};

function getPrepareArtifactsUrl(metaOrData) {
    return metaOrData?.background_prepare_url
        || metaOrData?.api_urls?.prepare_artifacts
        || (metaOrData?.id ? `/api/map-files/${metaOrData.id}/prepare-artifacts` : null);
}

async function kickOffDeferredArtifactBuild(metaOrData) {
    const url = getPrepareArtifactsUrl(metaOrData);
    if (!url) return false;

    try {
        const csrf = typeof getCsrfToken === "function" ? getCsrfToken() : (document.querySelector('meta[name="csrf-token"]')?.content || "");
        const res = await fetch(url, {
            method: 'POST',
            headers: (typeof buildCsrfHeaders === 'function' ? buildCsrfHeaders({
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }) : {
                'X-CSRF-TOKEN': csrf,
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }),
            credentials: 'same-origin'
        });

        if (!res.ok) return false;
        return true;
    } catch (e) {
        console.warn('Không kick được build nền:', e);
        return false;
    }
}

function startArtifactPolling(mapId, options = {}) {
    if (!mapId || typeof window.startSavedMapPmtilesPolling !== 'function') return false;
    return window.startSavedMapPmtilesPolling(mapId, options);
}

/* =========================
PREVIEW LOCAL
========================= */

async function previewLocalOnly(file, type) {
    const frontendType = normalizeFrontendType(type);

    if (shouldSkipLocalPreview(file)) {
        return {
            rendered: false,
            skipped: true,
            reason: "quick-preview-disabled"
        };
    }

    const localGeojson = await parseLocalGeoJSON(file);
    const normalizedGeojson = normalizeGeoJSON(localGeojson);
    const geoMeta = buildGeoMetaFromGeoJSON(normalizedGeojson);
    const areaCheck = validateGeoJSONAreaCodeLocal(normalizedGeojson);

    if (!areaCheck?.ok) {
        throw new Error(areaCheck?.message || "Dữ liệu không trùng khớp mã xã đã chọn");
    }

    if (typeof getUploadFileCacheKey === "function") {
        const cacheKey = getUploadFileCacheKey(file, type);
        window.uploadGeoMetaCache[cacheKey] = geoMeta;
    }

    if (typeof renderMapByType === "function") {
        renderMapByType(frontendType, normalizedGeojson);
    } else {
        throw new Error("Thiếu hàm renderMapByType");
    }

    window.fullLoaded = true;
    window.liteLoaded = true;
    window.ultraLoaded = true;

    return {
        rendered: true,
        skipped: false,
        geojson: normalizedGeojson,
        meta: geoMeta,
        area_check: areaCheck
    };
}

/* =========================
UPLOAD + LOAD SINGLE FILE
(flow: hiện trước -> lưu sau)
========================= */

async function uploadAndLoad(file, type) {
    const frontendType = normalizeFrontendType(type);

    try {
        if (!window.uploadPolicy?.canUploadMap) {
            throw new Error("Tài khoản hiện không có quyền upload. Vui lòng gia hạn VIP.");
        }

        const provinceCode = document.getElementById("provinceSelect")?.value || "";
        const areaCode = document.getElementById("areaSelect")?.value || "";

        if (!provinceCode) {
            throw new Error("Bạn phải chọn Tỉnh / Thành phố trước khi upload");
        }

        if (!areaCode) {
            throw new Error("Bạn phải chọn Xã / Phường trước khi upload");
        }

        const canPreviewLocal = !shouldSkipLocalPreview(file);

        if (canPreviewLocal) {
            showUploadMessage(`
                <strong>Đang hiển thị bản đồ...</strong><br>
                Hệ thống đang đọc file trên máy của bạn
            `, "warning");

            await previewLocalOnly(file, frontendType);

            showUploadMessage(`
                <strong>Đã hiển thị bản đồ</strong><br>
                Dữ liệu đang được lưu lên hệ thống...
            `, "warning");
        } else {
            showUploadMessage(`
                <strong>Đang lưu bản đồ...</strong><br>
                File lớn hoặc đang dùng điện thoại, hệ thống sẽ hiển thị từ máy chủ
            `, "warning");
        }

        const data = await uploadOnly(file, type);

        if (data?.id && typeof registerLoadedMapMeta === "function") {
            const mergedMeta = {
                ...(window.currentMapMeta || {}),
                ...data,
                type: frontendType
            };
            window.currentMapMeta = mergedMeta;
            registerLoadedMapMeta(frontendType, mergedMeta, data?.render_mode || (data?.pmtiles_ready ? "pmtiles" : "geojson"));
            if (!data?.pmtiles_ready) {
                kickOffDeferredArtifactBuild(mergedMeta);
            }
        }

        if ((!canPreviewLocal || isMobileUA()) && data?.id && typeof viewSavedMap === "function") {
            try {
                await viewSavedMap(data.id, { closeSavedPanel: false, silent: true, autoSwitchPmtiles: true });
            } catch (viewErr) {
                console.warn("viewSavedMap sau upload lỗi:", viewErr);
            }
        }

        if (data?.id && !data?.pmtiles_ready) {
            startArtifactPolling(data.id, { intervalMs: isMobileUA() ? 7000 : 3500, maxAttempts: isMobileUA() ? 180 : 90 });
        }

        let msg = `<strong>Tải lên thành công</strong><br>${data.name || file.name}`;
        if (data.message) {
            msg += `<br>${data.message}`;
        }
        if (Array.isArray(data.processing_errors) && data.processing_errors.length) {
            msg += `<br>${data.processing_errors.join("<br>")}`;
        }

        showUploadMessage(msg, "success");

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

        return data;
    } catch (err) {
        console.error("Upload lỗi:", err);

        let message = normalizeUploadErrorMessage(err.message || "Failed to fetch");

        if (typeof removeMapByType === "function") {
            removeMapByType(frontendType);
        }

        showUploadMessage(`
            <strong>Upload thất bại</strong><br>
            ${message}
        `, "error");

        throw err;
    }
}

/* =========================
VIP / INPUT LOCK
========================= */

function refreshUploadInputsByVip() {
    const canUpload = !!window.uploadPolicy?.canUploadMap;

    ["dc_cu", "dc_moi", "quy_hoach", "provinceSelect", "areaSelect"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        if (!canUpload) {
            el.disabled = true;
            el.dataset.locked = "1";
        } else {
            if (id !== "provinceSelect" && id !== "areaSelect") {
                el.disabled = false;
                el.dataset.locked = "0";
            }
        }
    });
}