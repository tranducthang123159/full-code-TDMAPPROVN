(function () {
  const SPLIT_RESULT_SOURCE = 'tdmap_split_result_source';
  const SPLIT_ACTIVE_SOURCE = 'tdmap_split_active_source';
  const SPLIT_RESULT_FILL = 'tdmap_split_result_fill';
  const SPLIT_RESULT_LINE = 'tdmap_split_result_line';
  const SPLIT_ACTIVE_FILL = 'tdmap_split_active_fill';
  const SPLIT_ACTIVE_LINE = 'tdmap_split_active_line';

  window.splitMode = window.splitMode || false;
  window.splitAction = null;
  window.splitSelectedVertices = [];
  window.splitPolygons = [];
  window.splitNewLinePickMode = false;
  window.orderedPtsTmp = [];
  window.rootFeatureSnapshot = null;
  window.originalFeatureSnapshot = null;
  window.currentSelectedFeature = window.currentSelectedFeature || null;

  let splitMarkers = [];
  let splitActiveInfoMarkers = [];
  let splitResultInfoMarkers = [];
  let splitCreatedPointMarker = null;
  let splitCreatedPointTimeout = null;
  let splitBound = false;
  let splitCanvasLockInstalled = false;
  let splitCanvasLockTarget = null;
  let splitInteractionGuardBound = false;

  function getMap() {
    return window.map || null;
  }

  function getFeatureLockKey(feature) {
    if (!feature) return '';
    const props = feature.properties || {};
    const parts = [
      feature.id,
      props.id,
      props.ID,
      props.objectid,
      props.OBJECTID,
      props.objectid_1,
      props.OBJECTID_1,
      props.fid,
      props.FID,
      props.feature_uid,
      props.FEATURE_UID,
      props.uid,
      props.UID,
      props.SHBANDO,
      props.SHTHUA,
      props.shbando,
      props.shthua
    ].filter(v => v !== undefined && v !== null && String(v).trim() !== '');
    return parts.map(v => String(v).trim()).join('|');
  }

  function isSameLockedParcel(featureA, featureB) {
    if (!featureA || !featureB) return false;

    const keyA = getFeatureLockKey(featureA);
    const keyB = getFeatureLockKey(featureB);
    if (keyA && keyB) return keyA === keyB;

    try {
      const ringA = getFeatureOuterRing(featureA);
      const ringB = getFeatureOuterRing(featureB);
      if (!ringA.length || !ringB.length) return false;
      const a0 = ringA[0];
      const b0 = ringB[0];
      return sameCoordLoose(a0, b0, 1e-9) && ringA.length === ringB.length;
    } catch (_) {
      return false;
    }
  }

  window.isSplitParcelSelectionLocked = function isSplitParcelSelectionLocked(feature) {
    if (!window.splitMode) return false;
    if (window.splitNewLinePickMode) return false;
    if (!feature) return true;
    return !isSameLockedParcel(window.currentSelectedFeature, feature);
  };

  function isSplitOverlayTarget(target) {
    if (!target || typeof target.closest !== 'function') return false;
    return Boolean(
      target.closest('#split-panel') ||
      target.closest('.maplibregl-marker') ||
      target.closest('.maplibregl-popup') ||
      target.closest('.maplibregl-ctrl')
    );
  }

  function handleSplitCanvasLockEvent(ev) {
    if (!window.splitMode) return;
    if (window.splitNewLinePickMode) return;
    if (isSplitOverlayTarget(ev.target)) return;

    if (typeof ev.preventDefault === 'function') ev.preventDefault();
    if (typeof ev.stopPropagation === 'function') ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
  }

  function handleSplitMapInteractionGuard(e) {
    if (!window.splitMode) return;
    if (window.splitNewLinePickMode) return;

    const originalEvent = e?.originalEvent || e;
    if (isSplitOverlayTarget(originalEvent?.target)) return;

    if (typeof e?.preventDefault === 'function') e.preventDefault();
    if (typeof originalEvent?.preventDefault === 'function') originalEvent.preventDefault();
    if (typeof originalEvent?.stopPropagation === 'function') originalEvent.stopPropagation();
    if (typeof originalEvent?.stopImmediatePropagation === 'function') originalEvent.stopImmediatePropagation();
  }

  function bindSplitInteractionGuard() {
    if (splitInteractionGuardBound) return;
    const map = getMap();
    if (!map) return;

    ['click', 'dblclick', 'contextmenu', 'touchend'].forEach((eventName) => {
      if (typeof map.on === 'function') {
        map.on(eventName, handleSplitMapInteractionGuard);
      }
    });

    splitInteractionGuardBound = true;
  }

  function installSplitCanvasLock() {
    if (splitCanvasLockInstalled) return;
    const map = getMap();
    if (!map) return;
    const container =
      (typeof map.getCanvasContainer === 'function' && map.getCanvasContainer()) ||
      (typeof map.getContainer === 'function' && map.getContainer()) ||
      null;
    if (!container) return;

    splitCanvasLockTarget = container;
    ['click', 'dblclick', 'contextmenu', 'mouseup', 'touchend', 'pointerup'].forEach((eventName) => {
      container.addEventListener(eventName, handleSplitCanvasLockEvent, true);
    });
    bindSplitInteractionGuard();
    splitCanvasLockInstalled = true;
  }

  function removeSplitCanvasLock() {
    if (!splitCanvasLockInstalled || !splitCanvasLockTarget) return;
    ['click', 'dblclick', 'contextmenu', 'mouseup', 'touchend', 'pointerup'].forEach((eventName) => {
      splitCanvasLockTarget.removeEventListener(eventName, handleSplitCanvasLockEvent, true);
    });
    splitCanvasLockInstalled = false;
    splitCanvasLockTarget = null;
  }

  function getLngLatFromEvent(e) {
    if (!e) return null;
    if (e.lngLat && Number.isFinite(e.lngLat.lng) && Number.isFinite(e.lngLat.lat)) {
      return { lng: e.lngLat.lng, lat: e.lngLat.lat };
    }
    if (e.latlng && Number.isFinite(e.latlng.lng) && Number.isFinite(e.latlng.lat)) {
      return { lng: e.latlng.lng, lat: e.latlng.lat };
    }
    return null;
  }

  function isSplitCompactMobile() {
    return window.matchMedia ? window.matchMedia('(max-width: 768px)').matches : window.innerWidth <= 768;
  }

  function syncSplitPanelLayout() {
    const panel = document.getElementById('split-panel');
    const distanceBox = document.getElementById('split-distance-box');
    if (!panel || !distanceBox) return;

    const compact = isSplitCompactMobile();
    const showDistanceBox = !compact || (window.splitMode && window.splitAction === 'insert-point');

    panel.classList.toggle('compact-mobile', compact);
    panel.classList.toggle('show-distance-box', !!showDistanceBox);
    distanceBox.style.display = showDistanceBox ? (compact ? 'grid' : 'flex') : 'none';
  }

  function ensureSplitPanelUI() {
    if (document.getElementById('split-panel')) return;

    const style = document.createElement('style');
    style.id = 'splitPanelStyleProMapLibre';
    style.textContent = `
      #split-panel{
        display:none;
        position:fixed;
        top:52px;
        left:28px;
        right:28px;
        z-index:9998;
        background:#f5f5f5;
        border:1px solid #d7d7d7;
        border-radius:16px;
        box-shadow:0 10px 28px rgba(0,0,0,.18);
        overflow:hidden;
        font-family:"Segoe UI",Roboto,sans-serif;
        max-width:720px;
        margin:0 auto;
      }

      #split-panel.active{display:block;}

      #split-panel-header{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        padding:12px 14px;
        background:#ececec;
        border-bottom:1px solid #d9d9d9;
        color:#3b3f46;
        font-weight:800;
        font-size:16px;
        cursor:grab;
        touch-action:none;
        user-select:none;
      }

      #split-panel-body{
        padding:12px;
        max-height:62vh;
        overflow:auto;
        -webkit-overflow-scrolling:touch;
      }

      #split-instruction{
        font-size:14px;
        line-height:1.35;
        font-weight:800;
        color:#1e6cf0;
        text-align:center;
        margin-bottom:10px;
      }

      #split-controls{
        display:grid;
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:8px;
        align-items:stretch;
      }

      .split-btn{
        border:none;
        border-radius:10px;
        font-size:13px;
        font-weight:800;
        color:#fff;
        padding:10px 8px;
        cursor:pointer;
        box-shadow:none;
        min-height:42px;
        white-space:normal;
        line-height:1.15;
        text-align:center;
        justify-content:center;
      }

      .split-btn:disabled{
        opacity:.55;
        cursor:not-allowed;
      }

      .btn-split-action{background:#f68b1f;}
      .btn-split-finish{background:#1f9d5b;}
      .btn-split-cancel{background:#6f7780;}
      #btn-new-split-line{background:#2563eb;}
      #btn-export-split-pdf{background:#6d28d9;}

      #split-distance-box{
        display:flex;
        flex-direction:column;
        align-items:stretch;
        justify-content:center;
        gap:8px;
        margin-top:10px;
        padding-top:10px;
        border-top:1px dashed #cfcfcf;
      }

      #split-distance-input,
      #split-distance-from{
        height:40px;
        width:100%;
        border:1px solid #c8c8c8;
        border-radius:10px;
        padding:0 12px;
        font-size:14px;
        background:#fff;
      }

      #split-distance-box .split-help{
        font-size:11px;
        color:#666;
        text-align:center;
        line-height:1.35;
      }

      #split-panel.compact-mobile{
        left:8px;
        right:8px;
        top:auto;
        bottom:8px;
        border-radius:16px;
        max-width:none;
      }

      #split-panel.compact-mobile #split-panel-header{
        font-size:14px;
        padding:10px 12px;
      }

      #split-panel.compact-mobile #split-panel-body{
        padding:10px;
        max-height:32vh;
      }

      #split-panel.compact-mobile #split-instruction{
        font-size:11px;
        margin-bottom:8px;
        line-height:1.25;
        display:-webkit-box;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
        overflow:hidden;
      }

      #split-panel.compact-mobile #split-controls{
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:6px;
      }

      #split-panel.compact-mobile .split-btn{
        font-size:11px;
        min-height:38px;
        padding:8px 6px;
        border-radius:9px;
      }

      #split-panel.compact-mobile #split-distance-box{
        display:none;
      }

      #split-panel.compact-mobile.show-distance-box #split-distance-box{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
      }

      #split-panel.compact-mobile.show-distance-box #split-distance-box .split-help{
        display:none;
      }

      @media (max-width:420px){
        #split-panel.compact-mobile #split-controls{
          grid-template-columns:repeat(2, minmax(0,1fr));
        }
      }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'split-panel';
    panel.innerHTML = `
      <div id="split-panel-header">
        <span>✂ Tách thửa</span>
        <span style="font-size:11px;color:#888;font-weight:700;">↕ Kéo</span>
      </div>

      <div id="split-panel-body">
        <div id="split-instruction">Chọn chế độ rồi chạm lên thửa để thao tác.</div>

        <div id="split-controls">
          <button class="split-btn btn-split-action" onclick="activateInsertPointMode()" id="btn-insert-split-point">➕ Tạo điểm</button>
          <button class="split-btn btn-split-action" onclick="activateSplitSelection()" id="btn-select-split-line">✂ Chọn đường tách</button>
          <button class="split-btn btn-split-finish" onclick="executeSplit()" id="btn-execute-split">✅ Tách thửa</button>
          <button class="split-btn btn-split-finish" onclick="finishSplitProcess()">✔ Hoàn tất</button>
          <button class="split-btn btn-split-cancel" onclick="undoSplitChanges()" id="btn-undo-split">↩ Hoàn tác</button>
          <button class="split-btn btn-split-cancel" onclick="closeSplitPanel()">✖ Đóng</button>
          <button class="split-btn" id="btn-new-split-line" style="display:none;" onclick="startNewSplitLine()">✂+ Chia tiếp</button>
          <button class="split-btn" id="btn-export-split-pdf" style="display:none;" onclick="exportCurrentSplitPDF()">Xuất Kết Quả📄 PDF tách</button>
        </div>

        <div id="split-distance-box">
          <input type="number" id="split-distance-input" placeholder="Khoảng cách (m)" min="0.001" step="0.001" />
          <select id="split-distance-from">
            <option value="start">Từ đỉnh đầu</option>
            <option value="end">Từ đỉnh cuối</option>
          </select>
          <div class="split-help">Chọn 2 đỉnh liền kề để chèn điểm theo khoảng cách nhập</div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    makeDraggable(panel, document.getElementById('split-panel-header'));
    syncSplitPanelLayout();

    if (!window.__splitPanelResizeBound) {
      window.addEventListener('resize', syncSplitPanelLayout);
      window.__splitPanelResizeBound = true;
    }
  }
  window.ensureSplitPanelUI = ensureSplitPanelUI;

  function makeDraggable(panel, handle) {
    let dragging = false;
    let dx = 0;
    let dy = 0;

    function startDrag(clientX, clientY) {
      const rect = panel.getBoundingClientRect();
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      dragging = true;
      dx = clientX - rect.left;
      dy = clientY - rect.top;
    }

    function moveDrag(clientX, clientY) {
      if (!dragging) return;
      let left = clientX - dx;
      let top = clientY - dy;
      left = Math.max(0, Math.min(left, window.innerWidth - panel.offsetWidth));
      top = Math.max(0, Math.min(top, window.innerHeight - panel.offsetHeight));
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
    }

    function stopDrag() {
      dragging = false;
    }

    handle.addEventListener('mousedown', function (e) {
      startDrag(e.clientX, e.clientY);
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      moveDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', stopDrag);

    handle.addEventListener('touchstart', function (e) {
      const t = e.touches[0];
      if (!t) return;
      startDrag(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      const t = e.touches[0];
      if (!t) return;
      moveDrag(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', stopDrag);
    document.addEventListener('touchcancel', stopDrag);
  }

  function ensureSource(map, id, data) {
    if (map.getSource(id)) map.getSource(id).setData(data);
    else map.addSource(id, { type: 'geojson', data });
  }

  function removeSourceAndLayer(map, source, layers) {
    layers.forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource(source)) map.removeSource(source);
  }

  function clearMarkerGroup(markers) {
    markers.forEach(m => {
      try { m.remove(); } catch (_) {}
    });
    markers.length = 0;
  }

  function clearCreatedPointMarker() {
    if (splitCreatedPointTimeout) {
      clearTimeout(splitCreatedPointTimeout);
      splitCreatedPointTimeout = null;
    }
    if (splitCreatedPointMarker) {
      try { splitCreatedPointMarker.remove(); } catch (_) {}
      splitCreatedPointMarker = null;
    }
  }

  function sameCoordLoose(a, b, eps = 1e-10) {
    return Array.isArray(a) && Array.isArray(b) && Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps;
  }

  function findCreatedVertexDisplayIndex(lng, lat) {
    if (!Array.isArray(window.orderedPtsTmp)) return -1;
    return window.orderedPtsTmp.findIndex(pt => sameCoordLoose([pt.lng, pt.lat], [lng, lat], 1e-9));
  }

  function showCreatedPointMarker(lng, lat) {
    const map = getMap();
    if (!map) return;
    clearCreatedPointMarker();

    const el = document.createElement('div');
    el.style.width = '46px';
    el.style.height = '46px';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <div style="position:relative;width:26px;height:26px;border-radius:50%;background:#fde047;border:3px solid #b45309;box-shadow:0 0 0 6px rgba(253,224,71,.28), 0 3px 10px rgba(0,0,0,.32);">
        <div style="position:absolute;inset:5px;border-radius:50%;background:#f97316;"></div>
      </div>
    `;

    splitCreatedPointMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map);

    if (typeof map.easeTo === 'function') {
      try { map.easeTo({ center: [lng, lat], duration: 350 }); } catch (_) {}
    }

    splitCreatedPointTimeout = setTimeout(() => {
      clearCreatedPointMarker();
    }, 6000);
  }

  function highlightCreatedPoint(lng, lat) {
    const displayIdx = findCreatedVertexDisplayIndex(lng, lat);
    if (displayIdx >= 0 && window.orderedPtsTmp?.[displayIdx]) {
      window.splitSelectedVertices = [window.orderedPtsTmp[displayIdx].originalIndex];
      renderActiveFeature(window.currentSelectedFeature);
      updateSplitInstruction(`Đã tạo điểm mới số ${displayIdx + 1}.`);
    }
    showCreatedPointMarker(lng, lat);
  }

  function clearMarkers() {
    clearMarkerGroup(splitMarkers);
  }

  function clearActiveInfoMarkers() {
    clearMarkerGroup(splitActiveInfoMarkers);
  }

  function clearResultInfoMarkers() {
    clearMarkerGroup(splitResultInfoMarkers);
  }

  function clearAllSplitMarkers() {
    clearMarkers();
    clearActiveInfoMarkers();
    clearResultInfoMarkers();
    clearCreatedPointMarker();
  }

  function getFeatureOuterRing(feature) {
    if (!feature?.geometry) return [];
    if (feature.geometry.type === 'Polygon') return feature.geometry.coordinates[0] || [];
    if (feature.geometry.type === 'MultiPolygon') return feature.geometry.coordinates?.[0]?.[0] || [];
    return [];
  }

  function setFeatureOuterRing(feature, ring) {
    if (!feature?.geometry) return;
    if (feature.geometry.type === 'Polygon') feature.geometry.coordinates = [ring];
    else if (feature.geometry.type === 'MultiPolygon') feature.geometry.coordinates = [[ring]];
  }

  function ensureClosedRing(ring) {
    if (!ring?.length) return ring || [];
    const f = ring[0], l = ring[ring.length - 1];
    if (f[0] !== l[0] || f[1] !== l[1]) return [...ring, [...f]];
    return ring;
  }

  function wgsToVN(pt) {
    if (typeof proj4 === 'undefined') return pt;
    return proj4('EPSG:4326', 'VN2000_Current', [pt[0], pt[1]]);
  }

  function vnToWGS(pt) {
    if (typeof proj4 === 'undefined') return pt;
    return proj4('VN2000_Current', 'EPSG:4326', [pt[0], pt[1]]);
  }

  function segmentLengthMeters(a, b) {
    const av = wgsToVN(a), bv = wgsToVN(b);
    return Math.hypot(bv[0] - av[0], bv[1] - av[1]);
  }

  function normalizeSegmentAngle(angle) {
    let a = Number(angle) || 0;
    if (a > 90) a -= 180;
    if (a < -90) a += 180;
    return a;
  }

  function getSegmentLabelRotation(a, b) {
    const map = getMap();

    try {
      if (map && typeof map.project === 'function') {
        const s1 = map.project([Number(a[0]), Number(a[1])]);
        const s2 = map.project([Number(b[0]), Number(b[1])]);
        const dx = Number(s2.x) - Number(s1.x);
        const dy = Number(s2.y) - Number(s1.y);
        if (Number.isFinite(dx) && Number.isFinite(dy) && (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6)) {
          return normalizeSegmentAngle(Math.atan2(dy, dx) * 180 / Math.PI);
        }
      }
    } catch (_) {}

    return normalizeSegmentAngle((-Math.atan2(Number(b[1]) - Number(a[1]), Number(b[0]) - Number(a[0])) * 180) / Math.PI);
  }

  function pointAlongSegmentByDistance(a, b, dist, from) {
    const av = wgsToVN(a), bv = wgsToVN(b);
    const dx = bv[0] - av[0], dy = bv[1] - av[1];
    const len = Math.hypot(dx, dy);
    if (!isFinite(len) || len <= 0) return null;
    let t = (Math.round(dist * 1000) / 1000) / len;
    if (from === 'end') t = 1 - t;
    if (t <= 0 || t >= 1) return null;
    return vnToWGS([av[0] + dx * t, av[1] + dy * t]);
  }

  function getOrderedVertices(feature) {
    const coords = getFeatureOuterRing(feature);
    if (!Array.isArray(coords) || coords.length < 4) return [];

    const unique = coords.slice(0, -1).map((p, i) => ({ raw: p, originalIndex: i }));
    const anchorOriginalIndex = unique[0]?.originalIndex ?? 0;

    let vnPts = unique.map((p) => {
      const xy = wgsToVN([p.raw[0], p.raw[1]]);
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

  window.getOrderedParcelVertices = window.getOrderedParcelVertices || function (feature) {
    return getOrderedVertices(feature).map(pt => ({ ...pt, exportX: pt.x, exportY: pt.y }));
  };


  function getPaletteByIndex(idx) {
    const colors = [
      { fill: '#22c55e33', stroke: '#15803d', areaBg: '#f0fdf4' },
      { fill: '#8b5cf633', stroke: '#6d28d9', areaBg: '#f5f3ff' },
      { fill: '#f59e0b33', stroke: '#b45309', areaBg: '#fffbeb' },
      { fill: '#2563eb33', stroke: '#1d4ed8', areaBg: '#eff6ff' },
      { fill: '#ef444433', stroke: '#b91c1c', areaBg: '#fef2f2' },
      { fill: '#14b8a633', stroke: '#0f766e', areaBg: '#f0fdfa' }
    ];
    return colors[idx % colors.length];
  }

  function createInfoMarker(lng, lat, html, targetArray, options = {}) {
    const map = getMap();
    if (!map) return null;
    const el = document.createElement('div');
    el.innerHTML = html;
    const root = el.firstElementChild || el;
    if (options.click) {
      root.style.cursor = 'pointer';
      root.style.touchAction = 'none';
      root.style.userSelect = 'none';
      const handleTap = function (ev) {
        ev.stopPropagation();
        if (typeof ev.preventDefault === 'function') ev.preventDefault();
        options.click(ev, root);
      };
      root.addEventListener('click', handleTap);
      root.addEventListener('touchstart', handleTap, { passive: false });
    }
    const marker = new maplibregl.Marker({ element: root, anchor: options.anchor || 'center' })
      .setLngLat([lng, lat])
      .addTo(map);
    targetArray.push(marker);
    return marker;
  }

  function renderEdgeLabelsForFeature(feature, targetArray, options = {}) {
    const coords = getFeatureOuterRing(feature);
    if (!coords || coords.length < 2) return;

    const ordered = options.orderedVertices || getOrderedVertices(feature);
    const labelColor = options.labelColor || '#dc3545';
    const borderColor = options.borderColor || labelColor;
    const bgColor = options.bgColor || '#ffffff';
    const clickable = Boolean(options.clickable);

    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const len = segmentLengthMeters([p1[0], p1[1]], [p2[0], p2[1]]);
      if (!isFinite(len) || len <= 0.3) continue;

      const midLng = (p1[0] + p2[0]) / 2;
      const midLat = (p1[1] + p2[1]) / 2;
      const displayRotation = getSegmentLabelRotation(p1, p2);

      const html = `
        <div style="background:${bgColor};border:1.2px solid ${borderColor};border-radius:3px;padding:1px 4px;font-size:9px;font-weight:800;color:${labelColor};white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.14);display:inline-block;transform-origin:center center;transform:rotate(${displayRotation}deg);line-height:1.1;writing-mode:horizontal-tb;text-orientation:mixed;">${len.toFixed(2)} m</div>
      `;

      createInfoMarker(midLng, midLat, html, targetArray, clickable ? {
        click: function (ev, root) { handleEdgeLabelClick(i, ev, root); }
      } : {});
    }
  }

  function renderAreaLabelForFeature(feature, targetArray, options = {}) {
    if (!feature) return;
    const center = turf.centerOfMass(feature);
    const lng = center.geometry.coordinates[0];
    const lat = center.geometry.coordinates[1];
    const name = options.name || feature.properties?.DISPLAY_NAME || feature.properties?.SHTHUA || 'Thửa';
    const area = Number(feature.properties?.DIENTICH || turf.area(feature)).toFixed(1);
    const stroke = options.stroke || '#334155';
    const bg = options.bg || '#ffffff';
    const fg = options.fg || '#111827';

    const html = `
      <div style="background:${bg};border:1px solid ${stroke};border-radius:5px;padding:3px 6px;min-width:72px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.14);">
        <div style="font-size:10px;font-weight:800;color:${stroke};line-height:1.15;">${name}</div>
        <div style="font-size:9px;font-weight:700;color:${fg};line-height:1.15;">${area} m²</div>
      </div>
    `;
    createInfoMarker(lng, lat, html, targetArray);
  }

  function renderActiveFeatureAnnotations(feature) {
    clearActiveInfoMarkers();
    if (!window.splitMode || !feature) return;
    renderEdgeLabelsForFeature(feature, splitActiveInfoMarkers, {
      orderedVertices: window.orderedPtsTmp,
      labelColor: '#c2410c',
      borderColor: '#fb923c',
      bgColor: '#fff7ed',
      clickable: true
    });
    renderAreaLabelForFeature(feature, splitActiveInfoMarkers, {
      name: feature.properties?.DISPLAY_NAME || feature.properties?.SHTHUA || 'Thửa gốc',
      stroke: '#1d4ed8',
      bg: '#eff6ff',
      fg: '#0f172a'
    });
  }

  function renderResultFeatureAnnotations(features) {
    clearResultInfoMarkers();
    if (!window.splitMode || !Array.isArray(features) || !features.length) return;

    features.forEach((feature, idx) => {
      const palette = getPaletteByIndex(idx);
      renderEdgeLabelsForFeature(feature, splitResultInfoMarkers, {
        labelColor: palette.stroke,
        borderColor: palette.stroke,
        bgColor: '#ffffff',
        clickable: false
      });
      renderAreaLabelForFeature(feature, splitResultInfoMarkers, {
        name: feature.properties?.DISPLAY_NAME || `Thửa ${idx + 1}`,
        stroke: palette.stroke,
        bg: palette.areaBg,
        fg: '#0f172a'
      });
    });
  }

  function renderActiveFeature(feature) {
    const map = getMap();
    if (!map || !feature) return;

    const fc = { type: 'FeatureCollection', features: [feature] };
    ensureSource(map, SPLIT_ACTIVE_SOURCE, fc);

    if (!map.getLayer(SPLIT_ACTIVE_FILL)) {
      map.addLayer({
        id: SPLIT_ACTIVE_FILL,
        type: 'fill',
        source: SPLIT_ACTIVE_SOURCE,
        paint: { 'fill-color': '#0d6efd', 'fill-opacity': 0.18 }
      });
    }

    if (!map.getLayer(SPLIT_ACTIVE_LINE)) {
      map.addLayer({
        id: SPLIT_ACTIVE_LINE,
        type: 'line',
        source: SPLIT_ACTIVE_SOURCE,
        paint: { 'line-color': '#dc3545', 'line-width': 4 }
      });
    }

    clearMarkers();
    window.orderedPtsTmp = getOrderedVertices(feature);

    const tmpSelected = Array.isArray(window._tmpVertexChoice)
      ? window._tmpVertexChoice.map(x => x.realIdx)
      : [];

    window.orderedPtsTmp.forEach((pt, idx) => {
      const selected = window.splitSelectedVertices.includes(pt.originalIndex) || tmpSelected.includes(pt.originalIndex);
      const el = document.createElement('div');
      el.style.width = '42px';
      el.style.height = '42px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.style.background = 'transparent';
      el.style.touchAction = 'none';
      el.style.userSelect = 'none';
      el.style.webkitTapHighlightColor = 'transparent';

      const normalColor = window.splitAction === 'insert-point'
        ? '#f59e0b'
        : (window.splitAction === 'select-cut-line' ? '#16a34a' : '#0d6efd');
      const normalTextColor = window.splitAction === 'insert-point' ? '#111827' : '#ffffff';

      el.innerHTML = `<div style="width:22px;height:22px;border-radius:50%;background:${selected ? '#ef4444' : normalColor};color:${selected ? '#ffffff' : normalTextColor};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,.38);pointer-events:none;">${idx + 1}</div>`;

      const handleVertexTap = function (ev) {
        if (ev) {
          ev.stopPropagation();
          if (typeof ev.preventDefault === 'function') ev.preventDefault();
        }
        onVertexClick(idx, pt.originalIndex);
      };

      if (window.PointerEvent) {
        el.addEventListener('pointerup', handleVertexTap, { passive: false });
      } else {
        el.addEventListener('click', handleVertexTap, { passive: false });
      }

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([pt.lng, pt.lat])
        .addTo(map);

      const markerEl = marker.getElement();
      if (markerEl) markerEl.style.zIndex = '40';
      splitMarkers.push(marker);
    });

    renderActiveFeatureAnnotations(feature);
  }

  function renderSplitResults() {
    const map = getMap();
    if (!map) return;

    if (!Array.isArray(window.splitPolygons) || !window.splitPolygons.length) {
      clearResultInfoMarkers();
      removeSourceAndLayer(map, SPLIT_RESULT_SOURCE, [SPLIT_RESULT_FILL, SPLIT_RESULT_LINE]);
      return;
    }

    const fc = {
      type: 'FeatureCollection',
      features: window.splitPolygons.map((f, i) => ({
        ...f,
        properties: { ...(f.properties || {}), __split_idx: i }
      }))
    };

    ensureSource(map, SPLIT_RESULT_SOURCE, fc);

    if (!map.getLayer(SPLIT_RESULT_FILL)) {
      map.addLayer({
        id: SPLIT_RESULT_FILL,
        type: 'fill',
        source: SPLIT_RESULT_SOURCE,
        paint: {
          'fill-color': ['match', ['get', '__split_idx'], 0, '#22c55e', 1, '#8b5cf6', 2, '#f59e0b', 3, '#2563eb', '#94a3b8'],
          'fill-opacity': 0.28
        }
      });
    }

    if (!map.getLayer(SPLIT_RESULT_LINE)) {
      map.addLayer({
        id: SPLIT_RESULT_LINE,
        type: 'line',
        source: SPLIT_RESULT_SOURCE,
        paint: { 'line-color': '#475569', 'line-width': 2 }
      });
    }

    renderResultFeatureAnnotations(window.splitPolygons);
  }

  function removeSplitLayers() {
    const map = getMap();
    if (!map) return;
    clearAllSplitMarkers();
    removeSourceAndLayer(map, SPLIT_ACTIVE_SOURCE, [SPLIT_ACTIVE_FILL, SPLIT_ACTIVE_LINE]);
    removeSourceAndLayer(map, SPLIT_RESULT_SOURCE, [SPLIT_RESULT_FILL, SPLIT_RESULT_LINE]);
  }

  function updateSplitInstruction(msg) {
    const el = document.getElementById('split-instruction');
    if (el) el.textContent = msg;
    syncSplitPanelLayout();
  }

  function updateSplitBtn() {
    const btn = document.getElementById('btn-select-split-line');
    if (!btn) return;
    const count = window.splitAction === 'select-cut-line' ? window.splitSelectedVertices.length : 0;
    btn.textContent = `✂ Chọn đường tách (${count}/2)`;
    btn.style.outline = window.splitAction === 'select-cut-line' ? '2px solid #fff' : 'none';
  }

  function updateInsertPointBtn() {
    const btn = document.getElementById('btn-insert-split-point');
    if (!btn) return;
    btn.style.outline = window.splitAction === 'insert-point' ? '2px solid #fff' : 'none';
  }

  function updateSplitMainButton() {
    const btn = document.getElementById('btnSplitStart');
    if (!btn) return;
    btn.textContent = window.splitMode ? '❌ Đóng tách thửa' : '✂ Tách thửa';
    btn.style.background = window.splitMode ? '#dc2626' : '#facc15';
    btn.style.color = window.splitMode ? '#fff' : '#111827';
  }
  window.updateSplitMainButtonExternal = updateSplitMainButton;

  function resetSplitState() {
    window.splitAction = null;
    window.splitSelectedVertices = [];
    window._tmpVertexChoice = [];
    updateSplitBtn();
    updateInsertPointBtn();
    syncSplitPanelLayout();
  }

  window.toggleSplitMode = async function toggleSplitMode() {
    ensureSplitPanelUI();
    if (!window.currentFeature) return alert('Vui lòng chọn thửa đất trước!');
    if (window.splitMode) return window.closeSplitPanel();

    if (typeof window.ensureCurrentFeatureHydrated === 'function') {
      try {
        await window.ensureCurrentFeatureHydrated(window.currentFeatureLayerType || 'dc_moi');
      } catch (e) {
        console.warn('Hydrate feature trước khi tách lỗi:', e);
      }
    }

    window.currentSelectedFeature = JSON.parse(JSON.stringify(window.currentFeature));
    window.originalFeatureSnapshot = JSON.parse(JSON.stringify(window.currentFeature));
    window.rootFeatureSnapshot = JSON.parse(JSON.stringify(window.currentFeature));
    window.splitMode = true;
    window.splitPolygons = [];
    window.splitNewLinePickMode = false;

    document.getElementById('split-panel').classList.add('active');
    installSplitCanvasLock();
    syncSplitPanelLayout();
    updateSplitInstruction('Đã khóa thửa hiện tại. Giờ chỉ kéo, zoom, xoay bản đồ và thao tác trên chính thửa này.');
    resetSplitState();
    updateSplitMainButton();
    renderActiveFeature(window.currentSelectedFeature);
    bindSplitMapClick();
  };

  window.closeSplitPanel = function closeSplitPanel() {
    const panel = document.getElementById('split-panel');
    if (panel) panel.classList.remove('active');
    removeSplitLayers();
    removeSplitCanvasLock();
    window.splitMode = false;
    window.splitPolygons = [];
    window.splitNewLinePickMode = false;
    window.currentSelectedFeature = window.currentFeature;
    window.rootFeatureSnapshot = null;
    window.originalFeatureSnapshot = null;
    resetSplitState();
    syncSplitPanelLayout();
    updateSplitMainButton();
  };

  window.undoSplitChanges = function undoSplitChanges() {
    if (!window.originalFeatureSnapshot) return;
    window.currentSelectedFeature = JSON.parse(JSON.stringify(window.originalFeatureSnapshot));
    window.splitPolygons = [];
    window.splitNewLinePickMode = false;
    resetSplitState();
    clearCreatedPointMarker();
    renderSplitResults();
    renderActiveFeature(window.currentSelectedFeature);
    document.getElementById('btn-new-split-line').style.display = 'none';
    document.getElementById('btn-export-split-pdf').style.display = 'none';
    updateSplitInstruction('Đã khôi phục trạng thái ban đầu.');
  };

  window.activateInsertPointMode = function activateInsertPointMode() {
    if (!window.currentSelectedFeature) return alert('Vui lòng chọn thửa đất trước!');
    window.splitAction = 'insert-point';
    window.splitSelectedVertices = [];
    window._tmpVertexChoice = [];
    updateSplitBtn();
    updateInsertPointBtn();
    renderActiveFeature(window.currentSelectedFeature);
    updateSplitInstruction('Tạo điểm: nhập khoảng cách rồi chạm cạnh, hoặc chọn 2 đỉnh liền kề.');
  };

  window.activateSplitSelection = function activateSplitSelection() {
    if (!window.currentSelectedFeature) return alert('Vui lòng chọn thửa đất trước!');
    window.splitAction = 'select-cut-line';
    window.splitSelectedVertices = [];
    window._tmpVertexChoice = [];
    updateSplitBtn();
    updateInsertPointBtn();
    renderActiveFeature(window.currentSelectedFeature);
    updateSplitInstruction('Chọn 2 điểm biên để tạo đường tách.');
  };

  function refreshVertexSelectionByRingIndex(ringIndices) {
    window.splitSelectedVertices = ringIndices.slice();
    renderActiveFeature(window.currentSelectedFeature);
  }

  function insertNewVertexByRingIndex(lng, lat, idx1, idx2) {
    const ring = getFeatureOuterRing(window.currentSelectedFeature).slice(0, -1);
    const n = ring.length;
    if (n < 3) return alert('Ring không hợp lệ.');

    const newPoint = [lng, lat];
    const newRing = [];
    for (let i = 0; i < n; i++) {
      newRing.push(ring[i]);
      const matchForward = i === idx1 && ((i + 1) % n) === idx2;
      const matchBackward = i === idx2 && ((i + 1) % n) === idx1;
      if (matchForward || matchBackward) newRing.push(newPoint);
    }

    setFeatureOuterRing(window.currentSelectedFeature, ensureClosedRing(newRing));
    renderActiveFeature(window.currentSelectedFeature);
  }

  function handleEdgeLabelClick(edgeIdx, clickEvent, rootEl) {
    if (!window.splitMode || !Array.isArray(window.orderedPtsTmp) || !window.orderedPtsTmp.length) return;

    const len = window.orderedPtsTmp.length;
    const i1 = edgeIdx;
    const i2 = (edgeIdx + 1) % len;
    const pt1 = window.orderedPtsTmp[i1];
    const pt2 = window.orderedPtsTmp[i2];

    if (!pt1 || !pt2) return;

    if (window.splitAction === 'insert-point') {
      let autoFrom = 'start';
      if (clickEvent && rootEl) {
        const rect = rootEl.getBoundingClientRect();
        const clickX = typeof clickEvent.clientX === 'number' ? clickEvent.clientX : rect.left;
        autoFrom = (clickX - rect.left) > (rect.width / 2) ? 'end' : 'start';
      }

      const fromEl = document.getElementById('split-distance-from');
      if (fromEl) fromEl.value = autoFrom;

      const dist = Math.round(parseFloat(document.getElementById('split-distance-input').value) * 1000) / 1000;
      if (!isFinite(dist) || dist <= 0) return alert('Vui lòng nhập khoảng cách trước khi bấm vào cạnh.');

      const segLen = segmentLengthMeters([pt1.lng, pt1.lat], [pt2.lng, pt2.lat]);
      if (dist >= segLen) return alert(`Khoảng cách phải nhỏ hơn chiều dài cạnh (${segLen.toFixed(3)} m).`);

      window.splitSelectedVertices = [pt1.originalIndex, pt2.originalIndex];
      renderActiveFeature(window.currentSelectedFeature);

      const newPt = pointAlongSegmentByDistance([pt1.lng, pt1.lat], [pt2.lng, pt2.lat], dist, autoFrom);
      if (!newPt) return alert('Không tính được điểm mới trên cạnh.');

      insertNewVertexByRingIndex(newPt[0], newPt[1], pt1.originalIndex, pt2.originalIndex);
      window.splitSelectedVertices = [];
      renderActiveFeature(window.currentSelectedFeature);
      highlightCreatedPoint(newPt[0], newPt[1]);
      updateSplitInstruction(`Đã tạo điểm mới trên cạnh ${i1 + 1}-${i2 + 1}.`);
      return;
    }

    if (window.splitAction === 'select-cut-line') {
      window.splitSelectedVertices = [pt1.originalIndex, pt2.originalIndex];
      renderActiveFeature(window.currentSelectedFeature);
      updateSplitBtn();
      updateSplitInstruction('Đã chọn nhanh 2 điểm. Nhấn Tách thửa để chạy.');
      return;
    }

    const segLen = segmentLengthMeters([pt1.lng, pt1.lat], [pt2.lng, pt2.lat]);
    updateSplitInstruction(`Cạnh ${i1 + 1}-${i2 + 1}: ${segLen.toFixed(2)} m. Chọn chế độ rồi bấm lại.`);
  }

  function onVertexClick(displayIdx, realIdx) {
    if (!window.splitMode) return;

    if (window.splitAction === 'select-cut-line') {
      const existing = window.splitSelectedVertices.indexOf(realIdx);
      if (existing >= 0) window.splitSelectedVertices.splice(existing, 1);
      else {
        if (window.splitSelectedVertices.length >= 2) return alert('Chỉ được chọn 2 điểm để làm đường tách.');
        window.splitSelectedVertices.push(realIdx);
      }
      refreshVertexSelectionByRingIndex(window.splitSelectedVertices);
      updateSplitBtn();
      updateSplitInstruction(
        window.splitSelectedVertices.length === 2
          ? 'Đã chọn đủ 2 điểm. Nhấn Tách thửa để thực hiện.'
          : `Đang chọn đường tách (${window.splitSelectedVertices.length}/2).`
      );
      return;
    }

    if (window.splitAction === 'insert-point') {
      if (!window._tmpVertexChoice) window._tmpVertexChoice = [];

      // Bấm lại đúng đỉnh cũ thì bỏ qua, tránh báo lỗi do double tap / misclick
      if (window._tmpVertexChoice.length === 1 && window._tmpVertexChoice[0].realIdx === realIdx) {
        updateSplitInstruction('Bạn đang bấm lại cùng một đỉnh. Hãy chọn đỉnh liền kề với nó, hoặc bấm trực tiếp vào cạnh.');
        return;
      }

      window._tmpVertexChoice.push({ displayIdx, realIdx });
      window.splitSelectedVertices = window._tmpVertexChoice.map(x => x.realIdx);
      renderActiveFeature(window.currentSelectedFeature);

      if (window._tmpVertexChoice.length < 2) {
        updateSplitInstruction('Đã chọn đỉnh 1. Chọn tiếp 1 đỉnh liền kề, hoặc chạm thẳng vào cạnh.');
        return;
      }

      const a = window._tmpVertexChoice[0];
      const b = window._tmpVertexChoice[1];
      const len = window.orderedPtsTmp.length;
      const isNext = b.displayIdx === (a.displayIdx + 1) % len;
      const isPrev = a.displayIdx === (b.displayIdx + 1) % len;

      if (!isNext && !isPrev) {
        // Không bật alert liên tục nữa. Giữ điểm thứ 2 làm điểm mốc mới để user bấm tiếp cho dễ.
        window._tmpVertexChoice = [b];
        window.splitSelectedVertices = [b.realIdx];
        renderActiveFeature(window.currentSelectedFeature);
        updateSplitInstruction('Đỉnh vừa chọn không liền kề với đỉnh trước. Mình đã giữ đỉnh mới làm mốc đầu tiên, hãy chọn 1 đỉnh liền kề với nó.');
        return;
      }

      const dist = Math.round(parseFloat(document.getElementById('split-distance-input').value) * 1000) / 1000;
      const from = document.getElementById('split-distance-from').value;
      if (!isFinite(dist) || dist <= 0) {
        return alert('Khoảng cách nhập không hợp lệ.');
      }

      const p1 = window.orderedPtsTmp[a.displayIdx];
      const p2 = window.orderedPtsTmp[b.displayIdx];
      const segLen = segmentLengthMeters([p1.lng, p1.lat], [p2.lng, p2.lat]);
      if (dist >= segLen) return alert(`Khoảng cách phải nhỏ hơn chiều dài cạnh (${segLen.toFixed(3)} m).`);

      const newPt = pointAlongSegmentByDistance([p1.lng, p1.lat], [p2.lng, p2.lat], dist, from);
      if (!newPt) return alert('Không tính được điểm mới trên cạnh.');

      insertNewVertexByRingIndex(newPt[0], newPt[1], a.realIdx, b.realIdx);
      window._tmpVertexChoice = [];
      window.splitSelectedVertices = [];
      renderActiveFeature(window.currentSelectedFeature);
      highlightCreatedPoint(newPt[0], newPt[1]);
      updateSplitInstruction('Đã tạo điểm mới. Muốn tách thì bấm Chọn đường tách rồi chọn 2 điểm biên.');
      return;
    }
  }
  window.onVertexClick = onVertexClick;

  async function requestSplitPreviewViaApi(feature, selectedVertices) {
    const parcelMeta = window.getCurrentParcelMeta ? window.getCurrentParcelMeta() : null;
    if (!parcelMeta?.id) return null;

    const res = await fetch(`/api/map-files/${parcelMeta.id}/split-preview`, {
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
      body: JSON.stringify({
        feature,
        selected_vertices: selectedVertices
      })
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success || !Array.isArray(json?.features)) {
      throw new Error(json?.message || 'Tách thửa qua API thất bại');
    }

    return json.features;
  }

  function finalizeSplitFeatures(features) {
    if (!Array.isArray(features) || features.length < 2) {
      throw new Error('Kết quả tách không hợp lệ');
    }

    const parentParcelNo = window.currentSelectedFeature?.properties?.DISPLAY_NAME || window.currentSelectedFeature?.properties?.SHTHUA || '-';
    const parentSheetNo = window.currentSelectedFeature?.properties?.PARENT_SHBANDO || window.currentSelectedFeature?.properties?.SHBANDO || '-';

    window.splitPolygons.push(...features.map((f, idx) => {
      const cloned = JSON.parse(JSON.stringify(f));
      const area = typeof turf !== 'undefined' ? turf.area(cloned) : Number(cloned?.properties?.DIENTICH || 0);
      cloned.properties = cloned.properties || {};
      cloned.properties.DIENTICH = area;
      cloned.properties.PARENT_SHTHUA = parentParcelNo;
      cloned.properties.PARENT_SHBANDO = parentSheetNo;
      cloned.properties.DISPLAY_NAME = cloned.properties.DISPLAY_NAME || `${parentParcelNo}-${idx + 1}`;
      return cloned;
    }));

    window.splitSelectedVertices = [];
    window.splitAction = null;
    document.getElementById('btn-new-split-line').style.display = 'inline-block';
    document.getElementById('btn-export-split-pdf').style.display = 'inline-block';
    updateSplitBtn();
    updateInsertPointBtn();
    removeSourceAndLayer(getMap(), SPLIT_ACTIVE_SOURCE, [SPLIT_ACTIVE_FILL, SPLIT_ACTIVE_LINE]);
    clearMarkers();
    clearActiveInfoMarkers();
    renderSplitResults();
    updateSplitInstruction('Đã tách xong. Muốn chia tiếp thì bấm Chia tiếp rồi chọn thửa con.');
  }

  window.executeSplit = async function executeSplit() {
    if (window.splitAction === 'insert-point') {
      return alert(`Bạn đang ở chế độ Tạo điểm.

Chế độ này chỉ để chèn thêm 1 đỉnh mới trên cạnh, chưa tách ngay.

Cách dùng nhanh:
1) Nhập khoảng cách
2) Bấm trực tiếp vào cạnh, hoặc chọn 2 đỉnh liền kề
3) Tạo điểm xong thì bấm "Chọn đường tách"
4) Chọn 2 điểm biên
5) Bấm "Tách thửa"`);
    }

    if (window.splitAction !== 'select-cut-line' || window.splitSelectedVertices.length !== 2) {
      return alert(`Muốn tách thửa, trước tiên bấm "Chọn đường tách", rồi chọn đúng 2 điểm biên.

Lưu ý: "Tạo điểm" chỉ là thêm đỉnh mới, không phải thao tác tách.`);
    }

    try {
      const apiFeatures = await requestSplitPreviewViaApi(window.currentSelectedFeature, window.splitSelectedVertices);
      finalizeSplitFeatures(apiFeatures);
      return;
    } catch (apiErr) {
      console.warn('split-preview API lỗi, fallback local:', apiErr);
    }

    const ringClosed = getFeatureOuterRing(window.currentSelectedFeature);
    const ring = ringClosed.slice(0, -1);
    const n = ring.length;
    let idx1 = window.splitSelectedVertices[0];
    let idx2 = window.splitSelectedVertices[1];
    if (idx1 === idx2) return alert('Hai điểm tách không được trùng nhau.');

    const forwardPath = [];
    let i = idx1;
    while (true) {
      forwardPath.push(ring[i]);
      if (i === idx2) break;
      i = (i + 1) % n;
    }
    forwardPath.push(ring[idx1]);

    const backwardPath = [];
    i = idx2;
    while (true) {
      backwardPath.push(ring[i]);
      if (i === idx1) break;
      i = (i + 1) % n;
    }
    backwardPath.push(ring[idx2]);

    if (forwardPath.length < 4 || backwardPath.length < 4) return alert('Một trong hai thửa sau tách không đủ số đỉnh.');

    const poly1 = turf.polygon([forwardPath]);
    const poly2 = turf.polygon([backwardPath]);
    const area1 = turf.area(poly1);
    const area2 = turf.area(poly2);
    if (area1 <= 0 || area2 <= 0) return alert('Kết quả tách không hợp lệ.');

    const parentParcelNo = window.currentSelectedFeature?.properties?.DISPLAY_NAME || window.currentSelectedFeature?.properties?.SHTHUA || '-';
    const parentSheetNo = window.currentSelectedFeature?.properties?.PARENT_SHBANDO || window.currentSelectedFeature?.properties?.SHBANDO || '-';

    const f1 = JSON.parse(JSON.stringify(window.currentSelectedFeature));
    const f2 = JSON.parse(JSON.stringify(window.currentSelectedFeature));
    setFeatureOuterRing(f1, forwardPath);
    setFeatureOuterRing(f2, backwardPath);
    f1.properties.DIENTICH = area1;
    f2.properties.DIENTICH = area2;
    f1.properties.PARENT_SHTHUA = parentParcelNo;
    f2.properties.PARENT_SHTHUA = parentParcelNo;
    f1.properties.PARENT_SHBANDO = parentSheetNo;
    f2.properties.PARENT_SHBANDO = parentSheetNo;
    f1.properties.DISPLAY_NAME = `${parentParcelNo}-1`;
    f2.properties.DISPLAY_NAME = `${parentParcelNo}-2`;

    finalizeSplitFeatures([f1, f2]);
  };

  window.startNewSplitLine = function startNewSplitLine() {
    if (!window.splitPolygons.length) return alert('Chưa có thửa nào để chia tiếp.');
    window.splitNewLinePickMode = true;
    updateSplitInstruction('Đang chọn thửa con để chia tiếp.');
  };

  function selectSubParcelForSplitByIndex(idx) {
    const feature = window.splitPolygons[idx];
    if (!feature) return;
    window.splitNewLinePickMode = false;
    window.currentSelectedFeature = JSON.parse(JSON.stringify(feature));
    window.originalFeatureSnapshot = JSON.parse(JSON.stringify(feature));
    window.splitPolygons = window.splitPolygons.filter((_, i) => i !== idx);
    renderSplitResults();
    resetSplitState();
    renderActiveFeature(window.currentSelectedFeature);
    updateSplitInstruction(`Đã khóa ${feature.properties.DISPLAY_NAME}. Giờ chỉ thao tác trên thửa này.`);
  }

  function bindSplitMapClick() {
    if (splitBound) return;
    const map = getMap();
    if (!map) return;
    splitBound = true;

    map.on('click', function (e) {
      if (!window.splitMode) return;
      if (window.splitNewLinePickMode && map.getLayer(SPLIT_RESULT_FILL)) {
        const features = map.queryRenderedFeatures(e.point, { layers: [SPLIT_RESULT_FILL] });
        if (features && features.length) {
          const idx = Number(features[0].properties.__split_idx);
          if (Number.isFinite(idx)) {
            selectSubParcelForSplitByIndex(idx);
          }
        }
      }
    });
  }

  window.finishSplitProcess = function finishSplitProcess() {
    if (!window.splitPolygons || window.splitPolygons.length < 2) return alert('Chưa thực hiện tách thửa!');
    window.exportCurrentSplitPDF();
  };

  
  function exportSplitPDF(allParcels) {
    if (!allParcels || !allParcels.length) { alert("Không có dữ liệu tách thửa!"); return; }
    try {
      const prop = (key) =>
        window.rootFeatureSnapshot?.properties?.[key] ||
        allParcels[0]?.properties?.[key] ||
        window.currentSelectedFeature?.properties?.[key] || "";

      const sht = prop("PARENT_SHTHUA") || prop("SHTHUA") || "-";
      const soTo = prop("PARENT_SHBANDO") || prop("SHBANDO") || "-";
      const loaiDat = prop("MLOAIDAT") || prop("LOAIDAT") || "——";
      const diaChiThua = prop("DIACHI") || prop("DIACHICHU") || "——";
      const tenChu = prop("TENCHU") || "——";
      const soGCN = prop("SOGCN") || "";
      const soVaoGCN = prop("SOVAOGCN") || "";
      const ngayCap = prop("NGAYCAP") || "";
      const cccd = prop("CCCD") || prop("CMND") || "——";
      const origFeature = window.rootFeatureSnapshot || null;
      const tongDienTich = origFeature
        ? Number(origFeature.properties?.DIENTICH || turf.area(origFeature)).toFixed(1)
        : allParcels.reduce((s, f) => s + Number(f.properties?.DIENTICH || turf.area(f)), 0).toFixed(1);

      const COLORS = [
        { fill: "#c8e6c9", stroke: "#2e7d32" },
        { fill: "#e1bee7", stroke: "#6a1b9a" },
        { fill: "#bbdefb", stroke: "#1565c0" },
        { fill: "#ffe0b2", stroke: "#e65100" },
        { fill: "#ffcdd2", stroke: "#b71c1c" },
        { fill: "#b2ebf2", stroke: "#006064" }
      ];
      const GRAY = { fill: "#e0e0e0", stroke: "#555" };

      const SW = 260, SH = 180;
      const svgBefore = _buildSplitSVGDiagram(origFeature ? _splitParcelsToVN([origFeature]) : null, SW, SH, null, GRAY);
      const svgAfter = _buildSplitSVGDiagram(_splitParcelsToVN(allParcels), SW, SH, COLORS, null);

      const letters = ['a', 'b', 'c', 'd', 'e', 'f'];
      let rowsAfter = '';
      allParcels.forEach((p, i) => {
        const nm = p.properties?.DISPLAY_NAME || `Thửa ${i + 1}`;
        const ar = Number(p.properties?.DIENTICH || turf.area(p)).toFixed(1);
        const ld = p.properties?.MLOAIDAT || loaiDat;
        rowsAfter += `<tr>
            <td>${letters[i] || i + 1}/ Thửa đất số: <b>${nm}</b>, tờ bản đồ số: <b>${soTo}</b>, diện tích: <b>${ar}</b> m²,
            Mục đích sử dụng: <b>${ld}</b> &nbsp; Đất ở: _________ m²</td>
          </tr>`;
      });

      function buildCoordTable(parcel, pi) {
        const col = COLORS[pi % COLORS.length];
        const name = parcel.properties?.DISPLAY_NAME || `Thửa ${pi + 1}`;
        const area = Number(parcel.properties?.DIENTICH || turf.area(parcel)).toFixed(1);
        const ordered = _getOrderedSplitPdfVertices(parcel);
        const n = ordered.length;
        const edgeLens = ordered.map((pt, ri) => {
          const next = ordered[(ri + 1) % n];
          return Math.hypot(next.x - pt.x, next.y - pt.y);
        });
        let rows = '';
        ordered.forEach((pt, ri) => {
          const c = edgeLens[ri].toFixed(2);
          rows += `<tr class="${ri % 2 === 0 ? 'even' : ''}">
              <td>${ri + 1}</td><td>${pt.x.toFixed(3)}</td><td>${pt.y.toFixed(3)}</td><td>${c}</td>
            </tr>`;
        });
        return `
          <div class="coord-table">
            <div class="coord-title" style="color:${col.stroke};">${name} &nbsp;(${area} m²)</div>
            <table>
              <thead><tr><th>STT</th><th>X (m)</th><th>Y (m)</th><th>C (m)</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      }

      function chunkArray(arr, size) {
        const out = [];
        for (let i = 0; i < arr.length; i += size) {
          out.push(arr.slice(i, i + size));
        }
        return out;
      }

      const coordTableHtmlList = allParcels.map((parcel, idx) => buildCoordTable(parcel, idx));
      const firstPageCoordTables = coordTableHtmlList.slice(0, 2).join('');
      const extraCoordChunks = chunkArray(coordTableHtmlList.slice(2), 2);
      const totalAfterArea = allParcels.reduce((s, f) => s + Number(f.properties?.DIENTICH || turf.area(f)), 0).toFixed(1);

      const extraPagesHtml = extraCoordChunks.map((chunk, pageIdx) => `
<div class="a4-page extra-page">
  <div class="a4-border extra-border">
    <div class="appendix-head">
      <div class="appendix-title">PHỤ LỤC TỌA ĐỘ THỬA SAU TÁCH</div>
      <div class="appendix-subtitle">Tờ bản đồ số <b>${soTo}</b> &nbsp;|&nbsp; Thửa gốc <b>${sht}</b> &nbsp;|&nbsp; Trang ${pageIdx + 2}</div>
    </div>
    <div class="line">Bảng tọa độ chi tiết các thửa sau tách:</div>
    <div class="coord-stack coord-stack-appendix">${chunk.join('')}</div>
  </div>
</div>`).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Bản vẽ tách thửa đất</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 794px; background: #fff; font-family: "Times New Roman", Times, serif; font-size: 9.5pt; color: #111; }
  body { margin: 0; }
  .a4-page { width: 794px; height: 1123px; padding: 14mm 13mm 12mm 18mm; background: #fff; overflow: hidden; }
  .a4-page + .a4-page { page-break-before: always; }
  .a4-border { border: 2px solid #111; padding: 7px 9px 9px 9px; height: calc(1123px - 26mm); display: flex; flex-direction: column; overflow: hidden; }
  h1 { text-align:center; font-size:13pt; font-weight:bold; text-transform:uppercase; margin-bottom:2px; }
  .subtitle { text-align:center; font-size:9pt; font-style:italic; margin-bottom:3px; }
  .mau-so { text-align:right; font-size:8.5pt; margin-bottom:4px; }
  .section { margin-top:5px; }
  .section-title { font-weight:bold; font-size:9.5pt; border-bottom:1px solid #333; margin-bottom:2px; padding-bottom:1px; }
  .sub-title { font-weight:bold; margin-top:3px; }
  .line { margin:1.5px 0; font-size:9pt; line-height:1.45; }
  .line-row { display:flex; align-items:flex-end; gap:3px; margin:1.5px 0; font-size:9pt; line-height:1.45; white-space:nowrap; }
  .line-row .label { flex-shrink:0; }
  .line-row .dash { border-bottom:1px dotted #555; flex:1; min-width:20px; }
  .red { color:#c00; }
  .indent { margin-left:14px; }
  .indent2 { margin-left:26px; }
  .diagram-row { display:flex; align-items:stretch; gap:5px; margin-top:4px; }
  .diagram-col { flex:1; min-width:0; }
  .diagram-label { font-size:7pt; font-style:italic; color:#555; margin-bottom:1px; line-height:1.3; }
  .diagram-box { border:1.5px solid #555; }
  .diagram-box svg { display:block; width:100%; height:155px; }
  .diagram-caption { text-align:center; font-size:7pt; font-style:italic; border-top:1px solid #ccc; padding:2px 0; background:#fafafa; }
  .arrow-box { display:flex; align-items:center; justify-content:center; font-size:20pt; color:#555; padding:0 2px; flex-shrink:0; }
  .coord-stack { display:flex; flex-direction:column; gap:6px; margin-top:6px; }
  .coord-table { width:100%; page-break-inside:avoid; break-inside:avoid; }
  .coord-title { font-weight:bold; font-size:8pt; margin-bottom:2px; }
  .coord-table table { width:100%; border-collapse:collapse; font-size:7.5pt; }
  .coord-table th { background:#e8e8e8; border:1px solid #999; padding:2px 3px; text-align:center; }
  .coord-table td { border:1px solid #ccc; padding:1.5px 3px; text-align:center; }
  .coord-table tr.even td { background:#f7f7f7; }
  .coord-stack-appendix { margin-top:8px; }
  .appendix-head { margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid #333; }
  .appendix-title { text-align:center; font-size:12pt; font-weight:bold; text-transform:uppercase; }
  .appendix-subtitle { text-align:center; font-size:8.5pt; margin-top:2px; }
  .extra-border { justify-content:flex-start; }
  .sign-row { display:flex; justify-content:space-between; margin-top:auto; padding-top:8px; font-size:9pt; }
  .sign-box { text-align:center; width:45%; }
  .sign-box .sign-title { font-weight:bold; }
  .sign-box .sign-name { margin-top:16px; font-style:italic; }
</style>
</head><body>
<div class="a4-page">
<div class="a4-border">
  <h1>Bản vẽ tách thửa đất, hợp thửa đất</h1>
  <div class="subtitle">(Kèm theo Đơn đề nghị tách thửa đất, hợp thửa đất)</div>
  <div class="mau-so">Mẫu số 02/DK</div>

  <div class="section">
    <div class="section-title">I. Hình thức tách, hợp thửa đất:</div>
    <div class="line indent">Tách thửa</div>
  </div>

  <div class="section">
    <div class="section-title">II. Thửa đất gốc:</div>
    <div class="sub-title indent">1. Thửa đất thứ nhất:</div>
    <div class="line indent2">1.1. Thửa số: <b>${sht}</b>, tờ bản đồ số: <b>${soTo}</b>, diện tích: <b>${tongDienTich}</b> m², loại đất: <b>${loaiDat}</b></div>
    <div class="line-row indent2"><span class="label">Địa chỉ thửa đất: <b>${diaChiThua}</b></span><span class="dash" style="min-width:10px;"></span></div>
    <div class="line indent2 red">Giấy chứng nhận số: ${soGCN || "____________________"} &nbsp;&nbsp; Số vào sổ GCN: ${soVaoGCN || "____________________"} &nbsp;&nbsp; Ngày cấp: ${ngayCap || "____________________"}</div>
    <div class="line-row indent2 red"><span class="label">Cơ quan cấp GCN:</span><span class="dash"></span></div>
    <div class="line indent2">1.2. Tên người sử dụng đất: <b>${tenChu}</b> &nbsp;; CCCD số: <b>${cccd}</b></div>
    <div class="line-row indent2"><span class="label">Địa chỉ:</span><span class="dash"></span></div>
    <div class="line indent2">1.3. Tình hình sử dụng đất:</div>
    <div class="line indent2">- Ranh giới thửa đất không thay đổi so với Giấy chứng nhận đã cấp</div>
    <div class="line indent2">- Tại thời điểm đo đạc tách thửa không tranh chấp</div>
    <div class="line-row indent2"><span class="label">- Hiện trạng sử dụng đất:</span><span class="dash"></span></div>
  </div>

  <div class="section">
    <div class="section-title">III. Thửa đất sau khi tách thửa đất, hợp thửa đất</div>
    <div class="line">1. Mô tả sơ bộ thông tin, mục đích thực hiện tách thửa đất, hợp thửa đất:</div>
    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;margin-top:2px;">
      ${rowsAfter}
    </table>
    <div class="line-row" style="margin-top:2px;"><span class="label">+ Mục đích thực hiện tách thửa:</span><span class="dash"></span></div>
    <div class="line-row"><span class="label" style="font-size:8pt;font-style:italic;">* Người lập bản vẽ:</span><span class="dash"></span></div>
  </div>

  <div class="section">
    <div class="section-title">3. Tách thửa đất, hợp thửa đất</div>
    <div class="diagram-row">
      <div class="diagram-col">
        <div class="diagram-label">3.1 Sơ đồ trước tách thửa đất, hợp thửa đất<br><i>(Thể hiện hình vẽ, các điểm định thửa đất, diện tích, loại đất, người sử dụng đất liền kề theo thửa đất gốc)</i></div>
        <div class="diagram-box">
          <svg viewBox="0 0 ${SW} ${SH}" xmlns="http://www.w3.org/2000/svg" style="height:155px;">${svgBefore}</svg>
          <div class="diagram-caption">TRƯỚC KHI TÁCH &nbsp;|&nbsp; Thửa ${sht} &nbsp;|&nbsp; ${tongDienTich} m²</div>
        </div>
      </div>
      <div class="arrow-box">→</div>
      <div class="diagram-col">
        <div class="diagram-label">3.2 Sơ đồ và độ dài cạnh thửa sau tách thửa đất, hợp thửa đất<br><i>(Thể hiện hình vẽ, các điểm định thửa đất, diện tích, kích thước cạnh, loại đất, người sử dụng đất liền kề)</i></div>
        <div class="diagram-box">
          <svg viewBox="0 0 ${SW} ${SH}" xmlns="http://www.w3.org/2000/svg" style="height:155px;">${svgAfter}</svg>
          <div class="diagram-caption">SAU KHI TÁCH &nbsp;|&nbsp; ${allParcels.length} thửa &nbsp;|&nbsp; Tổng: ${totalAfterArea} m²</div>
        </div>
      </div>
    </div>

    ${firstPageCoordTables ? `<div class="coord-stack">${firstPageCoordTables}</div>` : ''}

    <div class="sign-row">
      <div class="sign-box">
        <div class="sign-title">Người sử dụng đất</div>
        <div style="font-size:7.5pt;font-style:italic;">(Ký, ghi rõ họ tên)</div>
        <div class="sign-name">${tenChu}</div>
      </div>
      <div class="sign-box">
        <div class="sign-title">Người lập bản vẽ</div>
        <div style="font-size:7.5pt;font-style:italic;">(Ký, ghi rõ họ tên)</div>
        <div class="sign-name">&nbsp;</div>
      </div>
    </div>
  </div>
</div>
</div>
${extraPagesHtml}
</body></html>`;

      _renderSplitHtmlToPDF(html, `TachThua_To${soTo}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("exportSplitPDF error:", err);
      alert("Lỗi xuất PDF: " + (err.message || err));
    }
  }

  window.exportCurrentSplitPDF = function exportCurrentSplitPDF() {
    if (!window.splitPolygons || window.splitPolygons.length < 2) {
      return alert("Chưa có thửa nào được tách! Vui lòng tách thửa trước.");
    }
    const seen = new Set();
    const unique = window.splitPolygons.filter((p) => {
      const key = p.properties?.DISPLAY_NAME || JSON.stringify(p.geometry || {});
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    exportSplitPDF(unique);
  };

  function _getSplitFeatureOuterRing(feature) {
    if (!feature?.geometry) return [];
    if (feature.geometry.type === 'Polygon') return feature.geometry.coordinates[0] || [];
    if (feature.geometry.type === 'MultiPolygon') return feature.geometry.coordinates?.[0]?.[0] || [];
    return [];
  }

  function _getOrderedSplitPdfVertices(feature) {
    const coords = _getSplitFeatureOuterRing(feature);
    if (!Array.isArray(coords) || coords.length < 4) return [];

    const unique = coords.slice(0, -1).map((p, i) => ({ raw: p, originalIndex: i }));
    const anchorOriginalIndex = unique[0]?.originalIndex ?? 0;

    let vnPts = unique.map((p) => {
      const xy = proj4('EPSG:4326', 'VN2000_Current', [p.raw[0], p.raw[1]]);
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

  function _splitParcelsToVN(features) {
    return (features || []).map(f => {
      const coords = _getSplitFeatureOuterRing(f);
      const ringVN = coords.map(c => proj4('EPSG:4326', 'VN2000_Current', [c[0], c[1]]));
      return { feature: f, ringVN };
    });
  }

  function _buildSplitTransform(allRings, boxW, boxH, pad) {
    let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
    allRings.forEach(({ ringVN }) => ringVN.forEach(([e, n]) => {
      if (e < mnX) mnX = e;
      if (e > mxX) mxX = e;
      if (n < mnY) mnY = n;
      if (n > mxY) mxY = n;
    }));
    const dx = mxX - mnX || 1, dy = mxY - mnY || 1;
    const scl = Math.min((boxW - pad * 2) / dx, (boxH - pad * 2) / dy);
    const oX = pad + ((boxW - pad * 2) - dx * scl) / 2;
    const oY = pad + ((boxH - pad * 2) - dy * scl) / 2;
    return { toXY: (e, n) => [oX + (e - mnX) * scl, boxH - oY - (n - mnY) * scl] };
  }

  function _buildSplitSVGDiagram(data, svgW, svgH, COLORS, defaultColor) {
    if (!data || !data.length) return `<text x="${svgW / 2}" y="${svgH / 2}" text-anchor="middle" fill="#999" font-size="10">(Không có dữ liệu)</text>`;
    const PAD = 10, CAPT = 12;
    const { toXY } = _buildSplitTransform(data, svgW, svgH - CAPT, PAD);
    let svg = '';
    data.forEach(({ feature, ringVN }, idx) => {
      const col = (defaultColor || COLORS[idx % COLORS.length]);
      const pts = ringVN.map(([e, n]) => toXY(e, n).join(',')).join(' ');
      svg += `<polygon points="${pts}" fill="${col.fill}" fill-opacity="0.55" stroke="${col.stroke}" stroke-width="1.2"/>`;
      const coords = _getSplitFeatureOuterRing(feature);
      for (let i = 0; i < ringVN.length - 1; i++) {
        const av = proj4('EPSG:4326', 'VN2000_Current', [coords[i][0], coords[i][1]]);
        const bv = proj4('EPSG:4326', 'VN2000_Current', [coords[i + 1][0], coords[i + 1][1]]);
        const len = Math.hypot(bv[0] - av[0], bv[1] - av[1]);
        if (len < 0.3) continue;
        const [x1, y1] = toXY(ringVN[i][0], ringVN[i][1]);
        const [x2, y2] = toXY(ringVN[i + 1][0], ringVN[i + 1][1]);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        svg += `<text x="${mx}" y="${my}" font-size="7" fill="${col.stroke}" text-anchor="middle" transform="rotate(${ang},${mx},${my})" dy="-1.5">${len.toFixed(2)}m</text>`;
      }
      const center = turf.centerOfMass(feature).geometry.coordinates;
      const cVN = proj4('EPSG:4326', 'VN2000_Current', [center[0], center[1]]);
      const [cx, cy] = toXY(cVN[0], cVN[1]);
      const name = feature.properties?.DISPLAY_NAME || `Thửa ${idx + 1}`;
      const area = Number(feature.properties?.DIENTICH || turf.area(feature)).toFixed(1);
      svg += `<text x="${cx}" y="${cy}" font-size="9" font-weight="bold" fill="${col.stroke}" text-anchor="middle" dy="-4">${name}</text>`;
      svg += `<text x="${cx}" y="${cy}" font-size="8" fill="#333" text-anchor="middle" dy="6">${area} m²</text>`;
    });
    return svg;
  }

  function _renderSplitHtmlToPDF(htmlContent, filename) {
    if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
      return alert('Thiếu thư viện xuất PDF (html2canvas / jsPDF).');
    }

    if (typeof window.showLoading === 'function') window.showLoading('Đang tạo file PDF...');

    const A4_W_PX = 794;
    const A4_H_PX = 1123;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = [
      'position:fixed',
      'left:-9999px',
      'top:0',
      'width:' + A4_W_PX + 'px',
      'height:' + A4_H_PX + 'px',
      'border:none',
      'visibility:hidden',
      'overflow:hidden'
    ].join(';');
    document.body.appendChild(iframe);

    const cleanup = function () {
      try {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch (_) {}
      if (typeof window.hideLoading === 'function') window.hideLoading();
    };

    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
    iDoc.open();
    iDoc.write(htmlContent);
    iDoc.close();

    setTimeout(function () {
      const fixStyle = iDoc.createElement('style');
      fixStyle.textContent =
        'html,body{width:' + A4_W_PX + 'px!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff!important;}' +
        '*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}';
      iDoc.head.appendChild(fixStyle);

      const target = iDoc.body;
      const targetW = A4_W_PX;
      const targetH = Math.max(
        iDoc.body?.scrollHeight || 0,
        iDoc.documentElement?.scrollHeight || 0,
        A4_H_PX
      );
      iframe.style.height = targetH + 'px';

      html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: targetW,
        height: targetH,
        windowWidth: A4_W_PX,
        windowHeight: targetH,
        scrollX: 0,
        scrollY: 0,
        logging: false
      }).then(function (canvas) {
        try {
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const pageW_mm = pdf.internal.pageSize.getWidth();
          const pageH_mm = pdf.internal.pageSize.getHeight();
          const mmPerPx = pageW_mm / A4_W_PX;
          const pageH_cpx = Math.round((pageH_mm / mmPerPx) * 2);
          const canvasW = canvas.width;
          const canvasH = canvas.height;
          const totalPages = Math.ceil(canvasH / pageH_cpx);

          for (let page = 0; page < totalPages; page++) {
            const sliceY = page * pageH_cpx;
            const sliceH = Math.min(pageH_cpx, canvasH - sliceY);

            const sc = document.createElement('canvas');
            sc.width = canvasW;
            sc.height = sliceH;
            const ctx = sc.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasW, sliceH);
            ctx.drawImage(canvas, 0, sliceY, canvasW, sliceH, 0, 0, canvasW, sliceH);

            const imgData = sc.toDataURL('image/jpeg', 0.95);
            const sliceH_mm = (sliceH / 2) * mmPerPx;

            if (page > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, pageW_mm, sliceH_mm);
          }

          pdf.save(filename);
        } catch (e) {
          console.error('jsPDF error:', e);
          alert('Lỗi tạo PDF: ' + e.message);
        }
        cleanup();
      }).catch(function (err) {
        console.error('html2canvas error:', err);
        alert('Lỗi render PDF: ' + err.message);
        cleanup();
      });
    }, 800);
  }

  ensureSplitPanelUI();
  updateSplitMainButton();
})();
