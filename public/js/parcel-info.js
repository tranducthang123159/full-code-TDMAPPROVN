(function () {
  window.currentFeature = window.currentFeature || null;

  function ensureParcelBar() {
    let bar = document.getElementById('parcelBar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'parcelBar';
    document.body.appendChild(bar);
    return bar;
  }

  function ensureParcelBarStyle() {
    if (document.getElementById('parcelBarStylePro')) return;
    const style = document.createElement('style');
    style.id = 'parcelBarStylePro';
    style.textContent = `
      #parcelBar{
        position:fixed;
        z-index:9999;
        background:#fff;
        border-radius:16px;
        box-shadow:0 10px 28px rgba(0,0,0,.18);
        overflow:hidden;
        display:none;
        border:1px solid rgba(0,0,0,.08);
        font-family:"Segoe UI",Roboto,sans-serif;
      }

      #parcelBar.active{display:block;}
      #parcelBar.collapsed .parcel-bar-body{display:none;}

      .parcel-bar-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:14px 16px;
        background:#f8fafc;
        cursor:pointer;
        border-bottom:1px solid #e5e7eb;
      }

      .parcel-bar-title{
        font-size:18px;
        font-weight:800;
        color:#1f2937;
      }

      .parcel-bar-arrow{
        font-size:18px;
        font-weight:800;
        color:#374151;
      }

      .parcel-bar-body{
        padding:14px 16px 16px;
      }

      /* HÀNG THÔNG TIN THỬA: LUÔN 1 HÀNG, THIẾU CHỖ THÌ CUỘN NGANG */
      .bar-info-row{
        display:flex;
        flex-wrap:nowrap;
        gap:10px;
        align-items:stretch;
        overflow-x:auto;
        overflow-y:hidden;
        -webkit-overflow-scrolling:touch;
        scrollbar-width:thin;
        padding-bottom:4px;
      }

      .bar-info-row::-webkit-scrollbar{
        height:6px;
      }

      .bar-info-row::-webkit-scrollbar-thumb{
        background:rgba(0,0,0,.18);
        border-radius:999px;
      }

      .bar-item{
        min-width:120px;
        background:#f8fafc;
        border:1px solid #e5e7eb;
        border-radius:12px;
        padding:10px 12px;
        display:flex;
        flex-direction:column;
        gap:4px;
        flex:0 0 auto;
        white-space:nowrap;
      }

      .bar-item.owner{
        min-width:200px;
      }

      .bar-item span{
        font-size:12px;
        color:#6b7280;
        font-weight:700;
      }

      .bar-item b{
        font-size:15px;
        color:#111827;
      }

      .bar-actions{
        margin-top:12px;
        display:flex;
        flex-wrap:nowrap;
        gap:8px;
        overflow-x:auto;
        overflow-y:hidden;
        padding-bottom:2px;
        -webkit-overflow-scrolling:touch;
      }

      #parcelBar .btn{
        border:none;
        border-radius:10px;
        padding:10px 12px;
        font-size:13px;
        font-weight:800;
        cursor:pointer;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        white-space:nowrap;
        flex:0 0 auto;
        min-height:44px;
      }

      #parcelBar .btn.green{
        background:#16a34a;
        color:#fff;
      }

      #parcelBar .btn.purple{
        background:#7c3aed;
        color:#fff;
      }

      #parcelBar .btn.indigo{
        background:#4338ca;
        color:#fff;
      }

      #parcelBar .btn.yellow{
        background:#facc15;
        color:#111827;
      }

      #parcelBar .btn.blue{
        background:#1565c0;
        color:#fff;
      }

      #parcelBar .btn.blue.active{
        background:#0d47a1;
        box-shadow:0 0 8px rgba(21, 101, 192, .45);
      }

      #parcelBar .btn:disabled{
        opacity:.6;
        cursor:not-allowed;
      }

      @media (max-width:768px){
        .parcel-bar-title{
          font-size:16px;
        }

        .parcel-bar-body{
          padding:12px;
        }

        .bar-item{
          min-width:110px;
        }

        .bar-item.owner{
          min-width:180px;
        }

        .bar-item b{
          font-size:14px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  window.showParcelInfo = function showParcelInfo(feature) {
    if (typeof cloneFeatureForRuntime === 'function') {
      feature = cloneFeatureForRuntime(feature);
    }
    if (typeof syncVN2000ForCurrentFeature === 'function') {
      syncVN2000ForCurrentFeature(feature);
    }
    const p = feature?.properties ? feature.properties : feature;
    if (!p) {
      console.error('Feature lỗi:', feature);
      return;
    }

    ensureParcelBarStyle();
    const bar = ensureParcelBar();
    window.currentFeature = feature;

    bar.innerHTML = `
      <div class="parcel-bar-head" onclick="toggleParcelBar()">
        <div class="parcel-bar-title">Thông tin thửa đất</div>
        <div class="parcel-bar-arrow" id="parcelBarArrow">▼</div>
      </div>

      <div class="parcel-bar-body" id="parcelBarBody">
        <div class="bar-info-row">
          <div class="bar-item"><span>Tờ</span><b>${p.SHBANDO ?? ''}</b></div>
          <div class="bar-item"><span>Thửa</span><b>${p.SHTHUA ?? ''}</b></div>
          <div class="bar-item"><span>Tờ cũ</span><b>${p.SOTOCU ?? ''}</b></div>
          <div class="bar-item"><span>Diện tích</span><b>${Number(p.DIENTICH || 0).toFixed(2)} m²</b></div>
          <div class="bar-item"><span>Loại đất</span><b>${p.KHLOAIDAT ?? p.MLOAIDAT ?? ''}</b></div>
          <div class="bar-item owner"><span>Chủ</span><b>${p.TENCHU ?? ''}</b></div>
        </div>

        <div class="bar-actions">
          <button class="btn green" onclick="openParcelGoogleMaps()">🚗 Chỉ đường</button>
          <button class="btn purple" onclick="exportCoordinates()">Xuất Kết Quả📍 Tọa độ</button>
          <button class="btn indigo" onclick="exportParcelPDF()">Xuất Kết Quả📄 PDF</button>
          <button class="btn blue" id="btnQHCheck" onclick="toggleQHPanel()">🗺️ Kiểm tra QH</button>
          <button class="btn yellow" id="btnSplitStart" onclick="toggleSplitMode()">✂ Tách thửa</button>
        </div>
      </div>
    `;

    bar.classList.add('active');
    bar.classList.remove('collapsed');

    if (typeof window.ensureSplitPanelUI === 'function') {
      window.ensureSplitPanelUI();
    }
    if (typeof window.updateSplitMainButtonExternal === 'function') {
      window.updateSplitMainButtonExternal();
    }
  };

  window.toggleParcelBar = function toggleParcelBar() {
    const bar = document.getElementById('parcelBar');
    const arrow = document.getElementById('parcelBarArrow');
    if (!bar) return;
    bar.classList.toggle('collapsed');
    if (arrow) arrow.innerHTML = bar.classList.contains('collapsed') ? '▲' : '▼';
  };

  window.hideParcelBar = function hideParcelBar() {
    const bar = document.getElementById('parcelBar');
    if (!bar) return;
    bar.classList.remove('active');
    bar.classList.remove('collapsed');
  };

  window.openParcelGoogleMaps = function openParcelGoogleMaps() {
    const feature = window.currentFeature;
    if (!feature || typeof turf === 'undefined') return alert('Chưa chọn thửa.');
    const center = turf.centerOfMass(feature).geometry.coordinates;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${center[1]},${center[0]}`, '_blank');
  };

  // window.exportCoordinates = function exportCoordinates() {
  //   const feature = window.currentFeature;
  //   if (!feature) return alert('Chưa chọn thửa.');
  //   if (typeof window.getOrderedParcelVertices !== 'function') return alert('Thiếu hàm getOrderedParcelVertices().');

  //   const ordered = window.getOrderedParcelVertices(feature);
  //   let content = 'STT\\tX(m)\\tY(m)\\tZ(m)\\n';
  //   ordered.forEach((pt, idx) => {
  //     content += `${idx + 1}\\t${pt.exportX.toFixed(3)}\\t${pt.exportY.toFixed(3)}\\t0.000\\n`;
  //   });

  //   const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  //   const a = document.createElement('a');
  //   a.href = URL.createObjectURL(blob);
  //   a.download = `ToaDo_Thua_${feature?.properties?.SHTHUA || 'dat'}.txt`;
  //   a.click();
  // };

  // window.exportParcelPDF = function exportParcelPDF() {
  //   const feature = window.currentFeature;
  //   if (!feature) return alert('Chưa chọn thửa.');
  //   if (!window.jspdf || !window.jspdf.jsPDF) return alert('Thiếu thư viện jsPDF.');
  //   if (typeof window.getOrderedParcelVertices !== 'function') return alert('Thiếu hàm getOrderedParcelVertices().');

  //   const { jsPDF } = window.jspdf;
  //   const doc = new jsPDF();
  //   const p = feature.properties || {};
  //   const ordered = window.getOrderedParcelVertices(feature);

  //   doc.setFontSize(16);
  //   doc.text('SƠ ĐỒ THỬA ĐẤT', 105, 16, { align: 'center' });
  //   doc.setFontSize(11);
  //   doc.text(`Tờ: ${p.SHBANDO ?? '-'}`, 14, 28);
  //   doc.text(`Thửa: ${p.SHTHUA ?? '-'}`, 14, 35);
  //   doc.text(`Diện tích: ${Number(p.DIENTICH || 0).toFixed(2)} m²`, 14, 42);
  //   doc.text(`Chủ: ${p.TENCHU ?? '-'}`, 14, 49);

  //   if (doc.autoTable) {
  //     doc.autoTable({
  //       startY: 58,
  //       head: [['STT', 'X (m)', 'Y (m)', 'Z (m)']],
  //       body: ordered.map((pt, i) => [i + 1, pt.exportX.toFixed(3), pt.exportY.toFixed(3), '0.000'])
  //     });
  //   }

  //   doc.save(`SoDo_Thua_${p.SHTHUA || 'dat'}.pdf`);
  // };
})();