// Load modules
const fs = require('fs');
const cron = require('node-cron')
const Discord = require('discord.js');
// Update the games on sale every hour
const scan = require('./utils/scan')
const rand = require('./utils/random')
cron.schedule('0 6,18 * * *', startScan)
// Discord.js stuff
const { token } = require('./storage/token.json')
const config = require('./storage/config.json')
const client = new Discord.Client({intents: 32767});
client.config = config

// Load commands from ./commands
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}
client.once('ready', () => {
	console.log('Logged in!');
});

client.on('messageCreate', async message => {
    if(message.author.bot) return
    if(message.content == `<@${client.user.id}>` || message.content == `<@!${client.user.id}>`){
        const embed = new Discord.MessageEmbed()
        .setAuthor(client.user.tag, client.user.displayAvatarURL({dynamic: true}))
        .setColor(config.embedColor)
        .setTitle("Linux Gaming")
        .setDescription("This is Linux Gaming Bot, a bot that will help you find cheap or free games to play on linux. Get started by typing `/` and choosing my icon.")
        message.reply({embeds: [embed]})
    }
})
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;
	const { commandName } = interaction;
    const command = client.commands.get(interaction.commandName);
    interaction.author = interaction.user;
	if (!command) return;
	try {
		await command.execute(interaction);
	} catch (err) {
		console.error(err);
		await interaction.reply({ content: `An error occurred. ${err.stack}`, ephemeral: true });
	}
});
function startScan(){
	let random = rand.range(1000, 7200000)
	console.log('Test')
	console.log(random)
	setTimeout(scan, random)
}
client.login(token);