const bkk = "https://futar.bkk.hu/api/query/v1/ws/otp/api/where/";
const hotSmokinUrl = "/hotsmokin"; //change me plz or i will kill myself

let line = 0;
let stops = 0;

let time = 10;

let variant1 = 0;
let variant2 = 0;
let currentVariant = variant1;

let isUpdatingHotSmoke = true;
let isUpdatingSegment = false;

let stop1 = 0;
let stop2  = 0;
let isFinalStop = false;
let stop2ForFinalStop = 0;

let stopsUpdated = false;

window.onload = function() {
    
    let pickLineText = document.getElementById("pick-line-text");

    pickLineText.addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            loadLine();
    });

    update();
    setInterval(update,50);
    slowUpdate();
    setInterval(slowUpdate,10000);

}

function updateTime() {

    let dd = document.querySelector("#dropdown-time");

    time = Number(dd.options[dd.selectedIndex].value);

    if (currentVariant !== 0) {
        updateStops();
    }

}

function uploadHot() {

    console.log(line);
    console.log(stop1);

    let data = {
        name: "hotSmokinUpload",
        lineId: line.id,
        stop1Id: stop1.id,
        stop2Id: stop2.id,
        lineName: line.shortName,
        stop1Name: stop1.name,
        stop2Name: stop2.name
    };

    $.ajax({
        
        method:"POST",
        url:hotSmokinUrl,
        dataType:"jsonp",
        data:data,

        success: function(r) {console.log("Sent data for hot smokin statistics")},
        error: function(r) {console.log("An error while uploading hot smokin' data")},
        

    });

}

//change me plz
async function downloadHot() {
    await $.ajax({

        method:"GET",
        url:hotSmokinUrl,
        dataType:"json",

        success:function(r) {
            console.log(r.responseText);
            if (r.hot1) {
                document.getElementById("hot-smoke-1").innerHTML = `${r.hot1.line.name}: ${r.hot1.stop1.name} - ${r.hot1.stop2.name}`;
            } else {
                document.getElementById("hot-smoke-1").innerHTML = "Nincs elég adat az információ megjelenítéséhez";
            }
            if (r.hot2) {
                document.getElementById("hot-smoke-2").innerHTML = `${r.hot2.line.name}: ${r.hot2.stop1.name} - ${r.hot2.stop2.name}`;
            } else {
                document.getElementById("hot-smoke-2").innerHTML = "Nincs elég adat az információ megjelenítéséhez";
            }
            if (r.hot3) {
                document.getElementById("hot-smoke-3").innerHTML = `${r.hot3.line.name}: ${r.hot3.stop1.name} - ${r.hot3.stop2.name}`;
            } else {
                document.getElementById("hot-smoke-3").innerHTML = "Nincs elég adat az információ megjelenítéséhez";
            }
        },

        error:function(r) {
            console.log("An error occured while downloading hot smokin' data");
            console.log(r.responseText);
            document.getElementById("hot-smoke-1").innerHTML = "Hot smokin' #1";
            document.getElementById("hot-smoke-2").innerHTML = "Hot smokin' #2";
            document.getElementById("hot-smoke-3").innerHTML = "Hot smokin' #3";
        }

    });

    //fill the object 'result' with the data in 'response'

}

function checkSegment() {

    if (stop1==0||stop2==0) {
        document.getElementById("stop1").innerHTML = "Megálló A";
        document.getElementById("stop2").innerHTML = "Megálló B";
        document.getElementById("result").innerHTML = "Kérjük válasszon érvényes buszjáratot!";
        return 0;
    } else {
        document.getElementById("stop1").innerHTML = stop1.name;
        document.getElementById("stop2").innerHTML = stop2.name;
    }

    if (stop1.id==stop2.id) {
        document.getElementById("result").innerHTML = "Kérjük különböző megállókat válasszon!";
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
        document.getElementById("result").innerHTML = "A megállók fordítva vannak!";
        return 0;
    } else {
        document.getElementById("result").innerHTML = "Számolás folyamatban...";
        return 1;
    }



}

class CalculatedTrip {

    time1 = 0;
    normalTime1 = 0;
    time2 = 0;
    normalTime2 = 0;

    setOnlyTime1(time1) {
        this.time1 = time1;
        this.normalTime1 = time1;
    }

    setTime1(time1, normalTime1) {
        this.time1 = time1;
        this.normalTime1 = normalTime1;
    }

    setOnlyTime2(time2) {
        this.time2 = time2;
        this.normalTime2 = time2;
    }

    setTime2(time2, normalTime2) {
        this.time2 = time2;
        this.normalTime2 = normalTime2;
    }

    getTravelTime() {
        
        let date1 = new Date(this.time1*1000);
        let date2 = new Date(this.time2*1000);

        return (date2.getTime()-date1.getTime()) /1000 /60

    }

    getLatency() {

        let date1 = new Date(this.time1*1000);
        let normalDate1 = new Date(this.normalTime1*1000);
        let date2 = new Date(this.time2*1000);
        let normalDate2 = new Date(this.normalTime2*1000);
        
        let latency1 = date1.getTime()-normalDate1.getTime();
        let latency2 = date2.getTime()-normalDate2.getTime();

        let totalLatency = (latency1-latency2) /1000 /60;

        return totalLatency;

    }

}

async function downloadSegment() {

    //calculate avg time pass between stop1 and stop2
    //get all arrivals in the last '30' minutes at stop2
    let departures = 0;
    let trips=[];
    let id = 0;
    if (isFinalStop) {
        id = stop2ForFinalStop.id;
    } else {
        id = stop2.id;
    }
    
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

            //we have some stopTimes, let's check when the associated trips visited stop1 
            departures=r.data.entry.stopTimes;

        }
    });

    for (let i=0; i<departures.length; i++) {
        let currentTrip = 0;
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
            }

        });

    }
    
    return trips;


}

function updateSegment(trips) {
    let usefulTrips = [];
    for (let i=0; i<trips.length; i++) {

        if (trips[i].time1 != 0 && trips[i].time2 != 0) {

            usefulTrips.push(trips[i]);

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
        document.getElementById("result").innerHTML = "Hiba történt a számítás során";
        console.log(trips);
    } else {
        document.getElementById("result").innerHTML = (
            avgTravelTime + 
            " perc átlag utazási idő a szakaszon <br />"+
            avgLatency +
            " perc átlag felszedett késés a szakaszon"
        );
    }     
    
}

async function slowUpdate() {

    if (isUpdatingHotSmoke) {
        downloadHot();
    }

    if (isUpdatingSegment) {
        let trips = await downloadSegment();
        updateSegment(trips);
    }

}

async function update() {

    if (!stopsUpdated) {
        return;
    }
    
    stopsUpdated = false;
    if (checkSegment()==1) {

        //upload for hot smokin'
        uploadHot();

        let trips = await downloadSegment();
        updateSegment(trips);

        isUpdatingSegment = true;

    } else {
        isUpdatingSegment = false;
    }

}

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

    updateStops();

}

class routeDirection {

    constructor(name, stops) {

        this.name = name;
        this.stops = stops;

        this.loadRealStops();

    }

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

function updateStops() {

    let dd1 = document.getElementById("dropdown-stop1");
    let dd2 = document.getElementById("dropdown-stop2");

    let name1 = dd1.options[dd1.selectedIndex].text;
    let name2 = dd2.options[dd2.selectedIndex].text;

    let stops = currentVariant.stops;

    for (let i = 0; i < stops.length; i++)
        if (stops[i].name==name1) {
            stop1=stops[i];
            break;
        }

    for (let i = 0; i < stops.length; i++)
        if (stops[i].name==name2) {
           
            stop2 = stops[i];
            
            isFinalStop=false;
            stop2ForFinalStop = 0;
            if (i==stops.length-1) {
                isFinalStop = true;
                stop2ForFinalStop = stops[i-1];
            } 
            
            break;
        }

    stopsUpdated = true;

}

function updateVariant() {
    let dropdown = document.getElementById("dropdown-heading");
    let selectedText = dropdown.options[dropdown.selectedIndex].text;
    if (selectedText==variant1.name)
        currentVariant = variant1;
    else
        currentVariant = variant2;

    fillStops();
}

function fillVariants() {

    variant1 = new routeDirection(variants[0].headsign, variants[0].stopIds);
    variant2 = new routeDirection(variants[1].headsign, variants[1].stopIds);

    let dropdown = document.getElementById("dropdown-heading");

    let o1 = document.createElement("option");
    o1.innerHTML = variant1.name;
    o1.value = variant1;
    dropdown.appendChild(o1);

    let o2 = document.createElement("option");
    o2.innerHTML = variant2.name;
    o2.value = variant2;
    dropdown.appendChild(o2);

    updateVariant();

}

function resetStops() {

    stops = 0;
    currentVariant = 0;
    variant1 = 0;
    variant2 = 0;
    
    let dropdown = document.getElementById("dropdown-heading");
    dropdown.innerHTML = "";

    clearStops();

}

function clearStops() {

    let dd1 = document.getElementById("dropdown-stop1");
    let dd2 = document.getElementById("dropdown-stop2");

    dd1.innerHTML = "";
    dd2.innerHTML = "";

    stop1 = 0;
    stop2 = 0;
    stopsUpdated=true;

}

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
                alert("Nem sikerült betölteni a megállókat");
                resetStops();
                return;
            }

            fillVariants();
            
        }

    });

}

async function loadLine() {

    let input = document.getElementById("pick-line-text").value;
    
    let isInputCorrect = true;

    let dropdown = document.getElementById("dropdown-vehicleType");
    let vehicleType = dropdown.options[dropdown.selectedIndex].value;
    
    if (input == "") {
        isInputCorrect=false;
        alert("Kérjük válasszon járatot")
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
            console.log(line);
            let done=false;
            for (let prop in line) {
                if (line[prop].shortName.toLowerCase()==input.toLowerCase()) { //same name
                    if (line[prop].type.toLowerCase()==vehicleType.toLowerCase()) { //same type of vehicle
                        line = line[prop];
                        done=true;
                        break;
                    }
                }
            }
            if (!done) {
                for (let prop in line) {
                    if (line[prop].type.toLowerCase()==vehicleType.toLowerCase()) { //same type of vehicle
                        line = line[prop];
                        done=true;
                        break;
                    }
                }
            }

            if (!line.id || line.id == "BKK_9999") {
                alert("Nem találtunk járatot");
                line = 0;
                stopsUpdated=true;
                return;
            } else
                loadStops();

        },
        error:function (xhr, ajaxOptions, thrownError) {
            alert("error");
            alert(thrownError);
        },
        
    });

    if (line == 0)
        document.getElementById("pick-line-text").value = "";
    else
        document.getElementById("pick-line-text").value = line.shortName;
    
}