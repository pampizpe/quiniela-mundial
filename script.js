const $ = (id) => document.getElementById(id);

const defaultPlayers = [
  "Christopher Villaneda","Marlon Aldaz","Yasibit","Adriana Peña","Diego Peña",
  "Grissel","Camila","Vicky","Junior","Pamela Pizarro","William",
  "Miguel Rodríguez","Andre Heredia","Miguel Ospina"
];

function teams() {
  return {
    home: $("localTeam").value.trim() || "Local",
    away: $("awayTeam").value.trim() || "Visitante"
  };
}

function teamOptions(includeNone = false) {
  const t = teams();
  return `
    <option value="home">${t.home}</option>
    <option value="away">${t.away}</option>
    ${includeNone ? '<option value="none">Ninguno (0-0)</option>' : ''}
  `;
}

function refreshTeamOptions() {
  const realQualified = $("realQualified").value;
  const realFirstGoal = $("realFirstGoal").value;

  $("realQualified").innerHTML = teamOptions(false);
  $("realFirstGoal").innerHTML = teamOptions(true);

  if (realQualified) $("realQualified").value = realQualified;
  if (realFirstGoal) $("realFirstGoal").value = realFirstGoal;

  document.querySelectorAll(".pred-qualified").forEach((select) => {
    const current = select.value;
    select.innerHTML = teamOptions(false);
    if (current) select.value = current;
  });

  document.querySelectorAll(".pred-first-goal").forEach((select) => {
    const current = select.value;
    select.innerHTML = teamOptions(true);
    if (current) select.value = current;
  });
}

function addPlayer(data = {}) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td class="rank">—</td>
    <td><input class="player-name" value="${escapeHtml(data.name || "")}" placeholder="Nombre"></td>
    <td><input class="previous-points small-number" type="number" value="${data.previous ?? 0}"></td>
    <td><select class="pred-qualified">${teamOptions(false)}</select></td>
    <td>
      <select class="pred-result">
        <option value="home">Gana local</option>
        <option value="draw">Empate</option>
        <option value="away">Gana visitante</option>
      </select>
    </td>
    <td><input class="pred-home-goals small-number" type="number" min="0" value="${data.homeGoals ?? 0}"></td>
    <td><input class="pred-away-goals small-number" type="number" min="0" value="${data.awayGoals ?? 0}"></td>
    <td>
      <select class="pred-penalty">
        <option value="no">No</option>
        <option value="yes">Sí</option>
      </select>
    </td>
    <td><select class="pred-first-goal">${teamOptions(true)}</select></td>
    <td>
      <select class="pred-total">
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4+">4 o más</option>
      </select>
    </td>
    <td class="points">0</td>
    <td class="total">0</td>
    <td><button class="btn secondary detail-btn">Ver</button></td>
    <td><button class="btn danger remove-btn">X</button></td>
  `;

  $("playersBody").appendChild(tr);

  if (data.qualified) tr.querySelector(".pred-qualified").value = data.qualified;
  if (data.result) tr.querySelector(".pred-result").value = data.result;
  if (data.penalty) tr.querySelector(".pred-penalty").value = data.penalty;
  if (data.firstGoal) tr.querySelector(".pred-first-goal").value = data.firstGoal;
  if (data.totalGoals !== undefined) tr.querySelector(".pred-total").value = String(data.totalGoals);

  tr.querySelector(".detail-btn").addEventListener("click", () => showDetail(tr));
  tr.querySelector(".remove-btn").addEventListener("click", () => {
    tr.remove();
    updateSummary();
  });

  updateSummary();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[char]);
}

function result90(homeGoals, awayGoals) {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

function actualResult() {
  const homeGoals = Math.max(0, Number($("realHomeGoals").value || 0));
  const awayGoals = Math.max(0, Number($("realAwayGoals").value || 0));
  const total = homeGoals + awayGoals;

  return {
    homeGoals,
    awayGoals,
    result: result90(homeGoals, awayGoals),
    total: total >= 4 ? "4+" : String(total),
    qualified: $("realQualified").value,
    penalty: $("realPenalty").value,
    firstGoal: homeGoals === 0 && awayGoals === 0 ? "none" : $("realFirstGoal").value
  };
}

function evaluateRow(tr) {
  const real = actualResult();

  const items = [
    {
      name: "Equipo que clasifica",
      correct: tr.querySelector(".pred-qualified").value === real.qualified,
      win: 6, lose: -4
    },
    {
      name: "Resultado en 90 minutos",
      correct: tr.querySelector(".pred-result").value === real.result,
      win: 4, lose: -2
    },
    {
      name: "Marcador exacto",
      correct:
        Number(tr.querySelector(".pred-home-goals").value || 0) === real.homeGoals &&
        Number(tr.querySelector(".pred-away-goals").value || 0) === real.awayGoals,
      win: 8, lose: 0
    },
    {
      name: "¿Hubo penal?",
      correct: tr.querySelector(".pred-penalty").value === real.penalty,
      win: 3, lose: -2
    },
    {
      name: "Equipo que anotó primero",
      correct: tr.querySelector(".pred-first-goal").value === real.firstGoal,
      win: 2, lose: -1
    },
    {
      name: "Total de goles",
      correct: tr.querySelector(".pred-total").value === real.total,
      win: 3, lose: -1
    }
  ];

  items.forEach((item) => item.points = item.correct ? item.win : item.lose);

  return {
    items,
    points: items.reduce((sum, item) => sum + item.points, 0)
  };
}

function calculateAll() {
  const rows = [...document.querySelectorAll("#playersBody tr")];

  rows.forEach((tr) => {
    const evaluation = evaluateRow(tr);
    const previous = Number(tr.querySelector(".previous-points").value || 0);
    const pointsCell = tr.querySelector(".points");
    const totalCell = tr.querySelector(".total");

    pointsCell.textContent = evaluation.points;
    pointsCell.className = `points ${evaluation.points >= 0 ? "positive" : "negative"}`;
    totalCell.textContent = previous + evaluation.points;
  });

  rows.sort((a, b) =>
    Number(b.querySelector(".total").textContent || 0) -
    Number(a.querySelector(".total").textContent || 0)
  );

  rows.forEach((tr, index) => {
    $("playersBody").appendChild(tr);
    tr.querySelector(".rank").textContent =
      index === 0 ? "🥇 1" :
      index === 1 ? "🥈 2" :
      index === 2 ? "🥉 3" : index + 1;
  });

  updateSummary();
  saveData();
}

function updateSummary() {
  const rows = [...document.querySelectorAll("#playersBody tr")];
  $("playerCount").textContent = rows.length;

  if (!rows.length) {
    $("leaderName").textContent = "—";
    $("maxMatch").textContent = "0";
    $("minMatch").textContent = "0";
    return;
  }

  const matchPoints = rows.map((tr) => Number(tr.querySelector(".points").textContent || 0));
  $("maxMatch").textContent = Math.max(...matchPoints);
  $("minMatch").textContent = Math.min(...matchPoints);

  const sorted = [...rows].sort((a, b) =>
    Number(b.querySelector(".total").textContent || 0) -
    Number(a.querySelector(".total").textContent || 0)
  );

  $("leaderName").textContent = sorted[0].querySelector(".player-name").value || "—";
}

function showDetail(tr) {
  const evaluation = evaluateRow(tr);
  const name = tr.querySelector(".player-name").value || "Jugador";

  $("detailTitle").textContent = `${name} — ${evaluation.points} puntos`;
  $("detailBody").innerHTML = evaluation.items.map((item) => `
    <div class="detail-row">
      <span>${item.correct ? "✅" : "❌"} ${item.name}</span>
      <strong class="${item.correct ? "ok" : "bad"}">
        ${item.points > 0 ? "+" : ""}${item.points}
      </strong>
    </div>
  `).join("");

  $("detailModal").classList.add("open");
}

function closeModal() {
  $("detailModal").classList.remove("open");
}

function carryTotalsForward() {
  calculateAll();

  if (!confirm("Esto copiará el total acumulado a puntos anteriores y dejará el puntaje del partido en cero. ¿Continuar?")) return;

  document.querySelectorAll("#playersBody tr").forEach((tr) => {
    const total = Number(tr.querySelector(".total").textContent || 0);
    tr.querySelector(".previous-points").value = total;
    tr.querySelector(".points").textContent = "0";
    tr.querySelector(".points").className = "points";
    tr.querySelector(".total").textContent = total;
    tr.querySelector(".rank").textContent = "—";
  });

  updateSummary();
  saveData();
}

function saveData() {
  const rows = [...document.querySelectorAll("#playersBody tr")];

  const data = {
    local: $("localTeam").value,
    away: $("awayTeam").value,
    real: {
      qualified: $("realQualified").value,
      homeGoals: $("realHomeGoals").value,
      awayGoals: $("realAwayGoals").value,
      penalty: $("realPenalty").value,
      firstGoal: $("realFirstGoal").value
    },
    players: rows.map((tr) => ({
      name: tr.querySelector(".player-name").value,
      previous: tr.querySelector(".previous-points").value,
      qualified: tr.querySelector(".pred-qualified").value,
      result: tr.querySelector(".pred-result").value,
      homeGoals: tr.querySelector(".pred-home-goals").value,
      awayGoals: tr.querySelector(".pred-away-goals").value,
      penalty: tr.querySelector(".pred-penalty").value,
      firstGoal: tr.querySelector(".pred-first-goal").value,
      totalGoals: tr.querySelector(".pred-total").value
    }))
  };

  localStorage.setItem("quiniela_mundial_v3", JSON.stringify(data));
}

function loadData() {
  const raw = localStorage.getItem("quiniela_mundial_v3");

  if (!raw) {
    defaultPlayers.forEach((name) => addPlayer({ name }));
    return;
  }

  try {
    const data = JSON.parse(raw);

    $("localTeam").value = data.local || "España";
    $("awayTeam").value = data.away || "Francia";
    refreshTeamOptions();

    $("realQualified").value = data.real?.qualified || "home";
    $("realHomeGoals").value = data.real?.homeGoals || 0;
    $("realAwayGoals").value = data.real?.awayGoals || 0;
    $("realPenalty").value = data.real?.penalty || "no";
    $("realFirstGoal").value = data.real?.firstGoal || "none";

    $("playersBody").innerHTML = "";
    (data.players || []).forEach(addPlayer);
  } catch (error) {
    console.error(error);
    defaultPlayers.forEach((name) => addPlayer({ name }));
  }
}

function clearAll() {
  if (!confirm("¿Seguro que quieres borrar todos los datos guardados?")) return;

  localStorage.removeItem("quiniela_mundial_v3");
  $("playersBody").innerHTML = "";
  defaultPlayers.forEach((name) => addPlayer({ name }));
  updateSummary();
}

function teamLabel(value) {
  const t = teams();
  if (value === "home") return t.home;
  if (value === "away") return t.away;
  return "Ninguno";
}

function resultLabel(value) {
  if (value === "home") return `Gana ${teams().home}`;
  if (value === "away") return `Gana ${teams().away}`;
  return "Empate";
}

function exportExcel() {
  calculateAll();

  const rows = [...document.querySelectorAll("#playersBody tr")].map((tr, index) => ({
    Posición: index + 1,
    Jugador: tr.querySelector(".player-name").value,
    "Puntos anteriores": Number(tr.querySelector(".previous-points").value || 0),
    Clasifica: teamLabel(tr.querySelector(".pred-qualified").value),
    "Resultado 90'": resultLabel(tr.querySelector(".pred-result").value),
    Marcador: `${tr.querySelector(".pred-home-goals").value}-${tr.querySelector(".pred-away-goals").value}`,
    Penal: tr.querySelector(".pred-penalty").value === "yes" ? "Sí" : "No",
    "Primer gol": teamLabel(tr.querySelector(".pred-first-goal").value),
    "Total goles": tr.querySelector(".pred-total").value,
    "Puntos partido": Number(tr.querySelector(".points").textContent || 0),
    "Total acumulado": Number(tr.querySelector(".total").textContent || 0)
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ranking");
  XLSX.writeFile(workbook, "ranking_quiniela.xlsx");
}

function importExcel(file) {
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const workbook = XLSX.read(event.target.result, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!data.length) throw new Error("Archivo vacío");

      $("playersBody").innerHTML = "";

      data.forEach((row) => {
        const name =
          row.Jugador || row.jugador || row.Nombre || row.nombre ||
          row.Participante || row.participante || "";

        const previous =
          row["Puntos anteriores"] ?? row.Puntos_anteriores ??
          row.Puntos ?? row.puntos ??
          row.Acumulado ?? row.acumulado ?? 0;

        addPlayer({
          name,
          previous: Number(previous) || 0
        });
      });

      saveData();
      alert("Participantes y puntos anteriores importados correctamente.");
    } catch (error) {
      alert("No pude leer el archivo. Usa columnas llamadas 'Jugador' y 'Puntos anteriores'.");
    }

    $("importFile").value = "";
  };

  reader.readAsArrayBuffer(file);
}

$("localTeam").addEventListener("input", refreshTeamOptions);
$("awayTeam").addEventListener("input", refreshTeamOptions);
$("addPlayerBtn").addEventListener("click", () => addPlayer());
$("calculateBtn").addEventListener("click", calculateAll);
$("carryBtn").addEventListener("click", carryTotalsForward);
$("saveBtn").addEventListener("click", saveData);
$("clearBtn").addEventListener("click", clearAll);
$("closeModalBtn").addEventListener("click", closeModal);
$("detailModal").addEventListener("click", (event) => {
  if (event.target === $("detailModal")) closeModal();
});
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) importExcel(file);
});
$("exportBtn").addEventListener("click", exportExcel);

refreshTeamOptions();
loadData();
updateSummary();
