const Discord = require("discord.js");

module.exports = {
  name: "appeal",
  description: "Solicite seu appeal no servidor",
  type: Discord.ApplicationCommandType.ChatInput,

  run: async (client, interaction) => {
    const modal = new Discord.ModalBuilder()
      .setCustomId("appealModal")
      .setTitle("Pedido de appeal");

    const nick = new Discord.TextInputBuilder()
      .setCustomId("nick")
      .setLabel("Seu nick no Minecraft")
      .setStyle(Discord.TextInputStyle.Short)
      .setRequired(true);

    const motivo = new Discord.TextInputBuilder()
      .setCustomId("motivo")
      .setLabel("Motivo do ban (se souber)")
      .setStyle(Discord.TextInputStyle.Paragraph)
      .setRequired(false);

    const argumento = new Discord.TextInputBuilder()
      .setCustomId("argumento")
      .setLabel("Por que você deve ser desbanido?")
      .setStyle(Discord.TextInputStyle.Paragraph)
      .setRequired(true);

    const prova = new Discord.TextInputBuilder()
      .setCustomId("provas")
      .setLabel("Você tem vídeo do ocorrido? (link opcional)")
      .setStyle(Discord.TextInputStyle.Short)
      .setRequired(false);

    const row1 = new Discord.ActionRowBuilder().addComponents(nick);
    const row2 = new Discord.ActionRowBuilder().addComponents(motivo);
    const row3 = new Discord.ActionRowBuilder().addComponents(argumento);
    const row4 = new Discord.ActionRowBuilder().addComponents(prova);

    modal.addComponents(row1, row2, row3, row4);
    await interaction.showModal(modal);
  },
};
