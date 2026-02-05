const http = require("http");

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
}).listen(3000);

console.log("🌐 Keep-alive server running");
// =====================================================
// 🤖 NITIN REWARDS BOT – FULL A TO Z SYSTEM
// Developed & Managed by Nitin
// =====================================================

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// =====================================================
// 🔧 CONFIG (EXACT IDS)
// =====================================================

const TICKET_CATEGORY_ID = "1460634902872461372";
const FALCON_BOT_ID = "899899858981371935";

const STOCK_CHANNEL_ID = "1468552875662770196";
const STOCK_ROLE_ID = "1464896720235135058";

const STAFF_ROLES = [
  "1462441387768156221",
  "1462441551463452855",
];

const OWNERS = [
  "1291447772058353684",
  "1024354204694884422",
];

// =====================================================
// 🎁 REWARDS (LOCKED)
// =====================================================

const REWARDS = {
  mcfa:        { name: "MCFA Permanent", invites: 2 },
  nitro_basic: { name: "Nitro Basic (Yearly)", invites: 4 },
  nitro_boost: { name: "Nitro Boost (Yearly)", invites: 8 },
  minecraft:   { name: "Minecraft Redeem Code", invites: 8 },
  roblox_50:   { name: "Roblox $50 Gift Card", invites: 5 },
  roblox_100:  { name: "Roblox $100 Gift Card", invites: 10 },
};

// =====================================================
// 📁 PATHS
// =====================================================

const STOCK_DIR = path.join(__dirname, "stock");
const DATA_DIR = path.join(__dirname, "data");
const INVITE_DB = path.join(DATA_DIR, "invites.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(STOCK_DIR)) fs.mkdirSync(STOCK_DIR);
if (!fs.existsSync(INVITE_DB)) fs.writeFileSync(INVITE_DB, "{}");

// =====================================================
// 🧠 UTILITIES
// =====================================================

function loadInvites() {
  return JSON.parse(fs.readFileSync(INVITE_DB, "utf8"));
}

function saveInvites(data) {
  fs.writeFileSync(INVITE_DB, JSON.stringify(data, null, 2));
}

function log(action, text) {
  console.log(`[${new Date().toISOString()}] ${action} :: ${text}`);
}

function getStockFile(key) {
  return path.join(STOCK_DIR, `${key}.txt`);
}

function parseInvites(text) {
  const m = text.match(/(\d+)\s*invite/i);
  return m ? parseInt(m[1], 10) : null;
}

// =====================================================
// 🤖 CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// =====================================================
// 🎫 TICKET STATE (RUNTIME)
// =====================================================

const ticketState = new Map();

// =====================================================
// 🎫 TICKET CREATE → WELCOME
// =====================================================

client.on("channelCreate", async (channel) => {
  if (channel.parentId !== TICKET_CATEGORY_ID) return;

  setTimeout(() => {
    channel.send(
`👋 Welcome!

Your support ticket has been successfully created and is now active.

📌 How this works:
• This ticket uses an automated invite verification system
• Please run **Falcon \`-i\`** in this ticket to check your invite count
• Rewards will unlock automatically after verification

⚠️ Important:
• Do not spam commands
• Follow the instructions carefully for smooth processing

—
🤖 Nitin Rewards Bot  
Developed & Managed by **Nitin**`
    ).catch(() => {});
  }, 1200);
});

// =====================================================
// 📩 SINGLE MESSAGE HANDLER (IMPORTANT)
// =====================================================

client.on("messageCreate", async (message) => {
  if (!message.guild) return;

  // allow Falcon, block other bots
  if (message.author.bot && message.author.id !== FALCON_BOT_ID) return;

  // init ticket state
  if (
    message.channel.parentId === TICKET_CATEGORY_ID &&
    !ticketState.has(message.channel.id) &&
    !message.author.bot
  ) {
    ticketState.set(message.channel.id, {
      userId: message.author.id,
      invitesChecked: false,
      rewardKey: null,
      rmi: false,
    });
  }

  const state = ticketState.get(message.channel.id);

// =====================================================
// 📦 ADD STOCK (STAFF ONLY – EXACT NOTICE)
// =====================================================

  if (message.content.startsWith("!addstock")) {
    if (message.channel.id !== STOCK_CHANNEL_ID)
      return message.reply("❌ Stock sirf stock channel me add hota hai.");

    if (!message.member.roles.cache.has(STOCK_ROLE_ID))
      return message.reply("❌ Tumhare paas Stock Role nahi hai.");

    const args = message.content.split(" ");
    if (args.length < 3)
      return message.reply("❌ Format: !addstock <reward_key> <account/code>");

    const key = args[1];
    const data = args.slice(2).join(" ");

    if (!REWARDS[key])
      return message.reply("❌ Invalid reward key.");

    fs.appendFileSync(getStockFile(key), data + "\n");

    log("STOCK_ADD", `${message.author.id} → ${key} → ${data}`);
    return message.reply("✅ Stock added successfully.");
  }

// =====================================================
// 🦅 FALCON INVITE CHECK
// =====================================================

  if (message.author.id === FALCON_BOT_ID && state && !state.invitesChecked) {
    const invites =
      parseInvites(message.content) ||
      parseInvites(message.embeds.map(e => e.description || "").join(" "));

    if (invites === null) return;

    const db = loadInvites();
    if (!db[state.userId]) {
      db[state.userId] = { total: invites, used: 0 };
    } else {
      db[state.userId].total = Math.max(db[state.userId].total, invites);
    }
    saveInvites(db);

    state.invitesChecked = true;

    const available = db[state.userId].total - db[state.userId].used;

    log("INVITE_CHECK", `${state.userId} → ${available}`);

    if (available < 2) {
      return message.channel.send(
`❌ Invite Check Result

You do not have enough invites to claim rewards.

Available Invites: **${available}**
Minimum Required: **2**

—
🤖 Nitin Rewards Bot`
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("🎁 Available Rewards")
      .setDescription(
        Object.entries(REWARDS)
          .map(([k, v]) => `• **${k}** → ${v.name} (${v.invites} invites)`)
          .join("\n")
      );

    return message.channel.send({
      content:
`✅ Invite Verification Successful

Available Invites: **${available}**

Please type the reward you want to claim.

—
🤖 Nitin Rewards Bot`,
      embeds: [embed],
    });
  }

// =====================================================
// 🎁 REWARD SELECTION (SMART)
// =====================================================

  if (state && state.invitesChecked && !state.rewardKey && !message.author.bot) {
    const input = message.content.toLowerCase().trim();
    let key = null;

    if (REWARDS[input]) key = input;
    else if (input.includes("nitro") && input.includes("boost")) key = "nitro_boost";
    else if (input.includes("nitro") && input.includes("basic")) key = "nitro_basic";
    else if (input === "nitro") {
      return message.reply("❓ Please specify **Nitro Basic** or **Nitro Boost**.");
    }

    if (!key) return;

    const db = loadInvites();
    const available = db[state.userId].total - db[state.userId].used;

    if (available < REWARDS[key].invites) {
      return message.reply("❌ Not enough invites for this reward.");
    }

    state.rewardKey = key;

    return message.reply(
`✅ Reward Selected

Reward: **${REWARDS[key].name}**
Invites Required: **${REWARDS[key].invites}**

Please run **-rmi** to continue.

—
🤖 Nitin Rewards Bot`
    );
  }

// =====================================================
// 🔐 RMI
// =====================================================

  if (state && message.content.toLowerCase() === "-rmi") {
    state.rmi = true;
    return message.reply(
`🔐 Verification Successful

Type **DONE** to receive your reward.

—
🤖 Nitin Rewards Bot`
    );
  }

// =====================================================
// 💸 DONE → PAYOUT
// =====================================================

  if (state && message.content.toLowerCase() === "done" && state.rmi) {
    const db = loadInvites();
    const reward = REWARDS[state.rewardKey];

    const available = db[state.userId].total - db[state.userId].used;
    if (available < reward.invites)
      return message.reply("❌ Not enough invites remaining.");

    const file = getStockFile(state.rewardKey);
    if (!fs.existsSync(file)) return message.reply("❌ Stock empty.");

    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    if (!lines.length) return message.reply("❌ Stock empty.");

    const item = lines.shift();
    fs.writeFileSync(file, lines.join("\n") + "\n");

    db[state.userId].used += reward.invites;
    saveInvites(db);

    const user = await client.users.fetch(state.userId);
    await user.send(
`🎁 Your Reward

${reward.name}

||${item}||

—
🤖 Nitin Rewards Bot`
    );

    log("REWARD", `${state.userId} → ${state.rewardKey} → ${item}`);

    await message.channel.send(
`✅ Reward Delivered Successfully

Please vouch the owners:
<@${OWNERS[0]}> <@${OWNERS[1]}>

This ticket will close automatically.

—
🤖 Nitin Rewards Bot`
    );

    setTimeout(() => {
      message.channel.delete().catch(() => {});
    }, 5 * 60 * 1000);
  }
});

// =====================================================
// 🚀 LOGIN
// =====================================================

client.login(process.env.TOKEN);

// =====================================================
// 🧹 AUTO CLOSE + CONSOLE PATCH (LAST-ME-ADD)
// =====================================================

// ---------- FORCE CONSOLE LOG ----------
global.forceLog = function (tag, msg) {
  try {
    process.stdout.write(
      `[${new Date().toISOString()}] ${tag} :: ${msg}\n`
    );
  } catch {}
};

// test log (run hote hi dikhna chahiye)
forceLog("SYSTEM", "Force console logging active");

// ---------- SAFE AUTO CLOSE ----------
async function safeAutoClose(channel, reason = "Ticket closed", delayMs = 5 * 60 * 1000) {
  try {
    if (!channel || !channel.guild) {
      forceLog("AUTO_CLOSE", "Invalid channel");
      return;
    }

    const me = channel.guild.members.me;
    if (!me) {
      forceLog("AUTO_CLOSE", "Bot member not found");
      return;
    }

    const perms = channel.permissionsFor(me);
    if (!perms || !perms.has("ManageChannels")) {
      forceLog("AUTO_CLOSE", "Missing ManageChannels permission");
      return;
    }

    forceLog("AUTO_CLOSE", `Scheduled close for ${channel.id} in ${delayMs}ms`);

    setTimeout(async () => {
      try {
        if (!channel.deletable) {
          forceLog("AUTO_CLOSE", "Channel not deletable");
          return;
        }
        await channel.delete(reason);
        forceLog("AUTO_CLOSE", `Channel ${channel.id} deleted`);
      } catch (err) {
        forceLog("AUTO_CLOSE_ERROR", err.message);
      }
    }, delayMs);

  } catch (err) {
    forceLog("AUTO_CLOSE_ERROR", err.message);
  }
}

// ---------- AUTO CLOSE AFTER REWARD OR 0 INVITES ----------
client.on("messageCreate", async (message) => {
  if (!message.guild) return;

  const state = ticketState.get(message.channel.id);
  if (!state) return;

  // close after reward
  if (state.completed && !state._autoCloseSet) {
    state._autoCloseSet = true;
    forceLog("AUTO_CLOSE", "Reward completed, closing ticket");
    safeAutoClose(message.channel, "Reward completed");
  }

  // close if no invites left
  try {
    const data = loadInvites();
    const userData = data[state.userId];
    if (userData) {
      const available = userData.total - userData.used;
      if (available === 0 && !state._zeroCloseSet) {
        state._zeroCloseSet = true;
        await message.channel.send(
`❌ No Invites Remaining

You have used all available invites.
This ticket will now be closed.

—
🤖 Nitin Rewards Bot`
        );
        forceLog("AUTO_CLOSE", "0 invites remaining, closing ticket");
        safeAutoClose(message.channel, "No invites remaining", 5000);
      }
    }
  } catch (e) {
    forceLog("AUTO_CLOSE_ERROR", e.message);
  }
});
// =====================================================
// 📦 ADD STOCK VIA .TXT FILE (LAST-ME-ADD PATCH)
// =====================================================

client.on("messageCreate", async (message) => {
  if (!message.guild) return;
  if (message.author.bot) return;

  const content = message.content.toLowerCase().trim();

  // only !addstock <reward_key>
  if (!content.startsWith("!addstock")) return;

  // channel check
  if (message.channel.id !== STOCK_CHANNEL_ID) {
    return message.reply("❌ Stock sirf stock channel me add hota hai.");
  }

  // role check
  if (!message.member.roles.cache.has(STOCK_ROLE_ID)) {
    return message.reply("❌ Tumhare paas Stock Role nahi hai.");
  }

  const parts = message.content.split(/\s+/);
  if (parts.length !== 2) {
    return message.reply("❌ Format: !addstock <reward_key> (with .txt file)");
  }

  const rewardKey = parts[1].toLowerCase();
  if (!REWARDS[rewardKey]) {
    return message.reply("❌ Invalid reward key.");
  }

  // attachment check
  if (message.attachments.size !== 1) {
    return message.reply("❌ Ek hi .txt file upload karo.");
  }

  const attachment = message.attachments.first();
  if (!attachment.name.endsWith(".txt")) {
    return message.reply("❌ Sirf .txt file allowed hai.");
  }

  // download file
  let text;
  try {
    const res = await fetch(attachment.url);
    text = await res.text();
  } catch (err) {
    console.log("[ADDSTOCK_FILE] download failed:", err.message);
    return message.reply("❌ File read nahi ho paayi.");
  }

  // parse lines
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return message.reply("❌ File empty hai.");
  }

  // save to stock file
  const stockFile = getStockFile(rewardKey);
  fs.appendFileSync(stockFile, lines.join("\n") + "\n");

  console.log(
    `[STOCK_FILE_ADD] ${message.author.id} added ${lines.length} items to ${rewardKey}`
  );

  return message.reply(
`✅ Stock added successfully.

Reward: **${rewardKey}**
Items added: **${lines.length}**

—
🤖 Nitin Rewards Bot`
  );
});
process.on("unhandledRejection", (reason) => {
  console.log("❌ UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (err) => {
  console.log("❌ UNCAUGHT EXCEPTION:", err);
});
// =====================================================
// 👑 OWNER-ONLY FREE MCFA GIVE COMMAND (PREFIX: N/)
// =====================================================

const OWNER_ID = "1291447772058353684";
const OWNER_PREFIX = "N/";

client.on("messageCreate", async (message) => {
  try {
    if (!message.guild) return;
    if (message.author.bot) return;

    // owner check
    if (message.author.id !== OWNER_ID) return;

    // prefix check
    if (!message.content.startsWith(OWNER_PREFIX)) return;

    const args = message.content.slice(OWNER_PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    // =============================
    // N/give mcfa @user
    // =============================
    if (command === "give") {
      const rewardKey = args.shift()?.toLowerCase();
      const target = message.mentions.users.first();

      if (!rewardKey || !target) {
        return message.reply(
`❌ Invalid Usage

Use:
N/give mcfa @user

—
🤖 Nitin Rewards Bot`
        );
      }

      if (rewardKey !== "mcfa") {
        return message.reply("❌ This command is only enabled for **MCFA**.");
      }

      const stockFile = getStockFile("mcfa");
      if (!fs.existsSync(stockFile)) {
        return message.reply("❌ MCFA stock file not found.");
      }

      const lines = fs.readFileSync(stockFile, "utf8")
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        return message.reply("❌ MCFA stock is empty.");
      }

      // take first account
      const item = lines.shift();
      fs.writeFileSync(stockFile, lines.join("\n") + "\n");

      // DM user
      try {
        await target.send(
`🎁 **MCFA Permanent** (FREE)

||${item}||

This reward was manually granted by the developer.

—
🤖 Nitin Rewards Bot  
Developed & Managed by **Nitin**`
        );
      } catch {
        return message.reply("❌ User DM closed. Cannot deliver MCFA.");
      }

      // confirmation in channel
      await message.reply(
`✅ **MCFA Delivered Successfully**

Recipient: <@${target.id}>
Method: **Manual (Owner Grant)**

—
🤖 Nitin Rewards Bot`
      );

      // console log
      console.log(
        `[OWNER_GIVE] ${message.author.id} gave MCFA to ${target.id} :: ${item}`
      );
    }

  } catch (err) {
    console.log("[OWNER_GIVE_ERROR]", err.message);
  }
});