const cefrPathway = [
  {
    key: "PRE-A1",
    name: "Starters",
    range: "Levels 1-10",
    tone: "starter",
    outcome: "Safe first responses, picture talk, simple self-introduction.",
    skills: ["True / False", "Yes / No", "Picture words", "Short answers"],
    canDo: [
      "Can answer simple questions about self and familiar objects.",
      "Can describe pictures with short phrases.",
      "Can understand very simple spoken prompts with visual support."
    ]
  },
  {
    key: "A1",
    name: "Movers",
    range: "Levels 11-20",
    tone: "mover",
    outcome: "Everyday exchange, short stories, simple reasons.",
    skills: ["Word matching", "Mini dialogues", "Listening choices", "Simple stories"],
    canDo: [
      "Can ask and answer basic everyday questions.",
      "Can talk about routines, people, places, and preferences.",
      "Can connect short ideas with simple linking words."
    ]
  },
  {
    key: "A2",
    name: "Flyers",
    range: "Levels 21-30",
    tone: "flyer",
    outcome: "Longer turns, choices, past events, guided conversations.",
    skills: ["Fill blanks", "Conversations", "Listening pictures", "Story telling"],
    canDo: [
      "Can tell short simple stories using pictures or own ideas.",
      "Can talk briefly about activities done in the past.",
      "Can understand simple conversations on everyday topics."
    ]
  }
];

const practiceToolkit = [
  ["RW", "Reading & Writing", "Matching, short text, sentence completion"],
  ["LS", "Listening", "Picture selection, instructions, simple dialogue"],
  ["SP", "Speaking", "Personal questions, picture stories, differences"],
  ["VB", "Vocabulary", "Topic banks, spelling, word matching"]
];

const state = {
  languages: [],
  levels: [],
  selectedLanguage: null,
  selectedStage: 1,
  selectedLevel: null,
  selectedLevelDetail: null,
  room: null,
  timeline: null,
  materials: []
};

const els = {
  languageList: document.querySelector("#languageList"),
  practiceToolkit: document.querySelector("#practiceToolkit"),
  languageMetric: document.querySelector("#languageMetric"),
  levelMetric: document.querySelector("#levelMetric"),
  selectedMetric: document.querySelector("#selectedMetric"),
  roomMetric: document.querySelector("#roomMetric"),
  cefrScope: document.querySelector("#cefrScope"),
  cefrCards: document.querySelector("#cefrCards"),
  levelScope: document.querySelector("#levelScope"),
  levelGrid: document.querySelector("#levelGrid"),
  detailTitle: document.querySelector("#detailTitle"),
  detailMeta: document.querySelector("#detailMeta"),
  levelPedagogy: document.querySelector("#levelPedagogy"),
  subLevelList: document.querySelector("#subLevelList"),
  canDoPanel: document.querySelector("#canDoPanel"),
  createRoomButton: document.querySelector("#createRoomButton"),
  roomStatus: document.querySelector("#roomStatus"),
  roomSummary: document.querySelector("#roomSummary"),
  timelineView: document.querySelector("#timelineView"),
  timelineRefreshButton: document.querySelector("#timelineRefreshButton"),
  materialForm: document.querySelector("#materialForm"),
  materialTitle: document.querySelector("#materialTitle"),
  materialType: document.querySelector("#materialType"),
  materialUrl: document.querySelector("#materialUrl"),
  pinMaterialButton: document.querySelector("#pinMaterialButton"),
  materialList: document.querySelector("#materialList"),
  refreshButton: document.querySelector("#refreshButton"),
  toast: document.querySelector("#toast")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(readErrorMessage(text) || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function readErrorMessage(text) {
  try {
    const payload = JSON.parse(text);
    return payload.message;
  } catch {
    return text;
  }
}

async function init() {
  bindEvents();
  renderPracticeToolkit();
  renderCefrCards();
  await loadLanguages();
}

function bindEvents() {
  els.refreshButton.addEventListener("click", () => loadLanguages());
  els.createRoomButton.addEventListener("click", createRoom);
  els.timelineRefreshButton.addEventListener("click", loadTimeline);
  els.materialForm.addEventListener("submit", pinMaterial);

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedStage = Number(button.dataset.stage);
      document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.selectedLevel = null;
      state.selectedLevelDetail = null;
      loadLevels();
    });
  });
}

async function loadLanguages() {
  try {
    state.languages = await api("/api/languages");
    state.selectedLanguage = state.selectedLanguage || state.languages[0]?.code || null;
    renderLanguages();
    await loadLevels();
  } catch (error) {
    showToast(error.message);
  }
}

async function loadLevels() {
  if (!state.selectedLanguage) {
    renderAll();
    return;
  }

  try {
    state.levels = await api(`/api/languages/${state.selectedLanguage}/stages/${state.selectedStage}/levels`);
  } catch (error) {
    state.levels = [];
    showToast(error.message);
  }

  renderAll();
}

async function selectLevel(level) {
  state.selectedLevel = level;
  state.selectedLevelDetail = null;
  renderAll();

  try {
    state.selectedLevelDetail = await api(`/api/levels/${level.id}/detail`);
  } catch (error) {
    showToast(error.message);
  }

  renderAll();
}

async function createRoom() {
  if (!state.selectedLevel) {
    return;
  }

  const endpoint = state.selectedLevel.levelNumber >= 1 && state.selectedLevel.levelNumber <= 5
    ? "/api/rooms/survival-speaking"
    : "/api/rooms";

  try {
    state.room = await api(endpoint, {
      method: "POST",
      body: JSON.stringify({
        languageCode: state.selectedLevel.languageCode,
        levelNumber: state.selectedLevel.levelNumber,
        displayName: `${state.selectedLevel.languageCode} Level ${state.selectedLevel.levelNumber}`
      })
    });
    state.materials = [];
    await Promise.all([loadTimeline(), loadMaterials()]);
    showToast(`Room ${state.room.roomCode} created`);
  } catch (error) {
    showToast(error.message);
  }

  renderAll();
}

async function loadTimeline() {
  if (!state.room) {
    return;
  }

  try {
    state.timeline = await api(`/api/rooms/${state.room.roomCode}/timeline`);
  } catch (error) {
    showToast(error.message);
  }

  renderTimeline();
}

async function loadMaterials() {
  if (!state.room) {
    return;
  }

  try {
    state.materials = await api(`/api/rooms/${state.room.roomCode}/materials`);
  } catch (error) {
    showToast(error.message);
  }

  renderMaterials();
}

async function pinMaterial(event) {
  event.preventDefault();
  if (!state.room) {
    return;
  }

  try {
    await api(`/api/rooms/${state.room.roomCode}/materials`, {
      method: "POST",
      body: JSON.stringify({
        title: els.materialTitle.value,
        materialType: els.materialType.value,
        resourceUrl: els.materialUrl.value
      })
    });
    els.materialForm.reset();
    els.materialType.value = "SLIDE";
    await loadMaterials();
    showToast("Material pinned");
  } catch (error) {
    showToast(error.message);
  }
}

async function unpinMaterial(materialId) {
  if (!state.room) {
    return;
  }

  try {
    await api(`/api/rooms/${state.room.roomCode}/materials/${materialId}`, {
      method: "DELETE"
    });
    await loadMaterials();
  } catch (error) {
    showToast(error.message);
  }
}

function renderAll() {
  renderMetrics();
  renderLanguages();
  renderCefrCards();
  renderLevels();
  renderLevelDetail();
  renderCanDo();
  renderRoom();
  renderTimeline();
  renderMaterials();
}

function renderMetrics() {
  els.languageMetric.textContent = state.languages.length;
  els.levelMetric.textContent = state.levels.length;
  els.selectedMetric.textContent = state.selectedLanguage
    ? `${state.selectedLanguage} S${state.selectedStage}`
    : "--";
  els.roomMetric.textContent = state.room ? "Live" : "Idle";
  els.cefrScope.textContent = state.selectedStage === 1 ? "Stage 1 CEFR focus" : `Stage ${state.selectedStage} extension`;
}

function renderPracticeToolkit() {
  els.practiceToolkit.innerHTML = practiceToolkit.map(([code, title, text]) => `
    <article class="toolkit-item">
      <span>${code}</span>
      <div>
        <strong>${title}</strong>
        <p>${text}</p>
      </div>
    </article>
  `).join("");
}

function renderLanguages() {
  els.languageList.innerHTML = "";

  state.languages.forEach((language) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `language-button${language.code === state.selectedLanguage ? " active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(language.code)}</strong><span>${escapeHtml(language.name)}</span>`;
    button.addEventListener("click", () => {
      state.selectedLanguage = language.code;
      state.selectedLevel = null;
      state.selectedLevelDetail = null;
      loadLevels();
    });
    els.languageList.appendChild(button);
  });
}

function renderCefrCards() {
  const selectedBand = getCefrBand(state.selectedLevel?.levelNumber);
  els.cefrCards.innerHTML = cefrPathway.map((band) => `
    <article class="cefr-card ${band.tone}${selectedBand?.key === band.key ? " active" : ""}">
      <div class="cefr-card-top">
        <span class="cefr-key">${band.key}</span>
        <span class="cefr-range">${band.range}</span>
      </div>
      <h3>${band.name}</h3>
      <p>${band.outcome}</p>
      <div class="chip-row">${band.skills.map((skill) => `<span>${skill}</span>`).join("")}</div>
    </article>
  `).join("");
}

function renderLevels() {
  els.levelScope.textContent = state.selectedLanguage
    ? `${state.selectedLanguage} / Stage ${state.selectedStage}`
    : "--";
  els.levelGrid.innerHTML = "";

  if (state.levels.length === 0) {
    els.levelGrid.innerHTML = `<span class="empty-state">No levels found for this stage.</span>`;
    return;
  }

  state.levels.forEach((level) => {
    const band = getCefrBand(level.levelNumber);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `level-card ${band?.tone || "advanced"}${state.selectedLevel?.id === level.id ? " active" : ""}`;
    button.innerHTML = `
      <span class="level-number">${level.levelNumber}</span>
      <span class="level-title">${escapeHtml(level.title)}</span>
      <span class="level-meta">${band ? `${band.key} ${band.name}` : `Stage ${level.stageNumber}`}</span>
    `;
    button.addEventListener("click", () => selectLevel(level));
    els.levelGrid.appendChild(button);
  });
}

function renderLevelDetail() {
  const level = state.selectedLevel;
  els.createRoomButton.disabled = !level;

  if (!level) {
    els.detailTitle.textContent = "Level detail";
    els.detailMeta.textContent = "Select a level";
    els.levelPedagogy.innerHTML = "";
    els.subLevelList.innerHTML = `<span class="empty-state">Select a level to inspect sub-levels and room flow.</span>`;
    return;
  }

  const band = getCefrBand(level.levelNumber);
  els.detailTitle.textContent = `Level ${level.levelNumber} - ${level.title}`;
  els.detailMeta.textContent = `${level.languageCode} / Stage ${level.stageNumber} / ${level.durationMinutes} min`;
  els.levelPedagogy.innerHTML = band
    ? `<span>${band.key}</span><strong>${band.name}</strong><p>${band.outcome}</p>`
    : `<span>B1+</span><strong>Extension</strong><p>Longer speaking turns, reasoning, and live discussion practice.</p>`;

  const subLevels = state.selectedLevelDetail?.subLevels || [];
  if (subLevels.length === 0) {
    els.subLevelList.innerHTML = `<span class="empty-state">Loading sub-levels...</span>`;
    return;
  }

  els.subLevelList.innerHTML = subLevels.map((subLevel) => `
    <article class="sublevel-item">
      <span class="order-badge">${subLevel.subOrder}</span>
      <div>
        <strong>${escapeHtml(subLevel.title)}</strong>
        <div class="muted">${subLevel.contents.length} contents / ${subLevel.aiQuestions.length} prompts</div>
      </div>
      <span class="muted">${subLevel.durationMinutes} min</span>
    </article>
  `).join("");
}

function renderCanDo() {
  const band = getCefrBand(state.selectedLevel?.levelNumber) || cefrPathway[0];
  els.canDoPanel.innerHTML = `
    <div class="can-do-heading">
      <span class="cefr-key">${band.key}</span>
      <strong>${band.name}</strong>
    </div>
    ${band.canDo.map((item) => `<article class="can-do-item">${escapeHtml(item)}</article>`).join("")}
  `;
}

function renderRoom() {
  const enabled = Boolean(state.room);
  els.timelineRefreshButton.disabled = !enabled;
  els.materialTitle.disabled = !enabled;
  els.materialType.disabled = !enabled;
  els.materialUrl.disabled = !enabled;
  els.pinMaterialButton.disabled = !enabled;
  els.roomStatus.textContent = enabled ? "Live" : "Idle";
  els.roomStatus.className = `status-pill ${enabled ? "live" : "neutral"}`;

  if (!state.room) {
    els.roomSummary.innerHTML = `<span class="empty-state">No live room yet.</span>`;
    return;
  }

  els.roomSummary.innerHTML = `
    <span class="room-code">${escapeHtml(state.room.roomCode)}</span>
    <div>
      <strong>${escapeHtml(state.room.displayName)}</strong>
      <div class="muted">${state.room.languageCode} / Stage ${state.room.stageNumber} / Level ${state.room.levelNumber}</div>
    </div>
  `;
}

function renderTimeline() {
  if (!state.room) {
    els.timelineView.innerHTML = `<span class="empty-state">Create a room to see the 10-minute flow.</span>`;
    return;
  }

  if (!state.timeline) {
    els.timelineView.innerHTML = `<span class="empty-state">Loading timeline...</span>`;
    return;
  }

  els.timelineView.innerHTML = state.timeline.steps.map((step) => `
    <article class="timeline-step${step.current ? " current" : ""}">
      <strong>${step.subOrder}. ${escapeHtml(step.title)}</strong>
      <div class="timeline-meta">
        <span>${step.startMinute}-${step.endMinute} min</span>
        <span>${step.current ? "Current" : ""}</span>
      </div>
    </article>
  `).join("");
}

function renderMaterials() {
  if (!state.room) {
    els.materialList.innerHTML = `<span class="empty-state">Pinned slides and links appear after room creation.</span>`;
    return;
  }

  if (state.materials.length === 0) {
    els.materialList.innerHTML = `<span class="empty-state">No pinned materials.</span>`;
    return;
  }

  els.materialList.innerHTML = state.materials.map((material) => `
    <article class="material-item">
      <div>
        <strong>${escapeHtml(material.title)}</strong>
        <div class="muted">${escapeHtml(material.materialType)}</div>
        <a class="material-link" href="${escapeAttribute(material.resourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(material.resourceUrl)}</a>
      </div>
      <button class="icon-button small" type="button" title="Unpin" aria-label="Unpin" data-unpin="${material.id}">X</button>
    </article>
  `).join("");

  els.materialList.querySelectorAll("[data-unpin]").forEach((button) => {
    button.addEventListener("click", () => unpinMaterial(button.dataset.unpin));
  });
}

function getCefrBand(levelNumber) {
  if (!levelNumber || levelNumber > 30) {
    return null;
  }
  if (levelNumber <= 10) {
    return cefrPathway[0];
  }
  if (levelNumber <= 20) {
    return cefrPathway[1];
  }
  return cefrPathway[2];
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

init();
