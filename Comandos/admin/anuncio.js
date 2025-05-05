const { ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, ComponentType } = require("discord.js");

module.exports = {
  name: "anuncio",
  description: "Crie um anúncio interativo",
  type: ApplicationCommandType.ChatInput,

  run: async (client, interaction) => {
    const coresDisponiveis = {
      vermelho: "#ff0000",
      verde: "#00ff00",
      azul: "#0000ff",
      amarelo: "#ffff00",
      laranja: "#ffa500",
      roxo: "#800080",
      rosa: "#ffc0cb",
      branco: "#ffffff",
      preto: "#000000",
      cinza: "#808080",
      ciano: "#00ffff",
      marrom: "#8B4513",
      dourado: "#FFD700"
    };

    const validarHex = (cor) => /^#?[0-9A-F]{6}$/i.test(cor);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("embed").setLabel("Embed").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("normal").setLabel("Mensagem Normal").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ content: "📢 Que tipo de anúncio deseja fazer?", components: [row], ephemeral: true });

    const tipoInteracao = await interaction.channel.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: i => i.user.id === interaction.user.id,
      time: 60000
    });

    const tipo = tipoInteracao.customId;
    await tipoInteracao.update({ content: `📝 Tipo escolhido: ${tipo === "embed" ? "Embed" : "Mensagem Normal"}`, components: [] });

    const perguntar = async (pergunta, deletar = true) => {
      await interaction.followUp({ content: pergunta, ephemeral: true });
      const collected = await interaction.channel.awaitMessages({
        filter: m => m.author.id === interaction.user.id,
        max: 1,
        time: 120000,
        errors: ["time"]
      });
      if (deletar) await collected.first().delete();
      return collected.first();
    };

    const canais = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
    const options = canais.map(c => ({ label: c.name, value: c.id })).slice(0, 25);
    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId("canal_select").setPlaceholder("Escolha o canal de destino").addOptions(options)
    );

    await interaction.followUp({ content: "📍 Escolha o canal onde o anúncio será enviado:", components: [menu], ephemeral: true });
    const canalSelecionado = await interaction.channel.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === interaction.user.id,
      time: 60000
    });

    const canal = interaction.guild.channels.cache.get(canalSelecionado.values[0]);

    if (tipo === "normal") {
      await interaction.followUp({ content: "✏️ Envie a mensagem completa que será enviada (você pode anexar imagens ou enviar links):", ephemeral: true });
      const collected = await interaction.channel.awaitMessages({
        filter: m => m.author.id === interaction.user.id,
        max: 1,
        time: 120000,
        errors: ["time"]
      });

      const msg = collected.first();
      const texto = msg.content?.trim() || null;
      const anexos = msg.attachments.map(file => file.url);
      const regexImagem = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/gi;
      const imagensLink = [...(msg.content.matchAll?.(regexImagem) || [])].map(m => m[0]);
      const imagens = [...anexos, ...imagensLink];

      if (!texto && imagens.length === 0) {
        return interaction.followUp({ content: "❌ Não foi possível enviar a mensagem. Certifique-se de incluir texto ou imagem válida.", ephemeral: true });
      }

      const mensagemData = {};
      if (texto) mensagemData.content = texto;
      if (imagens.length > 0) mensagemData.files = imagens;

      await canal.send(mensagemData);
      return interaction.followUp({ content: "✅ Anúncio enviado com sucesso!", ephemeral: true });
    }

    const tituloMsg = await perguntar("✏️ Envie o título da embed:");
    const titulo = tituloMsg.content;
    const descricaoMsg = await perguntar("📝 Agora envie a descrição da embed:");
    const descricao = descricaoMsg.content;
    const thumbnailMsg = await perguntar("🖼️ Envie a URL da thumbnail (ou digite `pular`):");
    const thumbnail = thumbnailMsg.content;
    const imagemMsg = await perguntar("🖼️ Envie a URL da imagem principal (ou digite `pular`):");
    const imagem = imagemMsg.content;
    const footerMsg = await perguntar("📌 Envie o texto do rodapé (ou digite `pular`):");
    const footer = footerMsg.content;
    const footerIconMsg = await perguntar("🖼️ Envie a URL da imagem do rodapé (ou digite `pular`):");
    const footerIcon = footerIconMsg.content;

    await interaction.followUp({
      content: "🎨 Escolha a cor da embed digitando um dos nomes abaixo ou um código HEX (ex: `#ff0000`):\n\n`vermelho`, `verde`, `azul`, `amarelo`, `laranja`, `roxo`, `rosa`, `branco`, `preto`, `cinza`, `ciano`, `marrom`, `dourado`",
      ephemeral: true
    });
    const corInputMsg = await perguntar("🧾 Digite a cor da embed:");
    let corFinal = corInputMsg.content.toLowerCase();

    if (coresDisponiveis[corFinal]) {
      corFinal = coresDisponiveis[corFinal];
    } else if (validarHex(corFinal)) {
      if (!corFinal.startsWith("#")) corFinal = `#${corFinal}`;
    } else {
      return interaction.followUp({ content: "❌ Cor inválida! Use um nome válido ou um código hexadecimal.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(titulo)
      .setDescription(descricao)
      .setColor(corFinal)

    if (thumbnail.toLowerCase() !== "pular") embed.setThumbnail(thumbnail);
    if (imagem.toLowerCase() !== "pular") embed.setImage(imagem);
    if (footer.toLowerCase() !== "pular") {
      embed.setFooter({ text: footer, iconURL: footerIcon.toLowerCase() !== "pular" ? footerIcon : null });
    }

    await canal.send({ embeds: [embed] });
    return interaction.followUp({ content: "✅ Anúncio enviado com sucesso!", ephemeral: true });
  },
};
