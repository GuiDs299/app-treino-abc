(() => {
  const STORAGE_KEY = "treino_abc_v2";
  const todayKey = () => new Date().toISOString().split('T')[0];
  const $ = (id) => document.getElementById(id);

  const defaultWorkouts = {
    A: { title: "Treino A", subtitle: "Peito + Tríceps + Abdômen", exercises: [{ name: "Supino reto", target: "4x 6–8" }, { name: "Supino inclinado", target: "4x 8–10" }, { name: "Crucifixo", target: "3x 10–12" }, { name: "Tríceps testa", target: "3x 8–10" }] },
    B: { title: "Treino B", subtitle: "Costas + Bíceps + Ombro", exercises: [{ name: "Barra fixa", target: "4x 6–10" }, { name: "Remada curvada", target: "4x 6–8" }, { name: "Rosca direta", target: "3x 8–10" }, { name: "Face pull", target: "3x 12–15" }] },
    C: { title: "Treino C", subtitle: "Pernas Completo", exercises: [{ name: "Agachamento", target: "4x 8-10" }, { name: "Leg Press", target: "3x 12" }, { name: "Extensora", target: "3x 15" }, { name: "Panturrilha", target: "4x 20" }] }
  };

  const stateDefault = () => ({
    active: "A", logs: {}, bodyweight: [], workouts: JSON.parse(JSON.stringify(defaultWorkouts)), theme: "dark"
  });

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return stateDefault();
      const parsed = JSON.parse(raw);
      // Proteção de Migração: une dados antigos com estrutura nova
      return { 
        ...stateDefault(), 
        ...parsed, 
        bodyweight: parsed.bodyweight || [], 
        logs: parsed.logs || {} 
      };
    } catch (e) { return stateDefault(); }
  };

  let state = load();
  let tempWk = {};
  let workoutChart;

  const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); flashSave(); };
  const flashSave = () => { const el = $("saveState"); if (el) { el.textContent = "Salvo ✓"; setTimeout(() => el.textContent = "Salvando automaticamente ✓", 800); } };
  const toast = (msg) => { const t = $("toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 1600); };
  const getTodayLog = () => { const k = todayKey(); state.logs[k] ||= { type: "", workout: state.active, entries: {} }; return state.logs[k]; };

  // --- MEMÓRIA: BUSCA O ÚLTIMO REGISTRO DO EXERCÍCIO ---
  function getLastValue(exName) {
    const keys = Object.keys(state.logs).sort().reverse();
    const today = todayKey();
    for (const k of keys) {
      if (k === today) continue;
      const entry = state.logs[k].entries?.[exName];
      if (entry && (entry.load || entry.sets)) return entry;
    }
    return null;
  }

  // --- MENU E CONFIGURAÇÃO ---
  const toggleMenu = (open) => { $("sideMenu").classList.toggle("open", open); $("menuOverlay").classList.toggle("show", open); };
  $("btnOpenMenu").onclick = () => toggleMenu(true);
  $("btnCloseMenu").onclick = () => toggleMenu(false);
  $("menuOverlay").onclick = () => toggleMenu(false);

  $("btnEditWorkouts").onclick = () => {
    toggleMenu(false); tempWk = JSON.parse(JSON.stringify(state.workouts));
    renderConfigUI(); $("modalConfig").classList.add("show");
  };
  $("btnSaveConfig").onclick = () => { state.workouts = tempWk; save(); render(); $("modalConfig").classList.remove("show"); toast("Treinos salvos!"); };
  $("btnCloseConfig").onclick = () => $("modalConfig").classList.remove("show");

  window._updWk = (k, f, v) => { tempWk[k][f] = v; };
  window._updEx = (k, i, f, v) => { tempWk[k].exercises[i][f] = v; };
  window._removeEx = (k, i) => { tempWk[k].exercises.splice(i, 1); renderConfigUI(); };
  window._addEx = (k) => { tempWk[k].exercises.push({ name: "", target: "" }); renderConfigUI(); };
  window._removeWk = (k) => { if (confirm(`Excluir ${k}?`)) { delete tempWk[k]; renderConfigUI(); } };
  window._addWk = () => { const l = prompt("Letra (ex: D):")?.toUpperCase().trim(); if (l && !tempWk[l]) { tempWk[l] = { title: `Treino ${l}`, subtitle: "Novo", exercises: [] }; renderConfigUI(); } };

  function renderConfigUI() {
    const box = $("configBody"); box.innerHTML = "";
    Object.keys(tempWk).forEach(k => {
      const w = tempWk[k];
      let h = `<div class="edit-block">
        <div class="edit-block-title"><input class="input-wk-title" value="${w.title}" oninput="window._updWk('${k}','title',this.value)"><button class="danger" style="padding:4px 10px; font-size:10px" onclick="window._removeWk('${k}')">Excluir Aba</button></div>
        <input value="${w.subtitle}" oninput="window._updWk('${k}','subtitle',this.value)" placeholder="Músculos" style="font-size:13px; color:var(--muted); background:transparent; border:none; margin-bottom:10px; width:100%">
        <div style="font-size:10px; color:var(--muted); margin-bottom:8px; text-transform:uppercase">Exercícios</div>`;
      w.exercises.forEach((ex, i) => {
        h += `<div class="edit-row"><input value="${ex.name}" oninput="window._updEx('${k}',${i},'name',this.value)" placeholder="Nome"><input value="${ex.target}" oninput="window._updEx('${k}',${i},'target',this.value)" placeholder="Meta"><button class="btn-del-ex" onclick="window._removeEx('${k}',${i})">✕</button></div>`;
      });
      h += `<button class="btn-add-ex" onclick="window._addEx('${k}')">+ Adicionar Exercício</button></div>`;
      box.innerHTML += h;
    });
  }

  // --- RENDERS PRINCIPAIS ---
  function renderTabs() {
    const container = $("tabsContainer"); if (!container) return;
    container.innerHTML = "";
    Object.keys(state.workouts).forEach(k => {
      const btn = document.createElement("button"); btn.textContent = `Treino ${k}`;
      btn.className = state.active === k ? "primary" : "ghost";
      btn.onclick = () => { state.active = k; save(); render(); };
      container.appendChild(btn);
    });
  }

  function renderWorkout() {
    const prog = state.workouts[state.active]; if (!prog) return;
    $("workoutTitle").textContent = prog.title; $("workoutSubtitle").textContent = prog.subtitle;
    renderTabs();
    const list = $("exerciseList"); list.innerHTML = "";
    const tlog = getTodayLog();

    prog.exercises.forEach(ex => {
      const entry = tlog.entries[ex.name] || { load: "", sets: "" };
      const last = getLastValue(ex.name);
      const wrap = document.createElement("div"); wrap.className = "exercise";
      wrap.innerHTML = `
        <div class="ex-top">
          <div style="flex:1"><div class="ex-name">${ex.name}</div><div class="muted small">Meta: ${ex.target}</div></div>
          <div class="last-value-box">
            ${last ? `<span class="muted" style="font-size:11px">Anterior: <b>${last.load}kg</b> x <b>${last.sets}</b></span>` : '<span class="muted" style="font-size:10px">Sem histórico</span>'}
          </div>
        </div>
        <div class="fields">
          <div class="field"><label>Carga (kg)</label><input inputmode="decimal" value="${entry.load || ""}" oninput="window._updEntry('${encodeURIComponent(ex.name)}','load',this.value)"></div>
          <div class="field"><label>Séries</label><input inputmode="numeric" value="${entry.sets || ""}" oninput="window._updEntry('${encodeURIComponent(ex.name)}','sets',this.value)"></div>
        </div>`;
      list.appendChild(wrap);
    });
    renderKPIs();
  }

  window._updEntry = (ex, field, val) => {
    const name = decodeURIComponent(ex); const tlog = getTodayLog();
    tlog.entries[name] ||= { load: "", sets: "" }; tlog.entries[name][field] = val;
    if (tlog.type !== "rest") tlog.type = "train";
    save(); renderKPIs(); renderCalendar(); drawChart();
  };

  function renderKPIs() {
    const tlog = getTodayLog(); let sTotal = 0, vTotal = 0, done = 0;
    const prog = state.workouts[state.active];
    prog.exercises.forEach(ex => {
      const e = tlog.entries[ex.name]; if (e && (e.load || e.sets)) done++;
      const s = parseFloat(String(e?.sets || "").replace(",", ".")) || 0;
      const l = parseFloat(String(e?.load || "").replace(",", ".")) || 0;
      sTotal += s; vTotal += (l * s);
    });
    $("kpiSets").textContent = sTotal; $("kpiVolume").textContent = vTotal;
    $("kpiDone").textContent = `${prog.exercises.length ? Math.round((done / prog.exercises.length) * 100) : 0}%`;
  }

  function renderCalendar() {
    const cal = $("calendar"); if (!cal) return; cal.innerHTML = "";
    const now = new Date(); const dow = ["D", "S", "T", "Q", "Q", "S", "S"];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const k = d.toISOString().split('T')[0];
      const log = state.logs[k]; const type = log?.type || ""; const wk = log?.workout || "";
      const div = document.createElement("div"); div.className = "day";
      if (type === "train") div.classList.add("train"); if (type === "rest") div.classList.add("rest");
      div.innerHTML = `<div>${d.getDate()}</div><div class="muted" style="font-size:9px">${dow[d.getDay()]} ${type === "train" ? wk : (type === "rest" ? "R" : "")}</div>`;
      div.onclick = () => { state.logs[k] ||= { type: "", workout: state.active, entries: {} }; const t = state.logs[k].type; state.logs[k].type = t === "" ? "train" : (t === "train" ? "rest" : ""); save(); renderCalendar(); };
      cal.appendChild(div);
    }
  }

  // --- GRÁFICO PROFISSIONAL ---
  function drawChart() {
    const canvas = $("chart"); if (!canvas || typeof Chart === 'undefined') return;
    if (workoutChart) workoutChart.destroy();
    const ex = decodeURIComponent($("chartExercise").value || "");
    const rawData = []; const labels = [];

    Object.keys(state.logs).sort().forEach(k => {
      const load = parseFloat(String(state.logs[k].entries?.[ex]?.load || "").replace(",", "."));
      if (load > 0) { labels.push(k.split("-").reverse().join("/").substring(0, 5)); rawData.push(load); }
    });

    if (rawData.length < 2) { $("chartHint").textContent = "Mínimo 2 treinos para gráfico."; return; }
    else { $("chartHint").textContent = ""; }

    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue('--accent').trim();

    workoutChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: rawData, borderColor: accent, backgroundColor: accent.replace(')', ', 0.1)').replace('rgb', 'rgba'),
          borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: accent, pointRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: style.getPropertyValue('--muted'), font: { size: 10 } } },
          y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: style.getPropertyValue('--muted'), font: { size: 10 } } }
        }
      }
    });
  }

  // --- EVENTOS E BINDINGS ---
  let rest = { running: false, endAt: 0, iv: null };
  $("btnRest").onclick = () => {
    if (rest.running) { clearInterval(rest.iv); rest.running = false; $("restState").textContent = "Descanso: parado"; $("restTimer").textContent = "00:00"; $("btnRest").textContent = "Iniciar descanso"; $("btnRest").className = "primary"; }
    else {
      const sec = parseInt($("restPreset").value); rest.running = true; rest.endAt = Date.now() + sec * 1000;
      $("btnRest").textContent = "Parar"; $("btnRest").className = "danger";
      rest.iv = setInterval(() => {
        const left = Math.max(0, rest.endAt - Date.now()); const s = Math.ceil(left / 1000);
        $("restTimer").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
        if (left <= 0) { clearInterval(rest.iv); rest.running = false; toast("Descanso finalizado!"); $("btnRest").textContent = "Iniciar descanso"; $("btnRest").className = "primary"; $("restState").textContent = "Descanso: parado"; }
      }, 200);
    }
  };

  $("btnSaveBW").onclick = () => { const input = $("bwValue"); const v = parseFloat(input.value.replace(",", ".")); if (v > 0) { state.bodyweight.push({ date: todayKey(), kg: v }); save(); render(); input.value = ""; toast("Peso salvo!"); } };
  $("btnMarkTrain").onclick = () => { const k = todayKey(); state.logs[k] ||= { type: "train", workout: state.active, entries: {} }; state.logs[k].type = "train"; save(); render(); };
  $("btnMarkRest").onclick = () => { const k = todayKey(); state.logs[k] ||= { type: "rest", workout: state.active, entries: {} }; state.logs[k].type = "rest"; save(); render(); };
  $("btnClearToday").onclick = () => { if(confirm("Limpar hoje?")) { const k = todayKey(); if (state.logs[k]) { state.logs[k].entries = {}; state.logs[k].type = ""; } save(); render(); } };
  $("btnResetAll").onclick = () => { if(confirm("Zerar tudo?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); } };
  $("btnExport").onclick = () => { const b = new Blob([JSON.stringify(state)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `backup_${todayKey()}.json`; a.click(); toggleMenu(false); };
  $("btnImport").onclick = () => { const i = document.createElement("input"); i.type = "file"; i.onchange = async () => { state = JSON.parse(await i.files[0].text()); save(); render(); toast("Importado!"); }; i.click(); toggleMenu(false); };
  
  $("btnToggleThemeMenu").onclick = () => { 
    state.theme = state.theme === "light" ? "dark" : "light"; 
    applyTheme(state.theme); 
    save(); 
    toggleMenu(false); 
  };
  
  $("chartExercise").onchange = () => drawChart();

  const applyTheme = (t) => { 
    document.documentElement.setAttribute("data-theme", t);
    const meta = $("metaTheme");
    if(meta) meta.content = (t === "light" ? "#f1f5f9" : "#0b0f14");
    drawChart(); // Redesenha o gráfico para ler as cores do CSS atual
  };

  function render() {
    $("todayLine").textContent = `Hoje: ${new Date().toLocaleDateString("pt-BR")} • Ativo: ${state.active}`;
    renderWorkout(); renderCalendar();
    const lastBW = state.bodyweight[state.bodyweight.length - 1];
    $("bwLast").textContent = lastBW ? `Último: ${lastBW.kg}kg (${lastBW.date.split("-").reverse().join("/")})` : "Sem registros.";
    const set = new Set(); Object.keys(state.workouts).forEach(w => state.workouts[w].exercises.forEach(e => set.add(e.name)));
    const select = $("chartExercise"); const cur = select.value;
    select.innerHTML = Array.from(set).map(n => `<option value="${encodeURIComponent(n)}">${n}</option>`).join("");
    if(cur) select.value = cur;
    drawChart();
  }

  applyTheme(state.theme);
  render();
})();