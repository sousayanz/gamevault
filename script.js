const STORAGE_KEY = "gamevault-library-v1";
let games = loadGames();
let activeFilter = "all";
let toastTimer;

const $ = (id) => document.getElementById(id);
const grid = $("gameGrid");
const dialog = $("gameDialog");
const form = $("gameForm");

function loadGames() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveGames() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  render();
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function safeUrl(value = "") {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}
function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}
function getVisibleGames() {
  const query = $("searchInput").value.trim().toLowerCase();
  const genre = $("genreFilter").value;
  let list = games.filter(game => {
    const matchesQuery = `${game.name} ${game.genre} ${game.notes || ""}`.toLowerCase().includes(query);
    const matchesGenre = genre === "all" || game.genre === genre;
    let matchesFilter = true;
    if (activeFilter === "Favorito") matchesFilter = !!game.favorite;
    else if (activeFilter === "Instalado") matchesFilter = game.status === "Instalado";
    else if (activeFilter === "Backlog") matchesFilter = game.status === "Backlog";
    return matchesQuery && matchesGenre && matchesFilter;
  });
  const sort = $("sortSelect").value;
  if (sort === "az") list.sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
  else if (sort === "za") list.sort((a,b) => b.name.localeCompare(a.name, "pt-BR"));
  else list.sort((a,b) => b.createdAt - a.createdAt);
  return list;
}
function cardTemplate(game) {
  const image = safeUrl(game.image);
  const background = image
    ? `style="background-image:linear-gradient(0deg,#080a10e8,transparent 80%),url('${escapeHtml(image)}')"`
    : `style="background-image:linear-gradient(135deg,${game.color || "#262b44"},#191d2b)"`;
  const statusLabel = game.status === "Instalado" ? "INSTALADO" : game.status === "Concluído" ? "CONCLUÍDO" : "QUERO JOGAR";
  const link = safeUrl(game.link);
  return `<article class="game-card">
    <div class="cover" ${background}>
      <span class="cover-tag">${statusLabel}</span>
      <button class="favorite-button ${game.favorite ? "on" : ""}" data-action="favorite" data-id="${game.id}" title="Favoritar">${game.favorite ? "♥" : "♡"}</button>
      <div class="cover-title">${escapeHtml(game.name)}</div>
    </div>
    <div class="card-body">
      <div class="card-title-row"><div class="card-title" title="${escapeHtml(game.name)}">${escapeHtml(game.name)}</div><span class="genre-pill">${escapeHtml(game.genre)}</span></div>
      <div class="card-meta">${escapeHtml(game.notes || "Sem observações")}</div>
      <div class="card-actions">
        ${link ? `<a class="download-button" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">↗ ABRIR LINK</a>` : `<button class="download-button" disabled>SEM LINK</button>`}
        <button class="icon-button" data-action="edit" data-id="${game.id}" title="Editar">✎</button>
        <button class="icon-button" data-action="delete" data-id="${game.id}" title="Excluir">⌫</button>
      </div>
    </div>
  </article>`;
}
function render() {
  const visible = getVisibleGames();
  grid.innerHTML = visible.map(cardTemplate).join("");
  $("emptyState").classList.toggle("show", visible.length === 0);
  grid.style.display = visible.length ? "grid" : "none";
  $("totalStat").textContent = games.length;
  $("sideTotal").textContent = games.length;
  $("favoritesStat").textContent = games.filter(g => g.favorite).length;
  $("linksStat").textContent = games.filter(g => safeUrl(g.link)).length;
  const titles = {all:"Todos os jogos",Favorito:"Favoritos",Instalado:"Instalados",Backlog:"Quero jogar"};
  $("breadcrumbCurrent").textContent = titles[activeFilter] || "Todos os jogos";
  $("sectionTitle").textContent = activeFilter === "all" ? "Sua biblioteca" : titles[activeFilter];
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.filter === activeFilter));
}
function openNewGame() {
  form.reset();
  $("gameId").value = "";
  $("dialogTitle").textContent = "Adicionar jogo";
  $("gameStatus").value = "Backlog";
  dialog.showModal();
  $("gameName").focus();
}
function openEditGame(id) {
  const game = games.find(item => item.id === id);
  if (!game) return;
  $("gameId").value = game.id;
  $("gameName").value = game.name;
  $("gameGenre").value = game.genre;
  $("gameStatus").value = game.status;
  $("gameLink").value = game.link;
  $("gameImage").value = game.image || "";
  $("gameNotes").value = game.notes || "";
  $("dialogTitle").textContent = "Editar jogo";
  dialog.showModal();
}
$("addBtn").addEventListener("click", openNewGame);
$("emptyAddBtn").addEventListener("click", openNewGame);
$("closeDialog").addEventListener("click", () => dialog.close());
$("cancelDialog").addEventListener("click", () => dialog.close());
form.addEventListener("submit", event => {
  event.preventDefault();
  const id = $("gameId").value;
  const name = $("gameName").value.trim();
  const link = $("gameLink").value.trim();
  if (!safeUrl(link)) { notify("Informe um link HTTP ou HTTPS válido."); return; }
  const existing = games.find(game => game.id === id);
  const palette = ["#40305d","#24465a","#5a382f","#344d42","#4b3451","#34405c"];
  const game = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    name, genre: $("gameGenre").value, status: $("gameStatus").value,
    link, image: $("gameImage").value.trim(), notes: $("gameNotes").value.trim(),
    favorite: existing ? existing.favorite : false,
    color: existing ? existing.color : palette[Math.floor(Math.random()*palette.length)],
    createdAt: existing ? existing.createdAt : Date.now()
  };
  if (existing) games = games.map(item => item.id === id ? game : item);
  else games.unshift(game);
  saveGames();
  dialog.close();
  notify(existing ? "Jogo atualizado!" : "Jogo adicionado à biblioteca!");
});
grid.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const {action, id} = button.dataset;
  const game = games.find(item => item.id === id);
  if (!game) return;
  if (action === "favorite") {
    game.favorite = !game.favorite;
    saveGames();
  } else if (action === "edit") openEditGame(id);
  else if (action === "delete") {
    if (confirm(`Excluir "${game.name}" da biblioteca?`)) {
      games = games.filter(item => item.id !== id);
      saveGames();
      notify("Jogo removido.");
    }
  }
});
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  render();
}));
["searchInput","genreFilter","sortSelect"].forEach(id => $(id).addEventListener(id === "searchInput" ? "input" : "change", render));

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(games, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "gamevault-biblioteca.json"; a.click();
  URL.revokeObjectURL(url);
  notify("Backup exportado!");
});
$("importFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error("Formato inválido");
    const valid = imported.filter(game => game && typeof game.name === "string" && typeof game.link === "string");
    if (!confirm(`Importar ${valid.length} jogo(s)? Isso substituirá a biblioteca atual.`)) return;
    games = valid.map(game => ({
      id: game.id || String(Date.now()+Math.random()), name: game.name,
      genre: game.genre || "Outro", status: game.status || "Backlog",
      link: game.link, image: game.image || "", notes: game.notes || "",
      favorite: !!game.favorite, color: game.color || "#30294b",
      createdAt: Number(game.createdAt) || Date.now()
    }));
    saveGames(); notify("Biblioteca importada!");
  } catch { notify("Não foi possível importar esse arquivo."); }
  event.target.value = "";
});

render();
