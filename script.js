// Create the map centered on Auckland
const map = L.map('map').setView([-36.8485, 174.7633], 11);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Railway overlay on top
L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
  attribution: '© OpenRailwayMap',
  opacity: 0.7
}).addTo(map);

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
    iconSize: [20, 20],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  })
};

const apiKey = 'c2b1e0d02890459eaf091ab8894e285c';
const apiUrl = 'https://api.at.govt.nz/realtime/legacy/vehiclelocations';

let trainMarkers = [];
let openPopupTrainId = null;

function fetchTrains() {
  fetch(apiUrl, {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey
    }
  })
    .then(response => response.json())
    .then(data => {
      // Clear all old markers
      trainMarkers.forEach(marker => {
        map.removeLayer(marker);
      });
      trainMarkers = [];

      // Get ALL vehicles with positions
      const allVehicles = data.response.entity
        .filter(item => item.vehicle && item.vehicle.position)
        .map(item => {
          const v = item.vehicle;
          const hasTrip = v.trip && v.trip.route_id;
          const trainPattern = /^(EAST|WEST|STH|ONE)-\d+$/;
          const isInServiceTrain = hasTrip && trainPattern.test(v.trip.route_id);
          const label = v.vehicle?.label || '';
          const isAMP = label.startsWith('AMP');
          
          return {
            id: item.id,
            lat: v.position.latitude,
            lon: v.position.longitude,
            speed: v.position.speed || 0,
            bearing: v.position.bearing || 0,
            isInService: isInServiceTrain,
            isAMP: isAMP,
            line: isInServiceTrain ? v.trip.route_id.split('-')[0] : null,
            routeId: isInServiceTrain ? v.trip.route_id : label,
            destination: isInServiceTrain ? (v.trip.trip_headsign || 'Unknown') : 'Out of Service',
            rawData: item
          };
        })
        .filter(v => v.isInService || v.isAMP); // Only trains and AMP vehicles

      console.log('Total vehicles found:', allVehicles.length);

      // Group in-service trains with nearby out-of-service units
      const finalTrains = [];
      const used = new Set();

      allVehicles.forEach((vehicle, index) => {
        if (used.has(index)) return;
        
        // Only start grouping from in-service trains
        if (!vehicle.isInService) return;
        
        used.add(index);
        let unitCount = 1; // Start with 1 unit (the in-service train)
        
        // Find ALL nearby vehicles (in-service OR out-of-service)
        allVehicles.forEach((other, otherIndex) => {
          if (used.has(otherIndex)) return;
          if (index === otherIndex) return;
          
          // Calculate distance
          const latDiff = Math.abs(vehicle.lat - other.lat);
          const lonDiff = Math.abs(vehicle.lon - other.lon);
          const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
          
          // Check bearing similarity
          const bearingDiff = Math.abs(vehicle.bearing - other.bearing);
          
          // If close together (within 150m) and similar direction
          if (distance < 0.0015 && bearingDiff < 45) {
            unitCount++;
            used.add(otherIndex);
            console.log(`Coupled: ${vehicle.routeId} with ${other.routeId}`);
          }
        });
        
        finalTrains.push({
          ...vehicle,
          units: unitCount,
          cars: unitCount * 3
        });
      });

      // Add remaining AMP vehicles that weren't coupled
      allVehicles.forEach((vehicle, index) => {
        if (used.has(index)) return;
        if (!vehicle.isAMP) return;
        
        finalTrains.push({
          ...vehicle,
          units: 1,
          cars: 0, // AMP vehicles don't have "cars"
          line: 'OTHER'
        });
      });

      console.log(`Vehicles: ${allVehicles.length}, Final trains: ${finalTrains.length}`);
      
      const trainMarkerPairs = [];
      
      finalTrains.forEach(train => {
        const icon = trainIcons[train.line] || trainIcons['OTHER'];
        
        const marker = L.marker([train.lat, train.lon], {
          icon: icon
        }).addTo(map);
        
        const carInfo = train.line !== 'OTHER' && train.cars > 0 
          ? `${train.cars} carriages <br>`
          : '';
        
        marker.bindPopup(`
          <b>${train.line === 'OTHER' ? 'AMP Vehicle' : train.line + ' Line'}</b><br>
          ${train.destination !== 'Out of Service' ? 'Destination: ' + train.destination + '<br>' : ''}
          ${carInfo}
          Route: ${train.routeId}<br>
          Speed: ${train.speed} km/h<br>
          Bearing: ${train.bearing}°
        `);

        marker.on('popupopen', function() {
          openPopupTrainId = train.id;
        });
        
        marker.on('popupclose', function() {
          openPopupTrainId = null;
        });
        
        trainMarkers.push(marker);
        trainMarkerPairs.push({ train, marker });
      });
      
      if (openPopupTrainId) {
        const pair = trainMarkerPairs.find(p => p.train.id === openPopupTrainId);
        if (pair) {
          setTimeout(() => {
            pair.marker.openPopup();
          }, 50);
        } else {
          openPopupTrainId = null;
        }
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

// Fetch trains on load
fetchTrains();

// Refresh every 5 seconds
setInterval(fetchTrains, 5000);