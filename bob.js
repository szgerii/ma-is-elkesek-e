// BOB, THE BUILDTOOL

const fs = require("fs");
const path = require("path");
const { EOL } = require("os");

const minify = require("minify"); // HTML and CSS minification
const terser = require("terser"); // JS minification
const zlib = require("zlib"); // gzip compression

const imagemin = require("imagemin");
const imageminPNG = require("imagemin-pngquant");
const imageminSVG = require("imagemin-svgo");

const PREFIX = "[BOB]";

const deleteProdDir = process.argv.includes("--delete-prod-dir") || process.argv.includes("-dp");
const ignoreErrors = process.argv.includes("--ignore-errors") || process.argv.includes("-ie");
const stopOnWarning = process.argv.includes("--stop-on-warning") || process.argv.includes("-sw");
const collectWarnings = process.argv.includes("--collect-warnings") || process.argv.includes("-cw");
const warnings = [];

const buildConfigDir = process.argv.includes("--build-config") ? path.resolve(process.argv[process.argv.indexOf("--build-config") + 1]) : path.join(__dirname, ".bob_config");
const minifyPath = process.argv.includes("--min") ? path.resolve(process.argv[process.argv.indexOf("--min") + 1]) : path.join(buildConfigDir, "minify.json");
const compressTextPath = process.argv.includes("--tcomp") ? path.resolve(process.argv[process.argv.indexOf("--tcomp") + 1]) : path.join(buildConfigDir, "compress-text.json");
const compressImagePath = process.argv.includes("--icomp") ? path.resolve(process.argv[process.argv.indexOf("--icomp") + 1]) : path.join(buildConfigDir, "compress-image.json");
const clonePath = process.argv.includes("--clone") ? path.resolve(process.argv[process.argv.indexOf("--clone") + 1]) : null;

const prodBase = process.argv.includes("--prod-dir") ? path.resolve(process.argv[process.argv.indexOf("--prod-dir") + 1]) : path.resolve("dist");
const devBase = process.argv.includes("--dev-dir") ? path.resolve(process.argv[process.argv.indexOf("--dev-dir") + 1]) : path.resolve("src");

build();

/**
 * Runs the build process
 */
async function build() {
    const startTime = Date.now();

    if (deleteProdDir) {
        fs.rmdirSync(path.resolve(prodBase), {
            recursive: true
        });
    }

    console.log(`${PREFIX} Starting the build process...` + EOL);

    if (clonePath) {
        console.log(`${PREFIX} Cloning files...` + EOL);
        const cloneCount = await cloneFiles();
        console.log(`${EOL}${PREFIX} Cloning done. Successfully cloned ${cloneCount} file${cloneCount > 1 ? "s" : ""}.` + EOL);
    }
    
    console.log(`${PREFIX} Minifying files...` + EOL);
    const minCount = await minifyFiles();
    console.log(`${EOL}${PREFIX} Minification done. Successfully minified ${minCount} file${minCount > 1 ? "s" : ""}.` + EOL);
    
    console.log(`${PREFIX} Compressing text files...` + EOL);
    const textCompCount = await compressTextFiles();
    console.log(`${EOL}${PREFIX} Text file compression done. Successfully compressed ${textCompCount} file${textCompCount > 1 ? "s" : ""}.` + EOL);
    
    console.log(`${PREFIX} Compressing image files...` + EOL);
    const imgCompCount = await compressImageFiles();
    console.log(`${EOL}${PREFIX} Image file compression done. Successfully compressed ${imgCompCount} file${imgCompCount > 1 ? "s" : ""}.` + EOL);
    
    if (collectWarnings && warnings) {
        console.log(`${PREFIX} ${warnings.length} warnings were collected during the build process:${EOL}`);
        
        for (const warning of warnings) {
            console.log(`File: ${warning[0]}`);
            console.log(`Warning: ${warning[1]}${EOL}`);
        }
    }

    console.log(`${PREFIX} Build successfully completed in ${(Date.now() - startTime) / 1000} seconds.`);
    if (collectWarnings && warnings.length !== 0)
        console.log(`${PREFIX} See above for the warnings that were collected during the build process`);
}

/**
 * Minifies the files listed in minifyPath
 * @returns {Number} - the number of files successfully minified
 */
async function minifyFiles() {
    if (!fs.existsSync(minifyPath)) {
        console.error(`${PREFIX} Minification config file not found. Shutting down...`);
        
        process.exit(1);
    }

    const files = JSON.parse(fs.readFileSync(minifyPath));

    if (!fs.existsSync(path.resolve(prodBase)))
        fs.mkdirSync(path.resolve(prodBase));

    let minifiedCounter = 0;
    
    for (const f of files) {
        let dir = path.join(prodBase, f);
        dir = dir.slice(0, dir.lastIndexOf(path.sep));

        fs.mkdirSync(dir, {recursive: true});

        if (f.endsWith(".html") || f.endsWith(".css")) {
            console.log(`${PREFIX} Minifying ${f}...`);
            fs.writeFileSync(path.join(prodBase, f), await minify(path.join(devBase, f)));
            minifiedCounter++;
            console.log(`${PREFIX} Minification status: ${minifiedCounter}/${files.length} (${minifiedCounter / (files.length / 100)}%) done`);
        } else if (f.endsWith(".js")) {
            console.log(`${PREFIX} Minifying ${f}...`);
            const minified = terser.minify(fs.readFileSync(path.join(devBase, f)).toString(), {
                mangle: {
                    toplevel: true
                },
                warnings: true
            });
            
            if (minified.error) {
                console.log(`${PREFIX} An error occured while minifying the following file: ${f}`);
                console.log(minified.error);
                
                if (!ignoreErrors) {
                    console.log(`${PREFIX} Build failed. Shutting down...${EOL}`);
                    
                    process.exit(2);
                }
            }
            
            if (minified.warnings) {
                if (collectWarnings) {
                    warnings.push(...minified.warnings.map(el => [f, el]));
                } else {
                    console.log(`${EOL}${PREFIX} Warning(s) from the following file: ${f}${EOL}`);
                    
                    for (const warning of minified.warnings) {
                        console.log(warning + EOL);
                    }
                    
                    if (stopOnWarning) {
                        console.log(`${EOL}${PREFIX} Build failed. Shutting down...`);
                        
                        process.exit(3);
                    }
                }
            }
            
            fs.writeFileSync(path.join(prodBase, f), minified.code);
            minifiedCounter++;
            console.log(`${PREFIX} Minification status: ${minifiedCounter}/${files.length} (${minifiedCounter / (files.length / 100)}%) done`);
        }
    }
    
    return minifiedCounter;
}

/**
 * Compresses the text files listed in compressTextPath
 * @returns {Number} - the number of files successfully compressed
 */
async function compressTextFiles() {
    if (!fs.existsSync(compressTextPath)) {
        console.error(`${PREFIX} Text compression config file not found. Shutting down...`);
        
        process.exit(1);
    }

    const files = JSON.parse(fs.readFileSync(compressTextPath));

    let compCounter = 0;

    for (const f of files) {
        if (!f.endsWith(".html") && !f.endsWith(".css") && !f.endsWith(".js"))
            continue;
        
        console.log(`${PREFIX} Compressing ${f}...`);

        let dir = path.join(prodBase, f);
        dir = dir.slice(0, dir.lastIndexOf(path.sep));

        fs.mkdirSync(dir, {recursive: true});

        const inp = fs.createReadStream(path.join(devBase, f));
        const out = fs.createWriteStream(path.join(prodBase, f));
        
        inp.pipe(zlib.createGzip()).pipe(out);

        compCounter++;

        console.log(`${PREFIX} Text file compression status: ${compCounter}/${files.length} (${compCounter / (files.length / 100)}%) done`);
    }

    return compCounter;
}

/**
 * Compresses the image files listed in compressImagePath
 * @returns {Number} - the number of files successfully compressed
 */
async function compressImageFiles() {
    if (!fs.existsSync(compressImagePath)) {
        console.error(`${PREFIX} Image compression config file not found. Shutting down...`);
        
        process.exit(1);
    }

    const files = JSON.parse(fs.readFileSync(compressImagePath));

    let compCounter = 0;

    for (const f of files) {
        if (!f.endsWith(".png") && !f.endsWith(".svg"))
            continue;

        console.log(`${PREFIX} Compressing ${f}...`);
        
        let dir = path.join(prodBase, f);
        dir = dir.slice(0, dir.lastIndexOf(path.sep));

        fs.mkdirSync(dir, {recursive: true});

        const compressed = await imagemin([path.join(devBase, f)], {
            plugins: [
                imageminPNG({
                    quality: [0.6, 0.75]
                }),
                imageminSVG()
            ]
        });

        fs.writeFileSync(path.join(prodBase, f), compressed[0].data);
        
        compCounter++;

        console.log(`${PREFIX} Image file compression status: ${compCounter}/${files.length} (${compCounter / (files.length / 100)}%) done`);
    }

    return compCounter;
}

/**
 * Clones the files listed in clonePath
 * @returns {Number} - the number of files successfully cloned
 */
async function cloneFiles() {
    if (!fs.existsSync(clonePath)) {
        console.error(`${PREFIX} Clone config file not found.`);
        console.error(`${PREFIX} This is probably a problem with Bob, the buildtool. Please report it to hentesoposszum.`);
        
        process.exit(4);
    }

    const files = JSON.parse(fs.readFileSync(clonePath));

    if (!fs.existsSync(path.resolve(prodBase)))
        fs.mkdirSync(path.resolve(prodBase));

    let clonedCounter = 0;
    
    for (const f of files) {
        console.log(`${PREFIX} Cloning ${f}...`);
        
        let dir = path.join(prodBase, f);
        dir = dir.slice(0, dir.lastIndexOf(path.sep));
        
        fs.mkdirSync(dir, {recursive: true});
        
        const content = fs.readFileSync(path.join(devBase, f));
        fs.writeFileSync(path.join(prodBase, f), content);
        
        clonedCounter++;
        console.log(`${PREFIX} Cloning status: ${clonedCounter}/${files.length} (${clonedCounter / (files.length / 100)}%) done`);
    }

    return clonedCounter;
}