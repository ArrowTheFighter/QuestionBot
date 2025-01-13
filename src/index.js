require('dotenv').config();
const fs = require('fs');
const {Client, REST ,Events, Partials, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, PermissionsBitField, Permissions,ButtonBuilder, ButtonStyle, ActionRowBuilder, TextChannel} = require('discord.js');
const { Routes } = require('discord-api-types/v9');
const { memoryUsage } = require('process');
const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates,GatewayIntentBits.GuildMessageReactions,GatewayIntentBits.GuildMembers], partials: [Partials.Message, Partials.Channel, Partials.Reaction]});

const rest = new REST({ version: '9'}).setToken(process.env.TOKEN)

const USERPATH = 'src/files/users/'

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
                {name: `set reply ephemeral`, value: `getkey_ephemeral`}])
            .setRequired(true)
        )
        .addStringOption(option =>
            option
            .setName("config_value")
            .setDescription("The value to set.")
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
                        const userPreviousKey = CheckIfUserHasKey(interaction.user)
                        if(userPreviousKey != null)
                        {
                            interaction.reply({content: `You have already been given a key. Your key is \`${userPreviousKey}\``,ephemeral : true})
                            return
                        }
                        //Check if the user has the required role to use this command
                        if(!checkForGeneralRole(interaction.member))
                        {
                            interaction.reply({content: 'You do not have permission to use this command',ephemeral : true})
                            if(!checkIfGeneralRoleExists())
                            {
                                const logChannel = getLogChannel(interaction.guild)
                                if(logChannel != "")
                                {
                                    logChannel.send(`There is no \`general role\` set.\n Please use \`config set_roles "general usage"\` to set this role.`)
                                }
                               
                            }
                            return
                        }
                        //Give the member the key
                        const KeyData = GetKeyData()
                        const userKey = GetNextKeyAndRemove(interaction.user)
                        if(userKey == null)
                        {
                            interaction.reply('Woops! Looks like the key list is empty. Please contact support.')
                            return
                        }
                        const user = interaction.user
                        const replyMessage = GetKeyReply(user,userKey)
                        const DMMessage = getDMMessage(user,userKey)
                        interaction.reply({content : replyMessage, ephemeral : GetKeyReplyEphemeral()})
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
                if(!checkForManagerRole(interaction.member))
                {
                    interaction.reply({content: "You do not have permission to use this command", ephemeral: true})
                    return
                }
                const KeyData = GetKeyData()
                const UsedKeys = GetUsedKeyData();
                switch(interaction.options.getSubcommand())
                {
                    case "add":
                        const newkeys = interaction.options.getString('newkeys')
                        interaction.reply(`Adding the following keys: \`${newkeys}\``)
                        AddKeysToKeyData(newkeys)
                    break;
                    case "list_unused":
                        const keys = GetKeysAsNiceString()
                        if(keys == "")
                        {
                            interaction.reply(`The key list is empty. Use the \`/keys add\` command to add more keys.`)
                            return
                        }
                        interaction.reply(`Here are the unused keys in the list: ${keys}`)
                    break;
                    case 'list_used':
                        const niceString = await GetUsedKeysAsNiceString(client)
                        if(niceString == "")
                        {
                            interaction.reply(`The used key list is empty. User's will be added here when using the \`/get key\` command.`)
                            return
                        }
                        interaction.reply(`Here are the used keys in the list: \n${niceString}`)
                    break;
                    case "check_user":
                        var user = interaction.options.getUser("user")
                        var userKey = getUsersKey(user)
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
                        var userKey = getUsersKey(user)
                        if(userKey == null)
                        {
                            interaction.reply(`${user} has not recieved a key.`)
                            return
                        }
                        if(!removeKeyFromUsedKeys(user))
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
                            ClearUsedKeysList()
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
                            ClearKeyList()
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
                if(!checkForManagerRole(interaction.member))
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
                                setConfigSetting("managerRole",role.id)
                                return
                            break;
                            case "generalRole":
                                interaction.reply(`Setting the \`General Usage Role\` to \`${role.name}\``)
                                setConfigSetting("generalRole",role.id)
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
                            const configData = getConfigData()
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
                                setConfigSetting(stringOptionMessage,stringValue)
                                interaction.reply(`Setting the \`DM reply message\` to \`${stringValue}\``)
                                return
                            break;
                            default:
                                setConfigSetting(stringOptionMessage,stringValue)
                                interaction.reply(`Setting the \`${stringOptionMessage}\` to \`${stringValue}\``)
                            break;
                        }
                    break;

                    case "other":
                        var stringOptionMessage = interaction.options.getString("config_option")
                        var stringValue = interaction.options.getString("config_value")
                        if(stringValue == null)
                        {
                            const configData = getConfigData()
                            if(configData[stringOptionMessage] != null)
                            {
                                interaction.reply(`The configuration for \`${stringOptionMessage}\` is currently set to \`${configData[stringOptionMessage]}\``)
                            }else
                            {
                                interaction.reply(`There is no configuration set for \`${stringOptionMessage}\`.`)
                            }
                            return
                        }

                        setConfigSetting(stringOptionMessage,stringValue)
                        interaction.reply(`Setting the \`${stringOptionMessage}\` to \`${stringValue}\``)
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


function WriteKeyData(keydata)
{
    fs.writeFileSync(`src/files/keyData.txt`, JSON.stringify(keydata));
}

function WriteUsedKeyData(keydata)
{
    fs.writeFileSync(`src/files/usedKeyData.txt`, JSON.stringify(keydata));
}

function GetUsedKeyData()
{
    if(!fs.existsSync(`src/files/usedKeyData.txt`))
        {
            console.log("Couldnt find usedKeyData file. Creating new file.")
            var newKeyData = {}
            var JsonData = JSON.stringify(newKeyData)
            fs.writeFileSync(`src/files/usedKeyData.txt`, JsonData);
            const keyDataFile = fs.readFileSync(`src/files/usedKeyData.txt`,'utf8')
            var KeyDataParsed = JSON.parse(keyDataFile)
            return KeyDataParsed;
        }
        const keyDataFile = fs.readFileSync(`src/files/usedKeyData.txt`,'utf8')
    
        if(keyDataFile === "") return ""
        const KeyData = JSON.parse(keyDataFile)
    
        return KeyData
}

async function GetUsedKeysAsNiceString(client)
{
    const UsedKeyData = GetUsedKeyData()
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

function GetKeysAsNiceString()
{
    const KeyData = GetKeyData()
    var newString = ""
    if(KeyData.unusedKeys.length <= 0)
    {
        console.log("No unused keys")
        return ""
    }
    for (let index = 0; index < KeyData.unusedKeys.length; index++) {
        const noSpaces = KeyData.unusedKeys[index].replace(/\s/g, '')
        newString += `\`${noSpaces}\` `
    }
    return newString
}

function GetKeyData()
{
    if(!fs.existsSync(`src/files/keyData.txt`))
    {
        console.log("Couldnt find keyData file. Creating new file.")
        var newKeyData = {}
        newKeyData.unusedKeys = []
        var JsonData = JSON.stringify(newKeyData)
        fs.writeFileSync(`src/files/keyData.txt`, JsonData);
        return newKeyData;
    }
    const keyDataFile = fs.readFileSync(`src/files/keyData.txt`,'utf8')

    if(keyDataFile === "") return ""
    const KeyData = JSON.parse(keyDataFile)

    return KeyData
}

function ClearKeyList()
{
    const keyData = GetKeyData()
    var newKeyData = keyData
    newKeyData.unusedKeys = []
    WriteKeyData(newKeyData);
}

function ClearUsedKeysList()
{
    const usedKeyData = GetUsedKeyData()
    var newKeyData = usedKeyData
    newKeyData = {}
    WriteUsedKeyData(newKeyData)
}

function AddKeysToKeyData(keys)
{
    const KeyData = GetKeyData()
    var newKeyData = KeyData
    var splitKeys = keys.split(",")
    for (let index = 0; index < splitKeys.length; index++) {
        newKeyData.unusedKeys.push(splitKeys[index])
    }
    WriteKeyData(newKeyData)
}

function AssignKeyToUser(key,user)
{
    const KeyData = GetUsedKeyData()
    var newKeyData = KeyData
    
    var userAndKey = key

    newKeyData[user.id] = userAndKey

    WriteUsedKeyData(newKeyData)
}

function SetKeyData(keys)
{
    const KeyData = GetKeyData()
    var newKeyData = KeyData
    newKeyData.unusedKeys = keys.unusedKeys

    WriteKeyData(newKeyData)
}

function GetNextKeyAndRemove(user)
{
    const KeyData = GetKeyData()
    if(KeyData.unusedKeys.length <= 0)
    {
        return null;
    }
    const nextKey = KeyData.unusedKeys[0]
    var newKeys
    newkeys = KeyData
    newkeys.unusedKeys = KeyData.unusedKeys.slice(1)
    AssignKeyToUser(nextKey,user)
    SetKeyData(newkeys)
    return nextKey
}

function CheckIfUserHasKey(user)
{
    const UsedKeys = GetUsedKeyData()
    if(UsedKeys.hasOwnProperty(user.id))
    {
        console.log(`User already has key. their key is ${UsedKeys[user.id]}`)
        return UsedKeys[user.id]
    }
    return null;
}

function checkForManagerRole(member)
{
    if(member.guild.ownerId === member.id)
    {
        return true
    }
    const managerRole = getManagerRole()
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

function checkForGeneralRole(member)
{
    const generalRole = getGeneralRole()
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

function checkIfGeneralRoleExists()
{
    const generalRole = getGeneralRole()
    if(generalRole == null)
    {
        return false
    }
    return true
}

function getManagerRole()
{
    const configData = getConfigData()
    if(configData.managerRole == null)
    {
        return null
    }
    return getConfigData().managerRole
}

function getGeneralRole()
{
    const configData = getConfigData()
    if(configData.generalRole == null)
    {
        return null
    }
    return getConfigData().generalRole
}

function getAdminRole()
{
    return getDefaultData().adminRole
}

function setConfigSetting(configOption, value)
{
    const configData = getConfigData()
    var newConfigData = configData
    newConfigData[configOption] = value
    writeConfigData(newConfigData)
}

function getConfigData()
{
    if(!fs.existsSync(`src/files/config.txt`))
    {
        console.log("Couldnt find defaults file. Adding new config file")
        const configData = {}
        writeConfigData(configData)
        return configData;
    }
    const configFile = fs.readFileSync(`src/files/config.txt`,'utf8')

    const configData = JSON.parse(configFile)

    return configData
}

function getDMMessage(user,key)
{
    const configData = getConfigData()
    const userKeyWOSpace = key.replace(/\s/g, '')
    if(configData.dm_message == null)
    {
        return `You ran the "get key" command!\nHere is your key: \`${userKeyWOSpace}\``
    }

    const DMMessage = configData.dm_message
    var AdjustedMessage = DMMessage
    AdjustedMessage = AdjustedMessage.replace(/{KEY}/g,`${userKeyWOSpace}`)
    AdjustedMessage = AdjustedMessage.replace(/{USER}/g,`${user}`)
    AdjustedMessage = AdjustedMessage.replace(/\\n/g,"\n")
    return AdjustedMessage
}

function GetKeyReply(user,key)
{
    console.log(key)
    const configData = getConfigData()
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

function GetKeyReplyEphemeral()
{
    const configData = getConfigData()
    if(configData.getkey_ephemeral == null)
    {
        return false
    }
    return configData.getkey_ephemeral
}

function getLogChannel(guild)
{
    const configData = getConfigData()
    if(configData.logChannel == null)
    {
        return ""
    }
    const channel = guild.channels.cache.get(configData.logChannel)
    if(channel == null)
    {
        console.log("Error getting log channel.")
        return null
    }
    return channel
}

function getUsersKey(user)
{
    const usedKeyData = GetUsedKeyData()
    if(usedKeyData[user.id] == null)
    {
        return null
    }
    return usedKeyData[user.id]
}

function removeKeyFromUsedKeys(user)
{
    const usedKeyData = GetUsedKeyData()
    if(usedKeyData[user.id] == null)
    {
        console.log("Somehow the key was not in the used key list, this is not normally possible.")
        return false
    }
    var newKeyData = usedKeyData
    delete usedKeyData[user.id]
    WriteUsedKeyData(newKeyData)
    return true
}

function writeConfigData(configData)
{
    fs.writeFileSync(`src/files/config.txt`,JSON.stringify(configData))
}
