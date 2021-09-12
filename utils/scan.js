require('chromedriver');
const webdriver = require('selenium-webdriver');
const chrome = require("selenium-webdriver/chrome");
const fs = require('fs')
const scrollToBottom = require('./scrollToBottom')
const timestamp = require('./timestamp')
const { convertArrayToCSV } = require('convert-array-to-csv');
const querystring = require('querystring');
module.exports.scan = scan;
module.exports.devScan = developerScan;

async function developerScan(){
    console.log(`[${timestamp()}] DevScan started`)
    let driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().headless())
    .build();
    let developers = new Map()
    try {
        await driver.manage().setTimeouts( { script: 200000 } )
        await driver.get("https://store.steampowered.com/search/?category1=998&os=linux");
        // Scroll to bottom to force steam to load entire page
        await driver.executeAsyncScript(scrollToBottom)
        let allGames = await driver.findElements(webdriver.By.className("search_result_row"));
        for(const index in allGames){
            let game = {}
            let child = allGames[index].findElement(webdriver.By.className("responsive_search_name_combined"))
            let url = await allGames[index].getAttribute("href")
            game = await (await (await child.findElement(webdriver.By.className('search_name'))).findElement(webdriver.By.className('title'))).getText()
            let devs = await getDeveloper(url)
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
            console.log(`[${timestamp()}] Scanned ${game} [${parseInt(index) + 1}/${allGames.length}]`)
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    } catch (e) {
        console.error(e)
    } finally {
        let csv = await convertArrayToCSV(Array.from(developers, ([name, value]) => ({ name, games: value.games, email: '', url: value.url })), { separator: ';' })
        fs.writeFile('./storage/developers.csv', csv, async err => {
            if (err) {
              console.error(err)
              return
            }-
            await driver.quit();
            console.log(`[${timestamp()}] Scan finished, found ${developers.size} devs`)
        })
    }
}
async function getDeveloper(game){
    let driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().headless())
    .build();
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
        await (await dropdown.findElement(webdriver.By.css('option[value="2000"]'))).click()
        await (await (await driver.findElement(webdriver.By.className('btns'))).findElement(webdriver.By.className('btnv6_blue_hoverfade'))).click()
        await new Promise(resolve => setTimeout(resolve, 100));
        await new Promise(resolve => {
            driver.wait(webdriver.until.elementLocated(webdriver.By.id('developers_list')), 5 * 1000).then(() => {
                resolve();
            })
        });
    }
    let developers = [];
    let names = [];
    let developersRaw = await (await driver.findElement(webdriver.By.id('developers_list'))).findElements(webdriver.By.css('*'))
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
    driver.close()
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