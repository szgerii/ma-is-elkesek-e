const   http = require('http');

const PORT = 1104 | process.env.PORT;
const server = http.createServer(router);

start();

function start() {
    server.listen(PORT);
    console.log(`Server listening on port ${PORT}`);
}

function router(req, res) {
    switch (req.url) {
        case "/":
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end("good boi");
            break;
    
        default:
            res.writeHead(404, {"Content-Type": "text/html"});
            res.end("404: Page Not Round");
            break;
    }
}