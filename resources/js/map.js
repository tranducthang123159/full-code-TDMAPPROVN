// Khởi tạo map
var map = L.map('map').setView([10.762622, 106.660172], 13);

// Base layers
var street = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
);

var esriSat = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
);

var esriTopo = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
);

// Mặc định
street.addTo(map);


// Đổi layer
function changeBaseLayer(layer) {

    map.eachLayer(function(l) {
        if (l instanceof L.TileLayer) {
            map.removeLayer(l);
        }
    });

    layer.addTo(map);
}

// Toggle menu
function toggleLayerMenu() {
    var box = document.getElementById("mapSwitcher");
    box.style.display = box.style.display === "grid" ? "none" : "grid";
}