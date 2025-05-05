const Discord = require("discord.js");

module.exports = {
  name: "ip",
  description: "Veja o IP do servidor!",
  type: Discord.ApplicationCommandType.ChatInput,

  run: async (client, interaction) => {
    const embed = new Discord.EmbedBuilder()
      .setTitle("🔗 IP do Servidor")
      .setDescription("🎮 Nosso IP é: `example.com.br`\n📌 Copie e cole no seu jogo para entrar!")
      .setColor("Blue")
      .setFooter({ text: `Pedido por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    interaction.reply({ embeds: [embed], ephemeral: true }); // se quiser privado, coloque "ephemeral: true"
  }
}
