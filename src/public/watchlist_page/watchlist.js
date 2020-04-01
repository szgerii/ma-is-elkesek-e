
const bkk = "https://futar.bkk.hu/api/query/v1/ws/otp/api/where/";

let username = null;

const bus = "BUS";
const tram = "TRAM";
const metro = "SUBWAY";
const trolley = "TROLLEYBUS"
const hev = "RAIL";
const ship = "FERRY";

let line = 0; //Global variable of the chosen line
let stops = 0; //Global variable of the list of stops

let variant1 = 0; //Global variable of the 1st variant of the chosen line
let variant2 = 0; //Global variable of the 2nd variant of the chosen line
let currentVariant = variant1; //Global variable of the chosen variant

let watchlist = 0;

function setup() {

    const logoutLink = document.querySelector("#logout");
    
    logoutLink.addEventListener("click", () => {
        $.post("/logout", () => {
            window.location.assign("/");
        });
    });

    username = getUsername();

    drawWatchlist();

}

if (window.addEventListener)
	window.addEventListener("load", setup);
else if (window.attachEvent)
	window.attachEvent("onload", setup);

function deleteSegment(index) {

    let url = "/api/users/"+username+"/watchlist";
    let data = {
        lineId: watchlist[index].line.id,
        stop1Id: watchlist[index].stop1.id,
        stop2Id: watchlist[index].stop2.id,
    };

    $.ajax({

        method: "DELETE",
        url: url,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(data),

        success: function(r) {
            window.location.reload();
        },

        error: function(r) {

            if (r.status==401) {
                window.location.replace("/");
            } else {
                document.querySelector(".error-text").innerText = "Hiba történt a szakasz eltávolítása során..";
            }

        }

    });

}

async function loadWatchlist() {

    let url = "/api/users/"+username+"/watchlist";
    let result = null;

    await $.ajax({

        method: "GET",
        url: url,
        dataType: "json",

        success: function(r) {
            result = r.data;
        },
        error: function(r) {

            if (r.status==401) {
                window.location.replace("/");
            } else {
                document.querySelector(".error-text").innerText = "Hiba történt a járatlista betöltése során..";
                result = null;
            }

        }
    });

    return result;

}

async function getLineType(line) {

    let typeName = "";
    await $.ajax({

        method: "GET",
        url:bkk + "route-details.json",
        dataType: "jsonp",
        data: {
            routeId:line.id,
        },

        success:function (r) {

            if (r.status == "OK") {
                typeName = r.data.entry.type;
            } 
            
        },

        error:function (xhr, ajaxOptions, thrownError) {

            console.log("Error in request:");
            console.log(thrownError);

        },
    });

    switch(typeName) {
        case "BUS": typeName = "bus"; break;
        case "TRAM": typeName = "tram"; break;
        case "SUBWAY": typeName = "metro"; break;
        case "FERRY": typeName = "ship"; break;
        case "RAIL": typeName = "hev"; break;
        case "TROLLEYBUS": typeName = "trolley"; break;
    }

    return typeName;

}

async function drawWatchlist() {

    watchlist = await loadWatchlist();
    

    for (let i=0; i<watchlist.length; i++) {

        let type = await getLineType(watchlist[i].line);

        let element = document.createElement("div");
        element.classList.add("watchlist-element");
        element.classList.add("watchlist-"+type);

        let image = document.createElement("img");
        image.classList.add("watchlist-image");
        image.setAttribute("src","assets/images/icon-"+type+".png");

        let text = document.createElement("div");
        text.classList.add("watchlist-text");
        text.innerText = watchlist[i].line.name+": "+watchlist[i].stop1.name+" - " + watchlist[i].stop2.name+" -> ? perc";
        
        let del = document.createElement("div");
        del.classList.add("watchlist-delete");
        del.setAttribute("onclick",'deleteSegment('+i+');');
        del.innerText = "TÖRLÉS";

        element.appendChild(image);
        element.appendChild(text);
        element.appendChild(del);
        document.querySelector(".content").insertBefore(element, document.querySelector(".watchlist-add"));

    }

    updateWatchlist(watchlist);
    setInterval(function () {updateWatchlist(watchlist);}, 10000);

}

function updateWatchlist(watchlist) {

    //loadPredefinedSegment(watchlist[0].line, watchlist[0].stop1, watchlist[0].stop2, 0);
    for (let i=0; i<watchlist.length; i++) {

        loadPredefinedSegment(watchlist[i].line, watchlist[i].stop1, watchlist[i].stop2, document.querySelector(".content").childNodes[i+1].childNodes[1]);

    }

}

function calculateResult(trips) {

    let usefulTrips = [];

    for (let i=0; i<trips.length; i++) {

        if (trips[i].time1 != 0 && trips[i].time2 != 0) {

            if (trips[i].time1 != undefined && trips[i].time2 != undefined) {

                usefulTrips.push(trips[i]);

            }
            

        }
    }

    let travelTimesTotal = 0;
    let latencyTotal = 0;

    for (let i=0; i<usefulTrips.length; i++) {
        travelTimesTotal += usefulTrips[i].getTravelTime();
        latencyTotal += usefulTrips[i].getLatency();
    }

    let avgTravelTime = Math.round(travelTimesTotal/usefulTrips.length * 10) / 10;
    let avgLatency = Math.round(latencyTotal/usefulTrips.length * 10) / 10;

    if (isNaN(avgTravelTime) || isNaN(avgLatency)) {
        
        console.log("An error occured, avg travel time or avg latency came out to be NaN. Trips used for calculations:");
        console.log(usefulTrips);
        console.log("All downloaded trips:");
        console.log(trips);

        return null;

    } else {

        console.log("Calculation successfull, avg travel time: "+avgTravelTime+", avg gained latency: "+avgLatency+". Trips used:");
        console.log(usefulTrips);

        return avgTravelTime;
        
    }     
    
}

async function loadPredefinedSegment(prefLine, prefStop1, prefStop2, output) {

    //load stops(and variants) and wait till it finishes loading
    let line = prefLine;
    line.shortName = prefLine.name;
    
    let stops = 0;
    let variants = 0;
    let stop1 = 0;
    let stop2 = 0;

    await $.ajax({

        method: "GET",
        url:bkk + "route-details.json",
        dataType: "jsonp",
        data: {
            routeId:line.id,
        },

        success:function (r) {

            if (r.status == "OK") {
                stops = r.data.references.stops;
                variants = r.data.entry.variants;
            } else {
                return;
            }
            
        },

        error:function (xhr, ajaxOptions, thrownError) {

            console.log("Error in request:");
            console.log(thrownError);

        },

    });

    let variant1 = new predefinedRouteDirection(variants[0].headsign, variants[0].stopIds, stops);
    let variant2 = new predefinedRouteDirection(variants[1].headsign, variants[1].stopIds, stops);
    let currentVariant = variant1;

    //Determine which variant is used in the predefined segment by searching for stop1 in variant1
    let isVariant1Ok = false;
    for (let i=0; i<variant1.stops.length; i++) {

        if (variant1.stops[i].id==prefStop1.id) {

            isVariant1Ok = true;
            break;

        }

    }
    if (isVariant1Ok) currentVariant = variant1;    
    else currentVariant = variant2;

    //Find the used stops
    for (let i=0; i<currentVariant.stops.length; i++) {
        if (currentVariant.stops[i].id==prefStop1.id) {
            stop1 = currentVariant.stops[i];
        } else if (currentVariant.stops[i].id==prefStop2.id) {
            stop2 = currentVariant.stops[i];
        }
    }

    //Check special case for final stops
    stops = currentVariant.stops;
    let isFinalStop = false;
    let stop2ForFinalStop = 0;
    for (let i = 0; i < stops.length; i++) {
        if (stops[i].id==stop2.id) {
            
            isFinalStop=false;
            stop2ForFinalStop = 0;
            if (i==stops.length-1) {
                isFinalStop = true;
                stop2ForFinalStop = stops[i-1];
            } 
            
            break;
        }
    }

    //Load the segment
    let trips = await downloadSegment(line, stops, stop1, stop2, isFinalStop, stop2ForFinalStop, 20);
    
    let travelTime = calculateResult(trips);

    if (travelTime==null) {
        output.innerText = line.shortName+": "+stop1.name+" - " + stop2.name+" -> nincs adat";
    } else {
        output.innerText = line.shortName+": "+stop1.name+" - " + stop2.name+" -> " + travelTime + " perc";
    }

}

class CalculatedTrip {

    time1 = 0;
    normalTime1 = 0;
    time2 = 0;
    normalTime2 = 0;

    //function for setting time1 (first stop departure) of the trip, when there was no predicted time(no latency)
    setOnlyTime1(time1) {
        this.time1 = time1;
        this.normalTime1 = time1;
    }

    //Function for setting time1 (first stop departure) of the trip, when there was predicted time(the trip had latency)
    setTime1(time1, normalTime1) {
        this.time1 = time1;
        this.normalTime1 = normalTime1;
    }

    //function for setting time2 (second stop arrival) of the trip, when there was no predicted time(no latency)
    setOnlyTime2(time2) {
        this.time2 = time2;
        this.normalTime2 = time2;
    }

    //Function for setting time2 (second stop arrival) of the trip, when there was predicted time(the trip had latency)
    setTime2(time2, normalTime2) {
        this.time2 = time2;
        this.normalTime2 = normalTime2;
    }

    //Function for calculating the travel time of that trip between the two stops
    getTravelTime() {
        
        let date1 = new Date(this.time1*1000);
        let date2 = new Date(this.time2*1000);

        return (date2.getTime()-date1.getTime()) /1000 /60

    }

    //Function for calculating the latency that trip picked up between the two stops
    getLatency() {

        let date1 = new Date(this.time1*1000);
        let normalDate1 = new Date(this.normalTime1*1000);
        let date2 = new Date(this.time2*1000);
        let normalDate2 = new Date(this.normalTime2*1000);
        
        let latency1 = date1.getTime()-normalDate1.getTime();
        let latency2 = date2.getTime()-normalDate2.getTime();

        let gainedLatency = (latency2-latency1) /1000 /60;

        return gainedLatency;

    }

}

async function downloadSegment(line, stops, stop1, stop2, isFinalStop, stop2ForFinalStop, time) {

    //calculate avg time pass between stop1 and stop2
    //get all arrivals in the last x minutes at stop2
    let departures = 0;
    let trips=[];
    let id = 0;

    if (isFinalStop) {
        id = stop2ForFinalStop.id;
    } else {
        id = stop2.id;
    }
    
    //get the stopTimes
    await $.ajax({ 

        method: "GET",
        url: bkk + "arrivals-and-departures-for-stop.json",
        dataType: "jsonp",
        data: {
            stopId:id,
            minutesBefore:time,
            minutesAfter:0,
            includeReferences:false
        },

        success:function(r){

            //we have some stopTimes, let's check when the associated trips visited the stops
            departures = r.data.entry.stopTimes;

        },

        error:function (xhr, ajaxOptions, thrownError) {

            console.log("Error in request:");
            console.log(thrownError);

        }

    });

    //check stop times
    for (let i=0; i<departures.length; i++) {

        let currentTrip = 0;

        //check stop2 time
        if (!isFinalStop) {

            if (departures[i].predictedArrivalTime==undefined) {

                //no difference between predicted and normal
                currentTrip = new CalculatedTrip();
                currentTrip.setOnlyTime2(departures[i].arrivalTime);
                console.log("Set stop2 time of a trip based on:");
                console.log(departures[i]);

            } else {

                //there is difference between predicted and normal
                currentTrip = new CalculatedTrip();
                currentTrip.setTime2(departures[i].predictedArrivalTime, departures[i].arrivalTime);
                console.log("Set stop2 time of a trip based on:");
                console.log(departures[i]);

            }

        } else {
            currentTrip = new CalculatedTrip();
        }

        trips.push(currentTrip);
        
        //check stop1 time
        await $.ajax({

            method: "Get",
            url: bkk + "trip-details.json",
            dataType: "jsonp",
            data: {
                tripId:departures[i].tripId,
                includeReferences:false
            },

            success:function(r) {

                let stopTimes = r.data.entry.stopTimes;

                for (let i=0; i<stopTimes.length; i++) {
                    if (stopTimes[i].stopId==stop1.id) {

                        if (stopTimes[i].predictedDepartureTime==undefined) {
                            //no difference between predicted and normal
                            currentTrip.setOnlyTime1(stopTimes[i].departureTime);
                            console.log("Set stop1 time of a trip based on:");
                            console.log(stopTimes[i]);

                        } else {
                            //there is difference between predicted and normal
                            currentTrip.setTime1(stopTimes[i].predictedDepartureTime, stopTimes[i].departureTime);
                            console.log("Set stop1 time of a trip based on:");
                            console.log(stopTimes[i]);
                        }

                        break;
                    } 
                }

                if (isFinalStop) {
                    let arrival = stopTimes[stopTimes.length-1];
                    if (arrival.predictedArrivalTime==undefined) {
                        //no difference between predicted and normal
                        currentTrip.setOnlyTime2(arrival.arrivalTime);
                    } else {
                        //there is difference between predicted and normal
                        currentTrip.setTime2(arrival.predictedArrivalTime, arrival.arrivalTime);
                    }
                }
            },

            error:function (xhr, ajaxOptions, thrownError) {

                console.log("Error in request:");
                console.log(thrownError);
    
            }

        });

    }
    
    return trips;


}

class predefinedRouteDirection {

    constructor(name, stops, allStops) {

        this.name = name;
        this.stops = stops;
        this.allStops = allStops;

        this.loadRealStops();

    }

    //Function for getting the stops for this specific variant from the full stop list according to the variant list
    loadRealStops() {

        let s = this.stops;
        let result = [];

        for (let i=0; i<s.length; i++) {
            let currentSId = s[i];
            for (let prop in this.allStops) {
                if (this.allStops[prop].id == currentSId) {
                    result.push(this.allStops[prop]);
                    break;
                }
            }
        }

        this.stops = result;

    }
}

//Function for adding selected segment to current watchlist
function addSegment() {

    document.querySelector(".error-text").innerText = "";

    let dd1 = document.getElementById("dropdown-stop1");
    let dd2 = document.getElementById("dropdown-stop2");

    let name1 = dd1.options[dd1.selectedIndex].text;
    let name2 = dd2.options[dd2.selectedIndex].text;

    let stop1 = 0;
    let stop2 = 0;

    let stops = currentVariant.stops;

    for (let i = 0; i < stops.length; i++) {
        if (stops[i].name==name1) {
            stop1=stops[i];
            break;
        }
    }

    for (let i = 0; i < stops.length; i++) {
        if (stops[i].name==name2) {
           
            stop2 = stops[i];
            break;
        }
    }

    let url = "/api/users/"+username+"/watchlist";
    let data = {
        line: {
            id: line.id,
            name: line.shortName
        },
        stop1: {
            id: stop1.id,
            name: stop1.name
        },
        stop2: {
            id: stop2.id,
            name: stop2.name
        }
    }

    if (checkSegment(stop1, stop2)==0) {
        return;
    }

    $.ajax({

        method: "POST",
        url: url,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(data),

        success: function(r) {
            window.location.reload();
        },

        error: function(r) {

            if (r.status==401) {
                window.location.replace("/");
            } else if (r.status==409) {
                document.querySelector(".error-text").innerText = "Ez a szakasz már benne van a járatlistában.";
            } else {
                document.querySelector(".error-text").innerText = "Hiba történt a szakasz járatlistához adása során..";
            }

        }

    });

}

//Function for checking the segment
function checkSegment(stop1, stop2) {

    if (stop1==0||stop2==0) {

        document.querySelector(".error-text").innerHTML = "Nincs járat!";
        return 0;

    }

    if (stop1.id==stop2.id) {

        document.querySelector(".error-text").innerHTML = "Egyeznek a megállók!";
        return 0;

    }

    let stops = currentVariant.stops;
    let correctOrder = false;

    for (let i=0; i<stops.length; i++) {
        
        if (stops[i].id==stop1.id) {
            correctOrder=true;
            break;
        }

        if (stops[i].id==stop2.id) {
            break;
        }

    }

    

    if (correctOrder==false) {
        document.querySelector(".error-text").innerHTML = "Rossz sorrend!";
        return 0;
    } else {
        return 1;
    }



}

//Function for filling the stops from the selected variant into the stop dropdowns
function fillStops() {

    clearStops();

    let dd1 = document.getElementById("dropdown-stop1");
    let dd2 = document.getElementById("dropdown-stop2");

    let stops = currentVariant.stops;

    for (let prop in stops) {

        let option1 = document.createElement("option");
        let option2 = document.createElement("option");

        option1.value=stops[prop].code;
        option2.value=stops[prop].code;

        option1.innerHTML=stops[prop].name;
        option2.innerHTML=stops[prop].name;

        dd1.appendChild(option1);
        dd2.appendChild(option2);
    	
    }

}

//One routeDirection object represents a variant with a name and a list of stops
class routeDirection {

    constructor(name, stops) {

        this.name = name;
        this.stops = stops;

        this.loadRealStops();

    }

    //Function for getting the stops for this specific variant from the full stop list according to the variant list
    loadRealStops() {

        let s = this.stops;
        let result = [];

        for (let i=0; i<s.length; i++) {
            let currentSId = s[i];
            for (let prop in stops) {
                if (stops[prop].id == currentSId) {
                    result.push(stops[prop]);
                    break;
                }
            }
        }

        this.stops = result;

    }

}

//Function for updating the variant when the variant dropdown is changed
function updateVariant() {

    let dropdown = document.getElementById("dropdown-heading");
    let selectedText = dropdown.options[dropdown.selectedIndex].text;

    if (selectedText==variant1.name)
        currentVariant = variant1;
    else
        currentVariant = variant2;

    fillStops();
}

//Function for filling the variants from the selected line into the variant dropdown
function fillVariants() {

    variant1 = new routeDirection(variants[0].headsign, variants[0].stopIds);
    variant2 = new routeDirection(variants[1].headsign, variants[1].stopIds);

    let dropdown = document.getElementById("dropdown-heading");

    let o1 = document.createElement("option");
    o1.innerHTML = variant1.name;
    o1.value = variant1.name;
    dropdown.appendChild(o1);

    let o2 = document.createElement("option");
    o2.innerHTML = variant2.name;
    o2.value = variant2.name;
    dropdown.appendChild(o2);

    updateVariant();

}

//Function for reseting the stops and variants and clearing the variants from the variant dropdown
function resetStops() {

    stops = 0;
    currentVariant = 0;
    variant1 = 0;
    variant2 = 0;
    
    let dropdown = document.getElementById("dropdown-heading");
    dropdown.innerHTML = "";

    clearStops();

}

//Function for clearing the stops from the stop dropdowns, separated from resetSops, because changing variant should only clear stops, but not reset them
function clearStops() {

    let dd1 = document.getElementById("dropdown-stop1");
    let dd2 = document.getElementById("dropdown-stop2");

    dd1.innerHTML = "";
    dd2.innerHTML = "";

    stop1 = 0;
    stop2 = 0;
    
    isUpdatingSegment = false;
    

}

//Function for downloading the list of stops and variants of the selected line
async function loadStops() {

    await $.ajax({

        method: "GET",
        url:bkk + "route-details.json",
        dataType: "jsonp",
        data: {
            routeId:line.id,
        },

        success:function (r) {

            if (r.status == "OK") {
                stops = r.data.references.stops;
                variants = r.data.entry.variants;
            } else {
                console.log("Request succeeded but stop loading failed.");
                resetStops();
                return;
            }

            fillVariants();
            
        },

        error:function (xhr, ajaxOptions, thrownError) {

            console.log("Error in request:");
            console.log(thrownError);

        },

    });

}

async function loadLine() {

    let input = document.getElementById("pick-line-text").value;

    let dropdown = document.getElementById("dropdown-vehicleType");
    let vehicleType = dropdown.options[dropdown.selectedIndex].value;
    
    if (input == "") {
        alert("Kérjük válasszon járatot");
        return;
    }

    resetStops();

    await $.ajax({

        method:"GET",
        url:bkk+"search.json",
        dataType:"jsonp",
        data:{
            query:input,
        },

        success:function (r) {

            line = r.data.references.routes;
            let done = false;
            for (let prop in line) {
                if (line[prop].shortName.toLowerCase()==input.toLowerCase()) { //same name
                    if (line[prop].type.toLowerCase()==vehicleType.toLowerCase()) { //same type of vehicle
                        console.log("Found a route with matching name");
                        line = line[prop];
                        done = true;
                        break;
                    }
                }
            }
            if (!done) {
                for (let prop in line) {
                    if (line[prop].type.toLowerCase()==vehicleType.toLowerCase()) { //same type of vehicle
                        console.log("Found a route based on the input");
                        line = line[prop];
                        done = true;
                        break;
                    }
                }
            }

            //special cases for daily-changing routes (sweet hard code)
            let today = new Date().getDay();
            if (line.id == "BKK_MP53" && (today == 6 || today == 0)) { //normal M3 replacement should be weekend M3 repl at weekends
                line.id = "BKK_MP533";
                line.description = "Kőbánya-Kispest M | Lehel tér M";
            }
            if (line.id == "BKK_3031") {
                line.id="BKK_3030";
                line.description="Mexikói út M | Gubacsi út / Határ út";
            }

            if (!line.id || line.id == "BKK_9999") { //check if the returned line is 9999(object for special lines)
                alert("Nem találtunk járatot");
                console.log("No search results based on text \'"+input.toLowerCase()+"\'");
                line = 0;
                
                return;
            } else {
                console.log("Loading line stops and variants");
                colorScheme = vehicleType;
                loadStops();
            }

        },

        error:function (xhr, ajaxOptions, thrownError) {

            console.log("Error in request:");
            console.log(thrownError);

        },
        
    });

    if (line == 0)
        document.getElementById("pick-line-text").value = "";
    else
        document.getElementById("pick-line-text").value = line.shortName;
    
}