const $auth = document.getElementById("auth");
const $app  = document.getElementById("app");
const $overlay = document.getElementById("overlay");
const $ovTitle = document.getElementById("overlay-title");
const $ovSub   = document.getElementById("overlay-sub");

// Loading overlay helpers
function showLoading(title = 'Procesando…', sub = ''){
  try{
    if($overlay){
      if($ovTitle) $ovTitle.textContent = title || '';
      if($ovSub) $ovSub.textContent = sub || '';
      $overlay.classList.remove('hidden');
    }
  }catch(e){}
}
function hideLoading(){
  try{
    if($overlay){
      $overlay.classList.add('hidden');
      if($ovTitle) $ovTitle.textContent = '';
      if($ovSub) $ovSub.textContent = '';
    }
  }catch(e){}
}

const $tabs = document.querySelectorAll(".auth .tab");
const $forms = { login: document.getElementById("form-login"), signup: document.getElementById("form-signup") };

const $grid = document.getElementById("jobs-grid");
const $chips = document.querySelectorAll("#chip-categories .chip");
const $search = document.getElementById("search-input");
const $navItems = document.querySelectorAll(".nav-item");

const CATEGORY_LABELS = {
  web: "Páginas web",
  automations: "Automatizaciones",
  support: "Soportes",
  maintenance: "Mantenimientos",
  mobile_app: "Desarrollo App Móvil",
  desktop_app: "Desarrollo App escritorio"
};

function catLabel(key){
  return CATEGORY_LABELS[key] || key;
}

const MANAGER_ROLES = new Set(["CEO", "Administrador"]);
const DEFAULT_ROLE = "Tecnico";

function isManager(role){
  return MANAGER_ROLES.has(role);
}


// Tenure helpers
function pad2(n){ return String(Math.max(0, n)).padStart(2,'0'); }
function formatTenure(regIso){
  try{
    const start = dayjs(regIso);
    const now = dayjs();
    const y = now.diff(start, 'year');
    const mStart = start.add(y, 'year');
    const m = now.diff(mStart, 'month');
    const dStart = mStart.add(m, 'month');
    const d = now.diff(dStart, 'day');
    return `${pad2(y)}-${pad2(m)}-${pad2(d)}`;
  }catch(e){ return '--'; }
}

// ---------- View switching ----------
function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));
  const el = document.getElementById(`view-${name}`);
  if(el) el.classList.add('show');
  $navItems.forEach(n=> n.classList.toggle('active', n.dataset.view===name));
  lucide.createIcons();
  if(name==='clients') loadClientsList();
  if(name==='jobs') loadJobsTable();
  if(name==='users') loadUsersList();
}
$navItems.forEach(n=> n.onclick = ()=> showView(n.dataset.view));

const $role = document.getElementById("user-role");
const $userName = document.getElementById("user-name");
const $tenure = document.getElementById("user-tenure");
const $btnProfile = document.getElementById("btn-profile");
const $btnToggleSidebar = document.getElementById("btn-toggle-sidebar");

// Task modal refs
const $taskId = document.getElementById('task-id');
const $taskTitle = document.getElementById('task-title');
const $taskAssignee = document.getElementById('task-assignee');
const $taskStatus = document.getElementById('task-status');
const $taskProgress = document.getElementById('task-progress');
const $taskModalTitle = document.getElementById('task-modal-title');
const $taskJob = document.getElementById('task-job');
const $taskJobWrap = document.getElementById('task-job-wrap');

// Sidebar brand (will be initialized on boot)
let $brandAvatar = null, $brandName = null, $brandRole = null;

function setupBrandUI(){
  const brand = document.querySelector('.sidebar .brand');
  if(brand){
    brand.classList.add('user-brand');
    brand.innerHTML = `
      <div class="avatar-circle"><img id="brand-avatar" alt="Avatar de usuario"></div>
      <div class="brand-text">
        <strong id="brand-name">Usuario</strong>
        <small id="brand-role">Cargo</small>
      </div>
    `;
    $brandAvatar = document.getElementById('brand-avatar');
    $brandName = document.getElementById('brand-name');
    $brandRole = document.getElementById('brand-role');
  }
}

async function updateBrandValues(){
  try{
    const { data: { user } } = await sb.auth.getUser();
    const me = await getMe();
    const displayName = (user && user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || me.full_name || (user ? user.email : '');
    $brandName = document.getElementById('brand-name');
    $brandRole = document.getElementById('brand-role');
    $brandAvatar = document.getElementById('brand-avatar');
    if($brandName) $brandName.textContent = displayName;
    if($brandRole) $brandRole.textContent = me.role || '';
    if($brandAvatar) $brandAvatar.src = me.avatar_url || './assets/logo.png';
  }catch(e){}
}

// ---------- Auth UI (tabs, login, signup, logout) ----------
$tabs.forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('.auth .tab,.auth .form').forEach(x=>x.classList.remove('active','show'));
    btn.classList.add('active');
    const form = document.getElementById(`form-${btn.dataset.tab}`);
    if(form) form.classList.add('show');
  };
});

if($forms.signup){
  $forms.signup.onsubmit = async (e)=>{
    e.preventDefault();
    try{ showLoading('Creando cuenta…','Registrando usuario'); }catch(e){}
    const full_name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role').value || DEFAULT_ROLE;
    const { data, error } = await sb.auth.signUp({ email, password });
    if(error){ hideLoading(); toast(error.message,'error'); return; }
    try{
      const { data: s } = await sb.auth.getSession();
      if(s && s.session){
        const uid = s.session.user.id;
        await sb.from('profiles').insert({ id: uid, full_name, role }).catch(()=>{});
      }
    }catch(e){}
    hideLoading();
    toast('Cuenta creada. Revisa tu correo si requiere verificación.','ok');
  };
}

if($forms.login){
  $forms.login.onsubmit = async (e)=>{
    e.preventDefault();
    try{ showLoading('Iniciando sesión…','Organizando retorno'); }catch(e){}
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if(error){ hideLoading(); toast(error.message,'error'); return; }
    await ensureProfile();
    hideLoading();
    await boot();
  };
}

const $btnLogout = document.getElementById('btn-logout');
if($btnLogout){ $btnLogout.onclick = async ()=>{ await sb.auth.signOut(); location.reload(); } }

// Volver a Web Principal con transición usando overlay existente
try{
  const back = document.getElementById('backHome');
  if(back){
    back.addEventListener('click', (e)=>{
      e.preventDefault();
      try{ showLoading('Volviendo a la Web Principal',''); }catch(e){}
      setTimeout(()=>{ window.location.href = '../Web%20Principal/index.html'; }, 550);
    });
  }
}catch(e){}

// ---------- Tema (oscuro por defecto + toggle) ----------
(function initTheme(){
  const root = document.documentElement;
  const saved = localStorage.getItem('panelTheme');
  const initial = saved || (root.getAttribute('data-theme') || 'dark');
  root.setAttribute('data-theme', initial);
  const btn = document.getElementById('btn-toggle-theme');
  const setIcon = ()=>{
    if(!btn) return;
    const i = btn.querySelector('i');
    if(i){ i.setAttribute('data-lucide', root.getAttribute('data-theme')==='dark' ? 'sun' : 'moon'); }
    if(window.lucide && lucide.createIcons) lucide.createIcons();
  };
  setIcon();
  if(btn){
    btn.addEventListener('click', ()=>{
      const next = root.getAttribute('data-theme')==='dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('panelTheme', next);
      setIcon();
    });
  }
})();

// ---------- App boot ----------
async function boot(){
  const { data: { user } } = await sb.auth.getUser();
  if(!user){
    $auth.classList.remove('hidden');
    $app.classList.add('hidden');
    return;
  }
  const me = await getMe();
  try{ setupBrandUI(); await updateBrandValues(); }catch(e){}
  const displayName = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || me.full_name || user.email;
  if($userName) $userName.textContent = displayName;
  if($role){
    const roleDisplay = me.role || '';
    $role.textContent = roleDisplay;
    $role.classList.toggle('admin', isManager(roleDisplay));
  }
  if($tenure){
    const reg = (user && user.created_at) || (me && me.created_at);
    const t = formatTenure(reg);
    $tenure.innerHTML = `Tiempo en la empresa: ${t}<div class="tenure-sub">Año-Mes-Días</div>`;
  }
  $auth.classList.add('hidden'); $app.classList.remove('hidden');
  lucide.createIcons();

  bindProfileModal(me);
  await loadClientsIntoSelect();
  await loadUsersIntoSelect();
  await loadJobs();
  await updateStats();
  try{ await loadWidgets(); }catch(e){}
  initKanbanDnD();
  buildChart([]);
  // set default view
  try{ showView('dashboard'); }catch(e){}
  try{ enhanceUI(); }catch(e){}
  try{ initSidebarToggle(); }catch(e){}
}

// Intento de arranque inicial
try{ boot(); }catch(e){}


async function ensureProfile(){
  const { data: { user } } = await sb.auth.getUser();
  if(!user) return;
  const { data } = await sb.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if(!data){
    const full_name = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || null;
    await sb.from("profiles").insert({ id:user.id, full_name, role: DEFAULT_ROLE });
  }
}
async function getMe(){
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from("profiles").select("*").eq("id", user.id).single();
  return data;
}

// ---------- Stats ----------
async function updateStats(){
  const [{ count: cClients }, { count: cJobs }] = await Promise.all([
    sb.from("clients").select("*", { count:"exact", head:true }),
    sb.from("jobs").select("*", { count:"exact", head:true }).neq("status","archived"),
  ]);
  document.getElementById("stat-clients").textContent = cClients ?? 0;
  document.getElementById("stat-jobs").textContent    = cJobs ?? 0;

  const today = dayjs().startOf("day").toISOString();
  const { count: todayTasks } = await sb.from("tasks")
    .select("*",{count:"exact", head:true})
    .gte("created_at", today);
  document.getElementById("stat-tasks-today").textContent = todayTasks ?? 0;

  const { data:avg } = await sb.rpc("fn_overall_progress");
  let pct = 0;
  if(typeof avg === 'number') pct = avg;
  else if(Array.isArray(avg) && avg.length){
    const first = avg[0];
    if(typeof first === 'number') pct = first;
    else if(first && typeof first === 'object'){
      const k = Object.keys(first)[0];
      pct = Number(first[k]) || 0;
    }
  } else if(avg && typeof avg.value === 'number') {
    pct = avg.value;
  }
  document.getElementById("stat-progress").textContent = Math.round(pct) + "%";
}


// ---------- Dashboard widgets ----------
async function loadWidgets(){
  try{ await Promise.all([loadMyUpcoming(), loadOverdue(), loadWorkload(), loadRecentActivity()]); }catch(e){}
}

async function loadMyUpcoming(){
  const box = document.getElementById('w-my-upcoming'); if(!box) return;
  box.innerHTML = '<li class="meta">Cargando…</li>';
  const me = await getMe();
  const { data: tasks, error } = await sb.from('tasks').select('id,job_id,title,status,progress,created_at').eq('assignee', me.id).neq('status','done');
  if(error){ box.innerHTML = `<li class="meta">${error.message}</li>`; return; }
  const jobIds = [...new Set((tasks||[]).map(t=>t.job_id).filter(Boolean))];
  let jobsMap = {};
  if(jobIds.length){ const { data: jobs } = await sb.from('jobs').select('id,title,due_at').in('id', jobIds); (jobs||[]).forEach(j=> jobsMap[j.id]=j); }
  const rows = (tasks||[]).map(t=>({ t, j: jobsMap[t.job_id] })).filter(x=>x.j && x.j.due_at).sort((a,b)=> new Date(a.j.due_at)-new Date(b.j.due_at)).slice(0,6);
  if(!rows.length){ box.innerHTML = '<li class="meta">Sin próximas entregas</li>'; return; }
  box.innerHTML = rows.map(({t,j})=>`<li><span>${t.title}</span><span class="meta">Entrega ${dayjs(j.due_at).format('DD/MM HH:mm')}</span></li>`).join('');
}

async function loadOverdue(){
  const box = document.getElementById('w-overdue'); if(!box) return;
  box.innerHTML = '<li class="meta">Cargando…</li>';
  const me = await getMe(); const manager = me && isManager(me.role);
  const { data: tasks, error } = await sb.from('tasks').select('id,job_id,title,status,progress,assignee').neq('status','done');
  if(error){ box.innerHTML = `<li class="meta">${error.message}</li>`; return; }
  const filtered = (tasks||[]).filter(t=> manager || t.assignee===me.id);
  const jobIds = [...new Set(filtered.map(t=>t.job_id).filter(Boolean))];
  let jobsMap = {};
  if(jobIds.length){ const { data: jobs } = await sb.from('jobs').select('id,due_at').in('id', jobIds); (jobs||[]).forEach(j=> jobsMap[j.id]=j); }
  const now = new Date();
  const rows = filtered.map(t=>({ t, j:jobsMap[t.job_id] })).filter(x=>x.j && x.j.due_at && new Date(x.j.due_at) < now).sort((a,b)=> new Date(a.j.due_at)-new Date(b.j.due_at)).slice(0,6);
  if(!rows.length){ box.innerHTML = '<li class="meta">Sin vencidas</li>'; return; }
  box.innerHTML = rows.map(({t,j})=>`<li><span>${t.title}</span><span class="meta">Venció ${dayjs(j.due_at).format('DD/MM HH:mm')}</span></li>`).join('');
}

async function loadWorkload(){
  const box = document.getElementById('w-workload'); if(!box) return;
  box.innerHTML = '<li class="meta">Cargando…</li>';
  const { data: tasks, error } = await sb.from('tasks').select('assignee,status').neq('status','done');
  if(error){ box.innerHTML = `<li class="meta">${error.message}</li>`; return; }
  const groups = {};
  (tasks||[]).forEach(t=>{
    const k = t.assignee || 'sin';
    groups[k] = groups[k] || { doing:0, review:0, todo:0, total:0 };
    if(t.status==='doing') groups[k].doing++;
    else if(t.status==='review') groups[k].review++;
    else if(t.status==='todo') groups[k].todo++;
    groups[k].total++;
  });
  const ids = Object.keys(groups).filter(k=> k!=='sin');
  let names = {};
  if(ids.length){ const { data: ppl } = await sb.from('profiles').select('id,full_name').in('id', ids); (ppl||[]).forEach(p=> names[p.id]=p.full_name); }
  const rows = Object.entries(groups).map(([id,c])=>({ name: names[id] || (id==='sin'?'Sin asignar':'Usuario'), ...c })).sort((a,b)=> b.total-a.total).slice(0,8);
  if(!rows.length){ box.innerHTML = '<li class="meta">Sin datos</li>'; return; }
  box.innerHTML = rows.map(r=>`<li><span>${r.name}</span><span class="meta">En curso ${r.doing} · En revisión ${r.review} · Total ${r.total}</span></li>`).join('');
}

async function loadRecentActivity(){
  const box = document.getElementById('w-activity'); if(!box) return;
  box.innerHTML = '<li class="meta">Cargando…</li>';
  const { data, error } = await sb.from('task_updates').select('task_id,user_id,progress,note,created_at').order('created_at',{ascending:false}).limit(12);
  if(error){ box.innerHTML = `<li class="meta">${error.message}</li>`; return; }
  const rows = data || [];
  const uids = [...new Set(rows.map(r=>r.user_id).filter(Boolean))];
  const tids = [...new Set(rows.map(r=>r.task_id).filter(Boolean))];
  let names={}, tasksMap={};
  if(uids.length){ const { data:ppl } = await sb.from('profiles').select('id,full_name').in('id',uids); (ppl||[]).forEach(p=> names[p.id]=p.full_name); }
  if(tids.length){ const { data:tt } = await sb.from('tasks').select('id,title').in('id',tids); (tt||[]).forEach(t=> tasksMap[t.id]=t.title); }
  if(!rows.length){ box.innerHTML = '<li class="meta">Sin actividad</li>'; return; }
  box.innerHTML = rows.map(r=>{
    const when = dayjs(r.created_at).format('DD/MM HH:mm');
    const who = names[r.user_id] || 'Usuario';
    const task = tasksMap[r.task_id] || 'Tarea';
    const prog = typeof r.progress==='number' ? ` · ${r.progress}%` : '';
    const note = r.note ? ` · ${r.note}` : '';
    return `<li><span>${task}</span><span class="meta">${when} · ${who}${prog}${note}</span></li>`;
  }).join('');
}
// ---------- Filtros & búsqueda ----------
let filter = { cat:"all", q:"" };
$chips.forEach(ch=>{
  ch.onclick=()=>{ $chips.forEach(x=>x.classList.remove("active")); ch.classList.add("active"); filter.cat = ch.dataset.cat; loadJobs(); };
});
$search.oninput = ()=>{ filter.q = $search.value.trim(); loadJobs(); };

// ---------- Jobs grid ----------
let currentJob = null;
function catPill(cat){
  return catLabel(cat);
}
function statusColor(st){
  return st==="done" ? "border-color:#16a34a" : st==="on_hold" ? "border-color:#eab308" :
         st==="in_progress" ? "border-color:#38bdf8" : "border-color:#1f2937";
}
function statusLabel(st){
  return st==="done" ? "Completado" : st==="on_hold" ? "Pausado" : st==="in_progress" ? "En progreso" : st==="new" ? "Nuevo" : st;
}

async function loadJobs(){
  const requested = filter.cat;
  let q = sb.from("jobs_view").select("*").neq("status","archived");
  if(requested!=="all") q = q.eq("category", requested);
  if(filter.q) q = q.ilike("search_text", `%${filter.q}%`);
  const { data, error } = await q.order("created_at",{ ascending:false });
  if(error){ toast(error.message,"error"); return; }

  const rows = (data||[]).filter(j=>{
    if(requested === "all") return true;
    return j.category === requested;
  });

  $grid.innerHTML = rows.map(j=>`
    <article class="job" data-id="${j.id}" style="${statusColor(j.status)}">
      <div class="row">
        <div class="title">${j.title}</div>
        <div class="tags"><span class="pill">${catPill(j.category)}</span></div>
      </div>
      <div class="subrow"><span class="pill st-${j.status}">${statusLabel(j.status)}</span></div>
      <div class="row">
        <small class="muted">${j.client_name||''}</small>
        <small class="muted">${j.due_at ? "Entrega "+dayjs(j.due_at).format("DD/MM HH:mm"):""}</small>
      </div>
      <div class="progress"><span style="width:${j.progress||0}%"></span></div>
    </article>
  `).join("");

  document.querySelectorAll(".job").forEach(el=>{
    el.onclick = async ()=>{
      currentJob = el.dataset.id;
      const job = (data||[]).find(x=>x.id===currentJob);
      if(job) document.getElementById("kanban-title").textContent = job.title;
      document.querySelectorAll('.job').forEach(n=> n.classList.remove('selected'));
      el.classList.add('selected');
      await loadKanban();
      await loadJobProgressChart();
    };
  });
  if(currentJob){
    const sel = document.querySelector(`.job[data-id="${currentJob}"]`);
    if(sel) sel.classList.add('selected');
  }
}

// ---------- Kanban ----------
const sortables = {};
function initKanbanDnD(){
  ["todo","doing","review","done"].forEach(col=>{
    const el = document.getElementById(`col-${col}`);
    sortables[col] = new Sortable(el, {
      group: "tasks", animation: 150, ghostClass:"drag-ghost",
      onEnd: async (evt)=>{
        const id = evt.item.dataset.id;
        const newStatus = evt.to.id.replace("col-","");
        const { error } = await sb.from("tasks").update({ status:newStatus }).eq("id", id);
        if(error){ toast("No se pudo mover la tarea: "+error.message,"error"); await loadKanban(); return; }
        await loadKanban(); await loadJobs(); await updateStats();
      }
    });
  });
}

async function loadKanban(){
  ["todo","doing","review","done"].forEach(c=>document.getElementById(`col-${c}`).innerHTML="");
  if(!currentJob) return;
  const { data, error } = await sb.from("tasks_view").select("*").eq("job_id", currentJob).order("created_at");
  if(error){ toast(error.message,"error"); return; }
  let rows = data || [];
  try{
    const me = await getMe();
    const privileged = me && isManager(me.role);
    if(!privileged){
      rows = rows.filter(t=> t.assignee && t.assignee === me.id);
    }
  }catch(e){}
  // Enriquecer con nombres/roles si faltan
  let assigneesMap = {};
  try{
    const needLookup = rows.filter(t=> t.assignee && !t.assignee_name);
    const ids = [...new Set(needLookup.map(t=>t.assignee))];
    if(ids.length){
      const { data: ppl } = await sb.from('profiles').select('id,full_name,role').in('id', ids);
      (ppl||[]).forEach(p=> assigneesMap[p.id] = { name: p.full_name, role: p.role });
    }
  }catch(e){}

  rows.forEach(t=>{
    const card = document.createElement("div");
    card.className="task"; card.dataset.id=t.id;
    const p = assigneesMap[t.assignee];
    const nm = t.assignee_name || (p && p.name);
    const rl = t.assignee_role || (p && p.role);
    const assigneeText = `${nm || "Sin asignar"}${rl ? ` (${rl})` : ''}`;
    card.innerHTML = `
      <div class="t1">${t.title}</div>
      <div class="t2">${assigneeText}</div>
      <div class="bar"><span style="width:${t.progress||0}%"></span></div>
    `;
    document.getElementById(`col-${t.status}`).appendChild(card);
    card.onclick = ()=> openTaskEditor(t.id);
  });
}

// ---------- Chart ----------
let chart=null;
function buildChart(series){
  const ctx = document.getElementById("chart-progress");
  chart && chart.destroy();
  chart = new Chart(ctx, {
    type:"line",
    data:{ labels: series.map(x=>x.label), datasets:[{ label:"% avance", data:series.map(x=>x.value) }] },
    options:{ responsive:true, scales:{ y:{ min:0, max:100, ticks:{ stepSize:20 } } } }
  });
}
async function loadJobProgressChart(){
  if(!currentJob){ buildChart([]); return; }
  const { data } = await sb.rpc("fn_job_progress_timeline", { p_job_id: currentJob });
  const series = (data||[]).map(r=>({ label: dayjs(r.d).format("DD/MM"), value: r.p }));
  buildChart(series);
}

// ---------- Enhancements / Modals avanzados ----------
function enhanceUI(){
  // Delegación para editar tarea desde el kanban
  const kanban = document.getElementById('kanban');
  if(kanban){
    kanban.addEventListener('click', async (e)=>{
      const card = e.target.closest('.task');
      if(!card) return;
      await openTaskEditor(card.dataset.id);
    });
  }

  // Crear/guardar/eliminar tarea con modal completo
  const btnNewTask = document.getElementById('btn-new-task');
  const btnSaveTask = document.getElementById('btn-save-task');
  const btnDeleteTask = document.getElementById('btn-delete-task');
  if(btnNewTask){
    btnNewTask.onclick = async ()=>{
      try{
        await loadUsersIntoSelect();
        $taskId.value='';
        $taskTitle.value='';
        $taskAssignee.value='';
        $taskStatus.value='todo';
        $taskProgress.value=0;
        const $note = document.getElementById('task-note'); if($note) $note.value='';
        const $updates = document.getElementById('task-updates'); if($updates) $updates.innerHTML='';
        $taskModalTitle.textContent='Nueva tarea';
        await loadJobsIntoTaskSelect();
        if(currentJob){
          $taskJob.value = currentJob;
          if($taskJobWrap) $taskJobWrap.style.display = 'none';
        } else {
          if($taskJobWrap) $taskJobWrap.style.display = '';
        }
      }catch(e){}
      openDialog(document.getElementById('modal-task'));
    };
  }
  if(btnSaveTask){
    btnSaveTask.onclick = async ()=>{
      const job_id = currentJob || ($taskJob && $taskJob.value) || null;
      const obj = {
        job_id,
        title: document.getElementById('task-title').value.trim(),
        assignee: document.getElementById('task-assignee').value || null,
        status: document.getElementById('task-status').value,
        progress: Number(document.getElementById('task-progress').value || 0)
      };
      if(!obj.title){ toast('Título requerido','error'); return; }
      if(!obj.job_id){ toast('Selecciona un trabajo','error'); return; }
      const id = document.getElementById('task-id').value;
      if(id){
        const { error } = await sb.from('tasks').update(obj).eq('id', id);
        if(error){ toast(error.message,'error'); return; }
        try{ await addTaskUpdate(id, obj.progress, (document.getElementById('task-note')?.value || '').trim()); }catch(e){}
        toast('Tarea actualizada','ok');
      } else {
        const { data, error } = await sb.from('tasks').insert(obj).select().single();
        if(error){ toast(error.message,'error'); return; }
        try{ await addTaskUpdate(data.id, obj.progress, (document.getElementById('task-note')?.value || '').trim() || 'Creación de tarea'); }catch(e){}
        toast('Tarea creada','ok');
      }
      closeDialog(document.getElementById('modal-task'));
      await loadKanban(); await loadJobs(); await updateStats();
    };
  }
  if(btnDeleteTask){
    btnDeleteTask.onclick = async ()=>{
      const id = document.getElementById('task-id').value;
      if(!id){ closeDialog(document.getElementById('modal-task')); return; }
      if(!confirm('¿Eliminar tarea?')) return;
      const { error } = await sb.from('tasks').delete().eq('id', id);
      if(error){ toast(error.message,'error'); return; }
      toast('Tarea eliminada','ok');
      closeDialog(document.getElementById('modal-task'));
      await loadKanban(); await updateStats();
    };
  }

  // Botones de logout con modal
  const modalLogout = document.getElementById('modal-logout');
  const btnLogout = document.getElementById('btn-logout');
  const btnConfirmLogout = document.getElementById('btn-confirm-logout');
  if(btnLogout && modalLogout){ btnLogout.onclick = ()=> openDialog(modalLogout); }
  if(btnConfirmLogout){ btnConfirmLogout.onclick = async ()=>{ await sb.auth.signOut(); location.reload(); } }

  // Editar trabajo (modal)
  const modalEditJob = document.getElementById('modal-edit-job');
  const btnEditJob = document.getElementById('btn-edit-job');
  const btnSaveEditJob = document.getElementById('btn-save-edit-job');
  if(btnEditJob && modalEditJob){
    btnEditJob.onclick = async ()=>{
      if(!currentJob){ toast('Selecciona un trabajo','error'); return; }
      const { data, error } = await sb.from('jobs').select('*').eq('id', currentJob).single();
      if(error){ toast(error.message,'error'); return; }
      document.getElementById('edit-job-id').value = data.id;
      document.getElementById('edit-job-title').value = data.title||'';
      document.getElementById('edit-job-category').value = data.category || 'web';
      document.getElementById('edit-job-status').value = data.status||'in_progress';
      document.getElementById('edit-job-progress').value = Number(data.progress||0);
      document.getElementById('edit-job-start').value = data.start_at ? new Date(data.start_at).toISOString().slice(0,16) : '';
      document.getElementById('edit-job-due').value = data.due_at ? new Date(data.due_at).toISOString().slice(0,16) : '';
      document.getElementById('edit-job-desc').value = data.description || '';
      openDialog(modalEditJob);
    };
  }
  if(btnSaveEditJob){
    btnSaveEditJob.onclick = async ()=>{
      const id = document.getElementById('edit-job-id').value;
      const selectedCat = document.getElementById('edit-job-category').value;
      const descValue = document.getElementById('edit-job-desc').value;
      const payload = {
        title: document.getElementById('edit-job-title').value.trim(),
        category: selectedCat,
        status: document.getElementById('edit-job-status').value,
        progress: Number(document.getElementById('edit-job-progress').value||0),
        start_at: document.getElementById('edit-job-start').value || null,
        due_at: document.getElementById('edit-job-due').value || null,
        description: descValue.trim()
      };
      if(!payload.title){ toast('Título requerido','error'); return; }
      const { error } = await sb.from('jobs').update(payload).eq('id', id);
      if(error){ toast(error.message,'error'); return; }
      toast('Trabajo actualizado','ok');
      closeDialog(document.getElementById('modal-edit-job'));
      await loadJobs(); await loadKanban(); await updateStats(); await loadJobProgressChart();
    };
  }
}

// Cargar trabajos en el select del modal de tarea
async function loadJobsIntoTaskSelect(){
  if(!$taskJob) return;
  const { data, error } = await sb.from('jobs_view').select('id,title,client_name,status').neq('status','archived').order('created_at', { ascending:false });
  if(error){ return; }
  $taskJob.innerHTML = (data||[]).map(j=>`<option value="${j.id}">${j.title} — ${j.client_name||''}</option>`).join('');
}

async function openTaskEditor(taskId){
  const { data, error } = await sb.from('tasks').select('*').eq('id', taskId).single();
  if(error){ toast(error.message,'error'); return; }
  await loadUsersIntoSelect();
  $taskId.value = data.id;
  $taskTitle.value = data.title || '';
  $taskAssignee.value = data.assignee || '';
  $taskStatus.value = data.status || 'todo';
  $taskProgress.value = Number(data.progress||0);
  const $note = document.getElementById('task-note'); if($note) $note.value = '';
  $taskModalTitle.textContent = 'Editar tarea';
  await loadJobsIntoTaskSelect();
  if($taskJob){ $taskJob.value = data.job_id || currentJob || ''; }
  if($taskJobWrap) $taskJobWrap.style.display = '';
  try{ await loadTaskUpdates(taskId); }catch(e){}
  openDialog(document.getElementById('modal-task'));
}

// Registrar actualización de tarea
async function addTaskUpdate(taskId, progress, note){
  try{
    const { data: { user } } = await sb.auth.getUser();
    const user_id = user && user.id;
    await sb.from('task_updates').insert({ task_id: taskId, user_id, progress, note: note || null });
  }catch(e){}
}

// Cargar historial de actualizaciones
async function loadTaskUpdates(taskId){
  const box = document.getElementById('task-updates');
  if(!box) return;
  box.innerHTML = '<div class="update-item"><span class="update-meta">Cargando…</span></div>';
  const { data, error } = await sb.from('task_updates')
    .select('task_id,user_id,progress,note,created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending:false });
  if(error){ box.innerHTML = `<div class="update-item"><span class="update-meta">${error.message}</span></div>`; return; }
  const rows = data || [];
  if(!rows.length){ box.innerHTML = '<div class="update-item"><span class="update-meta">Sin movimientos</span></div>'; return; }
  const uids = [...new Set(rows.map(r=>r.user_id).filter(Boolean))];
  let nameMap = {};
  try{
    if(uids.length){
      const { data: ppl } = await sb.from('profiles').select('id,full_name').in('id', uids);
      (ppl||[]).forEach(p=> nameMap[p.id]=p.full_name);
    }
  }catch(e){}
  box.innerHTML = rows.map(r=>{
    const when = r.created_at ? dayjs(r.created_at).format('DD/MM/YYYY HH:mm') : '';
    const who = nameMap[r.user_id] || 'Usuario';
    const prog = (typeof r.progress === 'number') ? ` · ${r.progress}%` : '';
    const note = r.note ? `<div class="update-note">${r.note}</div>` : '';
    return `<div class="update-item"><div class="update-meta">${when} · ${who}${prog}</div>${note}</div>`;
  }).join('');
}

function initSidebarToggle(){
  const shell = document.querySelector('.shell');
  const btn = $btnToggleSidebar;
  if(!shell || !btn) return;
  const saved = localStorage.getItem('sidebar_collapsed');
  if(saved === '1'){ shell.classList.add('collapsed'); }
  btn.onclick = ()=>{
    shell.classList.toggle('collapsed');
    localStorage.setItem('sidebar_collapsed', shell.classList.contains('collapsed') ? '1' : '0');
  };
}
// ---------- Modales ----------
const modalNew = document.getElementById("modal-new");
document.querySelectorAll("#modal-new .tab").forEach(b=>{
  b.onclick=()=>{ document.querySelectorAll("#modal-new .tab,#modal-new .form").forEach(x=>x.classList.remove("active","show"));
    b.classList.add("active"); document.getElementById(b.dataset.tab).classList.add("show"); };
});
function openDialog(dlg){ if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open',''); }
function closeDialog(dlg){ if(dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
// Cerrar con botón [data-close]
document.querySelectorAll("#modal-new [data-close], #modal-task [data-close], #modal-profile [data-close], #modal-edit-job [data-close], #modal-edit-client [data-close], #modal-logout [data-close], #modal-boot [data-close]").forEach(b=>b.onclick=()=> closeDialog(b.closest("dialog")) );
// Cerrar al hacer clic fuera del contenido del modal
document.querySelectorAll('dialog.modal').forEach(dlg=>{
  dlg.addEventListener('click', (e)=>{
    const content = dlg.querySelector('.modal-content');
    if(!content) return;
    const r = content.getBoundingClientRect();
    const x = e.clientX, y = e.clientY;
    const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    if(!inside) closeDialog(dlg);
  });
});
document.getElementById("btn-open-new").onclick=()=>{ openDialog(modalNew); };

// ---------- Clientes ----------
document.getElementById("btn-save-client").onclick = async ()=>{
  const obj = {
    name: document.getElementById("client-name").value.trim(),
    contact_name: document.getElementById("client-contact").value.trim(),
    contact_email: document.getElementById("client-email").value.trim(),
    phone: document.getElementById("client-phone").value.trim(),
    notes: document.getElementById("client-notes").value.trim()
  };
  if(!obj.name){ toast("Nombre del cliente requerido","error"); return; }
  const { error } = await sb.from("clients").insert(obj);
  if(error){ toast(error.message,"error"); return; }
  toast("Cliente guardado","ok");
  await loadClientsIntoSelect(); await updateStats();
};

async function loadClientsIntoSelect(){
  const { data } = await sb.from("clients").select("id,name").order("created_at",{ascending:false});
  const sel = document.getElementById("job-client");
  sel.innerHTML = (data||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
}

// ---------- Jobs ----------
document.getElementById("btn-save-job").onclick = async ()=>{
  const selectedCat = document.getElementById("job-category").value;
  const descriptionInput = document.getElementById("job-desc").value;
  const obj = {
    client_id: document.getElementById("job-client").value || null,
    title: document.getElementById("job-title").value.trim(),
    category: selectedCat,
    description: descriptionInput.trim(),
    start_at: document.getElementById("job-start").value || null,
    due_at: document.getElementById("job-due").value || null
  };
  if(!obj.title){ toast("Título requerido","error"); return; }
  const { error } = await sb.from("jobs").insert(obj);
  if(error){ toast(error.message,"error"); return; }
  toast("Trabajo creado","ok"); closeDialog(modalNew);
  await loadJobs(); await updateStats();
};

document.getElementById("btn-edit-job").onclick = async ()=>{
  if(!currentJob){ toast("Selecciona un trabajo","error"); return; }
  const { data } = await sb.from("jobs").select("*").eq("id", currentJob).single();
  const newTitle = prompt("Nuevo título:", data.title);
  if(newTitle && newTitle.trim()!==data.title){
    const { error } = await sb.from("jobs").update({ title:newTitle.trim() }).eq("id", currentJob);
    if(error){ toast(error.message,"error"); return; }
    await loadJobs(); await loadKanban();
  }
};

// ---------- Tareas ----------
const modalTask = document.getElementById("modal-task");
// handler de nueva tarea movido a enhanceUI()

async function loadUsersIntoSelect(){
  const sel = document.getElementById("task-assignee");
  if(!sel) return;
  let me = null;
  try{ me = await getMe(); }catch(e){}
  const manager = me && isManager(me.role);
  let users = [];
  try{
    if(manager){
      const { data, error } = await sb.from("profiles").select("id,full_name,role").order("full_name");
      if(error) throw error;
      users = data || [];
    }else{
      const managerRoles = Array.from(MANAGER_ROLES);
      const list = [];
      if(me) list.push(me);
      const { data: admins, error } = await sb.from("profiles")
        .select("id,full_name,role")
        .in("role", managerRoles)
        .order("full_name");
      if(error) throw error;
      (admins || []).forEach(u=> list.push(u));
      const unique = new Map();
      list.forEach(u=>{ if(u && u.id && !unique.has(u.id)) unique.set(u.id, u); });
      users = Array.from(unique.values()).sort((a,b)=>{
        const nameA = a.full_name || '';
        const nameB = b.full_name || '';
        return nameA.localeCompare(nameB, 'es', { sensitivity:'base' });
      });
    }
  }catch(e){ users = []; }

  const options = [`<option value="">— Sin asignar —</option>`];
  users.forEach(u=>{
    options.push(`<option value="${u.id}">${u.full_name || u.id} (${u.role || ''})</option>`);
  });
  sel.innerHTML = options.join("");
}
document.getElementById("btn-save-task").onclick = async ()=>{
  const obj = {
    job_id: currentJob,
    title: document.getElementById("task-title").value.trim(),
    assignee: document.getElementById("task-assignee").value || null,
    status: document.getElementById("task-status").value,
    progress: Number(document.getElementById("task-progress").value || 0)
  };
  if(!obj.title){ toast("Título requerido","error"); return; }
  const { error } = await sb.from("tasks").insert(obj);
  if(error){ toast(error.message,"error"); return; }
  toast("Tarea creada","ok"); closeDialog(modalTask);
  await loadKanban(); await loadJobs(); await updateStats();
};

// ---------- Perfil ----------
function bindProfileModal(me){
  const dlg = document.getElementById("modal-profile");
  $btnProfile.onclick = async ()=>{
    const m = await getMe();
    try{
      const { data: { user } } = await sb.auth.getUser();
      const $email = document.getElementById("profile-email");
      if($email) $email.value = (user && user.email) || "";
      const fullname = (user && user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || m.full_name || "";
      document.getElementById("profile-name").value = fullname;
    }catch(e){ document.getElementById("profile-name").value = m.full_name || ""; }
    try{
      const { data: { user } } = await sb.auth.getUser();
      const phone = (m && m.numero_telefono) || (user && user.user_metadata && (user.user_metadata.phone || user.user_metadata.phone_number)) || "";
      const $phone = document.getElementById("profile-phone");
      if($phone) $phone.value = phone || "";
      const $avatarUrl = document.getElementById("profile-avatar");
      const $avatarPrev = document.getElementById("profile-avatar-preview");
      if($avatarUrl) $avatarUrl.value = m.avatar_url || "";
      if($avatarPrev) $avatarPrev.src = (m.avatar_url || './assets/logo.png');
      if($avatarUrl && $avatarPrev){ $avatarUrl.oninput = ()=>{ $avatarPrev.src = $avatarUrl.value || './assets/logo.png'; } }
      const $pwd = document.getElementById("profile-password");
      const $pwd2 = document.getElementById("profile-password2");
      if($pwd) $pwd.value = "";
      if($pwd2) $pwd2.value = "";
    }catch(e){}
    openDialog(dlg);
  };
  document.getElementById("btn-save-profile").onclick = async ()=>{
    const full_name = document.getElementById("profile-name").value.trim();
    const phone = (document.getElementById("profile-phone")?.value || "").trim();
    const avatar_url = (document.getElementById("profile-avatar")?.value || "").trim() || null;
    const emailNew = (document.getElementById("profile-email")?.value || "").trim();
    const newPass = (document.getElementById("profile-password")?.value || "").trim();
    const newPass2 = (document.getElementById("profile-password2")?.value || "").trim();
    if(!full_name){ toast("Nombre requerido","error"); return; }
    if(newPass || newPass2){
      if(newPass.length < 8){ toast("La contraseña debe tener al menos 8 caracteres","error"); return; }
      if(newPass !== newPass2){ toast("Las contraseñas no coinciden","error"); return; }
    }
    const { data: { user } } = await sb.auth.getUser();
    // Actualizar perfil (nombre) para sincronizar vistas y asignaciones
    const { error: e1 } = await sb.from("profiles").update({ full_name, avatar_url, numero_telefono: (phone || null) }).eq("id", user.id);
    if(e1){ toast(e1.message,"error"); return; }
    // Actualizar metadata del usuario (teléfono) y contraseña opcional
    try{
      const payload = { data: { phone: phone || null, full_name } };
      if(newPass) payload.password = newPass;
      if(emailNew && emailNew !== user.email) payload.email = emailNew;
      const { error: e2 } = await sb.auth.updateUser(payload);
      if(e2){ toast(e2.message,'error'); return; }
    }catch(err){ toast(String(err),'error'); return; }
    toast("Perfil actualizado","ok"); closeDialog(dlg);
    const { data: { user: user2 } } = await sb.auth.getUser();
    const displayName2 = (user2 && user2.user_metadata && (user2.user_metadata.full_name || user2.user_metadata.name)) || full_name;
    if($userName) $userName.textContent = displayName2;
    try{ await updateBrandValues(); }catch(e){}
  };
}

// ---------- Init ----------
// Mostrar modal de verificación al iniciar
try{ openDialog(document.getElementById('modal-boot')); }catch(e){}
sb.auth.getSession().then(()=>boot()).finally(()=>{
  try{ closeDialog(document.getElementById('modal-boot')); }catch(e){}
});
 
// ---------- Listados (Clientes y Trabajos) ----------
async function loadClientsList(){
  const { data, error } = await sb
    .from("clients")
    .select("id,name,contact_name,contact_email,phone,created_at")
    .order("created_at", { ascending:false });
  if(error){ toast(error.message, "error"); return; }
  const tbody = document.getElementById("clients-tbody");
  if(!tbody) return;
  const q = (document.getElementById('clients-search')?.value || '').toLowerCase();
  const rows = (data||[]).filter(c=>{
    if(!q) return true;
    return [c.name, c.contact_name, c.contact_email, c.phone].join(' ').toLowerCase().includes(q);
  }).map(c=>`
    <tr>
      <td>${c.name||""}</td>
      <td>${c.contact_name||""}</td>
      <td>${c.contact_email ? `<i data-lucide="mail"></i> ${c.contact_email}` : ""}</td>
      <td>${c.phone ? `<i data-lucide="phone"></i> ${c.phone}` : ""}</td>
      <td>${c.created_at ? dayjs(c.created_at).format('DD/MM/YYYY HH:mm') : ''}</td>
      <td>
        <button class="btn btn-ghost small" title="Editar" data-edit-client="${c.id}"><i data-lucide="pencil"></i></button>
        <button class="btn btn-ghost small" title="Eliminar" data-delete-client="${c.id}"><i data-lucide="trash-2"></i></button>
      </td>
    </tr>
  `).join("");
  tbody.innerHTML = rows;
  lucide.createIcons();
  attachClientsTableHandlers();
}

async function loadJobsTable(){
  const { data, error } = await sb
    .from("jobs_view")
    .select("*")
    .neq("status","archived")
    .order("created_at", { ascending:false });
  if(error){ toast(error.message, "error"); return; }
  const tbody = document.getElementById("jobs-tbody");
  if(!tbody) return;
  const q = (document.getElementById('jobs-search')?.value || '').toLowerCase();
  const rows = (data||[]).filter(j=>{
    if(!q) return true;
    return [j.title, j.client_name, j.category, j.status].join(' ').toLowerCase().includes(q);
  }).map(j=>{
    const statusLabel = ({ done:"Completado", on_hold:"Pausado", in_progress:"En progreso" })[j.status] || j.status;
    const eta = j.due_at ? dayjs(j.due_at).format('DD/MM HH:mm') : '';
    return `
      <tr>
        <td>${j.title}</td>
        <td>${j.client_name||""}</td>
        <td>${catPill(j.category)}</td>
        <td><span class="pill">${statusLabel}</span></td>
        <td class="progress-cell"><div class="progress"><span style="width:${j.progress||0}%"></span></div></td>
        <td>${eta}</td>
        <td>
          <button class="btn btn-ghost small" title="Abrir" data-open-job="${j.id}"><i data-lucide="external-link"></i></button>
          <button class="btn btn-ghost small" title="Editar" data-edit-job-row="${j.id}"><i data-lucide="pencil"></i></button>
          <button class="btn btn-ghost small" title="Archivar" data-archive-job="${j.id}"><i data-lucide="archive"></i></button>
        </td>
      </tr>
    `;
  }).join("");
  tbody.innerHTML = rows;
  lucide.createIcons();
  attachJobsTableHandlers();
}

// ---------- Usuarios (solo admin ve todos) ----------
async function loadUsersList(){
  const tbody = document.getElementById('users-tbody');
  const hint = document.getElementById('users-hint');
  if(!tbody) return;
  const me = await getMe();
  const manager = me && isManager(me.role);
  const q = (document.getElementById('users-search')?.value || '').toLowerCase();
  let records = [];
  let hintMsg = '';
  if(manager){
    const { data, error } = await sb
      .from('profiles')
      .select('full_name,role,numero_telefono,created_at')
      .order('created_at',{ascending:false});
    if(error){ tbody.innerHTML=''; if(hint) hint.textContent = error.message; return; }
    records = data || [];
  }else{
    const unique = new Map();
    if(me && me.id){ unique.set(me.id, me); }
    try{
      const { data: managers, error } = await sb
        .from('profiles')
        .select('id,full_name,role,numero_telefono,created_at')
        .in('role', Array.from(MANAGER_ROLES))
        .order('created_at',{ascending:false});
      if(error) throw error;
      (managers || []).forEach(u=>{ if(u && u.id && !unique.has(u.id)) unique.set(u.id, u); });
    }catch(e){ hintMsg = e.message || ''; }
    records = Array.from(unique.values());
    if(!hintMsg) hintMsg = 'Solo los administradores y CEO pueden ver todos los usuarios.';
  }

  records = (records || []).slice().sort((a,b)=>{
    const aDate = a && a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b && b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate;
  });

  const rows = records.filter(u=>{
    if(!q) return true;
    return [u.full_name||'', u.role||'', u.numero_telefono||''].join(' ').toLowerCase().includes(q);
  }).map(u=>`
    <tr>
      <td>${u.full_name||''}</td>
      <td>${u.role||''}</td>
      <td>${u.numero_telefono||''}</td>
      <td>${u.created_at ? dayjs(u.created_at).format('DD/MM/YYYY HH:mm') : ''}</td>
    </tr>
  `).join('');
  tbody.innerHTML = rows;
  if(hint) hint.textContent = hintMsg;
}

const $usersSearch = document.getElementById('users-search');
if($usersSearch) $usersSearch.oninput = ()=> loadUsersList();
const $btnRefUsers = document.getElementById('btn-refresh-users');
if($btnRefUsers) $btnRefUsers.onclick = ()=> loadUsersList();

// Buscadores
const $clientsSearch = document.getElementById('clients-search');
if($clientsSearch) $clientsSearch.oninput = ()=> loadClientsList();
const $jobsSearch = document.getElementById('jobs-search');
if($jobsSearch) $jobsSearch.oninput = ()=> loadJobsTable();

// Handlers de acciones en tablas
function attachClientsTableHandlers(){
  document.querySelectorAll('[data-edit-client]').forEach(b=> b.onclick = ()=> openEditClientModal(b.dataset.editClient));
  document.querySelectorAll('[data-delete-client]').forEach(b=> b.onclick = ()=> deleteClient(b.dataset.deleteClient));
}
async function openEditClientModal(id){
  const { data, error } = await sb.from('clients').select('*').eq('id', id).single();
  if(error){ toast(error.message, 'error'); return; }
  document.getElementById('edit-client-id').value = data.id;
  document.getElementById('edit-client-name').value = data.name||'';
  document.getElementById('edit-client-contact').value = data.contact_name||'';
  document.getElementById('edit-client-email').value = data.contact_email||'';
  document.getElementById('edit-client-phone').value = data.phone||'';
  document.getElementById('edit-client-notes').value = data.notes||'';
  openDialog(document.getElementById('modal-edit-client'));
}
async function deleteClient(id){
  if(!confirm('¿Eliminar cliente? Esta acción no se puede deshacer.')) return;
  const { error } = await sb.from('clients').delete().eq('id', id);
  if(error){ toast(error.message, 'error'); return; }
  toast('Cliente eliminado','ok');
  await loadClientsIntoSelect();
  await loadClientsList();
  await updateStats();
}

function attachJobsTableHandlers(){
  document.querySelectorAll('[data-open-job]').forEach(b=> b.onclick = async ()=>{
    currentJob = b.dataset.openJob; showView('dashboard');
    const titleEl = document.getElementById('kanban-title');
    try{
      const { data } = await sb.from('jobs').select('title').eq('id', currentJob).single();
      if(titleEl && data) titleEl.textContent = data.title;
    }catch(e){}
    await loadKanban(); await loadJobProgressChart();
  });
  document.querySelectorAll('[data-edit-job-row]').forEach(b=> b.onclick = ()=> openEditJobModal(b.dataset.editJobRow));
  document.querySelectorAll('[data-archive-job]').forEach(b=> b.onclick = ()=> archiveJob(b.dataset.archiveJob));
}
async function openEditJobModal(id){
  const { data, error } = await sb.from('jobs').select('*').eq('id', id).single();
  if(error){ toast(error.message,'error'); return; }
  document.getElementById('edit-job-id').value = data.id;
  document.getElementById('edit-job-title').value = data.title||'';
  document.getElementById('edit-job-category').value = data.category||'web';
  document.getElementById('edit-job-status').value = data.status||'in_progress';
  document.getElementById('edit-job-progress').value = Number(data.progress||0);
  document.getElementById('edit-job-start').value = data.start_at ? new Date(data.start_at).toISOString().slice(0,16) : '';
  document.getElementById('edit-job-due').value = data.due_at ? new Date(data.due_at).toISOString().slice(0,16) : '';
  document.getElementById('edit-job-desc').value = data.description||'';
  openDialog(document.getElementById('modal-edit-job'));
}
async function archiveJob(id){
  if(!confirm('¿Archivar trabajo?')) return;
  const { error } = await sb.from('jobs').update({ status:'archived' }).eq('id', id);
  if(error){ toast(error.message,'error'); return; }
  toast('Trabajo archivado','ok');
  await loadJobsTable(); await loadJobs(); await updateStats();
}

// Botones de refresco
const $btnRefClients = document.getElementById('btn-refresh-clients');
if($btnRefClients) $btnRefClients.onclick = ()=> loadClientsList();
const $btnRefJobs = document.getElementById('btn-refresh-jobs');
if($btnRefJobs) $btnRefJobs.onclick = ()=> loadJobsTable();
const $btnRefKanban = document.getElementById('btn-refresh-kanban');
if($btnRefKanban) $btnRefKanban.onclick = async ()=>{ await loadKanban(); await loadJobProgressChart(); };
