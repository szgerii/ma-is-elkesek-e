
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
                stops=0;
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

            if (!line.id) {
                alert("Nem találtunk járatot");
                line=0;
                
                return;
            } else {
                loadStops();
            }

            stop1=0;
            stop2=0;
            
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