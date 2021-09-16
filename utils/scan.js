require('geckodriver');
const webdriver = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const fs = require('fs')
const scrollToBottom = require('./scrollToBottom')
const timestamp = require('./timestamp')
const { convertArrayToCSV } = require('convert-array-to-csv');
const querystring = require('querystring');
const { resolve } = require('path');
let total = 0;
let devs = new Map()
module.exports.scan = scan;
module.exports.devScan = developerScan;
developerScan()
async function developerScan(){
    total = 0;
    devs.clear()
    console.log(`[${timestamp()}] DevScan started`)
    let driver = new webdriver.Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().headless().setPreference("network.proxy.type", 1).setPreference("network.proxy.socks", "127.0.0.1").setPreference("network.proxy.socks_port", 9050)).build();
    try {
        await driver.manage().setTimeouts( { script: 200000 } )
        await driver.get("https://store.steampowered.com/search/?category1=998&os=linux");
        // Scroll to bottom to force steam to load entire page
        //await driver.executeAsyncScript(scrollToBottom)
        let allGamesRaw = await driver.findElements(webdriver.By.className("search_result_row"))
        let allGames = []
        for (const game of allGamesRaw){
            let gameObj = {}
            gameObj.url = await game.getAttribute('href')
            gameObj.name = await (await (await (await game.findElement(webdriver.By.className("responsive_search_name_combined"))).findElement(webdriver.By.className('search_name'))).findElement(webdriver.By.className('title'))).getText()
            allGames.push(gameObj)
        }
        let length = allGames.length
        let splitGames = splitToChunks(allGames, 4)
        Promise.all([
            startDevscanBatch(splitGames[0], length, 1),
            startDevscanBatch(splitGames[1], length, 2),
            startDevscanBatch(splitGames[2], length, 3),
            startDevscanBatch(splitGames[3], length, 4)
        ]).then(async () => {
            console.log(`Done, scanned ${devs.size} developers`)
            let csv = await convertArrayToCSV(Array.from(devs, ([name, value]) => ({ name, games: value.games, email: '', url: value.url })), { separator: ';' })
        fs.writeFile('./storage/developers.csv', csv, async err => {
            if (err) {
              console.error(err)
              return
            }-
            await driver.quit();
            console.log(`[${timestamp()}] Scan finished, found ${devs.size} devs`)
        })
          }).catch((err) => console.log(err))
    } catch (e) {
        console.error(e)
    }
}
function splitToChunks(array, parts) {
let result = [];
    for (let i = parts; i > 0; i--) {
        result.push(array.splice(0, Math.ceil(array.length / i)));
    }
    return result;
}

async function startDevscanBatch(allGames, unsplit, num){
    return new Promise(async (resolve, reject) => {
        let developers = new Map()
        console.log(`Started Batch ${num}`)
        try {
            let proxy;
            switch(num){
                case 0:
                    console.log('Batch 0?????') 
                    process.exit()
                case 1:
                    proxy = '64.124.38.142:8080'
                    break;
                case 2:
                    proxy = '104.43.230.151:3128'
                    break;
                case 3:
                    proxy = '50.206.25.106:80'
                    break;
                case 4:
                    proxy = '207.244.170.103:8118'
                    break;
            }
            let driver = new webdriver.Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().headless().setPreference("network.proxy.type", 1).setPreference("network.proxy.socks", "127.0.0.1").setPreference("network.proxy.socks_port", 9050)).build();
            for(const index in allGames){
                let game = allGames[index].name
                console.log(`[${timestamp()}] Scanning ${game}`)
                let url = allGames[index].url
                let devs = await getDeveloper(url, driver)
                for(const dev of devs){
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
                console.log(`[${timestamp()}] Scanned ${game} [${total}/${unsplit}]`)
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }   catch (e) {
                reject(e)
        } finally {
            for (const [key, value] of developers.entries()) {
                devs.set(key, value)
            }
            resolve()
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
            driver.wait(webdriver.until.elementLocated(webdriver.By.id('developers_list')), 30000).then(() => {
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
            setTimeout(reject, 10000)
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