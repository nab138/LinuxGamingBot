require('chromedriver');
const webdriver = require('selenium-webdriver');
const chrome = require("selenium-webdriver/chrome");
const fs = require('fs')
const scrollToBottom = require('./scrollToBottom')
const timestamp = require('./timestamp')
module.exports = scan;
async function scan(){
    console.log(`[${await timestamp()}] Scan started`)
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
            //await driver.switchTo().newWindow('tab');
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
            console.log(`[${await timestamp()}] Scan finished, scanned ${games.length} games`)
        })
    }
}