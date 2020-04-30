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
let refreshInProgress = false; // Indicates whether or not the watchlist is currently being redrawn to the screen
let watchlistTime;

function setup() {

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

    fetch(url, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.status === 401) {
            window.location.replace("/");
        } else if (Math.floor(response.status / 100) !== 2){
            alert("Hiba történt a szakasz eltávolítása során. Kérjük próbálkozzon újra később.");
            console.debug("An error occured while deleting a section");
            console.debug(response);
            return;
        }

        const content = document.querySelector(".content");
            
        for (let i = index; i < watchlist.length - 1; i++) {
            watchlist[i] = watchlist[i + 1];
            watchlist[i].orderIndex--;

            content.children[i + 1].children[2].children[0].onclick = () => moveUp(i);
            content.children[i + 1].children[2].children[1].onclick = () => moveDown(i);
            content.children[i + 1].children[2].children[2].onclick = () => deleteSegment(i);
        }

        content.children[index].remove();

        watchlist.pop();

        if (watchlist.length === 0) {
            drawWatchlist(true);
        }
    })
}

async function loadWatchlist() {

    let url = "/api/users/"+username+"/watchlist";
    let result = null;

    await fetch(url)
    .then(async response => {
        return {
            json: await response.json(),
            status: response.status
        };
    })
    .then(res => {
        if (res.status === 401) {
            window.location.replace("/");
        } else if (res.json.status !== "success") {
            alert("Hiba történt a járatlista betöltése során. Kérjük próbálkozzon újra később.");
            result = null;
        }

        result = res.json.data.list;
        watchlistTime = res.json.data.time;
    })
    .catch(err => {
        alert("Hiba történt a lista betöltése során. Kérjük próbálkozzon újra később.");
        console.debug("An error occured while loading the user's watchlist");
        console.debug(err);
    });

    return result;

}

async function getLineType(line) {

    let typeName = "";

    await fetchJsonp(`${bkk}route-details.json?routeId=${line.id}`)
    .then(response => response.json())
    .then(json => {
        if (json.status == "OK") {
            typeName = json.data.entry.type;
        }
    })
    .catch(err => {
        console.debug(`An error occured while download the type of the following line: ${line}`);
        console.debug(err);
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

async function drawWatchlist(skipFetch) {

    if (refreshInProgress)
        return;

    refreshInProgress = true;

    if (!skipFetch)
        watchlist = await loadWatchlist();

    const content = document.querySelector(".content");

    if (watchlist.length === 0) {
        const infoContainer = document.createElement("div");
        infoContainer.id = "info-container";
        const info = document.createElement("p");
        info.id = "empty-info";
        info.innerText = "Még nincsenek szakaszok a listádon. Új szakaszokat a főoldalról menthetsz el, egy útvonal kiválasztása után.";
        infoContainer.appendChild(info);
        content.appendChild(infoContainer);
        refreshInProgress = false;
        return;
    }

    watchlist.sort((a, b) =>
        a.orderIndex < b.orderIndex ? -1 :
        a.orderIndex > b.orderIndex ? 1 : 0
    );

    for (let i = content.children.length - 1; i >= 0; i--) {
        content.children[i].remove();
    }

    for (let i = 0; i < watchlist.length; i++) {
        const type = await getLineType(watchlist[i].line);

        const element = document.createElement("div");
        element.classList.add("watchlist-element");
        element.classList.add("watchlist-"+type);

        const image = document.createElement("img");
        image.classList.add("watchlist-image");
        image.setAttribute("src","assets/images/icon-"+type+".svg");

        const text = document.createElement("div");
        text.classList.add("watchlist-text");
        text.innerHTML = "["+watchlist[i].line.name+"] "+watchlist[i].stop1.name+" - "+watchlist[i].stop2.name+": ? perc";
        
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("button-container");
        
        const upArrow = document.createElement("img");
        upArrow.src = `/assets/images/triangle-${type === "tram" || type === "ship" ? "black" : "white"}.png`;
        upArrow.classList.add("watchlist-move");
        upArrow.onclick = () => moveUp(i);
        buttonContainer.appendChild(upArrow);
        
        const downArrow = document.createElement("img");
        downArrow.src = `/assets/images/triangle-${type === "tram" || type === "ship" ? "black" : "white"}.png`;
        downArrow.classList.add("watchlist-move");
        downArrow.classList.add("watchlist-move-down");
        downArrow.onclick = () => moveDown(i);
        buttonContainer.appendChild(downArrow);

        const del = document.createElement("img");
        del.src = `/assets/images/x-${type === "tram" || type === "ship" ? "black" : "white"}.png`;
        del.classList.add("watchlist-delete");
        del.setAttribute("onclick",'deleteSegment('+i+');');
        buttonContainer.appendChild(del);
        
        element.appendChild(image);
        element.appendChild(text);
        element.appendChild(buttonContainer);
        content.appendChild(element);
    }

    updateWatchlist(watchlist);
    setInterval(() => updateWatchlist(watchlist), 10000);

    refreshInProgress = false;

}

function moveUp(i) {
    if (watchlist[i].orderIndex === 0)
        return;

    fetch(`/api/users/${username}/watchlist`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            lineId: watchlist[i].line.id,
            stop1Id: watchlist[i].stop1.id,
            stop2Id: watchlist[i].stop2.id,
            moveUp: true
        })
    })
    .then(() => {
        const content = document.querySelector(".content");

        watchlist[i].orderIndex--;
        watchlist[i - 1].orderIndex++;

        let temp = watchlist[i];
        watchlist[i] = watchlist[i - 1];
        watchlist[i - 1] = temp;
        
        // Swap the elements
        temp = content.children[i].cloneNode(true);
        content.children[i].replaceWith(content.children[i - 1].cloneNode(true));
        content.children[i - 1].replaceWith(temp);

        // Add event listeners to the new move up and move down buttons
        content.children[i].children[2].children[0].onclick = () => moveUp(i);
        content.children[i].children[2].children[1].onclick = () => moveDown(i);
        content.children[i].children[2].children[2].onclick = () => deleteSegment(i);
        content.children[i - 1].children[2].children[0].onclick = () => moveUp(i - 1);
        content.children[i - 1].children[2].children[1].onclick = () => moveDown(i - 1);
        content.children[i - 1].children[2].children[2].onclick = () => deleteSegment(i - 1);
    })
    .catch(err => {
        console.debug("An error occured while moving a section");
        console.debug(err);
        alert("Ismeretlen hiba történt a szakasz léptetése során, kérjük próbálkozzon újra később");
    });
}

function moveDown(i) {
    if (watchlist[i].orderIndex === watchlist.length - 1)
        return;

    fetch(`/api/users/${username}/watchlist`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            lineId: watchlist[i].line.id,
            stop1Id: watchlist[i].stop1.id,
            stop2Id: watchlist[i].stop2.id,
            moveUp: false
        })
    })
    .then(() => {
        const content = document.querySelector(".content");

        watchlist[i].orderIndex++;
        watchlist[i + 1].orderIndex--;

        let temp = watchlist[i];
        watchlist[i] = watchlist[i + 1];
        watchlist[i + 1] = temp;
        
        // Swap the elements
        temp = content.children[i].cloneNode(true);
        content.children[i].replaceWith(content.children[i + 1].cloneNode(true));
        content.children[i + 1].replaceWith(temp);

        // Add event listeners to the new move up and move down buttons
        content.children[i].children[2].children[0].onclick = () => moveUp(i);
        content.children[i].children[2].children[1].onclick = () => moveDown(i);
        content.children[i].children[2].children[2].onclick = () => deleteSegment(i);
        content.children[i + 1].children[2].children[0].onclick = () => moveUp(i + 1);
        content.children[i + 1].children[2].children[1].onclick = () => moveDown(i + 1);
        content.children[i + 1].children[2].children[2].onclick = () => deleteSegment(i + 1);
    })
    .catch(err => {
        console.debug("An error occured while moving a section");
        console.debug(err);
        alert("Ismeretlen hiba történt a szakasz léptetése során, kérjük próbálkozzon újra később");
    });
}

function updateWatchlist(watchlist) {

    const content = document.querySelector(".content");
    
    for (let i = 0; i < content.children.length; i++) {
        loadPredefinedSegment(watchlist[i].line, watchlist[i].stop1, watchlist[i].stop2, content.children[i].children[1]);
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
        
        console.debug("An error occured, avg travel time or avg latency came out to be NaN. Trips used for calculations:");
        console.debug(usefulTrips);
        console.debug("All downloaded trips:");
        console.debug(trips);

        return null;

    } else {

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

    await fetchJsonp(`${bkk}route-details.json?routeId=${line.id}`)
    .then(response => response.json())
    .then(json => {
        if (json.status === "OK") {
            stops = json.data.references.stops;
            variants = json.data.entry.variants;
        }
    })
    .catch(err => {
        console.debug(`An error occured while loading the following segment: ${prefLine}: ${prefStop1} - ${prefStop2}`);
        console.debug(err);
    });

    if (stops === 0 || variants === 0)
        return;

    let variant1 = new predefinedRouteDirection(variants[0].headsign, variants[0].stopIds, stops);
    let variant2 = new predefinedRouteDirection(variants[1].headsign, variants[1].stopIds, stops);
    let currentVariant = variant1;
    let variant1ContainsStop1 = false, variant1ContainsStop2 = false;

    //Determine which variant is used in the predefined segment by searching for stop1 in variant1
    for (let i = 0; i < variant1.stops.length; i++) {
        
        if (variant1.stops[i].id === prefStop1.id) {
            variant1ContainsStop1 = true;    
        }

        if (variant1.stops[i].id === prefStop2.id) {
            variant1ContainsStop2 = true;
        }
        
    }
    
    if (variant1ContainsStop1 && variant1ContainsStop2)
        currentVariant = variant1;    
    else
        currentVariant = variant2;

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
    let trips = await downloadSegment(line, stops, stop1, stop2, isFinalStop, stop2ForFinalStop, watchlistTime);
    
    let travelTime = calculateResult(trips);

    if (travelTime==null) {
        output.innerHTML = "[" + line.shortName+"] "+stop1.name+" - " + stop2.name+": nincs adat";
    } else {
        output.innerHTML = "[" + line.shortName+"] "+stop1.name+" - " + stop2.name+": " + travelTime + " perc";
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
    await fetchJsonp(`${bkk}arrivals-and-departures-for-stop.json?stopId=${id}&minutesBefore=${time}&minutesAfter=0&includeReferences=false`)
    .then(response => response.json())
    .then(json => {
        //we have some stopTimes, let's check when the associated trips visited the stops
        departures = json.data.entry.stopTimes;
    })
    .catch(err => {
        console.debug(`An error occured while downloading stopTimes for ${id}`);
        console.debug(err);
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

            } else {

                //there is difference between predicted and normal
                currentTrip = new CalculatedTrip();
                currentTrip.setTime2(departures[i].predictedArrivalTime, departures[i].arrivalTime);

            }

        } else {
            currentTrip = new CalculatedTrip();
        }

        trips.push(currentTrip);
        
        //check stop1 time
        await fetchJsonp(`${bkk}trip-details.json?tripId=${departures[i].tripId}&includeReferences=false`)
        .then(response => response.json())
        .then(json => {
            let stopTimes = json.data.entry.stopTimes;

            for (let i = 0; i < stopTimes.length; i++) {
                if (stopTimes[i].stopId==stop1.id) {

                    if (stopTimes[i].predictedDepartureTime==undefined) {
                        //no difference between predicted and normal
                        currentTrip.setOnlyTime1(stopTimes[i].departureTime);

                    } else {
                        //there is difference between predicted and normal
                        currentTrip.setTime1(stopTimes[i].predictedDepartureTime, stopTimes[i].departureTime);
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
        })
        .catch(err => {
            console.debug(`An error occured while trying to get trip details for ${departures[i]}`);
            console.debug(err);
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