const Discord = require("discord.js");
const fs = require("fs");
const path = require("path");

const horariosPath = path.resolve(__dirname, "../../json/horarios_champ.json");

module.exports = {
  name: "champ",
  description: "Veja ou edite os horários do evento Champion",
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "ver",
      description: "Veja os horários do evento",
      type: Discord.ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "adicionar",
      description: "Adicione um novo horário",
      type: Discord.ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "horario",
          description: "Ex: 20:00",
          type: Discord.ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "modo",
          description: "Modo de jogo (ex: Solo, Dupla, Trio)",
          type: Discord.ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "remover",
      description: "Remova um horário",
      type: Discord.ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "horario",
          description: "Horário para remover (ex: 20:00)",
          type: Discord.ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],

  run: async (client, interaction) => {
    const sub = interaction.options.getSubcommand();

    // Bloqueia subcomandos sensíveis para não-admins
    if (["adicionar", "remover"].includes(sub)) {
      if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: "❌ Apenas administradores podem usar este comando.",
          ephemeral: true,
        });
      }
    }

    let horarios = [];
    try {
      horarios = JSON.parse(fs.readFileSync(horariosPath, "utf8"));
    } catch (e) {
      horarios = [];
    }

    const salvarHorarios = () => {
      horarios.sort((a, b) => {
        const [h1, m1] = a.horario.split(":").map(Number);
        const [h2, m2] = b.horario.split(":").map(Number);
        return h1 * 60 + m1 - (h2 * 60 + m2);
      });
      fs.writeFileSync(horariosPath, JSON.stringify(horarios, null, 2));
    };

    if (sub === "ver") {
      const agora = new Date();
      const horaBrasilia = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const horaAtual = horaBrasilia.getHours();
      const minutoAtual = horaBrasilia.getMinutes();

      let eventoAtivo = null;
      let listaHorarios = "";

      for (const h of horarios) {
        const [hH, hM] = h.horario.split(":").map(Number);
        const minutosDoEvento = hH * 60 + hM;
        const minutosAgora = horaAtual * 60 + minutoAtual;

        listaHorarios += `🕐 ${h.horario} - ${h.modo}\n`;

        if (Math.abs(minutosAgora - minutosDoEvento) <= 5) {
          eventoAtivo = h;
        }
      }

      const embed = new Discord.EmbedBuilder()
        .setTitle("🏆 Evento Champ")
        .setColor("Gold")
        .setDescription(`📅 **Horários dos eventos:**\n${listaHorarios.trim()}`);

      if (eventoAtivo) {
        embed.addFields({
          name: "🟢 O evento está acontecendo agora!",
          value: `🎮 Modo: **${eventoAtivo.modo}**`,
        });
        embed.setFooter({ text: "Conecte-se: example.com.br" });
      }

      await interaction.reply({
        embeds: [embed],
        ephemeral: false,
      });
    }

    if (sub === "adicionar") {
      const horario = interaction.options.getString("horario");
      const modo = interaction.options.getString("modo");

      horarios.push({ horario, modo });
      salvarHorarios();

      await interaction.reply({
        content: `✅ Horário ${horario} (${modo}) adicionado com sucesso.`,
        ephemeral: true,
      });
    }

    if (sub === "remover") {
      const horarioRemover = interaction.options.getString("horario");
      const antes = horarios.length;

      horarios = horarios.filter((h) => h.horario !== horarioRemover);

      if (horarios.length === antes) {
        return interaction.reply({
          content: `⚠️ Horário ${horarioRemover} não encontrado.`,
          ephemeral: true,
        });
      }

      salvarHorarios();
      await interaction.reply({
        content: `✅ Horário ${horarioRemover} removido com sucesso.`,
        ephemeral: true,
      });
    }
  },
};
