require('dotenv').config();
const fs = require('fs');
const { Client, REST, Events, Partials, GatewayIntentBits, ChannelType, AttachmentBuilder, EmbedBuilder,StringSelectMenuBuilder, SlashCommandBuilder, PermissionFlagsBits ,PermissionsBitField, Permissions,ButtonBuilder, ButtonStyle, ActionRowBuilder, TextChannel} = require('discord.js');
const { Routes } = require('discord-api-types/v9');
const { memoryUsage } = require('process');
const internal = require('stream');
const { debug } = require('console');
const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates,GatewayIntentBits.GuildMessageReactions,GatewayIntentBits.GuildMembers], partials: [Partials.Message, Partials.Channel, Partials.Reaction]});

const rest = new REST({ version: '9'}).setToken(process.env.TOKEN)

const FILESPATH = 'src/files'

//Delete commands
// rest.delete(Routes.applicationCommand('1286948398234341436', "1287132867180101652"))
// 	.then(() => console.log('Successfully deleted guild command'))
//	.catch(console.error);

client.on(Events.ClientReady, (x) => {

    console.log(`${x.user.tag} is ready`);

    client.user.setActivity("Looking for Questions");

    const question = new SlashCommandBuilder()
    .setName('question')
    .setDescription('Submit a question.')
    .addStringOption(option => 
        option
        .setName("content")
        .setDescription("Enter you question here")
        .setRequired(true)
    )
    client.application.commands.create(question);

    const set_channel = new SlashCommandBuilder()
    .setName("set_channel")
    .setDescription("Set the channel to send questions to.")
    client.application.commands.create(set_channel)

    const enable = new SlashCommandBuilder()
        .setName("enable")
        .setDescription("enable the question bot")
    client.application.commands.create(enable)

    const disable = new SlashCommandBuilder()
        .setName("disable")
        .setDescription("disable the question bot")
    client.application.commands.create(disable)

    const config = new SlashCommandBuilder()
    .setName("config")
    .setDescription("configuration options")
    .addSubcommand(subcommand =>
        subcommand
        .setName("set_mod_role")
        .setDescription("Set the moderator role for this bot")
        .addRoleOption(option => 
            option
            .setName("role")
            .setDescription("Role to add")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
        subcommand
        .setName("clear")
        .setDescription("clear the entire config file")
        .addStringOption(option =>
            option
            .setName("confirm")
            .setDescription("Confirm clearing the entire config file")
        )
    )
    client.application.commands.create(config);

    const download_questions = new SlashCommandBuilder()
    .setName("download_questions")
    .setDescription("Save and download unanswered questions to a text file.")

    client.application.commands.create(download_questions);
    
});

client.on('interactionCreate', async (interaction) =>{
    if(interaction.isChatInputCommand())
    {
        switch (interaction.commandName)
        {
            case "question":
                
                //Check if the message was sent in a server and not a DM
                if(interaction.guild == null)
                {
                    interaction.reply({content: "This command cannot be used here. Please contact support if this is an error.", ephemeral: true})
                    return
                }
                if(!getEnabled(interaction.guild))
                {
                    interaction.reply({ content: "We are currently not accepting questions.", ephemeral: true })
                    return
                }

                const channel_id = getQuestionsChannel(interaction.guild)
                if (channel_id == null) {
                    interaction.reply({ content: "There was an error. Queue channel not setup, please contance support.", ephemeral: true })
                    return
                }

                const optionContent = interaction.options.getString("content")
                const main_embed = new EmbedBuilder()
                    .setTitle(`${interaction.user.tag} asked this question:`)
                    .setDescription(optionContent)
                    .addFields({name: `Status`, value: `🕘 In Queue`,inline: true})
                    .setColor('#ae41c4')
                    .setTimestamp()
                await interaction.reply({embeds: [main_embed]})

                const reply = await interaction.fetchReply()
                
                
                const channel = await interaction.guild.channels.fetch(channel_id);
                

                const messag_content = `\`\`\`

                    \`\`\`\nQuestion submitted by ${interaction.user}\n\nOriginal Message: ${reply.url}
                `

                const log_embed = new EmbedBuilder()
                    .setDescription(optionContent)
                    .setColor('#ae41c4') // You can also use HEX like '#0099ff'
                    .setTimestamp()

                const answeredButton = new ButtonBuilder()
                    .setCustomId('mark_answered')
                    .setLabel('✅ Mark as Answered')
                    .setStyle(ButtonStyle.Success);

                const dismissButton = new ButtonBuilder()
                    .setCustomId('mark_dismissed')
                    .setLabel('❌ Dismiss')
                    .setStyle(ButtonStyle.Danger);

                const button_row = new ActionRowBuilder().addComponents(answeredButton,dismissButton);

                channel.send({
                    content: messag_content,
                    embeds: [log_embed],
                    components: [button_row]
                })

                const questionSaveData = `${interaction.user.tag} Asks: ${optionContent}`
                const questionID = reply.url.split("/")[reply.url.split("/").length - 2] + "/" + reply.url.split("/")[reply.url.split("/").length - 1]
                addToQuestionsFile(interaction.guild, questionID,questionSaveData)
                
            break;

            case "enable":
                //Check if the message was sent in a server and not a DM
                if (interaction.guild == null) {
                    interaction.reply({ content: "This command cannot be used here. Please contact support if this is an error.", ephemeral: true })
                    return
                }
                //Check if the member has the required role/permissions
                if (!checkForManagerRole(interaction.member)) {
                    interaction.reply({ content: "You do not have permission to use this command", ephemeral: true })
                    return
                }
                setConfigSetting(interaction.guild, "enabled",true)
                interaction.reply({content: `✅ The question bot is now accepting questions.\n\nUse \`/question\` to submit a question.`})
            break;

            case "disable":
                //Check if the message was sent in a server and not a DM
                if (interaction.guild == null) {
                    interaction.reply({ content: "This command cannot be used here. Please contact support if this is an error.", ephemeral: true })
                    return
                }
                //Check if the member has the required role/permissions
                if (!checkForManagerRole(interaction.member)) {
                    interaction.reply({ content: "You do not have permission to use this command", ephemeral: true })
                    return
                }
                setConfigSetting(interaction.guild, "enabled", false)
                interaction.reply({ content: `❌ The question bot is no longer accepting questions` })
            break;

            case "download_questions":
                //Check if the message was sent in a server and not a DM
                if (interaction.guild == null) {
                    interaction.reply({ content: "This command cannot be used here. Please contact support if this is an error.", ephemeral: true })
                    return
                }
                //Check if the member has the required role/permissions
                if (!checkForManagerRole(interaction.member)) {
                    interaction.reply({ content: "You do not have permission to use this command", ephemeral: true })
                    return
                }

                if(Object.keys(getQuestionsData(interaction.guild)).length <= 0)
                {
                    interaction.reply({ content: "There are currently no questions logged", ephemeral: true })
                    return
                }

                const deleteButton = new ButtonBuilder()
                    .setCustomId('delete_questions')
                    .setLabel('❌ Remove Questions From Memory')
                    .setStyle(ButtonStyle.Danger);

                const deleteButtonRow = new ActionRowBuilder().addComponents(deleteButton);

                const attachment = GetQuestionListFile(interaction.guild,getQuestionsData(interaction.guild))
                interaction.reply({
                    content: `Questions list:`,
                    files: [attachment],
                    components: [deleteButtonRow]
                })
                return
            break;
                
            case "set_channel":
                //Check if the message was sent in a server and not a DM
                if (interaction.guild == null) {
                    interaction.reply({ content: "This command cannot be used here. Please contact support if this is an error.", ephemeral: true })
                    return
                }
                //Check if the member has the required role/permissions
                if (!checkForManagerRole(interaction.member)) {
                    interaction.reply({ content: "You do not have permission to use this command", ephemeral: true })
                    return
                }
                //Get channels from server
                const channels = interaction.guild.channels.cache
                    .filter(c => c.type === ChannelType.GuildText)
                    .map(c => ({ label: c.name, value: c.id }))
                    .slice(0, 25); // Discord only allows 25 options max

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_channel')
                    .setPlaceholder('Select a channel')
                    .addOptions(channels);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const embed = new EmbedBuilder()
                    .setTitle('Choose a channel for questions to queue up in')
                    .setDescription('   ')
                    .setColor('#e3f25e') // You can also use HEX like '#0099ff'

                await interaction.reply({
                    embeds: [embed],
                    components: [row],
                    ephemeral: true,
              });

            break;
            
            case "config":
                if(interaction.guild == null)
                {
                    interaction.reply({content: "This command cannot be used here. Please contact support if this is an error.", ephemeral: true})
                    return
                }
                if(!checkForManagerRole(interaction.member))
                {
                    interaction.reply({content: "You do not have permission to use this command", ephemeral: true})
                    return
                }
                switch(interaction.options.getSubcommand())
                {
                    case "set_mod_role":
                        const role = interaction.options.getRole("role")
                        
                        //TODO SET THIS TO CHECK FOR ADMIN PERMISSION
                        if(!hasAdminPermission(interaction.member))
                        {
                            if (interaction.member.id != interaction.guild.ownerId) {
                                interaction.reply({ content: "Only the server admins can modify this setting.", ephemeral: true })
                                return
                            }
                        }
                        
                        
                        interaction.reply(`Setting the \`Moderator Role\` to \`${role.name}\``)
                        // TODO MAKE SURE THIS GETS UPDATED WHEN CHECKING FOR THE "moderatorRole" 
                        setConfigSetting(interaction.guild,"moderatorRole",role.id)
                        return
                        
                    case "clear":

                        if (!hasAdminPermission(interaction.member)) {
                            if (interaction.member.id != interaction.guild.ownerId) {
                                interaction.reply({ content: "Only the server admins can modify this setting.", ephemeral: true })
                                return
                            }
                        }
                        var confirmString = interaction.options.getString("confirm")
                        if(confirmString != "confirm")
                        {
                            interaction.reply({content: `You need to type \`confirm\` to run this command.\nInsure you understand what you are doing before using this command.`, ephemeral: true})
                        }else
                        {
                            ClearConfig(interaction.guild)
                            interaction.reply({content: `Clearing the config file`, ephemeral: false})
                        }
                        return
                }
            break;
        }
        
    }

    // Check for Drop Down Menu interaction
    if (interaction.isStringSelectMenu())
    {
        if (interaction.customId == 'select_channel'){
            
            const selectedChannelId = interaction.values[0];
            const selectedChannel = await interaction.guild.channels.fetch(selectedChannelId);

            const embed = new EmbedBuilder()
                .setTitle(`✅ The __${selectedChannel.name}__ channel has is now the location to queue channels`)
                .setDescription('   ')
                .setColor('#30ff49') // You can also use HEX like '#0099ff'

            await interaction.update({
                embeds: [embed],
                components: [],
            });

            // 🧠 You can run any custom logic here:
            yourCustomFunction(selectedChannel, interaction.member);
        }
    }
    //BUTTON STUFF
    else if(interaction.isButton())
    {
        const message = interaction.message
        switch(interaction.customId)
        {
            case "mark_answered":
                var message_embed = EmbedBuilder.from(interaction.message.embeds[0]);
                message_embed.addFields({ name: 'Status', value: '✅ Answered', inline: true });
                message_embed.setColor("#30ff49")
                await interaction.update({
                    embeds: [message_embed],
                    components: []
                  });

                update_original_message(interaction, "Status/✅ Answered", "#30ff49")

                const questionID = getQuestionIDFromMessageURL(interaction)
                removeQuestionFromFile(interaction.guild, questionID)


            break;
            case 'mark_dismissed':
                var message_embed = EmbedBuilder.from(interaction.message.embeds[0]);
                message_embed.addFields({ name: 'Status', value: '❌ Dissmissed', inline: true });
                message_embed.setColor("#e32822")
                await interaction.update({
                    embeds: [message_embed],
                    components: []
                });

                const questionID2 = getQuestionIDFromMessageURL(interaction)
                removeQuestionFromFile(interaction.guild, questionID2)

                /* Update original message here: */

                //update_original_message(interaction, "Status/❌ Dismissed", "#e32822")
            break;
            case 'delete_questions':
                //Check if the message was sent in a server and not a DM
                if (interaction.guild == null) {
                    interaction.reply({ content: "This command cannot be used here. Please contact support if this is an error.", ephemeral: true })
                    return
                }
                //Check if the member has the required role/permissions
                if (!checkForManagerRole(interaction.member)) {
                    interaction.reply({ content: "You do not have permission to use this command", ephemeral: true })
                    return
                }
                const emptyData = {}
                writeQuestionData(interaction.guild,emptyData)
                await interaction.update({
                    components: []
                });

                interaction.channel.send({content: "Questions removed from memory"})
            break;
        }
    }
});

client.login(process.env.NEWTOKEN);


async function update_original_message(interaction, embed_text,embed_color)
{

    const message = interaction.message

    const channel_id = message.content.split("/")[message.content.split("/").length - 2]
    const member_message_id = message.content.split("/")[message.content.split("/").length - 1]

    const channel = client.channels.cache.get(channel_id)

    const member_message = await channel.messages.fetch(member_message_id)

    var member_message_embed = EmbedBuilder.from(member_message.embeds[0]);
    const fields = member_message_embed.data.fields || []
    fields.splice(0, 1)
    member_message_embed.addFields({ name: embed_text.split("/")[0], value: embed_text.split("/")[1], inline: true });
    member_message_embed.setColor(embed_color)

    member_message.edit({ embeds: [member_message_embed] })
}

function getQuestionIDFromMessageURL(interaction)
{
    const message = interaction.message

    const firstID = message.content.split("/")[5]
    const secondID = message.content.split("/")[6]

    const fullID = `${String(firstID)}/${secondID}`

    return fullID
}

function GetQuestionListFile(guild, questionData)
{
    let output = '';
    for (const key in questionData)
        {
            if(questionData.hasOwnProperty(key))
                {
                    output += `${questionData[key]}\n`
                }
        }

    const filePath = (`${FILESPATH}/${guild.id}/questions_list.txt`)

    fs.writeFileSync(filePath,output)

    const attachment = new AttachmentBuilder(filePath)

    return attachment
}

// Example function
function yourCustomFunction(channel, member) {
    console.log(`${member.tag} selected channel: #${channel.name}`);
    setConfigSetting(member.guild,"questionsChannel",channel.id)
}

function checkForFilesDir(guild)
{
    if(!fs.existsSync(`${FILESPATH}`))
    {
        fs.mkdirSync(`${FILESPATH}`)
    }
    if(!fs.existsSync(`${FILESPATH}/${guild.id}`))
    {
        fs.mkdirSync(`${FILESPATH}/${guild.id}`)
        fs.writeFileSync(`${FILESPATH}/${guild.id}/${guild.name}.txt`,`Server name: ${guild.name}\nServer ID: ${guild.id}`)
    }
}


function ClearConfig(guild)
{
    const newConfig = {}
    writeConfigData(guild, newConfig)
}

function checkForManagerRole(member)
{
    if(member.guild.ownerId === member.id)
    {
        return true
    }
    if(hasAdminPermission(member))
    {
        return true
    }
    const managerRole = getManagerRole(member.guild)
    if(managerRole == null)
    {
        console.log("There is no manager role set in the config.")
        return false
    }
    if(member.roles.cache.has(managerRole))
    {
        return true
    }
    return false
}

function hasAdminPermission(member)
{
    return member.permissions.has(PermissionFlagsBits.Administrator)
}

function getManagerRole(guild)
{
    const configData = getConfigData(guild)
    if(configData.moderatorRole == null)
    {
        return null
    }
    return configData.moderatorRole
}

function getQuestionsChannel(guild)
{
    const configData = getConfigData(guild)
    if (configData.questionsChannel == null) {
        console.log(`questionChannel was null in config file for server "${guild.name}"`)
        return null
    }
    return configData.questionsChannel
}

function getEnabled(guild) {
    const configData = getConfigData(guild)
    if (configData.enabled == null) {
        setConfigSetting(guild,"enabled",false)
        return false
    }
    return configData.enabled
}

function removeQuestionFromFile(guild,questionID)
{
    console.log(`Rmoving questions: ${questionID} ${typeof(questionID)}`)
    var questionData = getQuestionsData(guild)
    delete questionData[questionID]
    writeQuestionData(guild, questionData)
}

function addToQuestionsFile(guild, questionsData,questionValue) {
    const questionData = getQuestionsData(guild)
    var newQuestionData = questionData
    newQuestionData[questionsData] = questionValue
    writeQuestionData(guild, newQuestionData)
}

function writeQuestionData(guild, questionsData) {
    checkForFilesDir(guild)
    fs.writeFileSync(`${FILESPATH}/${guild.id}/questions.txt`, JSON.stringify(questionsData))
}

function getQuestionsData(guild) {
    checkForFilesDir(guild)
    if (!fs.existsSync(`${FILESPATH}/${guild.id}/questions.txt`)) {
        console.log(`Couldnt find questions file for guild ${guild.id}. Adding new questions file.`)
        const questionsData = {}
        writeQuestionData(guild, questionsData)
        return questionsData;
    }
    const settingsFile = fs.readFileSync(`${FILESPATH}/${guild.id}/questions.txt`, 'utf8')

    const questionData = JSON.parse(settingsFile)

    return questionData
}

function setConfigSetting(guild, configOption, value)
{
    const configData = getConfigData(guild)
    var newConfigData = configData
    newConfigData[configOption] = value
    writeConfigData(guild, newConfigData)
}

function getConfigData(guild)
{
    checkForFilesDir(guild)
    if(!fs.existsSync(`${FILESPATH}/${guild.id}/config.txt`))
    {
        console.log(`Couldnt find config file for guild ${guild.id}. Adding new config file.`)
        const configData = {}
        writeConfigData(guild, configData)
        return configData;
    }
    const configFile = fs.readFileSync(`${FILESPATH}/${guild.id}/config.txt`,'utf8')

    const configData = JSON.parse(configFile)

    return configData
}


function getLogChannel(guild)
{
    const configData = getConfigData(guild)
    if(configData.logChannel == null)
    {
        console.log("no log channel set")
        return null
    }
    const channel = guild.channels.cache.get(configData.logChannel)
    if(channel == null)
    {
        console.log("Error getting log channel.")
        return null
    }
    return channel
}

function TryAndSendLogMessage(guild,message)
{
    const channel = getLogChannel(guild)
    if(channel == null)
    {
        return false
    }
    if(message == null) return false
    channel.send(message)
    return true
}

function writeConfigData(guild,configData)
{
    checkForFilesDir(guild)
    fs.writeFileSync(`${FILESPATH}/${guild.id}/config.txt`,JSON.stringify(configData))
}
