const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js')
const {MessageActionRow, MessageButton, MessageEmbed} = require('discord.js')

module.exports = {
        data: new SlashCommandBuilder()
                .setName('games')
                .setDescription('Shows a list of on sale, linux compatible games')
                .addIntegerOption(option =>
                        option.setName('discount')
                                .setDescription('The minimum discount percent')
                                .setRequired(false)),
        async execute(interaction) {
                const backButton = new MessageButton({
                  style: 'PRIMARY',
                  label: 'Back',
                  emoji: '⬅️',
                  customId: 'back'
                })
                const forwardButton = new MessageButton({
                  style: 'PRIMARY',
                  label: 'Forward',
                  emoji: '➡️',
                  customId: 'forward'
                })
                
                const {author} = interaction
                let minDis = await interaction.options.getInteger("discount") ?? 75
                const games = require('../storage/SaleGames.json').filter(function(object){return parseInt(object.discount) >= minDis })
                
                /**
                 * Creates an embed with games starting from an index.
                 * @param {number} start The index to start from.
                 * @returns {Promise<MessageEmbed>}
                 */
                const generateEmbed = async start => {
                  const current = games.slice(start, start + 10)
                  return new Discord.MessageEmbed({
                    title: `Games ${start + 1}-${start + current.length} out of ${
                      games.length
                    }`,
                    description: "All the linux compatible games on steam that are on sale right now",
                    fields: await Promise.all(
                      current.map(async g => ({
                        name: g.name,
                        value: `Price: ${g.price.includes('\n') ? '~~' + g.price.replace('\n', '~~ ') : g.price} | Discount: -${g.discount}% | [Store Page](https://store.steampowered.com/app/${g.id})`
                      }))
                    ),
                    color: interaction.client.config.embedColor,
                  })
                }
                const canFitOnOnePage = games.length <= 10
                const embedMessage = await interaction.reply({
                  embeds: [await generateEmbed(0)],
                  components: canFitOnOnePage
                    ? []
                    : [new MessageActionRow({components: [forwardButton]})],
                    fetchReply: true
                })
                if (canFitOnOnePage) return
                const collector = embedMessage.createMessageComponentCollector({
                  filter: ({user}) => user.id === author.id
                })
                
                let currentIndex = 0
                collector.on('collect', async interaction => {
                  interaction.customId === 'back' ? (currentIndex -= 10) : (currentIndex += 10)
                  await interaction.update({
                    embeds: [await generateEmbed(currentIndex)],
                    components: [
                      new MessageActionRow({
                        components: [
                          ...(currentIndex ? [backButton] : []),
                          ...(currentIndex + 10 < games.length ? [forwardButton] : [])
                        ]
                        })
                ]
                })
        })
}}