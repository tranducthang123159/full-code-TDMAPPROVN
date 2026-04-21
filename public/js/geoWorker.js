self.onmessage = async function (e) {
    try {
        const file = e.data;

        if (!file) {
            throw new Error("Không tìm thấy file");
        }

        const raw = await file.text();
        const geo = JSON.parse(raw);

        if (!geo || geo.type !== "FeatureCollection" || !Array.isArray(geo.features)) {
            throw new Error("File không đúng định dạng GeoJSON");
        }

        postMessage({
            success: true,
            data: geo
        });
    } catch (err) {
        postMessage({
            success: false,
            error: err.message || "Không đọc được file"
        });
    }
};