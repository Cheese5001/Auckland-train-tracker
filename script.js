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


// trains on map
// Function to add a train marker
  function addTrainMarker(lat, lon, trainInfo) {
    const marker = L.marker([lat, lon]).addTo(map);
    marker.bindPopup(`<b>${trainInfo}</b>`);
  }
  
  // Example: Add a test marker
  addTrainMarker(-36.8485, 174.7633, 'EAST Line - Train 1');



// Your API key from Auckland Transport
const apiKey = 'c2b1e0d02890459eaf091ab8894e285c';

// The URL endpoint (where you're requesting data from)
const apiUrl = 'https://api.at.govt.nz/realtime/legacy/vehiclelocations';

// Making the request
fetch(apiUrl, {
  headers: {
    'Ocp-Apim-Subscription-Key': apiKey
  }
})
  .then(response => response.json())  // Convert response to JSON
  .then(data => {
    console.log(data); 


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
  }) 

  .catch(error => {
    console.error('Error:', error);  // If something went wrong
  });


  