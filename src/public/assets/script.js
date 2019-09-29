
const bkk="https://futar.bkk.hu/api/query/v1/ws/otp/api/where/";

let line = 0;
let stops = 0;

let stop1 = 0;
let stop2  = 0;

window.onload = function () {
    
    let pickLineText = document.getElementById("pick-line-text");

    pickLineText.addEventListener("keyup",(event) => {
        if (event.keyCode==13) {
            loadLine();
        }
    });


}

function resetStops() {
    stops=0;
    stop1=0;
    stop2=0;
    let dd1 = document.getElementById("dropdown-stop1");
    let dd2 = document.getElementById("dropdown-stop2");
    dd1.innerHTML="";
    dd2.innerHTML="";
}

function checkStops() {

    class MegállóPár {

        constructor(név, lat, lon) {
            this.név = név;
            this.lat = lat;
            this.lon = lon;
            this.oda = 0;
            this.vissza = 0;
        }

    }

    let megállóPárLista = [];

    for (let prop in stops) {
        
        let megállóPár = 0;

        for (let i=0; i<megállóPárLista.length; i++) {
            if (stops[prop].name==megállóPárLista[i].név) {
                megállóPár = megállóPárLista[i];
                break;
            }
        }

        if (megállóPár==0) {
            megállóPár = new MegállóPár(stops[prop].name, stops[prop].lat, stops[prop].lon);
            megállóPárLista.push(megállóPár);
        } 

        if (megállóPár.oda==0) {
            megállóPár.oda=stops[prop];
        } else {
            megállóPár.vissza=stops[prop];
        }

    }

    let unpairedStops = [];
    let brokenStopPairs = [];

    for (let i=0; i<megállóPárLista.length; i++) {
        if (megállóPárLista[i].vissza==0) {
            brokenStopPairs.push(megállóPárLista[i]);
            unpairedStops.push(megállóPárLista[i].oda);
        }
    }

    

    for (let i=0; i<unpairedStops.length; i++) {

    }

    for (let i=0; i<megállóPárLista.length; i++) {
        console.log(megállóPárLista[i].oda.name+"  +++  "+megállóPárLista[i].vissza.name);
    }
}

async function loadStops() {

    await $.ajax({
        method:"GET",
        url:bkk+"route-details.json",
        dataType:"jsonp",
        data:{
            routeId:line.id,
        },
        success:function (r) {

            if (r.status=="OK") {
                stops = r.data.references.stops;
            } else {
                alert("Nem sikerült betölteni a megállókat");
                resetStops();
                return;
            }

            let dd1 = document.getElementById("dropdown-stop1");
            let dd2 = document.getElementById("dropdown-stop2");

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

            //checkStops();
            
        }

    });

}

async function loadLine() {

    let input = document.getElementById("pick-line-text").value;
    
    let isInputCorrect = true;
    
    if (input=="") {
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

            if (!line.id||line.id=="BKK_9999") {
                alert("Nem találtunk járatot");
                line=0;
                return;
            } else {
                loadStops();
            }

            
            
        },
        error:function (xhr, ajaxOptions, thrownError) {
            alert("error");
            alert(thrownError);
        },
        
    });

    if (line==0) {
        document.getElementById("pick-line-text").value="";
    } else {
        document.getElementById("pick-line-text").value=line.shortName;
    }
    
    


}