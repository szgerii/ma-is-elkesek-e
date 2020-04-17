// BOB, THE BUILD TOOL

const fs = require("fs");
const path = require("path");
const { EOL } = require("os");

const minify = require("minify"); // HTML and CSS minification
const terser = require("terser"); // JS minification
const zlib = require("zlib"); // gzip compression

const logger = require("./private_modules/logger");
logger.set("x-verbose", true);

const deleteProdDir = process.argv.includes("--delete-prod-dir") || process.argv.includes("-dp");
const ignoreErrors = process.argv.includes("--ignore-errors") || process.argv.includes("-ie");
const stopOnWarning = process.argv.includes("--stop-on-warning") || process.argv.includes("-sw");

const buildConfigDir = process.env.BUILD_CONFIG || path.join(__dirname, ".build_config");
const minifyPath = process.argv.includes("--min") ? path.resolve(process.argv[process.argv.indexOf("--min") + 1]) : path.join(buildConfigDir, "minify.json");
const compressPath = process.argv.includes("--comp") ? path.resolve(process.argv[process.argv.indexOf("--comp") + 1]) : path.join(buildConfigDir, "compress.json");

const prodBase = process.argv.includes("--prod-dir") ? path.resolve(process.argv[process.argv.indexOf("--prod-dir") + 1]) : path.resolve("dist");
const devBase = process.argv.includes("--dev-dir") ? path.resolve(process.argv[process.argv.indexOf("--dev-dir") + 1]) : path.resolve("src");

build();

async function build() {
    if (deleteProdDir) {
        fs.rmdirSync(path.resolve(prodBase), {
            recursive: true
        });
    }

    logger.log("--BOB-- Starting the build process..." + EOL);
    
    logger.log("--BOB-- Minifying the files..." + EOL);
    await minifyFiles();
    logger.log("--BOB-- Minification done." + EOL);
    
    logger.log("--BOB-- Compressing the files..." + EOL);
    await compressFiles();
    logger.log("--BOB-- Compression done." + EOL);
    
    logger.log("--BOB-- Build done." + EOL);
}


async function minifyFiles() {
    if (!fs.existsSync(minifyPath)) {
        logger.error("Minification config file not found. Shutting down...");
        logger.close();
        process.exit(1);
    }

    const files = JSON.parse(fs.readFileSync(minifyPath));

    if (!fs.existsSync(path.resolve(prodBase)))
        fs.mkdirSync(path.resolve(prodBase));
    
    for (const f of files) {
        let dir = path.join(prodBase, f);
        dir = dir.slice(0, dir.lastIndexOf(path.sep));

        fs.mkdirSync(dir, {recursive: true});

        if (f.endsWith(".html") || f.endsWith(".css")) {
            fs.writeFileSync(path.join(prodBase, f), await minify(path.join(devBase, f)));
        } else if (f.endsWith(".js")) {
            const minified = terser.minify(fs.readFileSync(path.join(devBase, f)).toString(), {
                mangle: {
                    toplevel: true
                },
                warnings: true
            });

            if (minified.error) {
                logger.log(`An error occured while minifying the following file: ${f}`);
                logger.dir(minified.error);

                if (!ignoreErrors) {
                    logger.log(`Build failed. Shutting down...${EOL}`);
                    logger.close();
                    process.exit(2);
                }
            }

            if (minified.warnings) {
                logger.log(`Warning(s) from the following file: ${f}`);

                for (const warning of minified.warnings) {
                    logger.log(warning);
                }

                console.log();

                if (stopOnWarning) {
                    logger.log(`Build failed. Shutting down...`);
                    logger.close();
                    process.exit(3);
                }
            }

            fs.writeFileSync(path.join(prodBase, f), minified.code);
        }
    }
}

async function compressFiles() {
    if (!fs.existsSync(compressPath)) {
        logger.error("Minification config file not found. Shutting down...");
        logger.close();
        process.exit(1);
    }

    const files = JSON.parse(fs.readFileSync(compressPath));

    for (const f of files) {
        let dir = path.join(prodBase, f);
        dir = dir.slice(0, dir.lastIndexOf(path.sep));

        fs.mkdirSync(dir, {recursive: true});

        const compressed = zlib.deflateSync(fs.readFileSync(path.join(devBase, f)));
        fs.writeFileSync(path.join(prodBase, f), compressed);
    }
}