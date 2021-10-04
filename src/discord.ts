import { Client, Intents, MessageEmbed, Permissions } from 'discord.js';
import db from './mysql';
import { loadSubscriptions } from './subscriptions';

const token = process.env.DISCORD_TOKEN;
const client: any = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES]
});
export let ready = false;
// const invite = 'https://discord.com/oauth2/authorize?client_id=892847850780762122&permissions=536602999889&scope=bot';

client.login(token);

export const setActivity = (message, url?) => {
  try {
    client.user.setActivity(message, { type: 'WATCHING', url });
    return true;
  } catch (e) {
    console.log('Missing activity', e);
  }
};

client.on('ready', async () => {
  ready = true;
  console.log(`Discord bot logged as "${client.user.tag}"`);
  setActivity('!');
  await loadSubscriptions();
});

client.on('messageCreate', async msg => {
  const guild = msg.guild.id;

  if (msg.author.bot) return;

  if (msg.content === '!ping') msg.reply('Pong?');

  if (msg.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
    const [id, command, channel, space, mention] = msg.content.split(' ');

    if (id === '$snapshot') {
      const channelId = (channel || '').replace('<#', '').replace('>', '');

      if (['add', 'update'].includes(command)) {
        const subscription = [guild, channelId, space, mention || ''];
        await db.queryAsync(
          `
          INSERT INTO subscriptions (guild, channel, space, mention) VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE guild = ?, channel = ?, space = ?, mention = ?
        `,
          [...subscription, ...subscription]
        );
        await loadSubscriptions();
        const color = '#21B66F';
        const embed = new MessageEmbed()
          .setColor(color)
          .addFields(
            { name: 'Space', value: space, inline: true },
            { name: 'Channel', value: channel, inline: true },
            { name: 'Mention', value: mention || 'None', inline: true }
          )
          .setDescription('You have successfully subscribed to space events.');
        msg.reply({ embeds: [embed] });
      } else if (command === 'remove') {
        const query = `DELETE FROM subscriptions WHERE guild = ? AND channel = ? AND space = ?`;
        await db.queryAsync(query, [guild, channelId, space]);
        await loadSubscriptions();
        const color = '#EE4145';
        const embed = new MessageEmbed()
          .setColor(color)
          .addFields({ name: 'Space', value: space, inline: true }, { name: 'Channel', value: channel, inline: true })
          .setDescription('You have successfully unsubscribed to space events.');
        msg.reply({ embeds: [embed] });
      } else {
        const embed = new MessageEmbed().addFields(
          { name: 'Subscribe', value: '$snapshot add <channel> <space> <mention?>' },
          { name: 'Unsubscribe', value: '$snapshot remove <channel> <space> <mention?>' }
        );
        msg.reply({ embeds: [embed] });
      }
    }
  }
});

export const sendMessage = (channel, message) => {
  try {
    const speaker = client.channels.cache.get(channel);
    speaker.send(message);
    return true;
  } catch (e) {
    console.log('Missing', e);
  }
};

export default client;
