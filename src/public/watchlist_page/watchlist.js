
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
        text.innerHTML = watchlist[i].line.name+": "+watchlist[i].stop1.name+" - " + watchlist[i].stop2.name+" &#187 ? perc";
        
        let del = document.createElement("p");
        del.classList.add("watchlist-delete");
        del.setAttribute("onclick",'deleteSegment('+i+');');
        del.innerHTML = "&#10005";

        element.appendChild(image);
        element.appendChild(text);
        element.appendChild(del);
        document.querySelector(".content").insertBefore(element, document.querySelector(".error-text"));

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
        output.innerHTML = line.shortName+": "+stop1.name+" - " + stop2.name+" &#187 nincs adat";
    } else {
        output.innerHTML = line.shortName+": "+stop1.name+" - " + stop2.name+" &#187 " + travelTime + " perc";
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
