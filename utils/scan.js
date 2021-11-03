require('geckodriver');
const webdriver = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const fs = require('fs')
const scrollToBottom = require('./scrollToBottom')
const timestamp = require('./timestamp')
const { convertArrayToCSV } = require('convert-array-to-csv');
const querystring = require('querystring');
const { performance } = require('perf_hooks');
let total = 0;
let devs = new Map()
const parse = require('csv-parse/lib/sync');
module.exports.scan = scan;
module.exports.devScan = developerScan;
developerScan()
async function developerScan(){
    let t0 = performance.now()
    total = 0;
    devs.clear()
    console.log(`[${timestamp()}] DevScan started`)
    console.log(`[${timestamp()}] Loading existing CSV data`);
    const fileContent = await fs.readFileSync('./storage/developers.csv');
    const records = await parse(fileContent, {columns: true, delimiter: ';'});
    let loadedGames = []
    let loadedNames = []
    for(const record of records){
        let tmp = record.games.split(',')
        for(const game of tmp){
            loadedGames.push(game)
        }
        loadedNames.push(record.name)
    }
    let driver = new webdriver.Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().headless()).build();
    try {
        //await driver.manage().setTimeouts( { script: 200000 } )
        await driver.get("https://store.steampowered.com/search/?category1=998&os=linux");
        // Scroll to bottom to force steam to load entire page
        console.log(`[${timestamp()}] Retrieving all linux games from steam`);
        await driver.executeAsyncScript(scrollToBottom)
        console.log(`[${timestamp()}] Loaded all games. Retrieving info...`)
        let allGamesRaw = await driver.findElements(webdriver.By.className("search_result_row"))
        console.log(`[${timestamp()}] Loaded all info. Parsing...`)
        let allGames = []
        let limit = 0;
        if((process.argv[2] == '-l' || process.argv[2] == '--limit') && !isNaN(process.argv[3])){
            limit = parseInt(process.argv[3])
            console.log(`[DEBUG] Limit: ${limit}`)
        }
        for (const game of allGamesRaw){
            let gameObj = {}
            gameObj.url = await game.getAttribute('href')
            gameObj.name = await (await (await (await game.findElement(webdriver.By.className("responsive_search_name_combined"))).findElement(webdriver.By.className('search_name'))).findElement(webdriver.By.className('title'))).getText()
            if(!loadedGames.includes(gameObj.name) && (limit == 0 || allGames.length < limit)) allGames.push(gameObj)
        }
        console.log(`[${timestamp()}] Starting Scan (Batches: 1)`);
        Promise.all([
            startDevscanBatch(allGames, records),
        ]).then(async () => {
            let oldSize = new Map(records.map(key => [key.name, {email: key.email, games: key.games.split(','), url: key.url}])).size
            console.log(`[${timestamp()}] Done, scanned ${devs.size - oldSize} developers`)
            let csv = await convertArrayToCSV(Array.from(devs, ([name, value]) => ({ name, games: value.games, email: value.email ?? ' ', url: value.url })), { separator: ';' })
            fs.writeFile('./storage/developers.csv', csv, async err => {
            if (err) {
                console.error(err)
                return
            }
            await driver.quit();
            let t1 = performance.now()
            console.log(`[${timestamp()}] Scan finished, found ${devs.size - oldSize} devs and updated ${devs.size} devs in ${Math.round(((t1 - t0) / 1000) * 100) / 100} seconds`)
        })
          }).catch(async (err) => {
            let oldSize = new Map(records.map(key => [key.name, {email: key.email, games: key.games.split(','), url: key.url}])).size
            console.log(`[${timestamp()}] Done, scanned ${devs.size - oldSize} developers`)
            let csv = await convertArrayToCSV(Array.from(devs, ([name, value]) => ({ name, games: value.games, email: value.email ?? ' ', url: value.url })), { separator: ';' })
            fs.writeFile('./storage/developersUnsure.csv', csv, async err => {
                if (err) {
                    console.error(err)
                    return
                }
                try{await driver.quit()}catch(e){void e};
                let t1 = performance.now()
                console.log(`[${timestamp()}] Scan finished, found ${devs.size - oldSize} devs and updated ${devs.size} devs in ${Math.round(((t1 - t0) / 1000) * 100) / 100} seconds`)
            })
            console.log(`An error occured during the scan. Results have been written to storage/developersUnsure.csv to prevent overwriting good data with bad data.`)
            console.error(err)
          })
    } catch (e) {
        let oldSize = new Map(records.map(key => [key.name, {email: key.email, games: key.games.split(','), url: key.url}])).size
        console.log(`[${timestamp()}] Done, scanned ${devs.size - oldSize} developers`)
        let csv = await convertArrayToCSV(Array.from(devs, ([name, value]) => ({ name, games: value.games, email: value.email ?? ' ', url: value.url })), { separator: ';' })
        fs.writeFile('./storage/developersUnsure.csv', csv, async err => {
            if (err) {
                console.error(err)
                return
            }
            try{await driver.quit()}catch(e){void e};
            let t1 = performance.now()
            console.log(`[${timestamp()}] Scan finished, found ${devs.size - oldSize} devs and updated ${devs.size} devs in ${Math.round(((t1 - t0) / 1000) * 100) / 100} seconds`)
        })
        console.log(`An error occured during the scan. Results have been written to storage/developersUnsure.csv to prevent overwriting good data with bad data.`)
        console.error(e)
    }
}
async function startDevscanBatch(allGames, records){
    return new Promise(async (resolve, reject) => {
        let developers = new Map(records.map(key => [key.name, {email: key.email, games: key.games.split(','), url: key.url}]))
        if(allGames.length == 0){
            for (const [key, value] of developers.entries()) {
                devs.set(key, value)
            }
            resolve()
        } else {
            try {
                let driver = new webdriver.Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().headless()).build();
                for(const index in allGames){
                    let game = allGames[index].name
                    console.log(`[${timestamp()}] Scanning ${game}`)
                    let url = allGames[index].url
                    let deves = await getDeveloper(url, driver)
                    for(const dev of deves){
                        if(!developers.has(dev.name.replace(/ \(mac\)/ig, '').replace(/ \(linux\)/ig, ''))){
                            dev.dev.games = [game]
                            developers.set(dev.name.replace(/ \(mac\)/ig, '').replace(/ \(linux\)/ig, ''), dev.dev)
                        } else {
                            let map = developers.get(dev.name.replace(/ \(mac\)/ig, '').replace(/ \(linux\)/ig, ''))
                            if(!map.games.includes(game)){
                                map.games.push(game)
                                developers.set(dev.name.replace(/ \(mac\)/ig, '').replace(/ \(linux\)/ig, ''), map)
                            }
                        }
                    }
                    total++;
                    console.log(`[${timestamp()}] Scanned ${game} [${total}/${allGames.length}]`)
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }
            }   catch (e) {
                    for (const [key, value] of developers.entries()) {
                        devs.set(key, value)
                    }
                    reject(e)
            } finally {
                for (const [key, value] of developers.entries()) {
                    devs.set(key, value)
                }
                resolve()
            }
        }
    })
}
async function getDeveloper(game, driver){
    if(game.includes('store.steampowered.com/sub/')) return []
    const originalWindow = await driver.getWindowHandle();
    await driver.switchTo().newWindow('window');
    await driver.get(game);
    let existed = await driver.findElement(webdriver.By.id("ageYear")).then(function() {
        return true;
    }, function(err) {
        if (err instanceof webdriver.error.NoSuchElementError) {
            return false;
        } else {
            webdriver.promise.rejected(err);
        }
    });
    if(existed){
        let dropdown = await driver.findElement(webdriver.By.id("ageYear"));
        await (await dropdown.findElement(webdriver.By.css('option[value="1980"]'))).click()
        await (await (await driver.findElement(webdriver.By.className('btns'))).findElement(webdriver.By.className('btnv6_blue_hoverfade'))).click()
        await new Promise(resolve => setTimeout(resolve, 100));
        await new Promise((resolve, reject) => {
            driver.wait(webdriver.until.elementLocated(webdriver.By.id('developers_list')), 3000).then(() => {
                resolve();
            }).catch(async function(ex) {
                reject(ex)
            });
        }).catch(e => {
            return []
        })
    }
    let developers = [];
    let names = [];
    let devDiv;
    try {
    devDiv = await new Promise(async (resolve, reject) => { await driver.findElement(webdriver.By.id('developers_list')).then((rl) => {
            resolve(rl);
        }).catch(async function(ex) {
            console.log(`Error on game ${game}`)
            console.error(ex)
            reject(ex)
        })
    }) } catch (e) {
        await driver.close()
        await driver.switchTo().window(originalWindow);
        return []
    }
    let developersRaw = await devDiv.findElements(webdriver.By.css('*'))
    for(const devRaw of developersRaw){
        let url = await devRaw.getAttribute("href")
        let name = (await querystring.unescape((url.includes('https://store.steampowered.com/search/?developer=') ? url.replace('https://store.steampowered.com/search/?developer=', '').split('&snr=')[0] : url.replace('https://store.steampowered.com/developer/',  '').replace('https://store.steampowered.com/publisher/',  '').split('?')[0]))).replace(';', 'semicolon')
        if(!names.includes(name)){
            let dev = {}
            dev.dev = {}
            dev.dev.url = url;
            dev.dev.games = []
            dev.name = name
            developers.push(dev)
            names.push(dev.name)
        }
    } 
    await driver.close()
    await driver.switchTo().window(originalWindow);
    return developers
}
async function scan(){
    console.log(`[${timestamp()}] Scan started`)
    let driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().headless())
    .build();
    let games = []
    try {
        await driver.get("https://store.steampowered.com/search/?category1=998&os=linux&specials=1");
        // Scroll to bottom to force steam to load entire page
        await driver.executeAsyncScript(scrollToBottom)
        let allGames = await driver.findElements(webdriver.By.className("search_result_row"));
        for(const index in allGames){
            let game = {}
            let child = allGames[index].findElement(webdriver.By.className("responsive_search_name_combined"))
            let saleRaw = (await (await child.findElement(webdriver.By.className('search_price_discount_combined'))).findElement(webdriver.By.className('search_discount')))
            game.discount = (await saleRaw.getText()).replace('-', '').replace('%', '')
            let url = await allGames[index].getAttribute("href")
            game.id = url.replace('https://store.steampowered.com/app/', '').split('/')[0]
            game.name = await (await (await child.findElement(webdriver.By.className('search_name'))).findElement(webdriver.By.className('title'))).getText()
            game.price = await (await child.findElement(webdriver.By.className('search_price discounted')).getText()).trim()
            games.push(game)
        }
    } catch (e) {
        console.error(e)
    } finally {
        fs.writeFile('./storage/games.json', JSON.stringify(games), async err => {
            if (err) {
              console.error(err)
              return
            }
            await driver.quit();
            console.log(`[${timestamp()}] Scan finished, scanned ${games.length} games`)
        })
    }
}