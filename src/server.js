const   http  = require('http'),
        fs    = require('fs');

const PORT = 1104 || process.env.PORT;
const server = http.createServer(ddosProtection);

// 
let files = [];

// DoS
const DOS_BLOCK_TIMEOUT = 5 * 60000, DOS_PROTECTION_TIMEOUT = 0.5 * 60000, DOS_PLUS_TIMEOUT = 2 * 60000, DOS_MAX_REQUEST = 100;
let dosProtection = {};

// DDoS
const DDOS_MAX_REQUEST_COUNT = 100;
let requestCount = 0, ddosQueue = [];

start();

function start() {

    files.push(fs.readFileSync(__dirname + "/public/index.html"));
    files.push(fs.readFileSync(__dirname + "/public/styles.css"));
    files.push(fs.readFileSync(__dirname + "/public/script.js"));

    server.listen(PORT);
    console.log(`Server listening on port ${PORT}`);

}

function ddosProtection(req, res) {
    
    if (requestCount++ < DDOS_MAX_REQUEST_COUNT) {
        router(req, res);
    } else {
        ddosQueue.push({req, res});
    }

}

function router(req, res) {

    if (dosProtection[req.connection.remoteAddress] === undefined)
        dosProtection[req.connection.remoteAddress] = {
            reqCount: 0,
            blocked: false,
            timeOfBlock: -1,
            blockTimeout: 0,
            numOfBlocks: 0};
    
    const currentDosProtection = dosProtection[req.connection.remoteAddress];
    currentDosProtection.reqCount = currentDosProtection.reqCount + 1 || 1;
    
    if (currentDosProtection.reqCount > DOS_MAX_REQUEST) {
        
        if (currentDosProtection.blocked) {

            if (Date.now() - currentDosProtection.timeOfBlock > currentDosProtection.blockTimeout) {
                
                currentDosProtection.blocked = false;
                currentDosProtection.timeOfBlock = -1;
                currentDosProtection.blockTimeout = 0;
                currentDosProtection.reqCount = 0;

            } else
                currentDosProtection.blockTimeout += DOS_PLUS_TIMEOUT * currentDosProtection.numOfBlocks * (currentDosProtection.reqCount - DOS_MAX_REQUEST);
            
            if (currentDosProtection.blocked) {
                handleNextRequest();
                res.end(`DoS Védelem: Túl sok kérés jött erről az IP címről az utóbbi időben, úgyhogy tiltva lett ${currentDosProtection.blockTimeout / 60000} percre. Kérlek ne próbáld meg befrissíteni az oldalt, mert azzal csak plusz tiltási időt kapsz.`);
            }

        } else {

            currentDosProtection.blocked = true;
            currentDosProtection.timeOfBlock = Date.now();
            currentDosProtection.blockTimeout = DOS_BLOCK_TIMEOUT * ++currentDosProtection.numOfBlocks;
       
        }
        
        if (currentDosProtection.blocked)
            return;

    } else {

        setTimeout(() => {
            if (!currentDosProtection.blocked)
                currentDosProtection.reqCount--;
        }, DOS_PROTECTION_TIMEOUT);
    
    }

    if (req.method === "GET") {

        switch (req.url) {

            case "/":
                res.writeHead(200, {"Content-Type": "text/html"});
                res.end(files[0]);
                break;
            
            case "/styles.css":
                res.writeHead(200, {"Content-Type": "text/css"});
                res.end(files[1]);
                break;
            
            case "/script.js":
                res.writeHead(200, {"Content-Type": "text/javascript"});
                res.end(files[2]);
                break;

            default:
                res.writeHead(404, {"Content-Type": "text/html"});
                res.end("404: Page Not Round");
                break;

        }

        handleNextRequest();

    } else {

        handleNextRequest();
        res.writeHead(405, {"Content-Type": "text/html"});
        res.end(`405: Nem megfelelő HTTP metódus (${req.method})`);

    }
}

function handleNextRequest() {
    
    requestCount--;
    
    if (ddosQueue.length === 0)
        return;

    const nextReq = ddosQueue.shift();
    router(nextReq.req, nextReq.res);

}