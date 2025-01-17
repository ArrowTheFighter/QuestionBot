require('dotenv').config();
const fs = require('fs');
const {Client, REST ,Events, Partials, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, PermissionsBitField, Permissions,ButtonBuilder, ButtonStyle, ActionRowBuilder, TextChannel} = require('discord.js');
const { Routes } = require('discord-api-types/v9');
const { memoryUsage } = require('process');
const internal = require('stream');
const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates,GatewayIntentBits.GuildMessageReactions,GatewayIntentBits.GuildMembers], partials: [Partials.Message, Partials.Channel, Partials.Reaction]});

const rest = new REST({ version: '9'}).setToken(process.env.TOKEN)

const FILESPATH = 'src/files'

//Delete commands
// rest.delete(Routes.applicationCommand('1286948398234341436', "1287132867180101652"))
// 	.then(() => console.log('Successfully deleted guild command'))
//	.catch(console.error);

client.on(Events.ClientReady, (x) => {

    console.log(`${x.user.tag} is ready`);

    client.user.setActivity("Key Giveaway!");

    const ping = new SlashCommandBuilder()
    .setName('get')
    .setDescription('Get your testing key!')
    .addSubcommand(subcommand => 
        subcommand
        .setName("key")
        .setDescription("Get your testing key!")
    )
    client.application.commands.create(ping);

    const keys = new SlashCommandBuilder()
    .setName('keys')
    .setDescription('Manage keys')
    .addSubcommand(subcommand => 
        subcommand
        .setName("add")
        .setDescription("Add new keys to the key list")
        .addStringOption(option =>
            option
            .setName("newkeys")
            .setDescription("A list of new keys")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName("list_unused")
        .setDescription("List all the unused keys in the key list")
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName("list_used")
        .setDescription("List all the used keys in the key list")
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName("check_user")
        .setDescription("Check if a user has a key")
        .addUserOption(option =>
            option
            .setName("user")
            .setDescription("Check to see if a user has a key")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName("remove_user")
        .setDescription("Removes a user from the used key list")
        .addUserOption(option =>
            option
            .setName("user")
            .setDescription("The user to remove")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName("clear_usedkeys")
        .setDescription("Clears all the used keys")
        .addStringOption(option => 
            option
            .setName("confirm")
            .setDescription("Type confirm to run this command")
        )
    )
    .addSubcommand(subcommand => 
        subcommand
        .setName("clear_unusedkeys")
        .setDescription("Clears all the unused keys")
        .addStringOption(option => 
            option
            .setName("confirm")
            .setDescription("Type confirm to run this command")
        )
    )
    
    client.application.commands.create(keys);

    const config = new SlashCommandBuilder()
    .setName("config")
    .setDescription("config")
    .addSubcommand(subcommand =>
        subcommand
        .setName("set_roles")
        .setDescription("Set a required role for different commands.")
        .addStringOption(option =>
            option
            .setName("config_option")
            .setDescription("The config option to adjust")
            .setChoices([{name: `manager role`, value: `managerRole`},{name: `general usage`, value: `generalRole`}])
            .setRequired(true)
        )
        .addRoleOption(option => 
            option
            .setName("role")
            .setDescription("Role to add")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
        subcommand
        .setName("set_messages")
        .setDescription("set the reply given to users when running different commands. Formating: {KEY} - {USER} - \\n")
        .addStringOption(option =>
            option
            .setName("config_option")
            .setDescription("The config option to adjust")
            .setChoices([{name: `Set get key DM reply`, value: `dm_message`},
                {name: `Set get key reply`, value: `getkey_reply`}])
            .setRequired(true)
        )
        .addStringOption(option =>
            option
            .setName("config_value")
            .setDescription("The value to set.")
        )
    )
    .addSubcommand(subcommand =>
        subcommand
        .setName("other")
        .setDescription("set config settings")
        .addStringOption(option =>
            option
            .setName("config_option")
            .setDescription("The config option to adjust")
            .setChoices([{name: `log channel ID`, value: `logChannel`},
                {name: `set reply ephemeral`, value: `getkey_ephemeral`},
                {name: `set remaining keys log message`, value: `remainingKeysMsg`},
                {name: `set remaining keys log amount`, value: `remainingKeysAmount`}])
            .setRequired(true)
        )
        .addStringOption(option =>
            option
            .setName("config_value")
            .setDescription("The value to set.")
        )
    ).addSubcommand(subcommand =>
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
    
});

client.on('interactionCreate', async (interaction) =>{
    if(interaction.isChatInputCommand())
    {
        switch (interaction.commandName)
        {
            case "get":
                switch (interaction.options.getSubcommand())
                {
                    case "key":
                        //Check if the message was sent in a server and not a DM
                        if(interaction.guild == null)
                        {
                            interaction.reply({content: "This command cannot be used here. Please contact support if this is an error.", ephemeral: true})
                            return
                        }
                        //Check if the user has already been given a key
                        const userPreviousKey = CheckIfUserHasKey(interaction.guild, interaction.user)
                        if(userPreviousKey != null)
                        {
                            interaction.reply({content: `You have already been given a key. Your key is \`${userPreviousKey}\``,ephemeral : true})
                            return
                        }
                        //Check if the user has the required role to use this command
                        if(!checkForGeneralRole(interaction.guild, interaction.member))
                        {
                            interaction.reply({content: 'You do not have permission to use this command',ephemeral : true})
                            if(!checkIfGeneralRoleExists(interaction.guild))
                            {
                                TryAndSendLogMessage(interaction.guild, `There is no \`general role\` set.\n Please use \`config set_roles "general usage"\` to set this role.`)
                            }
                            return
                        }
                        //Give the member the key
                        const KeyData = GetKeyData(interaction.guild)
                        const userKey = GetNextKeyAndRemove(interaction.guild,interaction.user)
                        const ConfigData = getConfigData(interaction.guild)
                        var remainingKA = 3
                        if(ConfigData.remainingKeysAmount != null)
                        {
                            remainingKA = Number(ConfigData.remainingKeysAmount)
                            
                        }
                        if(userKey == null)
                        {
                            interaction.reply('Woops! Looks like the key list is empty. Please contact support.')
                            TryAndSendLogMessage(interaction.guild,`**Notice!** There are no keys in the keylist.`)
                            return
                        }
                        console.log(KeyData.unusedKeys.length + " - " + remainingKA)
                        if(KeyData.unusedKeys.length <= remainingKA + 1)
                        {
                            TryAndSendLogMessage(interaction.guild,GetRemainingKeysMsg(interaction.guild))
                        }
                        const user = interaction.user
                        const replyMessage = GetKeyReply(interaction.guild, user,userKey)
                        const DMMessage = getDMMessage(interaction.guild, user,userKey)
                        const isEphemeral = GetKeyReplyEphemeral(interaction.guild)
                        interaction.reply({content : replyMessage, ephemeral : isEphemeral})
                        user.send(DMMessage)
                    break;
                }
            break;

            case "keys": 
                if(interaction.guild == null)
                {
                    interaction.reply({content: "This command cannot be used here. Please contact support if this is an error.", ephemeral: true})
                    return
                }
                if(!checkForManagerRole(interaction.guild,interaction.member))
                {
                    interaction.reply({content: "You do not have permission to use this command", ephemeral: true})
                    return
                }
                switch(interaction.options.getSubcommand())
                {
                    case "add":
                        const newkeys = interaction.options.getString('newkeys')
                        interaction.reply(`Adding the following keys: \`${newkeys}\``)
                        AddKeysToKeyData(interaction.guild, newkeys)
                    break;
                    case "list_unused":
                        const keys = GetKeysAsNiceString(interaction.guild)
                        if(keys == "")
                        {
                            interaction.reply(`The key list is empty. Use the \`/keys add\` command to add more keys.`)
                            return
                        }
                        interaction.reply(`Here are the unused keys in the list: ${keys}`)
                    break;
                    case 'list_used':
                        const niceString = await GetUsedKeysAsNiceString(interaction.guild,client)
                        if(niceString == "")
                        {
                            interaction.reply(`The used key list is empty. User's will be added here when using the \`/get key\` command.`)
                            return
                        }
                        interaction.reply(`Here are the used keys in the list: \n${niceString}`)
                    break;
                    case "check_user":
                        var user = interaction.options.getUser("user")
                        var userKey = getUsersKey(interaction.guild, user)
                        if(userKey == null)
                        {
                            interaction.reply(`${user} has not recieved a key.`)
                            return
                        }
                        interaction.reply(`${user} has recieved a key. Their key is \`${userKey}\``)
                        return
                    break;
                    case "remove_user":
                        var user = interaction.options.getUser("user")
                        var userKey = getUsersKey(interaction.guild, user)
                        if(userKey == null)
                        {
                            interaction.reply(`${user} has not recieved a key.`)
                            return
                        }
                        if(!removeKeyFromUsedKeys(interaction.guild, user))
                        {
                            interaction.reply("Something went very wrong. Please contact support")
                            return
                        }
                        interaction.reply(`${user} has been removed from the key list. Their key was \`${userKey}\``)
                    break;
                    case "clear_usedkeys":
                        var confirmString = interaction.options.getString("confirm")
                        if(confirmString != "confirm")
                        {
                            interaction.reply({content: `You need to type \`confirm\` to run this command.\nInsure you understand what you are doing before using this command.`, ephemeral: true})
                        }else
                        {
                            ClearUsedKeysList(interaction.guild)
                            interaction.reply({content: `Clearing the used keys list.`, ephemeral: false})
                        }
                        return
                    break;
                    case "clear_unusedkeys":
                        var confirmString = interaction.options.getString("confirm")
                        if(confirmString != "confirm")
                        {
                            interaction.reply({content: `You need to type \`confirm\` to run this command.\nInsure you understand what you are doing before using this command.`, ephemeral: true})
                        }else
                        {
                            ClearKeyList(interaction.guild)
                            interaction.reply({content: `Clearing the unused keys list.`, ephemeral: false})
                        }
                        return
                    break;
                }
            break;

            case "config":
                if(interaction.guild == null)
                {
                    interaction.reply({content: "This command cannot be used here. Please contact support if this is an error.", ephemeral: true})
                    return
                }
                if(!checkForManagerRole(interaction.guild, interaction.member))
                {
                    interaction.reply({content: "You do not have permission to use this command", ephemeral: true})
                    return
                }
                switch(interaction.options.getSubcommand())
                {
                    case "set_roles":
                        const stringOption = interaction.options.getString("config_option")
                        const role = interaction.options.getRole("role")
                        switch(stringOption)
                        {
                            case "managerRole":
                                if(interaction.member.id != interaction.guild.ownerId)
                                {
                                    interaction.reply({content: "Only the server owner can modify this setting.", ephemeral: true})
                                    return
                                }
                                interaction.reply(`Setting the \`Manager Role\` to \`${role.name}\``)
                                setConfigSetting(interaction.guild,"managerRole",role.id)
                                return
                            break;
                            case "generalRole":
                                interaction.reply(`Setting the \`General Usage Role\` to \`${role.name}\``)
                                setConfigSetting(interaction.guild,"generalRole",role.id)
                                return
                            break;
                        }
                        interaction.reply(`Setting  \`${role.name}\``)
                    break;
                    case "set_messages":
                        var stringOptionMessage = interaction.options.getString("config_option")
                        var stringValue = interaction.options.getString("config_value")
                        if(stringValue == null)
                        {
                            const configData = getConfigData(interaction.guild)
                            if(configData[stringOptionMessage] != null)
                            {
                                interaction.reply(`The configuration for \`${stringOptionMessage}\` is currently set to \`${configData[stringOptionMessage]}\``)
                            }else
                            {
                                interaction.reply(`There is no configuration set for \`${stringOptionMessage}\`.`)
                            }
                            return
                        }
                        switch(stringOptionMessage)
                        {
                            case "dm_message":
                                setConfigSetting(interaction.guild,stringOptionMessage,stringValue)
                                interaction.reply(`Setting the \`DM reply message\` to \`${stringValue}\``)
                                return
                            break;
                            default:
                                setConfigSetting(interaction.guild,stringOptionMessage,stringValue)
                                interaction.reply(`Setting the \`${stringOptionMessage}\` to \`${stringValue}\``)
                            break;
                        }
                    break;

                    case "other":
                        var stringOptionMessage = interaction.options.getString("config_option")
                        var stringValue = interaction.options.getString("config_value")
                        if(stringValue == null)
                        {
                            const configData = getConfigData(interaction.guild)
                            if(configData[stringOptionMessage] != null)
                            {
                                interaction.reply(`The configuration for \`${stringOptionMessage}\` is currently set to \`${configData[stringOptionMessage]}\``)
                            }else
                            {
                                interaction.reply(`There is no configuration set for \`${stringOptionMessage}\`.`)
                            }
                            return
                        }

                        setConfigSetting(interaction.guild, stringOptionMessage,stringValue)
                        interaction.reply(`Setting the \`${stringOptionMessage}\` to \`${stringValue}\``)
                    break;

                    case "clear":
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
                    break;
                }
            break;
        }
        if(interaction.commandName == 'ping'){
            interaction.reply('Pong!');
        }
        
    }

    // BUTTON STUFF
    // else if(interaction.isButton())
    // {
    //     switch(interaction.customId)
    //     {
            
    //     }
    // }
})

client.login(process.env.NEWTOKEN);


function WriteKeyData(guild, keydata)
{
    checkForFilesDir(guild)
    fs.writeFileSync(`${FILESPATH}/${guild.id}/keyData.txt`, JSON.stringify(keydata));
}

function WriteUsedKeyData(guild,keydata)
{
    checkForFilesDir(guild)
    fs.writeFileSync(`${FILESPATH}/${guild.id}/usedKeyData.txt`, JSON.stringify(keydata));
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

function GetUsedKeyData(guild)
{
    checkForFilesDir(guild)
    if(!fs.existsSync(`${FILESPATH}/${guild.id}/usedKeyData.txt`))
        {
            console.log(`Couldnt find usedKeyData file for guild ${guild.id}. Creating new file.`)
            var newKeyData = {}
            var JsonData = JSON.stringify(newKeyData)
            fs.writeFileSync(`${FILESPATH}/${guild.id}/usedKeyData.txt`, JsonData);
            return newKeyData;
        }
        const keyDataFile = fs.readFileSync(`${FILESPATH}/${guild.id}/usedKeyData.txt`,'utf8')
    
        if(keyDataFile === "") return ""
        const KeyData = JSON.parse(keyDataFile)
    
        return KeyData
}

async function GetUsedKeysAsNiceString(guild,client)
{
    const UsedKeyData = GetUsedKeyData(guild)
    var niceString = ""
    if(Object.entries(UsedKeyData).length <= 0)
    {
        return ""
    }
    for (const [key, value] of Object.entries(UsedKeyData))
    {
        const user = await client.users.fetch(key)
        niceString += `Name = \`${user.displayName}\` : ID = \`${user.id}\` : key =  \`${value}\`\n`
    }

    return niceString
}

function GetKeysAsNiceString(guild)
{
    const KeyData = GetKeyData(guild)
    var newString = ""
    if(KeyData.unusedKeys.length <= 0)
    {
        return ""
    }
    for (let index = 0; index < KeyData.unusedKeys.length; index++) {
        const noSpaces = KeyData.unusedKeys[index].replace(/\s/g, '')
        newString += `\`${noSpaces}\` `
    }
    return newString
}

function GetKeyData(guild)
{
    checkForFilesDir(guild)
    if(!fs.existsSync(`${FILESPATH}/${guild.id}/keyData.txt`))
    {
        console.log(`Couldnt find keyData for guild ${guild.id} file. Creating new file.`)
        var newKeyData = {}
        newKeyData.unusedKeys = []
        var JsonData = JSON.stringify(newKeyData)
        fs.writeFileSync(`${FILESPATH}/${guild.id}/keyData.txt`, JsonData);
        return newKeyData;
    }
    const keyDataFile = fs.readFileSync(`${FILESPATH}/${guild.id}/keyData.txt`,'utf8')

    if(keyDataFile === "") return ""
    const KeyData = JSON.parse(keyDataFile)

    return KeyData
}

function ClearKeyList(guild)
{
    const keyData = GetKeyData(guild)
    var newKeyData = keyData
    newKeyData.unusedKeys = []
    WriteKeyData(guild,newKeyData);
}

function ClearUsedKeysList(guild)
{
    const usedKeyData = GetUsedKeyData(guild)
    var newKeyData = usedKeyData
    newKeyData = {}
    WriteUsedKeyData(guild,newKeyData)
}

function ClearConfig(guild)
{
    const newConfig = {}
    writeConfigData(guild, newConfig)
}

function AddKeysToKeyData(guild,keys)
{
    const KeyData = GetKeyData(guild)
    var newKeyData = KeyData
    var splitKeys = keys.split(",")
    for (let index = 0; index < splitKeys.length; index++) {
        newKeyData.unusedKeys.push(splitKeys[index])
    }
    WriteKeyData(guild,newKeyData)
}

function AssignKeyToUser(guild,key,user)
{
    const KeyData = GetUsedKeyData(guild)
    var newKeyData = KeyData
    
    var userAndKey = key

    newKeyData[user.id] = userAndKey

    WriteUsedKeyData(guild,newKeyData)
}

function SetKeyData(guild,keys)
{
    const KeyData = GetKeyData(guild)
    var newKeyData = KeyData
    newKeyData.unusedKeys = keys.unusedKeys

    WriteKeyData(guild,newKeyData)
}

function GetNextKeyAndRemove(guild,user)
{
    const KeyData = GetKeyData(guild)
    if(KeyData.unusedKeys.length <= 0)
    {
        return null;
    }
    const nextKey = KeyData.unusedKeys[0]
    var newKeys
    newkeys = KeyData
    newkeys.unusedKeys = KeyData.unusedKeys.slice(1)
    AssignKeyToUser(guild,nextKey,user)
    SetKeyData(guild,newkeys)
    return nextKey
}

function CheckIfUserHasKey(guild, user)
{
    const UsedKeys = GetUsedKeyData(guild)
    if(UsedKeys.hasOwnProperty(user.id))
    {
        return UsedKeys[user.id]
    }
    return null;
}

function checkForManagerRole(guild,member)
{
    if(member.guild.ownerId === member.id)
    {
        return true
    }
    const managerRole = getManagerRole(guild)
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

function checkForGeneralRole(guild,member)
{
    const generalRole = getGeneralRole(guild)
    if(generalRole == null)
    {
        console.log("There is no general role set in the config.")
        return false
    }
    if(member.roles.cache.has(generalRole))
    {
        return true
    }
    return false
}

function checkIfGeneralRoleExists(guild)
{
    const generalRole = getGeneralRole(guild)
    if(generalRole == null)
    {
        return false
    }
    return true
}

function getManagerRole(guild)
{
    const configData = getConfigData(guild)
    if(configData.managerRole == null)
    {
        return null
    }
    return configData.managerRole
}

function getGeneralRole(guild)
{
    const configData = getConfigData(guild)
    if(configData.generalRole == null)
    {
        return null
    }
    return configData.generalRole
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

function getDMMessage(guild,user,key)
{
    const configData = getConfigData(guild)
    const userKeyWOSpace = key.replace(/\s/g, '')
    if(configData.dm_message == null)
    {
        return `Here is your requested key:\n\`${userKeyWOSpace}\``
    }

    const DMMessage = configData.dm_message
    var AdjustedMessage = DMMessage
    AdjustedMessage = AdjustedMessage.replace(/{KEY}/g,`${userKeyWOSpace}`)
    AdjustedMessage = AdjustedMessage.replace(/{USER}/g,`${user}`)
    AdjustedMessage = AdjustedMessage.replace(/\\n/g,"\n")
    return AdjustedMessage
}

function GetKeyReply(guild,user,key)
{
    const configData = getConfigData(guild)
    const userKeyWOSpace = key.replace(/\s/g, '')
    if(configData.getkey_reply == null)
    {
        return `Generating a key for ${user}! Please check your DM's shortly.`
    }

    const ReplyMessage = configData.getkey_reply
    var AdjustedMessage = ReplyMessage
    AdjustedMessage = AdjustedMessage.replace(/{KEY}/g,`${userKeyWOSpace}`)
    AdjustedMessage = AdjustedMessage.replace(/{USER}/g,`${user}`)
    AdjustedMessage = AdjustedMessage.replace(/\\n/g,"\n")
    return AdjustedMessage
}

function GetRemainingKeysMsg(guild)
{
    const configData = getConfigData(guild)
    const KeyData = GetKeyData(guild)

    var keyString = `**${KeyData.unusedKeys.length}** keys`
    if(KeyData.unusedKeys.length == 1)
    keyString = `**${KeyData.unusedKeys.length}** key`

    if(configData.remainingKeysMsg == null)
    {
        return `The key list has only ${keyString} left.`
    }

    const ReplyMessage = configData.remainingKeysMsg
    var AdjustedMessage = ReplyMessage
    AdjustedMessage = AdjustedMessage.replace(/{KEY}/g,`${keyString}`)
    AdjustedMessage = AdjustedMessage.replace(/\\n/g,"\n")
    return AdjustedMessage
}

function GetKeyReplyEphemeral(guild)
{
    const configData = getConfigData(guild)
    if(configData.getkey_ephemeral == null)
    {
        return false
    }
    return configData.getkey_ephemeral
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

function getUsersKey(guild, user)
{
    const usedKeyData = GetUsedKeyData(guild)
    if(usedKeyData[user.id] == null)
    {
        return null
    }
    return usedKeyData[user.id]
}

function removeKeyFromUsedKeys(guild, user)
{
    const usedKeyData = GetUsedKeyData(guild)
    if(usedKeyData[user.id] == null)
    {
        console.log("Somehow the key was not in the used key list, this is not normally possible.")
        return false
    }
    var newKeyData = usedKeyData
    delete usedKeyData[user.id]
    WriteUsedKeyData(guild,newKeyData)
    return true
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
