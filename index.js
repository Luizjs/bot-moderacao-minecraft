// Feito por luizjs!

const {
  Client,
  GatewayIntentBits,
  Collection,
  InteractionType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Partials
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.slashCommands = new Collection();
require('./handler')(client);
client.login(config.token);

const appealsPath = path.resolve(__dirname, "./json/appeals.json");
let appeals = {};
if (fs.existsSync(appealsPath)) {
  appeals = JSON.parse(fs.readFileSync(appealsPath, "utf8"));
}
function saveAppeals() {
  fs.writeFileSync(appealsPath, JSON.stringify(appeals, null, 2));
}

const reviewingAdmins = {};
const reports = {};
const reportChannelId = '1362153000059015178';
const staffChannelId = '1362152918383333478';

client.on("ready", () => {
  console.log(`🔥 Estou online em ${client.user.username}!`);
});

process.on("unhandledRejection", (reason) => console.log(`🚫 Erro Detectado:\n\n${reason.stack}`));
process.on("uncaughtException", (error) => console.log(`🚫 Erro Detectado:\n\n${error.stack}`));
process.on("uncaughtExceptionMonitor", (error) => console.log(`🚫 Erro Detectado:\n\n${error.stack}`));

client.on("interactionCreate", async (interaction) => {
  if (interaction.type === InteractionType.ApplicationCommand) {
    const cmd = client.slashCommands.get(interaction.commandName);
    if (!cmd) return interaction.reply(`Erro`);
    interaction["member"] = interaction.guild.members.cache.get(interaction.user.id);
    return cmd.run(client, interaction);
  }

  require('./events/config-ticket').execute(interaction);
  require('./events/ticket').execute(interaction);
  require('./events/gerenciar').execute(interaction);

  // Appeal modal
  if (interaction.customId === "appealModal") {
    const userId = interaction.user.id;

    if (appeals[userId]) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription("❌ | Você já possui um appeal em análise. Aguarde até que ele seja avaliado.")
        ],
        flags: 64
      });
    }

    const nick = interaction.fields.getTextInputValue("nick");
    const motivo = interaction.fields.getTextInputValue("motivo");
    const argumento = interaction.fields.getTextInputValue("argumento");
    const provas = interaction.fields.getTextInputValue("provas");

    const targetGuildId = "1334654079548391549";
    const targetChannelId = "1334676280666488832";
    const targetGuild = client.guilds.cache.get(targetGuildId);
    const channel = await targetGuild.channels.fetch(targetChannelId);

    const embed = new EmbedBuilder()
      .setTitle("📥 Novo Appeal")
      .setColor("Orange")
      .addFields(
        { name: "👤 Usuário", value: `<@${userId}>`, inline: true },
        { name: "🎮 Nick", value: nick || "Não informado", inline: true },
        { name: "📌 Motivo do ban", value: motivo || "Não informado" },
        { name: "📝 Argumento", value: argumento || "Não informado" },
        { name: "🎥 Provas", value: provas || "Nenhuma fornecida" }
      )
      .setFooter({ text: `ID do Usuário: ${userId}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`review_appeal_${userId}`)
        .setLabel("📄 Revisar Appeal")
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });

    appeals[userId] = true;
    saveAppeals();

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Green")
          .setDescription("✅ | Seu appeal foi enviado com sucesso! A resposta pode levar até **7 dias úteis**. Mantenha suas DMs abertas para notificações.")
      ],
      flags: 64
    });
  }

  if (interaction.isButton()) {
    const [action, type, userId] = interaction.customId.split("_");

    // Review Appeal
    if (action === "review" && type === "appeal") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: "❌ Você não tem permissão para isso.", flags: 64 });
      }

      if (!reviewingAdmins[userId]) {
        reviewingAdmins[userId] = interaction.user.id;

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`confirm_approve_${userId}`).setLabel("✅ Aprovar Appeal").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`confirm_deny_${userId}`).setLabel("❌ Recusar Appeal").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`cancel_review_${userId}`).setLabel("❌ Cancelar Revisão").setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
          content: `👀 Você iniciou a revisão do appeal de <@${userId}>. Escolha uma ação abaixo:`,
          components: [confirmRow],
          flags: 64
        });
      } else if (reviewingAdmins[userId] !== interaction.user.id) {
        return interaction.reply({
          content: `⚠️ Este appeal já está sendo revisado por <@${reviewingAdmins[userId]}>.`,
          flags: 64
        });
      }
    }

    if (interaction.customId.startsWith("confirm_approve_") || interaction.customId.startsWith("confirm_deny_")) {
      const userId = interaction.customId.split("_")[2];
      const isApproval = interaction.customId.includes("approve");

      const appealMessage = await interaction.channel.messages.fetch(interaction.message.reference.messageId).catch(() => null);
      if (!appealMessage) return interaction.reply({ content: "❌ Não foi possível encontrar a mensagem original do appeal.", flags: 64 });

      const originalEmbed = appealMessage.embeds[0];
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setTitle("📌 Appeal Resolvido")
        .setColor(isApproval ? 0x57F287 : 0xED4245)
        .spliceFields(originalEmbed.fields.length - 1, 1)
        .addFields(
          { name: "🛡️ Status", value: isApproval ? "✅ Appeal aprovado" : "❌ Appeal recusado", inline: true },
          { name: "👮 Staff responsável", value: `<@${interaction.user.id}>`, inline: true }
        );

      await appealMessage.edit({ embeds: [updatedEmbed], components: [] });

      try {
        const user = await client.users.fetch(userId);
        await user.send(
          isApproval
            ? `✅ Olá <@${userId}>, seu appeal foi **aprovado**! Você pode voltar a jogar .`
            : `❌ Olá <@${userId}>, seu appeal foi **recusado**. Se desejar, pode adquirir unban`
        );
      } catch (err) {
        console.error(`❌ Não foi possível enviar DM para ${userId}`);
      }

      await interaction.update({
        content: `📌 Appeal de <@${userId}> ${isApproval ? "aprovado ✅" : "recusado ❌"} por <@${interaction.user.id}>.`,
        embeds: [],
        components: []
      });

      if (isApproval) {
        await interaction.followUp({
          content: `🔔 **Lembrete:** Desbanir o nick **${originalEmbed.fields.find(f => f.name === "🎮 Nick")?.value}** no servidor.`,
          flags: 64
        });
      }

      delete appeals[userId];
      delete reviewingAdmins[userId];
      saveAppeals();
    }

    if (interaction.customId.startsWith("cancel_review_")) {
      const userId = interaction.customId.split("_")[2];

      if (reviewingAdmins[userId] !== interaction.user.id) {
        return interaction.reply({ content: "❌ Apenas quem iniciou a revisão pode cancelá-la.", flags: 64 });
      }

      delete reviewingAdmins[userId];
      return interaction.reply({
        content: "✅ Revisão cancelada. O appeal voltou a estar disponível para análise.",
        flags: 64
      });
    }

    // Denúncia (aceitar ou recusar via modal)
    if (["aceitar", "recusar"].includes(action)) {
      const modal = new ModalBuilder()
        .setCustomId(`resposta_${action}_${type}`)
        .setTitle(action === "aceitar" ? "✅ Aceitar Denúncia" : "❌ Recusar Denúncia")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('motivo')
              .setLabel('Informe o motivo da decisão')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );
      await interaction.showModal(modal);
    }
  }

  // Resposta à denúncia via modal
  if (interaction.isModalSubmit()) {
    const [_, acao, reportId] = interaction.customId.split("_");
    const motivo = interaction.fields.getTextInputValue("motivo");
    const report = reports[reportId];

    if (!report) {
      return interaction.reply({ content: '❌ Denúncia não encontrada.', ephemeral: true });
    }

    const embedFinal = new EmbedBuilder()
  .setTitle(acao === 'aceitar' ? '✅ Denúncia Aprovada' : '❌ Denúncia Recusada')
  .setColor(acao === 'aceitar' ? 0x57F287 : 0xED4245)
  .addFields(
    { name: '👤 Autor da denúncia', value: `<@${report.autorId}>`, inline: true },
    { name: '👮 Staff responsável', value: `<@${interaction.user.id}>`, inline: true },
    { name: '🧑 Usuário denunciado', value: `${report.denunciado || 'Não informado'}`, inline: true },
    { name: '📝 Motivo da denúncia', value: `${report.motivo || 'Não informado'}` },
    { name: '📄 Provas', value: `${report.provas || 'Nenhuma prova fornecida.'}` },
    { name: '📌 Status', value: acao === 'aceitar' ? '✅ Denúncia aceita' : '❌ Denúncia recusada' }
  )
  .setFooter({ text: `ID do autor: ${report.autorId}` })
  .setTimestamp();

    const staffChannel = await interaction.guild.channels.fetch(staffChannelId);
    const staffMsg = await staffChannel.messages.fetch(report.staffMessageId);
    await staffMsg.edit({ embeds: [embedFinal], components: [] });

    try {
      const user = await client.users.fetch(report.autorId);
      await user.send(
        acao === 'aceitar'
          ? '✅ Sua denúncia foi **aceita**! Obrigado por ajudar a manter o servidor seguro.'
          : `❌ Sua denúncia foi **recusada**. Motivo: ${motivo}`
      );
    } catch (err) {
      console.error(`❌ Não foi possível enviar DM para o autor da denúncia (${report.autorId})`);
    }

    await interaction.reply({
      content: `✅ Denúncia ${acao === 'aceitar' ? 'aceita' : 'recusada'} com sucesso.`,
      ephemeral: true,
    });

    delete reports[reportId];
  }
});

client.on('messageCreate', async (message) => {
  const reportChannelId = '1362153000059015178'; // Certifique-se de manter o ID correto
  if (message.author.bot || message.channel.id !== reportChannelId) return;

  const content = message.content;

  // Expressões para extrair dados da denúncia
  const nickMatch = content.match(/Nick do jogador acusado:\s*(.+)/i);
  const provasMatch = content.match(/Provas:\s*(.+)/i);
  const printsMatch = content.match(/Prints:\s*(.+)/i);
  const videosMatch = content.match(/Vídeos:\s*(.+)/i);
  const descricaoMatch = content.match(/Descrição adicional:\s*(.+)/i);

  // Se for uma denúncia válida
  if (nickMatch && provasMatch && printsMatch && videosMatch && descricaoMatch) {
    const denunciado = nickMatch[1].trim();
    const provas = `📷 Prints: ${printsMatch[1].trim()}\n🎥 Vídeos: ${videosMatch[1].trim()}`;
    const motivo = descricaoMatch[1].trim();

    const staffChannel = await client.channels.fetch(staffChannelId);
    await message.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setTitle('🚨 Nova Denúncia Recebida')
      .setDescription(`📨 Enviada por: <@${message.author.id}>\n\n📋 Conteúdo:\n${content.slice(0, 4000)}`)
      .setColor('Red')
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aceitar_${message.id}`).setLabel('✅ Aceitar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`recusar_${message.id}`).setLabel('❌ Recusar').setStyle(ButtonStyle.Danger)
    );

    const sentMsg = await staffChannel.send({ embeds: [embed], components: [buttons] });

    reports[message.id] = {
      autorId: message.author.id,
      originalMessageUrl: message.url,
      staffMessageId: sentMsg.id,
      denunciado,
      motivo,
      provas
    };

    try {
      await message.author.send('✅ Sua denúncia foi recebida com sucesso e está sendo analisada pela nossa equipe.');
    } catch (err) {
      console.error(`❌ Não foi possível enviar DM para ${message.author.tag}`);
    }
  } else {
    // Se a mensagem NÃO for uma denúncia válida
    await message.delete().catch(() => {});
    try {
      await message.author.send(
        '⚠️ Sua mensagem foi removida do canal de denúncias pois não segue o formato correto.\n\nPor favor, siga este modelo:\n\n' +
        '**Nick do jogador acusado:**\n' +
        '**Provas:**\n' +
        '**Prints:**\n' +
        '**Vídeos:**\n' +
        '**Descrição adicional:**'
      );
    } catch (err) {
      console.error(`❌ Não foi possível enviar DM para ${message.author.tag}`);
    }
  }
});

// Quaisquer duvida, contacte o luiz