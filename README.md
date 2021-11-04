# LinuxGamingBot
A small bot that is **undergoing active development** designed to help linux gamers and provide benefits to developers who publish native linux builds.

You can view a trello board for this project [here](https://trello.com/b/id1J1Uw8/linuxgamingbot)

## Contribution

New commands and other contributions are always welcome, but what would help the most is filling out more emails in storage/developers.csv.

Open a PR with any contributions and I will review and merge it.

## Usage

I don't recommend you try to run this yet but heres the instructions anyway

You have to have nodejs v16 or above installed

Step one: Clone the repository and `cd` into it. `git clone https://github.com/nab138/LinuxGamingBot.git && cd LinuxGamingBot`

Step two: Install dependencies. `npm install`

Step three: Create an application on the [Discord Developer Portal](https://discord.com/developers/applications/) and copy the token.

Step four: Create a new file in the "storage" directory called "token.json" and put `{"token":"token from discord developer portal"}` in it. `echo {"token":"token from discord developer portal"} >> storage/token.json`

Step five: Start the bot. `node .`

You can configure the bot with config.json. Right now there isn't many options, if you want to change things edit index.js

**If your trying to run this, know that it uses selenium + chromedriver to get info from steam because the steam api sucks. The bot hasn't been thoroughly tested, maybe use a vpn while running to prevent steam from getting mad at you. This uses cron to run scans of steam games at any time between 6:00 to 8:00 (am) and any time between 18:00-20:00 (6:00-8:00 pm). The cron system hasn't been fully tested yet and I think I'm doing something wrong.**
