const bkk = "https://futar.bkk.hu/api/query/v1/ws/otp/api/where/";
const hotSmokinUrl = "/api/hotsmokin";

const bus = "BUS";
const tram = "TRAM";
const metro = "SUBWAY";
const trolley = "TROLLEYBUS";
const hev = "RAIL";
const ship = "FERRY";

let line = 0; //Global variable of the chosen line
let stops = 0; //Global variable of the list of stops

let time = 10; //Global variable of the number of minutes chosen

let variant1 = 0; //Global variable of the 1st variant of the chosen line
let variant2 = 0; //Global variable of the 2nd variant of the chosen line
let currentVariant = variant1; //Global variable of the chosen variant 

let isUpdatingHotSmoke = true; //Global variable determining whether hot smokin' is being updated or not
let isUpdatingSegment = false; //Global variable determining whether the segment displayed is being updated or not 

let stop1 = 0; //Global variable of the 1st stop chosen
let stop2  = 0; //Global variable of the 2nd stop chosen
let isFinalStop = false; //Global variable determining whether the 2nd stop is the final stop of that variant(special case) or not
let stop2ForFinalStop = 0; //Global variable of the stop that is used to get information about the real 2nd stop if it's the last stop

let currentHot = 0; //Global variable of the loaded hot smokin' top 4 segments

let colorScheme = bus;

//Set up slow and quick update ticks and set eventListeners
function setup() {
    
    let pickLineText = document.getElementById("pick-line-text");
    let hotSmokeMenu = document.getElementsByClassName("hot-smoke-menu")[0];
    let hotSmokeItems = document.getElementsByClassName("hot-smoke");
    const logoutLink = document.querySelector("#logout");

    hotSmokeMenu.addEventListener("click", () => {
        for(const arrow of document.querySelectorAll(".hotsmokin-arrow")) {
            arrow.innerHTML = arrow.innerHTML.charCodeAt(0) === 9660 ? "&#9650" : "&#9660";
        }

        for (let i=0; i<hotSmokeItems.length; i++) 
            hotSmokeItems[i].classList.toggle("hot-smoke-active");
    });

    pickLineText.addEventListener("keyup", (event) => {
        if (event.keyCode == 13)
            loadLine();
    });

    if (logoutLink) {
        logoutLink.addEventListener("click", () => {
            $.post("/logout", () => {
                window.location.reload();
            });
        });
    }

    slowUpdate();
    setInterval(slowUpdate,10000);

}

if (window.addEventListener)
	window.addEventListener("load", setup);
else if (window.attachEvent)
	window.attachEvent("onload", setup);

//Function for updating the current colorScheme
function updateScheme() {

    let stopSigns = document.getElementsByClassName("stopSign-img");
    let stopSignUrl = "";

    switch (colorScheme) {

        case bus: {

            document.documentElement.style.setProperty('--color-box','rgb(20,30,100)');
            document.documentElement.style.setProperty('--color-box-transparent','rgba(20,30,100,0.5)');
            document.documentElement.style.setProperty('--color-main','white');
            document.documentElement.style.setProperty('--color-text','black');
            document.documentElement.style.setProperty('--color-navText','white');

            document.documentElement.style.setProperty('--background-url','url("assets/images/bg-bus.png")');
            document.documentElement.style.setProperty('--background-positioning-desktop','0px 0px');
            document.documentElement.style.setProperty('--background-positioning-mobile','-700px 0px');
            
            stopSignUrl = "assets/images/stopSign-bus.png";

            break;

        }
        case tram: {
           
            document.documentElement.style.setProperty('--color-box','rgb(180,180,0)');
            document.documentElement.style.setProperty('--color-box-transparent','rgba(180,180,0,0.5)');
            document.documentElement.style.setProperty('--color-main','white');
            document.documentElement.style.setProperty('--color-text','black');
            document.documentElement.style.setProperty('--color-navText','black');

            document.documentElement.style.setProperty('--background-url','url("assets/images/bg-tram.png")');
            document.documentElement.style.setProperty('--background-positioning-desktop','0px 0px');
            document.documentElement.style.setProperty('--background-positioning-mobile','-640px 0px');

            stopSignUrl = "assets/images/stopSign-tram.png";

            break;

        }
        case metro: {
            
            document.documentElement.style.setProperty('--color-box','rgb(80,80,80)');
            document.documentElement.style.setProperty('--color-box-transparent','rgba(80,80,80,0.5)');
            document.documentElement.style.setProperty('--color-main','white');
            document.documentElement.style.setProperty('--color-text','black');
            document.documentElement.style.setProperty('--color-navText','white');

            document.documentElement.style.setProperty('--background-url','url("assets/images/bg-metro.png")');
            document.documentElement.style.setProperty('--background-positioning-desktop','0px 0px');
            document.documentElement.style.setProperty('--background-positioning-mobile','-300px 0px');
            
            stopSignUrl = "assets/images/stopSign-metro.png";

            break;

        }
        case trolley: {
            
            document.documentElement.style.setProperty('--color-box','rgb(160,0,0)');
            document.documentElement.style.setProperty('--color-box-transparent','rgba(160,0,0,0.5)');
            document.documentElement.style.setProperty('--color-main','white');
            document.documentElement.style.setProperty('--color-text','black');
            document.documentElement.style.setProperty('--color-navText','white');

            document.documentElement.style.setProperty('--background-url','url("assets/images/bg-trolley.png")');
            document.documentElement.style.setProperty('--background-positioning-desktop','0px 0px');
            document.documentElement.style.setProperty('--background-positioning-mobile','-500px 0px');
            
            stopSignUrl = "assets/images/stopSign-trolley.png";

            break;

        }
        case hev: {
            
            document.documentElement.style.setProperty('--color-box','rgb(0,140,0)');
            document.documentElement.style.setProperty('--color-box-transparent','rgba(0,140,0,0.5)');
            document.documentElement.style.setProperty('--color-main','white');
            document.documentElement.style.setProperty('--color-text','black');
            document.documentElement.style.setProperty('--color-navText','white');

            document.documentElement.style.setProperty('--background-url','url("assets/images/bg-hev.png")');
            document.documentElement.style.setProperty('--background-positioning-desktop','200px 200px');
            document.documentElement.style.setProperty('--background-positioning-mobile','-400px 0px');
            
            stopSignUrl = "assets/images/stopSign-hev.png";

            break;

        }
        case ship: {
            
            document.documentElement.style.setProperty('--color-box','rgb(240,240,240)');
            document.documentElement.style.setProperty('--color-box-transparent','rgba(240,240,240,0.5)');
            document.documentElement.style.setProperty('--color-main','white');
            document.documentElement.style.setProperty('--color-text','black');
            document.documentElement.style.setProperty('--color-navText','black');

            document.documentElement.style.setProperty('--background-url','url("assets/images/bg-ship.png")');
            document.documentElement.style.setProperty('--background-positioning-desktop','0px 0px');
            document.documentElement.style.setProperty('--background-positioning-mobile','-300px 200px');
            
            stopSignUrl = "assets/images/stopSign-ship.png";

            break;

        }

        


    }

    for (let i=0; i<stopSigns.length; i++) {

        stopSigns[i].setAttribute("src", stopSignUrl);

    }

}

//Function for loading a segment with predefined line and stops(IN DEVELOPMENT)
async function loadPredefinedSegment(prefLine, prefStop1, prefStop2) {

    //reset all stops(delete variants and stops from dropdown, set everything to 0)
    resetStops();

    //manually set the used line to the predefined one(skip user input AND loadline())
    line = prefLine;
    line.shortName = prefLine.name;

    document.getElementById("pick-line-text").value = line.shortName;

    //load stops(and variants) and wait till it finishes loading
    await loadStops();

    //Determine which variant is used in the predefined segment by searching for stop1 in variant1(skip user input)
    let isVariant1Ok = false;
    for (let i=0; i<variant1.stops.length; i++) {

        if (variant1.stops[i].id==prefStop1.id) {

            isVariant1Ok = true;
            break;

        }

    }
    
    if (isVariant1Ok) currentVariant = variant1;    
    else currentVariant = variant2;

    let dropdown = document.getElementById("dropdown-heading");
    dropdown.value = currentVariant.name;

    //Fill the stops based on the current variant(skip updateVariant())
    fillStops();

    //Manually set the used stops to the predefined ones(skip user input)
    for (let i=0; i<currentVariant.stops.length; i++) {
        if (currentVariant.stops[i].id==prefStop1.id) {
            stop1 = currentVariant.stops[i];
        } else if (currentVariant.stops[i].id==prefStop2.id) {
            stop2 = currentVariant.stops[i];
        }
    }

    document.getElementById("dropdown-vehicleType").value = stop1.type;
    colorScheme = stop1.type;
    updateScheme();

    let dd1 = document.getElementById("dropdown-stop1");
    let dd2 = document.getElementById("dropdown-stop2");
    dd1.value = stop1.code;
    dd2.value = stop2.code;

    //Load the segment(skip updateStops())
    if (checkSegment()==1) {

        //upload for hot smokin'
        uploadHot();

        let trips = await downloadSegment();
        showSegmentInformation(trips);

        isUpdatingSegment = true;

    } else {
        isUpdatingSegment = false;
    }


}

//Function for the onlick event of the hot smoke boxes, starts loading apredefined segment
function hotSmokeClick(hotSmoke) {

    if (currentHot[hotSmoke - 1]) {
        loadPredefinedSegment(currentHot[hotSmoke - 1].line, currentHot[hotSmoke - 1].stop1, currentHot[hotSmoke - 1].stop2);
    }

}

//Function for updating the stops when the time-dropdown is changed
async function updateTime() {

    let dd = document.querySelector("#dropdown-time");

    time = Number(dd.options[dd.selectedIndex].value);

    if (currentVariant !== 0) {
        if (isUpdatingSegment) {
            document.getElementById("result").innerHTML = "Számolás...";
            let trips = await downloadSegment();
            showSegmentInformation(trips);
        }
    }

}

//Function for uploading data for hot smokin' statistics
function uploadHot() {

    let data = JSON.stringify({
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
    });

    $.ajax({
        
        method:"POST",
        url:hotSmokinUrl,
        contentType: "application/json; charset=utf-8",
        dataType:"json",
        data: data,

        success: function(r) {
            console.log("Sent data for hot smokin statistics")
        },
        error: function(r) {
            console.log("An error occured while uploading hot smokin' data");
            if (r.responseJSON && r.responseJSON.status === "error") {
                console.log(r.message);
            } else {
                if (r.responseJSON.data.line)
                    console.log(r.responseJSON.data.line);
                if (r.responseJSON.data.stop1)
                    console.log(r.responseJSON.data.stop1);
                if (r.responseJSON.data.stop2)
                    console.log(r.responseJSON.data.stop2);
            }
        },
        

    });

}

//Function for downloading hot smokin' top 3 and showing them
async function downloadHot() {
    await $.ajax({

        method:"GET",
        url:hotSmokinUrl,
        dataType:"json",

        success:function(r) {

            if (r.status === "success") {
                for (let i = 0; i < 4; i++) {
                    const hotSmokinItem = document.querySelector(`#hot-smoke-${i + 1}`);
                    if (r.data[i]) {
                        hotSmokinItem.innerText = `${r.data[i].line.name}: ${r.data[i].stop1.name} - ${r.data[i].stop2.name}`;
                        hotSmokinItem.title = `${r.data[i].line.name}: ${r.data[i].stop1.name} - ${r.data[i].stop2.name}`;
                    } else {
                        hotSmokinItem.innerText = "Nincs elég adat az információ megjelenítéséhez";
                        hotSmokinItem.title = "Nincs elég adat az információ megjelenítéséhez";
                    }
                }
            }

            currentHot = r.data;

        },

        error:function(r) {

            console.log("An error occured while downloading hot smokin' data");
            if (r.responseJSON) {
                console.log(r.responseJSON.message);
            }

            for (let i = 0; i < 4; i++) {
                const hotsmokinItem = document.getElementById(`hot-smoke-${i + 1}`)
                hotsmokinItem.innerText = "Hiba történt a betöltés során";
                hotsmokinItem.title = "Hiba történt a betöltés során";
            }

            currentHot = 0;
        
        }

    });

}

//Function for checking the selected stops
function checkSegment() {

    if (stop1==0||stop2==0) {

        if (variant1==0||variant2==0) {
            document.getElementById("result").innerHTML = "Nincs járat!";
            return 0;
        } else {
            document.getElementById("result").innerHTML = "Nincsenek kiválasztva megállók!!";
            return 0;
        }
        

    }

    if (stop1.id==stop2.id) {

        document.getElementById("result").innerHTML = "Egyeznek a megállók!";
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
        document.getElementById("result").innerHTML = "Rossz sorrend!";
        return 0;
    } else {
        document.getElementById("result").innerHTML = "Számolás...";
        return 1;
    }



}

//One CalculatedTrip Object represents the times when a specific trip arrived/departed at/from a selected stop 
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

//Function for downloading all the necessary information about the trips and the stopTimes
async function downloadSegment() {

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
            departures=r.data.entry.stopTimes;

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

//Function for showing avg travel time and avg gained latency on the segment(between stop1 and stop2)
function showSegmentInformation(trips) {

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
        if (usefulTrips.length==0) {
            document.getElementById("result").innerHTML = "Nincs adat!";
        } else {
            document.getElementById("result").innerHTML = "hiba történt!";
        }
        
        console.log("An error occured, avg travel time or avg latency came out to be NaN. Trips used for calculations:");
        console.log(usefulTrips);
        console.log("All downloaded trips:");
        console.log(trips);

    } else {

        document.getElementById("result").innerHTML = (
            avgTravelTime+" perc"
        );

        console.log("Calculation successfull, avg travel time: "+avgTravelTime+", avg gained latency: "+avgLatency+". Trips used:");
        console.log(usefulTrips);
        
    }     
    
}

//Function for the slow update(every 10 secs), updating hot smokin' and the segment, if it's currently being displayed
async function slowUpdate() {

    if (isUpdatingHotSmoke) {
        downloadHot();
    }

    if (isUpdatingSegment) {
        let trips = await downloadSegment();
        showSegmentInformation(trips);
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

    updateStops();

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

//Function for updating the stops when a stop dropdown is changed
async function updateStops() {

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

    if (checkSegment()==1) {

        //upload for hot smokin'
        uploadHot();

        let trips = await downloadSegment();
        showSegmentInformation(trips);

        isUpdatingSegment = true;

    } else {
        isUpdatingSegment = false;
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

    dropdown.innerHTML = '<option value="" disabled="" selected="" hidden="">Irány</option>';

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
    
    dropdown.innerHTML = '<option value="" disabled="" selected="" hidden="">Kérjük válasszon egy járatot</option>';

    clearStops();

}

//Function for clearing the stops from the stop dropdowns, separated from resetSops, because changing variant should only clear stops, but not reset them
function clearStops() {

    let dd1 = document.getElementById("dropdown-stop1");
    let dd2 = document.getElementById("dropdown-stop2");
    
    if (currentVariant!=0) {
        dd1.innerHTML = '<option value="" disabled="" selected="" hidden="">Első megálló</option>';
        dd2.innerHTML = '<option value="" disabled="" selected="" hidden="">Második megálló</option>';
    } else {
        dd1.innerHTML = '<option value="" disabled="" selected="" hidden="">Kérjük válasszon egy járatot</option>';
        dd2.innerHTML = '<option value="" disabled="" selected="" hidden="">Kérjük válasszon egy járatot</option>';
    }
    

    stop1 = 0;
    stop2 = 0;
    
    isUpdatingSegment = false;

    checkSegment();
    

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

//Function for searching for the chosen line and downloading the information about it
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
                updateScheme();
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