const Discord = require("discord.js");

module.exports = {
  name: "privatizar",
  description: "Restringe o acesso do ticket apenas para o criador e o cargo da equipe.",
  type: Discord.ApplicationCommandType.ChatInput,

  run: async (client, interaction) => {
    const cargoSuporteId = "1333134192455712981"; 
    const cargoStaffId = "1099361090665717771";    
    const membro = interaction.member;
    const suporteRole = interaction.guild.roles.cache.get(cargoSuporteId);
    const temPermissao = membro.roles.cache.some(role => role.position >= suporteRole.position);

    if (!temPermissao) {
      return interaction.reply({
        content: "❌ Você não tem permissão para usar este comando.",
        ephemeral: true
      });
    }

    const channel = interaction.channel;

    if (!channel.name.startsWith("🎫-")) {
      return interaction.reply({
        content: "❌ Este comando só pode ser usado em canais de ticket (🎫-).",
        ephemeral: true
      });
    }

    const topic = channel.topic;
    const userIdMatch = topic?.match(/\d{17,}/);
    const userId = userIdMatch?.[0];

    if (!userId) {
      return interaction.reply({
        content: "❌ Não foi possível identificar o autor do ticket pela descrição do canal.",
        ephemeral: true
      });
    }

    const ticketAuthor = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!ticketAuthor) {
      return interaction.reply({
        content: "❌ Não foi possível localizar o autor do ticket no servidor.",
        ephemeral: true
      });
    }

    await channel.permissionOverwrites.set([
      {
        id: interaction.guild.roles.everyone,
        deny: [Discord.PermissionFlagsBits.ViewChannel],
      },
      {
        id: ticketAuthor.id,
        allow: [
          Discord.PermissionFlagsBits.ViewChannel,
          Discord.PermissionFlagsBits.SendMessages,
          Discord.PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: cargoStaffId,
        allow: [
          Discord.PermissionFlagsBits.ViewChannel,
          Discord.PermissionFlagsBits.SendMessages,
          Discord.PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ]);

    const embed = new Discord.EmbedBuilder()
      .setColor("Blurple")
      .setDescription(
        `📌 **Este canal foi restrito e está acessível apenas para o cargo <@&${cargoStaffId}> e o autor do ticket.**\n\n` +
        `> Aguarde até que um membro da equipe venha lhe atender. Por favor, evite marcar a staff.\n\n` +
        `🔒 **Privado para:** <@&${cargoStaffId}>`
      )
      .setFooter({ text: "Sistema de Tickets", iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
