
const bkk = "https://futar.bkk.hu/api/query/v1/ws/otp/api/where/";

let line = 0;
let stops = 0;

let variant1 = 0;
let variant2 = 0;
let currentVariant = variant1;

let isUpdatingHotSmoke = false;
let isUpdatingSegment = false;

let stop1 = 0;
let stop2  = 0;

let departures = 0;
let trips = [];

let stopsUpdated = false;

window.onload = function() {
    
    let pickLineText = document.getElementById("pick-line-text");

    pickLineText.addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            loadLine();
    });

    setInterval(update,50);
    setInterval(slowUpdate,10000);

}

function checkSegment() {

    console.log("check");

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
    time2 = 0;

    constructor(time2) {

        this.time2 = time2;
    
        this.time1 = 0;


    }

    setTime1(time1) {
        this.time1 = time1;
    }

    getTravelTime() {
        
        let date1 = new Date(this.time1*1000);
        let date2 = new Date(this.time2*1000);

        return (date2.getTime()-date1.getTime()) /1000 /60

    }

}

async function downloadSegment() {

    //calculate avg time pass between stop1 and stop2
    //get all arrivals in the last '30' minutes at stop2
    trips=[];
    await $.ajax({
        method: "GET",
        url: bkk + "arrivals-and-departures-for-stop.json",
        dataType: "jsonp",
        data: {
            stopId:stop2.id,
            minutesBefore:30,
            minutesAfter:0,
            includeReferences:false
        },
        success:function(r){

            //we have some stopTimes, let's check when the associated trips visited stop1 
            departures=r.data.entry.stopTimes;
            

        }
    });

    for (let i=0; i<departures.length; i++) {
        let currentTrip = new CalculatedTrip(departures[i].predictedArrivalTime);
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
                        currentTrip.setTime1(stopTimes[i].predictedDepartureTime);
                        break;
                    } 
                }
            }

        });

    }
    



}

function updateSegment() {
    let usefulTrips = [];
    for (let i=0; i<trips.length; i++) {

        if (trips[i].time1 != 0 && trips[i].time2 != 0) {

            usefulTrips.push(trips[i])

        }
    }

    let travelTimesTotal = 0;
    for (let i=0; i<usefulTrips.length; i++) {

        travelTimesTotal+=usefulTrips[i].getTravelTime();

    }

    let avg = Math.round(travelTimesTotal/usefulTrips.length);
            
    document.getElementById("result").innerHTML = avg + " perc átlag utazási idő a szakaszon";
}

async function slowUpdate() {

    if (isUpdatingHotSmoke) {

        //download hot smokin'

    }

    if (isUpdatingSegment) {
        await downloadSegment();
        updateSegment();
    }

}

function update() {

    if (!stopsUpdated) {
        return;
    }
    
    stopsUpdated = false;
    if (checkSegment()==1) {

        //upload for hot smokin'

        downloadSegment();

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
            let done=false;
            for (let prop in line) {
                if (line[prop].shortName.toLowerCase()==input.toLowerCase()) {
                    line = line[prop];
                    done=true;
                    break;
                }
            }
            if (!done) {
                for (let prop in line) {
                    line = line[prop];
                    done=true;
                    break;
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