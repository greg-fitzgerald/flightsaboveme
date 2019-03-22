// jshint esversion: 6

// Function to format the model of the plane since I didnt like how it returned the data
function modelGetter(prodline) {
  var manufacture = "";
  for (var i = 0; i < prodline.length; i++) {
    if (prodline[i] != " ") {
      manufacture += prodline[i];
    } else {
      break;
    }
  }
  return manufacture;
}

// Function to grab the coordinates of airports. Accepts 3 letter airport code -> returns an array with the coordinates
function airportCoordFinder(airport) {
  var coords = [];
  for (var j = 0; j < airports.length; j++) {
    if (airports[j].codeIataAirport == airport) {
      coords.push(airports[j].latitudeAirport);
      coords.push(airports[j].longitudeAirport);
      break;
    }
  }
  return coords;
}

// Input airport code -> returns the full name ("PDX" => "Portland International")
function getAirportName(airport) {
  var name;
  for (var j = 0; j < airports.length; j++) {
    if (airports[j].codeIataAirport == airport) {
      name = airports[j].nameAirport.replace(/['"]+/g, "");
      break;
    }
  }
  return name;
}

// Declaring a variable to hold aircraft data
var aircraft;

// Function that is called when a plane is clicked, get the data pertaining to the aircraft.
function getPlanes(regNum, icao24) {
  //Create string for url
  var callURL = "https://aviation-edge.com/v2/public/airplaneDatabase?key=476fda-e02499&numberRegistratgion=" + regNum + "&hexIcaoAirplane=" + icao24;
  console.log(callURL);
  var planeInfo = new XMLHttpRequest();
  //Call the open function, GET-type of request, url, true-asynchronous
  planeInfo.open(
    "GET",
    callURL,
    true
  );
  //call the onload
  planeInfo.onload = function() {
    //check if the status is 200(means everything is okay)
    if (this.status === 200) {
      //return server response as an object with JSON.parse
      aircraft = JSON.parse(this.responseText);
      console.log("Plane Data Sucussfully Retrieved!");
    } else {
      console.log("some error");
    }
  };
  //call send
  planeInfo.send();
}

// Variable to contain the coords for IP location
var ipLoc = [];
// Variable to store the live flights
var flights;
// String variable that holds the flight data after being processed to a geojson
var flightgeojson = '{"type": "FeatureCollection","features": [';
// json parsed verson of flightgeojson (since thats a string)
var data;

// Getting the IP location
getLoc();

// Function to get that location, pushes lat and long to an array
function getLoc() {
  var ip = new XMLHttpRequest();
  //Call the open function, GET-type of request, url, true-asynchronous
  ip.open("GET", "https://api.ipstack.com/check?access_key=135afa636271316d57c8bda9dfa77597", true);
  //call the onload
  ip.onload = function() {
    //check if the status is 200(means everything is okay)
    if (this.status === 200) {
      //return server response as an object with JSON.parse
      ipLocObject = JSON.parse(this.responseText);
      ipLoc.push(ipLocObject.latitude);
      ipLoc.push(ipLocObject.longitude);
      console.log("Location from IP obtained!");
      getAirport();
    } else {
      console.log("some error");
    }
  };
  //call send
  ip.send();
}

// Declaring a variable to hold the airport data (object)
var airports;

// Getting the airport data, assigning it to airports variable
function getAirport() {
  var ap = new XMLHttpRequest();
  //Call the open function, GET-type of request, url, true-asynchronous
  ap.open(
    "GET",
    "https://aviation-edge.com/v2/public/airportDatabase?key=476fda-e02499",
    true
  );
  //call the onload
  ap.onload = function() {
    //check if the status is 200(means everything is okay)
    if (this.status === 200) {
      //return server response as an object with JSON.parse
      airports = JSON.parse(this.responseText);
      console.log("Airports Sucussfully Retrieved!");

      getFlight();
    } else {
      console.log("some error");
    }
  };
  //call send
  ap.send();
}

//Getting the flights, and processing it into a geoJson
function getFlight() {
  var oReq = new XMLHttpRequest();
  oReq.onload = reqListener;
  oReq.onerror = reqError;
  oReq.open(
    "get",
    "https://aviation-edge.com/v2/public/flights?key=476fda-e02499&status=en-route&limit=3000",
    true
  );
  oReq.send();
  //console.log(data
}

function reqError(err) {
  console.log("Fetch Error :-S", err);
}

function reqListener() {
  flights = JSON.parse(this.responseText);
  for (var i = 0; i < flights.length; i++) {
    // for other flight data if flights.states.icao = other.icao
    let flightData = `{
          "type" : "Feature",
          "geometry" : {
            "type": "Point",
            "coordinates": [${flights[i].geography.longitude}, ${
      flights[i].geography.latitude
    }]},
            "properties": {
              "regNumber" : "${flights[i].aircraft.regNumber}",
              "icao24" : "${flights[i].aircraft.icao24}",
              "altitude" : ${flights[i].geography.altitude},
              "speed" : ${flights[i].speed.horizontal},
              "departed" : "${flights[i].departure.iataCode}",
              "departedCoords" : [${airportCoordFinder(
                flights[i].departure.iataCode
              )}],
              "departedName" : "${getAirportName(
                flights[i].departure.iataCode
              )}",
              "arrival" : "${flights[i].arrival.iataCode}",
              "arrivalCoords" : [${airportCoordFinder(
                flights[i].arrival.iataCode
              )}],
              "arrivalName" : "${getAirportName(flights[i].arrival.iataCode)}",
              "airline" : "${flights[i].airline.icaoCode}",
              "direction" : ${flights[i].geography.direction}
            }}, `;
    flightgeojson += "\n" + flightData;
  }

  //cuts off last comma
  flightgeojson = flightgeojson.substring(0, flightgeojson.length - 2);
  flightgeojson += "]}";
  data = JSON.parse(flightgeojson);
  console.log("Flights Retrieved, LETS MAP THAT SHIT");

  //Calling function to create the map now that the data has been retrieved
  makeMap(data);
}

// This deletes the map object? Not exactly sure what this does but I googled my error and StackOverflow told me to do this...and, well...it worked
map.off();
map.remove();

//Function that does all the mapping
function makeMap(data) {
  //console.log(data);
  console.log(ipLoc);

  //creating the map and passing it the ip location
  var map = L.map("map", {
    center: ipLoc,
    zoom: 13
  });

  //getting the basemap from mapbox + inserting it
  L.tileLayer(
    "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZ3JlZ2ZpdHpnZXJhbGQiLCJhIjoiY2ptZ3Rhc29hMDF5MDNxcGxncnU5bzZpYSJ9.eaxRgScqpLGPaE9QCLWH0w", {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="http://mapbox.com">Mapbox</a>',
      id: "mapbox.light"
    }
  ).addTo(map);

  //creating the sidebar and setting options
  var sidebar = L.control.sidebar("sidebar", {
    closeButton: true,
    position: "left"
  });

  //adding the sidebar
  map.addControl(sidebar);

  // plane symbology design
  var newIcon = L.icon({
    iconUrl: "https://image.flaticon.com/icons/png/512/18/18565.png",
    iconSize: [30, 30]
  });

  //placing the geojson into the map (all the plane icons)
  L.geoJSON(data, {
      pointToLayer: function(feature, latlng) {
        return L.marker(latlng, {
          icon: newIcon,
          rotationAngle: feature.properties.direction,
          opacity: 0.5
        });
      },
      onEachFeature: onEachFeature
    }) //telling it what to do when clicked (get aircraft info, add flight info to html)
    .on("click", function(e) {
      getPlanes(e.sourceTarget.feature.properties.regNumber, e.sourceTarget.feature.properties.icao24);
      // time out to get some data and give some time for setview animations
      setTimeout(function() {
        sidebar.toggle();
        document.getElementById("speed").innerHTML = e.sourceTarget.feature.properties.speed + "mph";
        document.getElementById("alt").innerHTML = e.sourceTarget.feature.properties.altitude + "m";
        document.getElementById("dep").innerHTML = e.sourceTarget.feature.properties.departedName;
        document.getElementById("arr").innerHTML = e.sourceTarget.feature.properties.arrivalName;
        document.getElementById("airline").innerHTML = e.sourceTarget.feature.properties.airline;

        // The second map within the sidebar
        var container = L.DomUtil.get('PlaneMap');
        if (container != null) {
          container._leaflet_id = null;
        }
        var planemap = L.map("PlaneMap", {
          zoomControl: false
        });
        //fitting the map bounding box to contain the two airports
        planemap.fitBounds([e.sourceTarget.feature.properties.arrivalCoords, e.sourceTarget.feature.properties.departedCoords]);
        // second map basemap
        L.tileLayer(
          "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZ3JlZ2ZpdHpnZXJhbGQiLCJhIjoiY2ptZ3Rhc29hMDF5MDNxcGxncnU5bzZpYSJ9.eaxRgScqpLGPaE9QCLWH0w", {
            maxZoom: 18,
            id: "mapbox.dark"
          }
        ).addTo(planemap);

        //adding airport markers to second map
        var orgin = L.marker(e.sourceTarget.feature.properties.departedCoords).addTo(planemap);
        var dest = L.marker(e.sourceTarget.feature.properties.arrivalCoords).addTo(planemap);

        //variable to an array of the coordinates for use in creating a line
        line = [e.sourceTarget.feature.properties.departedCoords, e.sourceTarget.feature.properties.arrivalCoords];

        // making that line
        var pathLine = L.polyline(line).addTo(planemap);

        // given the js some time to get the aircraft model data, so its about time to add it to the sidebar
        document.getElementById("model").innerHTML = modelGetter(aircraft[0].productionLine) + " " + aircraft[0].planeModel;
        document.getElementById("engineType").innerHTML = aircraft[0].enginesType;
        document.getElementById("engineNum").innerHTML = aircraft[0].enginesCount;
        document.getElementById("age").innerHTML = aircraft[0].planeAge;

      }, 2500);
      // document.getElementById("speed").innerHTML = e.properties.speed;
    })
    .addTo(map);

  // function to setview to center the plane that was clicked (thanks for the function Joanna!)
  function onEachFeature(feature, layer) {
    //bind click
    layer.on({
      click: whenClicked

    });
  }

  function whenClicked(e) {
    map.setView(e.latlng, 13);
  }
}
