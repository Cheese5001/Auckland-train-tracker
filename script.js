// maps script


// Create the map centered on Auckland
const map = L.map('map').setView([-36.8485, 174.7633], 11);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Railway overlay on top
L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
  attribution: '© OpenRailwayMap',
  opacity: 0.7  // Make it semi-transparent
}).addTo(map);

console.log('Map loaded!');


const trainIcons = {
  'ONE': L.icon({
    iconUrl: 'train_icons/train_icon_onehunga.svg',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  }),
  'STH': L.icon({
    iconUrl: 'train_icons/train_icon_southen.svg',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  }),
  'EAST': L.icon({
    iconUrl: 'train_icons/train_icon_easten.svg',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  }),
  'WEST': L.icon({
    iconUrl: 'train_icons/train_icon_westen.svg',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  }),
  'OTHER': L.icon({ 
    iconUrl: 'train_icons/train_icon_other.svg',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  })
};

// // trains on map
// // Function to add a train marker
  function addTrainMarker(lat, lon, trainInfo) {
    const marker = L.marker([lat, lon]).addTo(map);
    marker.bindPopup(`<b>${trainInfo}</b>`);
  }



const apiKey = 'c2b1e0d02890459eaf091ab8894e285c';
const apiUrl = 'https://api.at.govt.nz/realtime/legacy/vehiclelocations';

let trainMarkers = [];
let openPopupTrainId = null;

// Making the request
// Auto-refresh train positions every 30 seconds
function fetchTrains() {
  fetch(apiUrl, {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey
    }
  })
    .then(response => response.json())
    .then(data => {
      console.log('Refreshed data:', data); 
      
        trainMarkers.forEach(marker => {
        map.removeLayer(marker);
        });
      trainMarkers = [];


    const trains = data.response.entity
      .filter(item => {
        if (!item.vehicle || !item.vehicle.position || !item.vehicle.trip) {
          return false;
        }
        
        const routeId = item.vehicle.trip.route_id;
        
        // Train route IDs follow pattern: LINENAME-NUMBER
        // Examples: EAST-201, WEST-203, SOUTH-202
        const trainPattern = /^(EAST|WEST|STH|ONE)-\d+$/;
        //RBW
        return trainPattern.test(routeId);
      })
      .map(item => {
        const v = item.vehicle;
        const routeId = v.trip.route_id;
        const lineName = routeId.split('-')[0]; // Extract "EAST" from "EAST-201"
    

        return {
          id: item.id,
          line: lineName,
          fullRouteId: routeId,
          lat: v.position.latitude,
          lon: v.position.longitude,
          coords: [v.position.latitude, v.position.longitude],
          timestamp: v.timestamp,
          speed: v.position.speed,
          bearing: v.position.bearing
        };
      });
    
    console.log('Simplified train data:', trains);
    console.log('Number of trains:', trains.length);
    
    // NOW ADD TRAINS TO THE MAP
      

    trains.forEach(train => {
      // Get the icon for this train line, or use default if not found
      const icon = trainIcons[train.line] || trainIcons['OTHER'];
      
      // Create marker with train picture
      const marker = L.marker([train.lat, train.lon], {
        icon: icon
      }).addTo(map);
      
      // Add popup with info
      marker.bindPopup(`
        <b>${train.line} Line</b><br>
        Route: ${train.fullRouteId}<br>
        Speed: ${train.speed} km/h<br>
        Bearing: ${train.bearing}°
      `);

              // Track when popup is opened
        marker.on('popupopen', function() {
          openPopupTrainId = train.id;
        });
        
        // Track when popup is closed
        marker.on('popupclose', function() {
          if (openPopupTrainId === train.id) {
            openPopupTrainId = null;
          }
        });
        
        // If this train's popup was open before refresh, reopen it
        if (openPopupTrainId === train.id) {
          marker.openPopup();
        }
      
      trainMarkers.push(marker);
    });
    
  })

  .catch(error => {
    console.error('Error:', error);  // If something went wrong
  });
}


// Call it once on load
fetchTrains();

setInterval(fetchTrains, 1000);