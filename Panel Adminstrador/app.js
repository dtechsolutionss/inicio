const $auth = document.getElementById("auth");
const $app  = document.getElementById("app");
const $authBackHome = document.querySelector(".auth-floating-back");
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
const ROLE_PRIORITY = { CEO:0, Administrador:1 };
const BOGOTA_TZ = 'America/Bogota';
const copFormatter = new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 });

let canManageUsers = false;
let supportsBlocking = false;

function isManager(role){
  return MANAGER_ROLES.has(role);
}

function formatBogotaParts(value){
  if(!value) return null;
  try{
    const date = value instanceof Date ? value : new Date(value);
    if(Number.isNaN(date.getTime())) return null;
    const formatter = new Intl.DateTimeFormat('es-CO', {
      timeZone: BOGOTA_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map = {};
    parts.forEach(p=>{ if(p.type !== 'literal') map[p.type] = p.value; });
    return map;
  }catch(e){ return null; }
}

function formatDateTimeBogota(value, includeTime = true){
  const parts = formatBogotaParts(value);
  if(!parts) return '';
  const dateStr = `${parts.day}/${parts.month}/${parts.year}`;
  if(!includeTime) return dateStr;
  if(!parts.hour || !parts.minute) return dateStr;
  return `${dateStr} ${parts.hour}:${parts.minute}`;
}

function formatCurrencyCOP(value){
  if(value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if(Number.isNaN(num)) return '—';
  return copFormatter.format(num);
}

function cleanNumberInputString(str){
  return String(str)
    .replace(/\s+/g, '')
    .replace(/cop/gi, '')
    .replace(/\$/g, '')
    .replace(/[^0-9,\.\-]/g, '');
}

function parseLocalizedNumber(str){
  if(typeof str !== 'string') return null;
  let cleaned = cleanNumberInputString(str);
  if(!cleaned) return null;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  if(hasComma && hasDot){
    if(cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')){
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    }else{
      cleaned = cleaned.replace(/,/g, '');
    }
  }else if(hasComma){
    cleaned = cleaned.replace(/,/g, '.');
  }else if(hasDot){
    const firstDot = cleaned.indexOf('.');
    const secondDot = cleaned.indexOf('.', firstDot + 1);
    if(secondDot !== -1){
      cleaned = cleaned.replace(/\./g, '');
    }else{
      const fractional = cleaned.slice(firstDot + 1);
      if(fractional.length === 3 && cleaned.slice(0, firstDot).length){
        cleaned = cleaned.replace(/\./g, '');
      }
    }
  }
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}

function formatMoneyInputValue(value){
  const num = toNullableNumber(value);
  if(num === null) return '';
  return num.toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:2 });
}

function formatHoursValue(value){
  if(value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if(Number.isNaN(num)) return '—';
  return `${num.toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:2 })} h`;
}

function buildDeltaChip(current, reference, positiveIsGood = false){
  if(current === null || current === undefined || current === '' || reference === null || reference === undefined || reference === ''){
    return '<span class="delta-chip delta-neutral">Sin datos</span>';
  }
  const curr = Number(current);
  const ref = Number(reference);
  if(Number.isNaN(curr) || Number.isNaN(ref)) return '<span class="delta-chip delta-neutral">Sin datos</span>';
  const delta = curr - ref;
  if(Math.abs(delta) < 0.01) return '<span class="delta-chip delta-neutral">En presupuesto</span>';
  const favorable = positiveIsGood ? delta >= 0 : delta <= 0;
  const cls = favorable ? 'delta-positive' : 'delta-negative';
  const label = copFormatter.format(Math.abs(delta));
  const text = favorable ? `A favor ${label}` : `Sobrepasa ${label}`;
  return `<span class="delta-chip ${cls}">${text}</span>`;
}

function buildHoursDelta(real, estimated){
  if(real === null || real === undefined || real === '' || estimated === null || estimated === undefined || estimated === ''){
    return '<span class="delta-chip delta-neutral">Sin datos</span>';
  }
  const r = Number(real);
  const e = Number(estimated);
  if(Number.isNaN(r) || Number.isNaN(e)) return '<span class="delta-chip delta-neutral">Sin datos</span>';
  const delta = r - e;
  if(Math.abs(delta) < 0.01) return '<span class="delta-chip delta-neutral">Dentro del plan</span>';
  const favorable = delta <= 0;
  const cls = favorable ? 'delta-positive' : 'delta-negative';
  const label = `${Math.abs(delta).toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:2 })} h`;
  const text = favorable ? `Ahorro ${label}` : `Extra ${label}`;
  return `<span class="delta-chip ${cls}">${text}</span>`;
}

function toNullableNumber(value){
  if(value === null || value === undefined) return null;
  if(typeof value === 'number'){ return Number.isNaN(value) ? null : value; }
  const str = String(value).trim();
  if(!str) return null;
  const num = parseLocalizedNumber(str);
  return num;
}

function normalizeDateTimeInput(value){
  if(value === null || value === undefined) return null;
  const str = String(value).trim();
  if(!str || !str.includes('T')) return null;
  const [datePart, timePartRaw] = str.split('T');
  if(!datePart || !timePartRaw) return null;
  let timePart = timePartRaw;
  if(timePart.includes('+') || timePart.includes('-')){
    const match = timePart.match(/^(\d{2}:\d{2})(?::\d{2})?/);
    timePart = match ? match[0] : '';
  }
  if(!timePart) return null;
  if(!timePart.includes(':')) return null;
  if(timePart.length === 5){
    timePart = `${timePart}:00`;
  }
  return `${datePart}T${timePart}`;
}

function applyMoneyFormatting(input, value){
  if(!input) return;
  const formatted = formatMoneyInputValue(value !== undefined ? value : input.value);
  input.value = formatted;
}

function attachCurrencyFormatter(input){
  if(!input) return;
  input.addEventListener('input', ()=>{
    const raw = input.value;
    const sanitized = cleanNumberInputString(raw);
    if(raw !== sanitized){
      const pos = input.selectionStart;
      const diff = raw.length - sanitized.length;
      input.value = sanitized;
      try{
        const newPos = typeof pos === 'number' ? Math.max(0, pos - diff) : sanitized.length;
        input.setSelectionRange(newPos, newPos);
      }catch(e){}
    }
  });
  input.addEventListener('focus', ()=>{
    const num = toNullableNumber(input.value);
    if(num !== null){
      input.value = String(num);
      try{ input.select(); }catch(e){}
    }
  });
  input.addEventListener('blur', ()=> applyMoneyFormatting(input));
  applyMoneyFormatting(input);
}

function initMoneyInputs(){
  ['job-budget','job-actual-cost','edit-job-budget','edit-job-actual-cost']
    .map(id=> document.getElementById(id))
    .forEach(el=> attachCurrencyFormatter(el));
}

function getBogotaDateKey(value){
  const parts = formatBogotaParts(value);
  if(!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatForDateInput(date){
  if(!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function formatForTimeInput(date){
  if(!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const hh = String(date.getHours()).padStart(2,'0');
  const mm = String(date.getMinutes()).padStart(2,'0');
  return `${hh}:${mm}`;
}

function getTaskGlobalReferenceDate(){
  const date = ($taskGlobalDate?.value || '').trim();
  const time = ($taskGlobalTime?.value || '').trim();
  if(!date){
    return new Date();
  }
  const iso = `${date}T${time || '00:00'}-05:00`;
  const parsed = new Date(iso);
  if(Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
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
  if(name==='jobs'){ loadJobsTable(); loadArchivedJobsTable(); }
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
const $taskHours = document.getElementById('task-hours');
const $taskAttachmentsInput = document.getElementById('task-attachments');
const $taskAttachmentsList = document.getElementById('task-attachments-list');
const $taskDeliverableInput = document.getElementById('task-deliverable-input');
const $taskDeliverablesList = document.getElementById('task-deliverables');
const $btnAddDeliverable = document.getElementById('btn-add-deliverable');
const $taskGlobalFilter = document.getElementById('task-global-filter');
const $taskGlobalDate = document.getElementById('task-global-date');
const $taskGlobalTime = document.getElementById('task-global-time');
const $taskGlobalDateDisplay = document.getElementById('task-global-date-display');
const $taskGlobalList = document.getElementById('task-global-list');
const $btnCompleteTask = document.getElementById('btn-complete-task');

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
  const backAuth = $authBackHome;
  const handler = (e)=>{
    e.preventDefault();
    try{ showLoading('Volviendo a la Web Principal',''); }catch(e){}
    setTimeout(()=>{ window.location.href = '../Web%20Principal/index.html'; }, 550);
  };
  if(back){ back.addEventListener('click', handler); }
  if(backAuth){ backAuth.addEventListener('click', handler); }
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
    if($authBackHome) $authBackHome.classList.remove('hidden');
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
  if($authBackHome) $authBackHome.classList.add('hidden');
  lucide.createIcons();

  bindProfileModal(me);
  await loadClientsIntoSelect();
  await loadUsersIntoSelect();
  await loadJobs();
  await updateStats();
  try{ await loadWidgets(); }catch(e){}
  try{ await loadTaskGlobalList($taskGlobalFilter?.value || 'upcoming'); }catch(e){}
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

async function saveProfileChanges({
  id,
  full_name,
  role,
  numero_telefono,
  avatar_url,
  syncAuth = false,
  authUser = null,
  emailNew = '',
  newPassword = ''
}){
  if(!id) throw new Error('Usuario no válido.');
  const payload = {
    full_name: full_name || null,
    numero_telefono: numero_telefono || null,
    avatar_url: avatar_url || null,
  };
  if(typeof role !== 'undefined'){
    payload.role = role || DEFAULT_ROLE;
  }
  const { data, error } = await sb
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select('id,full_name,role,numero_telefono,avatar_url')
    .maybeSingle();
  if(error) throw error;
  if(syncAuth){
    const user = authUser || (await sb.auth.getUser()).data?.user;
    if(user && user.id === id){
      const authPayload = { data: { full_name, phone: numero_telefono || null } };
      if(newPassword) authPayload.password = newPassword;
      if(emailNew && emailNew !== user.email) authPayload.email = emailNew;
      const { error: authError } = await sb.auth.updateUser(authPayload);
      if(authError) throw authError;
    }
  }
  return data;
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
  const { data: tasks, error } = await sb.from('tasks').select('id,job_id,title,status,progress,created_at,horas_invertidas').eq('assignee', me.id).neq('status','done');
  if(error){ box.innerHTML = `<li class="meta">${error.message}</li>`; return; }
  const jobIds = [...new Set((tasks||[]).map(t=>t.job_id).filter(Boolean))];
  let jobsMap = {};
  if(jobIds.length){ const { data: jobs } = await sb.from('jobs').select('id,title,due_at,presupuesto,costo_real,horas_estimadas,horas_reales').in('id', jobIds); (jobs||[]).forEach(j=> jobsMap[j.id]=j); }
  const rows = (tasks||[]).map(t=>({ t, j: jobsMap[t.job_id] })).filter(x=>x.j && x.j.due_at).sort((a,b)=> new Date(a.j.due_at)-new Date(b.j.due_at)).slice(0,6);
  if(!rows.length){ box.innerHTML = '<li class="meta">Sin próximas entregas</li>'; return; }
  box.innerHTML = rows.map(({t,j})=>{
    const due = formatDateTimeBogota(j.due_at);
    const logged = t.horas_invertidas ? ` · ${formatHoursValue(t.horas_invertidas)} registradas` : '';
    const budgetChip = buildDeltaChip(j.costo_real, j.presupuesto);
    const hoursDelta = buildHoursDelta(j.horas_reales, j.horas_estimadas);
    return `<li><span>${t.title}</span><span class="meta">Entrega ${due}${logged}<br>${budgetChip} ${hoursDelta}</span></li>`;
  }).join('');
}

async function loadOverdue(){
  const box = document.getElementById('w-overdue'); if(!box) return;
  box.innerHTML = '<li class="meta">Cargando…</li>';
  const me = await getMe(); const manager = me && isManager(me.role);
  const { data: tasks, error } = await sb.from('tasks').select('id,job_id,title,status,progress,assignee,horas_invertidas').neq('status','done');
  if(error){ box.innerHTML = `<li class="meta">${error.message}</li>`; return; }
  const filtered = (tasks||[]).filter(t=> manager || t.assignee===me.id);
  const jobIds = [...new Set(filtered.map(t=>t.job_id).filter(Boolean))];
  let jobsMap = {};
  if(jobIds.length){ const { data: jobs } = await sb.from('jobs').select('id,due_at,presupuesto,costo_real,horas_estimadas,horas_reales').in('id', jobIds); (jobs||[]).forEach(j=> jobsMap[j.id]=j); }
  const now = new Date();
  const rows = filtered.map(t=>({ t, j:jobsMap[t.job_id] })).filter(x=>x.j && x.j.due_at && new Date(x.j.due_at) < now).sort((a,b)=> new Date(a.j.due_at)-new Date(b.j.due_at)).slice(0,6);
  if(!rows.length){ box.innerHTML = '<li class="meta">Sin vencidas</li>'; return; }
  box.innerHTML = rows.map(({t,j})=>{
    const due = formatDateTimeBogota(j.due_at);
    const logged = t.horas_invertidas ? ` · ${formatHoursValue(t.horas_invertidas)} registradas` : '';
    const budgetChip = buildDeltaChip(j.costo_real, j.presupuesto);
    const hoursDelta = buildHoursDelta(j.horas_reales, j.horas_estimadas);
    return `<li><span>${t.title}</span><span class="meta">Venció ${due}${logged}<br>${budgetChip} ${hoursDelta}</span></li>`;
  }).join('');
}

async function loadWorkload(){
  const box = document.getElementById('w-workload'); if(!box) return;
  box.innerHTML = '<li class="meta">Cargando…</li>';
  const { data: tasks, error } = await sb.from('tasks').select('assignee,status,job_id,horas_invertidas').neq('status','done');
  if(error){ box.innerHTML = `<li class="meta">${error.message}</li>`; return; }
  const groups = {};
  const jobIds = [...new Set((tasks||[]).map(t=> t.job_id).filter(Boolean))];
  const jobsMap = {};
  if(jobIds.length){
    const { data: jobs } = await sb.from('jobs').select('id,presupuesto,costo_real,horas_estimadas,horas_reales').in('id', jobIds);
    (jobs||[]).forEach(j=>{ if(j && j.id) jobsMap[j.id] = j; });
  }
  (tasks||[]).forEach(t=>{
    const k = t.assignee || 'sin';
    groups[k] = groups[k] || { doing:0, review:0, todo:0, total:0, hoursLogged:0, jobsSeen:new Set(), budgetPlanned:0, budgetActual:0, hoursEstimated:0, hoursReal:0 };
    if(t.status==='doing') groups[k].doing++;
    else if(t.status==='review') groups[k].review++;
    else if(t.status==='todo') groups[k].todo++;
    groups[k].total++;
    const hoursTask = Number(t.horas_invertidas || 0);
    if(!Number.isNaN(hoursTask)) groups[k].hoursLogged += hoursTask;
    const job = jobsMap[t.job_id];
    if(job && !groups[k].jobsSeen.has(job.id)){
      groups[k].jobsSeen.add(job.id);
      const planned = Number(job.presupuesto || 0);
      const actual = Number(job.costo_real || 0);
      if(!Number.isNaN(planned)) groups[k].budgetPlanned += planned;
      if(!Number.isNaN(actual)) groups[k].budgetActual += actual;
      const hEst = Number(job.horas_estimadas || 0);
      const hReal = Number(job.horas_reales || 0);
      if(!Number.isNaN(hEst)) groups[k].hoursEstimated += hEst;
      if(!Number.isNaN(hReal)) groups[k].hoursReal += hReal;
    }
  });
  const ids = Object.keys(groups).filter(k=> k!=='sin');
  let names = {};
  if(ids.length){ const { data: ppl } = await sb.from('profiles').select('id,full_name').in('id', ids); (ppl||[]).forEach(p=> names[p.id]=p.full_name); }
  const rows = Object.entries(groups).map(([id,c])=>({ name: names[id] || (id==='sin'?'Sin asignar':'Usuario'), ...c, jobsSeen: undefined })).sort((a,b)=> b.total-a.total).slice(0,8);
  if(!rows.length){ box.innerHTML = '<li class="meta">Sin datos</li>'; return; }
  box.innerHTML = rows.map(r=>{
    const budgetChip = buildDeltaChip(r.budgetActual, r.budgetPlanned);
    const hoursDelta = (r.hoursEstimated || r.hoursReal) ? buildHoursDelta(r.hoursReal, r.hoursEstimated) : '<span class="delta-chip delta-neutral">Sin horas planificadas</span>';
    const hoursLogged = r.hoursLogged ? `${r.hoursLogged.toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:2 })} h registradas` : 'Sin horas registradas';
    return `<li><span>${r.name}</span><span class="meta">En curso ${r.doing} · En revisión ${r.review} · Total ${r.total}<br>${hoursLogged}<br>${budgetChip} ${hoursDelta}</span></li>`;
  }).join('');
}

async function loadTaskGlobalList(mode = 'upcoming'){
  if(!$taskGlobalList) return;
  const reference = getTaskGlobalReferenceDate();
  if($taskGlobalDateDisplay){
    const label = formatDateTimeBogota(reference) || '--';
    $taskGlobalDateDisplay.textContent = `Fecha seleccionada: ${label}`;
  }
  $taskGlobalList.innerHTML = '<li class="meta">Cargando…</li>';
  let me = null;
  try{ me = await getMe(); }catch(e){}
  const manager = me && isManager(me?.role);
  const nowTs = reference.getTime();
  const referenceDateKey = getBogotaDateKey(reference);
  try{
    if(mode === 'recent'){
      const { data, error } = await sb.from('task_updates')
        .select('task_id,user_id,progress,note,created_at')
        .order('created_at', { ascending:false })
        .limit(10);
      if(error) throw error;
      const rows = (data || []).filter(r=> getBogotaDateKey(r.created_at) === referenceDateKey);
      if(!rows.length){ $taskGlobalList.innerHTML = '<li class="meta">Sin actividad reciente.</li>'; return; }
      const tids = [...new Set(rows.map(r=> r.task_id).filter(Boolean))];
      const uids = [...new Set(rows.map(r=> r.user_id).filter(Boolean))];
      const taskNames = {};
      const userNames = {};
      if(tids.length){
        const { data: tasks } = await sb.from('tasks').select('id,title').in('id', tids);
        (tasks||[]).forEach(t=>{ if(t && t.id) taskNames[t.id] = t.title; });
      }
      if(uids.length){
        const { data: ppl } = await sb.from('profiles').select('id,full_name').in('id', uids);
        (ppl||[]).forEach(p=>{ if(p && p.id) userNames[p.id] = p.full_name; });
      }
      $taskGlobalList.innerHTML = rows.map(r=>{
        const title = taskNames[r.task_id] || 'Tarea';
        const who = userNames[r.user_id] || 'Usuario';
        const when = formatDateTimeBogota(r.created_at);
        const prog = typeof r.progress === 'number' ? ` · ${r.progress}%` : '';
        const note = r.note ? ` · ${r.note}` : '';
        return `<li class="is-recent"><span>${title}</span><span class="meta">${when} · ${who}${prog}${note}</span></li>`;
      }).join('');
      return;
    }

    if(mode === 'team'){
      const { data: tasks, error } = await sb.from('tasks').select('assignee,status,job_id,horas_invertidas').neq('status','done');
      if(error) throw error;
      const jobIds = [...new Set((tasks||[]).map(t=> t.job_id).filter(Boolean))];
      const jobsMap = {};
      if(jobIds.length){
        const { data: jobs } = await sb.from('jobs').select('id,due_at,presupuesto,costo_real,horas_estimadas,horas_reales').in('id', jobIds);
        (jobs||[]).forEach(j=>{ if(j && j.id) jobsMap[j.id] = j; });
      }
      const groups = {};
      (tasks||[])
        .map(task=>({ task, job: jobsMap[task.job_id] }))
        .filter(x=> x.job && x.job.due_at && getBogotaDateKey(x.job.due_at) === referenceDateKey)
        .forEach(({ task: t })=>{
        const key = t.assignee || 'sin';
        groups[key] = groups[key] || { total:0, doing:0, review:0, todo:0, hoursLogged:0, jobsSeen:new Set(), budgetPlanned:0, budgetActual:0, hoursEstimated:0, hoursReal:0 };
        if(t.status==='doing') groups[key].doing++;
        else if(t.status==='review') groups[key].review++;
        else if(t.status==='todo') groups[key].todo++;
        groups[key].total++;
        const hoursTask = Number(t.horas_invertidas || 0);
        if(!Number.isNaN(hoursTask)) groups[key].hoursLogged += hoursTask;
        const job = jobsMap[t.job_id];
        if(job && !groups[key].jobsSeen.has(job.id)){
          groups[key].jobsSeen.add(job.id);
          const planned = Number(job.presupuesto || 0);
          const actual = Number(job.costo_real || 0);
          if(!Number.isNaN(planned)) groups[key].budgetPlanned += planned;
          if(!Number.isNaN(actual)) groups[key].budgetActual += actual;
          const hEst = Number(job.horas_estimadas || 0);
          const hReal = Number(job.horas_reales || 0);
          if(!Number.isNaN(hEst)) groups[key].hoursEstimated += hEst;
          if(!Number.isNaN(hReal)) groups[key].hoursReal += hReal;
        }
      });
      const ids = Object.keys(groups).filter(k=> k !== 'sin' && k);
      const names = { sin: 'Sin asignar' };
      if(ids.length){
        const { data: ppl } = await sb.from('profiles').select('id,full_name').in('id', ids);
        (ppl||[]).forEach(p=>{ if(p && p.id) names[p.id] = p.full_name || p.id; });
      }
      const rows = Object.entries(groups).map(([id, stats])=>({
        id,
        name: names[id] || (id==='sin' ? 'Sin asignar' : 'Usuario'),
        ...stats,
        jobsSeen: undefined
      })).sort((a,b)=> b.total - a.total).slice(0,8);
      if(!rows.length){ $taskGlobalList.innerHTML = '<li class="meta">Sin tareas activas.</li>'; return; }
      $taskGlobalList.innerHTML = rows.map(r=>{
        const budgetChip = buildDeltaChip(r.budgetActual, r.budgetPlanned);
        const hoursDelta = (r.hoursEstimated || r.hoursReal) ? buildHoursDelta(r.hoursReal, r.hoursEstimated) : '<span class="delta-chip delta-neutral">Sin horas planificadas</span>';
        const hoursLogged = r.hoursLogged ? `${r.hoursLogged.toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:2 })} h registradas` : 'Sin horas registradas';
        return `
          <li class="is-team">
            <span>${r.name}</span>
            <span class="meta">Tareas ${r.total} · En curso ${r.doing} · Revisión ${r.review}<br>${hoursLogged}<br>${budgetChip} ${hoursDelta}</span>
          </li>
        `;
      }).join('');
      return;
    }

    if(!me){ $taskGlobalList.innerHTML = '<li class="meta">Inicia sesión para ver tus tareas.</li>'; return; }
    const { data: tasks, error } = await sb.from('tasks')
      .select('id,title,status,progress,assignee,job_id,horas_invertidas')
      .neq('status','done');
    if(error) throw error;
    const pool = (tasks||[]).filter(t=>{
      if(mode === 'upcoming') return t.assignee === (me && me.id);
      if(manager) return true;
      return t.assignee === (me && me.id);
    });
    const jobIds = [...new Set(pool.map(t=> t.job_id).filter(Boolean))];
    const jobsMap = {};
    if(jobIds.length){
      const { data: jobs } = await sb.from('jobs').select('id,title,due_at,presupuesto,costo_real,horas_estimadas,horas_reales').in('id', jobIds);
      (jobs||[]).forEach(j=>{ if(j && j.id) jobsMap[j.id] = j; });
    }
    const annotated = pool.map(t=>({ t, job: jobsMap[t.job_id] })).filter(x=> x.job && x.job.due_at);
    const cmp = mode === 'overdue'
      ? annotated.filter(x=> new Date(x.job.due_at).getTime() < nowTs)
      : annotated.filter(x=> new Date(x.job.due_at).getTime() >= nowTs);
    cmp.sort((a,b)=> new Date(a.job.due_at) - new Date(b.job.due_at));
    if(!cmp.length){
      $taskGlobalList.innerHTML = mode === 'overdue'
        ? '<li class="meta">Sin tareas vencidas.</li>'
        : '<li class="meta">Sin próximas cargas.</li>';
      return;
    }
    $taskGlobalList.innerHTML = cmp.slice(0,8).map(({ t, job })=>{
      const due = job && job.due_at ? formatDateTimeBogota(job.due_at) : '';
      const cls = mode === 'overdue' ? 'is-overdue' : 'is-upcoming';
      const metaLabel = mode === 'overdue' ? `Venció ${due}` : `Entrega ${due}`;
      const budgetChip = buildDeltaChip(job?.costo_real, job?.presupuesto);
      const hoursDelta = buildHoursDelta(job?.horas_reales, job?.horas_estimadas);
      const hoursLogged = t.horas_invertidas ? ` · Horas registradas ${formatHoursValue(t.horas_invertidas)}` : '';
      return `<li class="${cls}"><span>${t.title || job?.title || 'Tarea'}</span><span class="meta">${metaLabel}${hoursLogged}<br>${budgetChip} ${hoursDelta}</span></li>`;
    }).join('');
  }catch(err){
    $taskGlobalList.innerHTML = `<li class="meta">${err?.message || 'No fue posible cargar la información.'}</li>`;
  }
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
    const when = formatDateTimeBogota(r.created_at);
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
const TASK_ATTACHMENTS_BUCKET = 'task-attachments';
let currentTaskDeliverables = [];
let currentTaskAttachments = [];

function resetTaskModalExtras(){
  currentTaskDeliverables = [];
  currentTaskAttachments = [];
  if($taskHours) $taskHours.value = '';
  if($taskAttachmentsInput) $taskAttachmentsInput.value = '';
  renderTaskDeliverables();
  renderTaskAttachments();
}

if($btnAddDeliverable){
  $btnAddDeliverable.onclick = ()=>{
    const label = ($taskDeliverableInput?.value || '').trim();
    if(!label){ toast('Escribe el nombre del entregable.','error'); return; }
    currentTaskDeliverables.push({ label, done:false });
    if($taskDeliverableInput) $taskDeliverableInput.value = '';
    renderTaskDeliverables();
  };
}
if($taskDeliverablesList){
  $taskDeliverablesList.addEventListener('change', (e)=>{
    const input = e.target.closest('input[data-deliverable-index]');
    if(!input) return;
    const idx = Number(input.dataset.deliverableIndex);
    if(Number.isInteger(idx) && currentTaskDeliverables[idx]){
      currentTaskDeliverables[idx].done = input.checked;
    }
  });
  $taskDeliverablesList.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-remove-deliverable]');
    if(!btn) return;
    const idx = Number(btn.dataset.removeDeliverable);
    if(Number.isInteger(idx)){
      currentTaskDeliverables.splice(idx,1);
      renderTaskDeliverables();
    }
  });
}
if($taskAttachmentsList){
  $taskAttachmentsList.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-remove-attachment]');
    if(!btn) return;
    const id = btn.dataset.removeAttachment;
    if(id) deleteTaskAttachment(id);
  });
}

function renderTaskDeliverables(){
  if(!$taskDeliverablesList) return;
  if(!currentTaskDeliverables.length){
    $taskDeliverablesList.innerHTML = '<li class="attachment-empty">Sin entregables registrados.</li>';
    lucide.createIcons();
    return;
  }
  $taskDeliverablesList.innerHTML = currentTaskDeliverables.map((item, idx)=>{
    const safeLabel = item?.label || `Entregable ${idx+1}`;
    const checked = item?.done ? 'checked' : '';
    const notes = item?.notes ? `<span class="deliverable-meta">${item.notes}</span>` : '';
    return `
      <li>
        <div class="deliverable-item">
          <label>
            <input type="checkbox" data-deliverable-index="${idx}" ${checked}>
            <span>${safeLabel}</span>
          </label>
          ${notes}
        </div>
        <button type="button" title="Eliminar" data-remove-deliverable="${idx}"><i data-lucide="x"></i></button>
      </li>
    `;
  }).join('');
  lucide.createIcons();
}

function renderTaskAttachments(){
  if(!$taskAttachmentsList) return;
  if(!currentTaskAttachments.length){
    $taskAttachmentsList.innerHTML = '<li class="attachment-empty">Sin adjuntos</li>';
    lucide.createIcons();
    return;
  }
  $taskAttachmentsList.innerHTML = currentTaskAttachments.map(att=>{
    const safeName = att?.file_name || 'Archivo';
    const url = att?.file_url || '#';
    const id = att?.id || '';
    return `
      <li>
        <a href="${url}" target="_blank" rel="noopener">${safeName}</a>
        <div class="attachment-actions">
          <button type="button" title="Eliminar adjunto" data-remove-attachment="${id}"><i data-lucide="trash-2"></i></button>
        </div>
      </li>
    `;
  }).join('');
  lucide.createIcons();
}

async function loadTaskAttachments(taskId){
  if(!taskId){ currentTaskAttachments = []; renderTaskAttachments(); return; }
  try{
    const { data, error } = await sb
      .from('task_attachments')
      .select('id,task_id,file_name,file_path,file_url,created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending:false });
    if(error) throw error;
    currentTaskAttachments = data || [];
  }catch(err){
    toast(err?.message || 'No fue posible cargar los adjuntos.', 'error');
    currentTaskAttachments = [];
  }
  renderTaskAttachments();
}

async function deleteTaskAttachment(id){
  if(!id) return;
  const att = currentTaskAttachments.find(a=> a.id === id);
  try{
    if(att?.file_path){
      await sb.storage.from(TASK_ATTACHMENTS_BUCKET).remove([att.file_path]);
    }
  }catch(e){}
  try{
    await sb.from('task_attachments').delete().eq('id', id);
    currentTaskAttachments = currentTaskAttachments.filter(a=> a.id !== id);
    renderTaskAttachments();
    toast('Adjunto eliminado','ok');
  }catch(err){
    toast(err?.message || 'No fue posible eliminar el adjunto.','error');
  }
}

function sanitizeFileName(name){
  return (name || 'archivo')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9._-]+/g,'_');
}

async function uploadTaskAttachments(taskId, files = []){
  if(!taskId || !files.length) return [];
  const uploaded = [];
  for(const file of files){
    const extSafe = sanitizeFileName(file.name || 'archivo');
    const path = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${extSafe}`;
    const { error: upError } = await sb.storage
      .from(TASK_ATTACHMENTS_BUCKET)
      .upload(path, file, { upsert:false, contentType: file.type || undefined });
    if(upError){ throw upError; }
    const { data: pub } = sb.storage.from(TASK_ATTACHMENTS_BUCKET).getPublicUrl(path);
    const file_url = pub?.publicUrl || '';
    const record = {
      task_id: taskId,
      file_name: file.name,
      file_path: path,
      file_url
    };
    const { data, error } = await sb
      .from('task_attachments')
      .insert(record)
      .select()
      .single();
    if(error) throw error;
    uploaded.push(data);
  }
  return uploaded;
}

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

  const jobIds = rows.map(j=> j.id).filter(Boolean);
  let jobDetailsMap = {};
  if(jobIds.length){
    try{
      const { data: jobDetails } = await sb
        .from('jobs')
        .select('id,presupuesto,costo_real,horas_estimadas,horas_reales')
        .in('id', jobIds);
      (jobDetails || []).forEach(job=>{
        if(job && job.id) jobDetailsMap[job.id] = job;
      });
    }catch(err){
      console.error('No se pudieron cargar los detalles de presupuesto de los proyectos', err);
    }
  }

  $grid.innerHTML = rows.map(j=>{
    const detail = jobDetailsMap[j.id] || {};
    const presupuesto = detail.presupuesto ?? j.presupuesto;
    const costoReal = detail.costo_real ?? j.costo_real;
    const horasEst = detail.horas_estimadas ?? j.horas_estimadas;
    const horasReal = detail.horas_reales ?? j.horas_reales;
    const budget = formatCurrencyCOP(presupuesto);
    const actual = formatCurrencyCOP(costoReal);
    const hoursEstDisplay = formatHoursValue(horasEst);
    const hoursRealDisplay = formatHoursValue(horasReal);
    const eta = j.due_at ? `Entrega ${formatDateTimeBogota(j.due_at)}` : '';
    const deltaBudget = buildDeltaChip(costoReal, presupuesto);
    const deltaHours = buildHoursDelta(horasReal, horasEst);
    return `
      <article class="job" data-id="${j.id}" style="${statusColor(j.status)}">
        <div class="row">
          <div class="title">${j.title}</div>
          <div class="tags"><span class="pill">${catPill(j.category)}</span></div>
        </div>
        <div class="subrow"><span class="pill st-${j.status}">${statusLabel(j.status)}</span></div>
        <div class="row">
          <small class="muted">${j.client_name||''}</small>
          <small class="muted">${eta}</small>
        </div>
        <div class="progress"><span style="width:${j.progress||0}%"></span></div>
        <div class="job-finance">
          <div class="meta-row"><span>Presupuesto</span><strong>${budget}</strong></div>
          <div class="meta-row"><span>Costo real</span><span>${actual}</span>${deltaBudget}</div>
          <div class="meta-row"><span>Horas</span><span class="hours-chip">Real ${hoursRealDisplay} · Est. ${hoursEstDisplay}</span>${deltaHours}</div>
        </div>
      </article>
    `;
  }).join("");

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
        await loadTaskGlobalList($taskGlobalFilter?.value || 'upcoming');
        await loadWidgets();
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
  initMoneyInputs();
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
        resetTaskModalExtras();
        $taskModalTitle.textContent='Nueva tarea';
        await loadJobsIntoTaskSelect();
        if(currentJob){
          $taskJob.value = currentJob;
          if($taskJobWrap) $taskJobWrap.style.display = 'none';
        } else {
          if($taskJobWrap) $taskJobWrap.style.display = '';
        }
        await loadTaskAttachments(null);
      }catch(e){}
      if($btnCompleteTask){ $btnCompleteTask.style.display = 'none'; }
      openDialog(document.getElementById('modal-task'));
    };
  }
  if(btnSaveTask){
    btnSaveTask.onclick = async ()=>{
      const job_id = currentJob || ($taskJob && $taskJob.value) || null;
      const title = document.getElementById('task-title').value.trim();
      if(!title){ toast('Título requerido','error'); return; }
      if(!job_id){ toast('Selecciona un trabajo','error'); return; }
      const progressValue = Number(document.getElementById('task-progress').value || 0);
      const hoursValueRaw = $taskHours ? $taskHours.value : '';
      let horas_invertidas = null;
      if(hoursValueRaw !== '' && hoursValueRaw !== null && hoursValueRaw !== undefined){
        const parsedHours = Number(hoursValueRaw);
        if(!Number.isNaN(parsedHours)) horas_invertidas = parsedHours;
      }
      const deliverablesPayload = currentTaskDeliverables.map(item=>({
        label: item?.label || 'Entregable',
        done: !!item?.done,
        notes: item?.notes ? String(item.notes) : undefined
      }));
      const payload = {
        job_id,
        title,
        assignee: document.getElementById('task-assignee').value || null,
        status: document.getElementById('task-status').value,
        progress: Number.isNaN(progressValue) ? 0 : progressValue,
        horas_invertidas,
        deliverables: deliverablesPayload.length ? deliverablesPayload : null
      };
      const note = (document.getElementById('task-note')?.value || '').trim();
      const files = $taskAttachmentsInput ? Array.from($taskAttachmentsInput.files || []) : [];
      const id = document.getElementById('task-id').value;
      try{
        if(id){
          await updateTaskRecord(id, payload, note, files);
          toast('Tarea actualizada','ok');
        }else{
          await saveTaskRecord(payload, note, files);
          toast('Tarea creada','ok');
        }
      }catch(err){
        toast(err?.message || 'No fue posible guardar la tarea.','error');
        return;
      }
      if($taskAttachmentsInput) $taskAttachmentsInput.value = '';
      closeDialog(document.getElementById('modal-task'));
      resetTaskModalExtras();
      await loadKanban(); await loadJobs(); await updateStats();
      await loadTaskGlobalList($taskGlobalFilter?.value || 'upcoming');
      await loadWidgets();
    };
  }
  if(btnDeleteTask){
    btnDeleteTask.onclick = async ()=>{
      const id = document.getElementById('task-id').value;
      if(!id){ closeDialog(document.getElementById('modal-task')); return; }
      if(!confirm('¿Eliminar tarea?')) return;
      let attachments = [];
      try{
        const { data } = await sb.from('task_attachments').select('id,file_path').eq('task_id', id);
        attachments = data || [];
      }catch(e){}
      if(attachments.length){
        const ids = attachments.map(a=> a.id).filter(Boolean);
        const paths = attachments.map(a=> a.file_path).filter(Boolean);
        try{
          if(paths.length) await sb.storage.from(TASK_ATTACHMENTS_BUCKET).remove(paths);
        }catch(e){}
        try{
          if(ids.length) await sb.from('task_attachments').delete().in('id', ids);
        }catch(e){}
      }
      const { error } = await sb.from('tasks').delete().eq('id', id);
      if(error){ toast(error.message,'error'); return; }
      toast('Tarea eliminada','ok');
      closeDialog(document.getElementById('modal-task'));
      await loadKanban(); await updateStats();
      await loadTaskGlobalList($taskGlobalFilter?.value || 'upcoming');
      await loadWidgets();
    };
  }
  if($btnCompleteTask){
    $btnCompleteTask.onclick = async ()=>{
      const id = ($taskId?.value || '').trim();
      if(!id){ toast('Selecciona una tarea válida.','error'); return; }
      let me = null;
      try{ me = await getMe(); }catch(e){}
      const manager = me && isManager(me?.role);
      let task = null;
      try{
        const { data, error } = await sb.from('tasks').select('assignee,status').eq('id', id).maybeSingle();
        if(error) throw error;
        task = data;
      }catch(err){ toast(err?.message || 'No fue posible completar la tarea.','error'); return; }
      if(!task){ toast('Tarea no encontrada.','error'); return; }
      if(!manager && task.assignee !== (me && me.id)){ toast('No puedes completar esta tarea.','error'); return; }
      const { error } = await sb.from('tasks').update({ status:'done', progress:100 }).eq('id', id);
      if(error){ toast(error.message,'error'); return; }
      try{ await addTaskUpdate(id, 100, 'Tarea marcada como cumplida'); }catch(e){}
      toast('Tarea completada.','ok');
      if(modalTask) closeDialog(modalTask);
      await loadKanban(); await loadJobs(); await updateStats();
      await loadTaskGlobalList($taskGlobalFilter?.value || 'upcoming');
      await loadWidgets();
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
      await openEditJobModal(currentJob);
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
        start_at: normalizeDateTimeInput(document.getElementById('edit-job-start').value),
        due_at: normalizeDateTimeInput(document.getElementById('edit-job-due').value),
        description: descValue.trim(),
        presupuesto: toNullableNumber(document.getElementById('edit-job-budget')?.value),
        costo_real: toNullableNumber(document.getElementById('edit-job-actual-cost')?.value),
        horas_estimadas: toNullableNumber(document.getElementById('edit-job-hours-estimated')?.value),
        horas_reales: toNullableNumber(document.getElementById('edit-job-hours-real')?.value)
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
  resetTaskModalExtras();
  await loadUsersIntoSelect();
  $taskId.value = data.id;
  $taskTitle.value = data.title || '';
  $taskAssignee.value = data.assignee || '';
  $taskStatus.value = data.status || 'todo';
  $taskProgress.value = Number(data.progress||0);
  if($taskHours){
    const hrs = data.horas_invertidas;
    $taskHours.value = (hrs === null || hrs === undefined) ? '' : Number(hrs);
  }
  const $note = document.getElementById('task-note'); if($note) $note.value = '';
  $taskModalTitle.textContent = 'Editar tarea';
  await loadJobsIntoTaskSelect();
  if($taskJob){ $taskJob.value = data.job_id || currentJob || ''; }
  if($taskJobWrap) $taskJobWrap.style.display = '';
  currentTaskDeliverables = Array.isArray(data.deliverables)
    ? data.deliverables.map(item=>({
        label: item?.label || item?.titulo || 'Entregable',
        done: !!item?.done,
        notes: item?.notes || item?.descripcion || ''
      }))
    : [];
  renderTaskDeliverables();
  await loadTaskAttachments(taskId);
  try{ await loadTaskUpdates(taskId); }catch(e){}
  if($btnCompleteTask){
    let me = null;
    try{ me = await getMe(); }catch(e){}
    const manager = me && isManager(me?.role);
    const canComplete = manager || (me && me.id === data.assignee);
    $btnCompleteTask.style.display = canComplete ? '' : 'none';
    $btnCompleteTask.disabled = !canComplete;
  }
  openDialog(document.getElementById('modal-task'));
}

// Registrar actualización de tarea
async function addTaskUpdate(taskId, progress, note, meta = {}){
  try{
    const { data: { user } } = await sb.auth.getUser();
    const user_id = user && user.id;
    const extras = [];
    if(meta && typeof meta === 'object'){
      if(meta.horas_invertidas !== undefined && meta.horas_invertidas !== null && meta.horas_invertidas !== ''){
        const hrs = Number(meta.horas_invertidas);
        if(!Number.isNaN(hrs)) extras.push(`Horas ${hrs.toLocaleString('es-CO', { minimumFractionDigits:0, maximumFractionDigits:2 })}`);
      }
      if(Array.isArray(meta.deliverables) && meta.deliverables.length){
        const total = meta.deliverables.length;
        const done = meta.deliverables.filter(d=> d && d.done).length;
        extras.push(`Entregables ${done}/${total}`);
      }
    }
    let fullNote = (note || '').trim();
    if(extras.length){
      fullNote = fullNote ? `${fullNote} · ${extras.join(' · ')}` : extras.join(' · ');
    }
    await sb.from('task_updates').insert({ task_id: taskId, user_id, progress, note: fullNote || null });
  }catch(e){}
}

async function saveTaskRecord(payload, note, files){
  const { data, error } = await sb.from('tasks').insert(payload).select().single();
  if(error) throw error;
  await addTaskUpdate(data.id, payload.progress, note || 'Creación de tarea', {
    horas_invertidas: payload.horas_invertidas,
    deliverables: payload.deliverables || []
  });
  if(files && files.length){
    currentTaskAttachments = await uploadTaskAttachments(data.id, files);
    renderTaskAttachments();
  }
  return data;
}

async function updateTaskRecord(id, payload, note, files){
  const { error } = await sb.from('tasks').update(payload).eq('id', id);
  if(error) throw error;
  await addTaskUpdate(id, payload.progress, note || 'Actualización de tarea', {
    horas_invertidas: payload.horas_invertidas,
    deliverables: payload.deliverables || []
  });
  if(files && files.length){
    const uploaded = await uploadTaskAttachments(id, files);
    currentTaskAttachments = [...uploaded, ...currentTaskAttachments];
    renderTaskAttachments();
  }
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
    const when = r.created_at ? formatDateTimeBogota(r.created_at) : '';
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
const modalEditUser = document.getElementById('modal-edit-user');
const $editUserId = document.getElementById('edit-user-id');
const $editUserName = document.getElementById('edit-user-name');
const $editUserRole = document.getElementById('edit-user-role');
const $editUserPhone = document.getElementById('edit-user-phone');
const $editUserAvatar = document.getElementById('edit-user-avatar');
const $editUserAvatarPreview = document.getElementById('edit-user-avatar-preview');
const $btnSaveEditUser = document.getElementById('btn-save-edit-user');
document.querySelectorAll("#modal-new .tab").forEach(b=>{
  b.onclick=()=>{ document.querySelectorAll("#modal-new .tab,#modal-new .form").forEach(x=>x.classList.remove("active","show"));
    b.classList.add("active"); document.getElementById(b.dataset.tab).classList.add("show"); };
});
function openDialog(dlg){ if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open',''); }
function closeDialog(dlg){ if(dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
// Cerrar con botón [data-close]
document.querySelectorAll("#modal-new [data-close], #modal-task [data-close], #modal-profile [data-close], #modal-edit-job [data-close], #modal-edit-client [data-close], #modal-edit-user [data-close], #modal-logout [data-close], #modal-boot [data-close]").forEach(b=>b.onclick=()=> closeDialog(b.closest("dialog")) );
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
if($editUserAvatar){
  updateEditUserAvatarPreview($editUserAvatar.value || '');
  $editUserAvatar.addEventListener('input', ()=> updateEditUserAvatarPreview($editUserAvatar.value));
}
if($btnSaveEditUser){
  $btnSaveEditUser.onclick = async ()=>{
    if(!canManageUsers){ toast('No tienes permisos para editar usuarios.','error'); return; }
    const id = ($editUserId?.value || '').trim();
    if(!id){ toast('Selecciona un usuario válido.','error'); return; }
    const full_name = ($editUserName?.value || '').trim();
    const role = ($editUserRole?.value || DEFAULT_ROLE) || DEFAULT_ROLE;
    const numero_telefono = ($editUserPhone?.value || '').trim();
    const avatar_url = ($editUserAvatar?.value || '').trim();
    try{ showLoading('Actualizando usuario…','Guardando cambios'); }catch(e){}
    try{
      await saveProfileChanges({
        id,
        full_name,
        role,
        numero_telefono,
        avatar_url
      });
    }catch(err){
      hideLoading();
      const msg = err?.message || String(err);
      toast(msg, 'error');
      return;
    }
    hideLoading();
    toast('Usuario actualizado','ok');
    if(modalEditUser) closeDialog(modalEditUser);
    await loadUsersList();
    try{
      const { data: { user } } = await sb.auth.getUser();
      if(user && user.id === id){ await updateBrandValues(); }
    }catch(e){}
  };
}

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
    start_at: normalizeDateTimeInput(document.getElementById("job-start").value),
    due_at: normalizeDateTimeInput(document.getElementById("job-due").value),
    presupuesto: toNullableNumber(document.getElementById('job-budget')?.value),
    costo_real: toNullableNumber(document.getElementById('job-actual-cost')?.value),
    horas_estimadas: toNullableNumber(document.getElementById('job-hours-estimated')?.value),
    horas_reales: toNullableNumber(document.getElementById('job-hours-real')?.value)
  };
  if(!obj.title){ toast("Título requerido","error"); return; }
  const { error } = await sb.from("jobs").insert(obj);
  if(error){ toast(error.message,"error"); return; }
  toast("Trabajo creado","ok"); closeDialog(modalNew);
  await loadJobs(); await updateStats();
};

document.getElementById("btn-edit-job").onclick = async ()=>{
  if(!currentJob){ toast("Selecciona un trabajo","error"); return; }
  try{
    await openEditJobModal(currentJob);
  }catch(e){ toast(e?.message || 'No fue posible cargar el trabajo.','error'); }
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
    try{
      await saveProfileChanges({
        id: user.id,
        full_name,
        numero_telefono: phone,
        avatar_url,
        syncAuth: true,
        authUser: user,
        emailNew,
        newPassword: newPass
      });
    }catch(err){
      const msg = err?.message || String(err);
      toast(msg, 'error');
      return;
    }
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
      <td>${c.created_at ? formatDateTimeBogota(c.created_at) : ''}</td>
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
  const tbody = document.getElementById("jobs-tbody");
  const hint = document.getElementById('jobs-hint');
  if(!tbody) return;
  if(hint) hint.textContent = 'Cargando trabajos…';
  const { data, error } = await sb
    .from("jobs_view")
    .select("*")
    .neq("status","archived")
    .order("created_at", { ascending:false });
  if(error){
    tbody.innerHTML = '';
    if(hint) hint.textContent = error.message;
    toast(error.message, "error");
    return;
  }
  const q = (document.getElementById('jobs-search')?.value || '').toLowerCase();
  const filtered = (data||[]).filter(j=>{
    if(!q) return true;
    return [j.title, j.client_name, j.category, j.status].join(' ').toLowerCase().includes(q);
  });
  const rows = filtered.map(j=>{
    const statusLabel = ({ done:"Completado", on_hold:"Pausado", in_progress:"En progreso" })[j.status] || j.status;
    const eta = j.due_at ? formatDateTimeBogota(j.due_at) : '';
    const budget = formatCurrencyCOP(j.presupuesto);
    const actual = formatCurrencyCOP(j.costo_real);
    const hoursLabel = `Est. ${formatHoursValue(j.horas_estimadas)} · Real ${formatHoursValue(j.horas_reales)}`;
    const deltaBudget = buildDeltaChip(j.costo_real, j.presupuesto);
    const deltaHours = buildHoursDelta(j.horas_reales, j.horas_estimadas);
    return `
      <tr>
        <td>${j.title}</td>
        <td>${j.client_name||""}</td>
        <td>${catPill(j.category)}</td>
        <td><span class="pill">${statusLabel}</span></td>
        <td class="progress-cell"><div class="progress"><span style="width:${j.progress||0}%"></span></div></td>
        <td>${budget}</td>
        <td>${actual}<br>${deltaBudget}</td>
        <td><span class="hours-chip">${hoursLabel}</span><br>${deltaHours}</td>
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
  if(hint){
    hint.textContent = filtered.length ? 'Trabajos activos ordenados por fecha.' : 'Sin trabajos activos para mostrar.';
  }
  lucide.createIcons();
  attachJobsTableHandlers();
}

async function loadArchivedJobsTable(){
  const tbody = document.getElementById('jobs-archived-tbody');
  const hint = document.getElementById('jobs-archived-hint');
  if(!tbody) return;
  if(hint) hint.textContent = 'Cargando archivados…';
  const { data, error } = await sb
    .from('jobs_view')
    .select('*')
    .eq('status', 'archived')
    .order('created_at', { ascending:false });
  if(error){
    tbody.innerHTML = '';
    if(hint) hint.textContent = error.message || 'No fue posible cargar los trabajos archivados.';
    toast(error.message || 'No fue posible cargar los trabajos archivados.', 'error');
    return;
  }
  const rowsData = (data || []).slice().sort((a,b)=>{
    const aKey = a.archived_at || a.updated_at || a.created_at || '';
    const bKey = b.archived_at || b.updated_at || b.created_at || '';
    if(!aKey && !bKey) return 0;
    if(!aKey) return 1;
    if(!bKey) return -1;
    return new Date(bKey).getTime() - new Date(aKey).getTime();
  });
  const q = (document.getElementById('jobs-search')?.value || '').toLowerCase();
  const filtered = rowsData.filter(j=>{
    if(!q) return true;
    return [j.title, j.client_name, j.category].join(' ').toLowerCase().includes(q);
  });
  const rows = filtered.map(j=>{
    const archivedAt = j.archived_at || j.updated_at || j.created_at;
    const when = archivedAt ? formatDateTimeBogota(archivedAt) : '';
    const budget = formatCurrencyCOP(j.presupuesto);
    const actual = formatCurrencyCOP(j.costo_real);
    const hoursReal = formatHoursValue(j.horas_reales);
    return `
      <tr>
        <td>${j.title}</td>
        <td>${j.client_name||''}</td>
        <td>${catPill(j.category)}</td>
        <td>${budget}</td>
        <td>${actual}</td>
        <td>${hoursReal}</td>
        <td>${when}</td>
      </tr>
    `;
  }).join('');
  tbody.innerHTML = rows;
  if(hint){
    hint.textContent = filtered.length ? 'Historial de trabajos archivados.' : 'Sin trabajos archivados.';
  }
}

// ---------- Empleados (solo admin ve todos) ----------
function rolePriority(role){
  return ROLE_PRIORITY[role] ?? 2;
}

async function loadUsersList(){
  const tbody = document.getElementById('users-tbody');
  const hint = document.getElementById('users-hint');
  if(!tbody) return;
  let me = null;
  try{ me = await getMe(); }catch(e){}
  const manager = me && isManager(me.role);
  canManageUsers = !!manager;
  const q = (document.getElementById('users-search')?.value || '').toLowerCase();
  let records = [];
  let hintMsg = '';
  let allowBlocking = false;
  try{
    if(manager){
      let query = sb
        .from('profiles')
        .select('*')
        .order('created_at',{ascending:false});
      if(me && me.role === 'Administrador') query = query.neq('role','CEO');
      const { data, error } = await query;
      if(error) throw error;
      records = data || [];
    }else{
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .neq('role','CEO')
        .neq('role','Administrador')
        .order('created_at',{ascending:false});
      if(error) throw error;
      records = data || [];
      hintMsg = 'Solo ves a los empleados operativos.';
    }
    allowBlocking = (records||[]).some(row=> Object.prototype.hasOwnProperty.call(row || {}, 'is_blocked'));
    supportsBlocking = allowBlocking;
    if(manager){
      hintMsg = allowBlocking
        ? 'Puedes editar, bloquear o eliminar desde las acciones.'
        : 'Puedes editar o eliminar desde las acciones.';
    }
  }catch(err){
    tbody.innerHTML = '';
    if(hint) hint.textContent = err?.message || 'No fue posible cargar los empleados.';
    return;
  }

  const unique = new Map();
  (records||[]).forEach(u=>{ if(u && u.id && !unique.has(u.id)) unique.set(u.id, u); });
  if(me && me.id && !unique.has(me.id)) unique.set(me.id, me);
  records = Array.from(unique.values());

  records = records.slice().sort((a,b)=>{
    const aRole = rolePriority(a?.role);
    const bRole = rolePriority(b?.role);
    if(aRole !== bRole) return aRole - bRole;
    const aName = (a?.full_name || '').toLowerCase();
    const bName = (b?.full_name || '').toLowerCase();
    if(aName && bName && aName !== bName) return aName.localeCompare(bName, 'es', { sensitivity:'base' });
    const aDate = a && a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b && b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate;
  });

  const filtered = records.filter(u=>{
    if(!q) return true;
    return [u.full_name||'', u.role||'', u.numero_telefono||''].join(' ').toLowerCase().includes(q);
  });
  const rows = filtered.map(u=>{
    const blocked = allowBlocking && !!u.is_blocked;
    const rowClass = blocked ? ' class="is-blocked"' : '';
    const blockedTag = blocked ? '<small class="blocked-label">Bloqueado</small>' : '';
    const isSelf = me && u && u.id === me.id;
    const manageable = manager && u && u.id && (me?.role === 'CEO' || u.role !== 'CEO');
    const editBtn = manageable
      ? `<button class="btn btn-ghost small" title="Editar empleado" data-edit-user="${u.id}"><i data-lucide="pencil"></i></button>`
      : '';
    const blockAction = blocked ? 'unblock' : 'block';
    const blockIcon = blocked ? 'user-check' : 'user-x';
    const blockTitle = blocked ? 'Desbloquear empleado' : 'Bloquear empleado';
    const blockBtn = (allowBlocking && manageable && !isSelf)
      ? `<button class="btn btn-ghost small" title="${blockTitle}" data-block-user="${u.id}" data-block-action="${blockAction}"><i data-lucide="${blockIcon}"></i></button>`
      : '';
    const deleteBtn = (manageable && !isSelf)
      ? `<button class="btn btn-ghost small" title="Eliminar empleado" data-delete-user="${u.id}"><i data-lucide="trash-2"></i></button>`
      : '';
    const actions = manageable ? [editBtn, blockBtn, deleteBtn].filter(Boolean).join('') : '';
    return `
      <tr${rowClass}>
        <td>${u.full_name||''}${blockedTag}</td>
        <td>${u.role||''}</td>
        <td>${u.numero_telefono||''}</td>
        <td>${u.created_at ? formatDateTimeBogota(u.created_at) : ''}</td>
        <td class="actions-cell">${actions}</td>
      </tr>
    `;
  }).join('');
  tbody.innerHTML = rows;
  const thActions = document.querySelector('[data-users-actions]');
  if(thActions){ thActions.style.display = manager ? '' : 'none'; }
  if(!manager){
    tbody.querySelectorAll('.actions-cell').forEach(td=>{ td.style.display='none'; });
  }else{
    tbody.querySelectorAll('.actions-cell').forEach(td=>{ td.style.display=''; });
  }
  if(hint){
    let finalHint = hintMsg;
    if(!filtered.length){
      finalHint = q
        ? 'Sin coincidencias para la búsqueda actual.'
        : (hintMsg || 'Aún no hay empleados registrados.');
    }else if(manager){
      finalHint = allowBlocking
        ? 'Gestiona (editar/bloquear/eliminar) desde la columna de acciones.'
        : 'Gestiona (editar/eliminar) desde la columna de acciones.';
    }
    hint.textContent = finalHint;
  }
  lucide.createIcons();
  if(manager) attachUsersTableHandlers();
}

const $usersSearch = document.getElementById('users-search');
if($usersSearch) $usersSearch.oninput = ()=> loadUsersList();
const $btnRefUsers = document.getElementById('btn-refresh-users');
if($btnRefUsers) $btnRefUsers.onclick = ()=> loadUsersList();
function initTaskGlobalControls(){
  const now = new Date();
  if($taskGlobalDate && !$taskGlobalDate.value){
    $taskGlobalDate.value = formatForDateInput(now);
  }
  if($taskGlobalTime && !$taskGlobalTime.value){
    $taskGlobalTime.value = formatForTimeInput(now);
  }
  const handler = ()=> loadTaskGlobalList($taskGlobalFilter?.value || 'upcoming');
  if($taskGlobalDate) $taskGlobalDate.onchange = handler;
  if($taskGlobalTime) $taskGlobalTime.onchange = handler;
  if($taskGlobalFilter) $taskGlobalFilter.onchange = handler;
}
try{ initTaskGlobalControls(); }catch(e){}

// Buscadores
const $clientsSearch = document.getElementById('clients-search');
if($clientsSearch) $clientsSearch.oninput = ()=> loadClientsList();
const $jobsSearch = document.getElementById('jobs-search');
if($jobsSearch) $jobsSearch.oninput = ()=>{ loadJobsTable(); loadArchivedJobsTable(); };

// Handlers de acciones en tablas
function attachClientsTableHandlers(){
  document.querySelectorAll('[data-edit-client]').forEach(b=> b.onclick = ()=> openEditClientModal(b.dataset.editClient));
  document.querySelectorAll('[data-delete-client]').forEach(b=> b.onclick = ()=> deleteClient(b.dataset.deleteClient));
}
function attachUsersTableHandlers(){
  document.querySelectorAll('[data-edit-user]').forEach(b=>{
    b.onclick = ()=> openEditUserModal(b.dataset.editUser);
  });
  if(supportsBlocking){
    document.querySelectorAll('[data-block-user]').forEach(b=>{
      b.onclick = ()=> toggleUserBlock(b.dataset.blockUser, b.dataset.blockAction);
    });
  }
  document.querySelectorAll('[data-delete-user]').forEach(b=>{
    b.onclick = ()=> deleteUser(b.dataset.deleteUser);
  });
}

async function toggleUserBlock(id, action){
  if(!supportsBlocking){ toast('El bloqueo de empleados no está disponible en este momento.','error'); return; }
  if(!canManageUsers){ toast('No tienes permisos para gestionar empleados.','error'); return; }
  if(!id){ toast('Empleado no válido.','error'); return; }
  const block = action === 'block';
  try{ showLoading(block ? 'Bloqueando empleado…' : 'Reactivando empleado…'); }catch(e){}
  let finalError = null;
  try{
    const payload = { is_blocked: block };
    if(block){ payload.blocked_at = new Date().toISOString(); }
    else { payload.blocked_at = null; }
    let { error } = await sb.from('profiles').update(payload).eq('id', id);
    if(error && error.message && error.message.toLowerCase().includes('blocked_at')){
      const { error: fallback } = await sb.from('profiles').update({ is_blocked: block }).eq('id', id);
      error = fallback;
    }
    if(error) finalError = error;
  }catch(err){ finalError = err; }
  hideLoading();
  if(finalError){ toast(finalError.message || 'No fue posible actualizar el estado.','error'); return; }
  toast(block ? 'Empleado bloqueado.' : 'Empleado habilitado.','ok');
  await loadUsersList();
  await loadUsersIntoSelect();
}

async function deleteUser(id){
  if(!canManageUsers){ toast('No tienes permisos para gestionar empleados.','error'); return; }
  if(!id){ toast('Empleado no válido.','error'); return; }
  if(!confirm('¿Eliminar este empleado? Esta acción es permanente.')) return;
  try{ showLoading('Eliminando empleado…'); }catch(e){}
  const { error } = await sb.from('profiles').delete().eq('id', id);
  hideLoading();
  if(error){ toast(error.message,'error'); return; }
  toast('Empleado eliminado.','ok');
  await loadUsersList();
  await loadUsersIntoSelect();
}
function updateEditUserAvatarPreview(url){
  if(!$editUserAvatarPreview) return;
  const safe = (url || '').trim();
  if(safe){
    $editUserAvatarPreview.onerror = ()=>{
      $editUserAvatarPreview.onerror = null;
      $editUserAvatarPreview.src = './assets/logo.png';
    };
    $editUserAvatarPreview.src = safe;
  }else{
    $editUserAvatarPreview.onerror = null;
    $editUserAvatarPreview.src = './assets/logo.png';
  }
}
async function openEditUserModal(id){
  if(!canManageUsers){ toast('No tienes permisos para editar usuarios.','error'); return; }
  if(!id){ toast('Usuario no válido.','error'); return; }
  let user = null;
  try{
    const { data, error, status } = await sb
      .from('profiles')
      .select('id,full_name,role,numero_telefono,avatar_url')
      .eq('id', id)
      .maybeSingle();
    if(error && status !== 406) throw error;
    if(status === 406 || !data){
      user = null;
    }else{
      user = data;
    }
  }catch(err){
    toast(err?.message || 'No fue posible cargar el usuario.','error');
    return;
  }
  if(!user){ toast('Usuario no encontrado.','error'); return; }
  if($editUserId) $editUserId.value = user.id || '';
  if($editUserName) $editUserName.value = user.full_name || '';
  if($editUserRole){
    const desiredRole = user.role && Array.from($editUserRole.options).some(opt=> opt.value === user.role)
      ? user.role
      : DEFAULT_ROLE;
    $editUserRole.value = desiredRole;
  }
  if($editUserPhone) $editUserPhone.value = user.numero_telefono || '';
  if($editUserAvatar){
    $editUserAvatar.value = user.avatar_url || '';
    updateEditUserAvatarPreview(user.avatar_url || '');
  }
  if(modalEditUser) openDialog(modalEditUser);
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
  const $budget = document.getElementById('edit-job-budget');
  if($budget){
    $budget.value = data.presupuesto ?? '';
    applyMoneyFormatting($budget);
  }
  const $actual = document.getElementById('edit-job-actual-cost');
  if($actual){
    $actual.value = data.costo_real ?? '';
    applyMoneyFormatting($actual);
  }
  document.getElementById('edit-job-hours-estimated').value = data.horas_estimadas ?? '';
  document.getElementById('edit-job-hours-real').value = data.horas_reales ?? '';
  openDialog(document.getElementById('modal-edit-job'));
}
async function archiveJob(id){
  if(!confirm('¿Archivar trabajo?')) return;
  const { error } = await sb.from('jobs').update({ status:'archived' }).eq('id', id);
  if(error){ toast(error.message,'error'); return; }
  toast('Trabajo archivado','ok');
  await loadJobsTable(); await loadArchivedJobsTable(); await loadJobs(); await updateStats();
}

// Botones de refresco
const $btnRefClients = document.getElementById('btn-refresh-clients');
if($btnRefClients) $btnRefClients.onclick = ()=> loadClientsList();
const $btnRefJobs = document.getElementById('btn-refresh-jobs');
if($btnRefJobs) $btnRefJobs.onclick = ()=>{ loadJobsTable(); loadArchivedJobsTable(); };
const $btnRefArchivedJobs = document.getElementById('btn-refresh-archived-jobs');
if($btnRefArchivedJobs) $btnRefArchivedJobs.onclick = ()=> loadArchivedJobsTable();
const $btnRefKanban = document.getElementById('btn-refresh-kanban');
if($btnRefKanban) $btnRefKanban.onclick = async ()=>{ await loadKanban(); await loadJobProgressChart(); };
