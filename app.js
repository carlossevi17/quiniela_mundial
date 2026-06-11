// app.js

// 1. Configuración de Supabase
const SUPABASE_URL = 'https://rlxzdkxkqgtbbhbdowfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseHpka3hrcWd0YmJoYmRvd2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODM1NjYsImV4cCI6MjA5Njc1OTU2Nn0.D-jZt7b3IaJDq8wRGx1i_9ib8F1XIO3W1FqgDc0GIAc';

// Renombramos la variable a "api" para evitar conflicto con la librería global "supabase"
const api = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ESTADO GLOBAL ---
const appState = {
  user: null,
  profile: null,
  matches: [],
  myLeagues: [],
  activeLeagueId: null,
  currentMatchId: null
};

// --- DOM ELEMENTS ---
const elements = {
  navbar: document.getElementById('navbar'),
  authView: document.getElementById('auth-view'),
  leaguesView: document.getElementById('leagues-view'),
  matchesView: document.getElementById('matches-view'),
  rankingView: document.getElementById('ranking-view'),
  matchDetailView: document.getElementById('match-detail-view'),
  
  leagueSelectorContainer: document.getElementById('league-selector-container'),
  globalLeagueSelector: document.getElementById('global-league-selector'),
  myLeaguesList: document.getElementById('my-leagues-list'),
  navBtnMatches: document.getElementById('nav-btn-matches'),
  navBtnRanking: document.getElementById('nav-btn-ranking'),

  createLeagueForm: document.getElementById('create-league-form'),
  joinLeagueForm: document.getElementById('join-league-form'),

  authForm: document.getElementById('auth-form'),
  emailInput: document.getElementById('email'),
  passwordInput: document.getElementById('password'),
  authSubmitBtn: document.getElementById('auth-submit-btn'),
  authError: document.getElementById('auth-error'),
  logoutBtn: document.getElementById('logout-btn'),

  matchesList: document.getElementById('matches-list'),
  adminAddMatch: document.getElementById('admin-add-match'),
  addMatchForm: document.getElementById('add-match-form'),

  rankingList: document.getElementById('ranking-list'),
  currentLeagueName: document.getElementById('current-league-name'),
  rankingLeagueName: document.getElementById('ranking-league-name'),

  adminResultPanel: document.getElementById('admin-result-panel'),
  adminResultForm: document.getElementById('admin-result-form'),
  detailTeams: document.getElementById('detail-teams'),
  detailStatus: document.getElementById('detail-status'),
  detailPredictionsList: document.getElementById('detail-predictions-list'),
  detailPredictionsLocked: document.getElementById('detail-predictions-locked'),
  detailLeagueName: document.getElementById('detail-league-name'),

  editMatchModal: document.getElementById('edit-match-modal'),
  editMatchForm: document.getElementById('edit-match-form'),
  
  nicknameModal: document.getElementById('nickname-modal'),
  nicknameForm: document.getElementById('nickname-form'),
  nicknameInput: document.getElementById('nickname-input')
};

let authMode = 'login'; // 'login' | 'register'

// --- NAVEGACIÓN ---
const app = {
  showView: (viewId) => {
    // Si intenta ir a partidos/ranking sin liga seleccionada, no dejarle
    if ((viewId === 'matches-view' || viewId === 'ranking-view') && !appState.activeLeagueId) {
      alert("Por favor, selecciona o crea una liguilla primero.");
      return app.showView('leagues-view');
    }

    ['auth-view', 'leagues-view', 'matches-view', 'ranking-view', 'match-detail-view'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');
    
    // Save to localStorage
    if (viewId !== 'auth-view') {
      localStorage.setItem('quiniela_currentView', viewId);
    }
    
    if (viewId === 'leagues-view') loadLeaguesView();
    if (viewId === 'matches-view') loadMatches();
    if (viewId === 'ranking-view') loadRanking();
    if (viewId === 'match-detail-view') loadMatchDetail(appState.currentMatchId);
  },

  switchAuthTab: (mode) => {
    authMode = mode;
    document.getElementById('tab-login').classList.toggle('active', mode === 'login');
    document.getElementById('tab-register').classList.toggle('active', mode === 'register');
    elements.authSubmitBtn.textContent = mode === 'login' ? 'Entrar' : 'Registrarse';
    elements.authError.textContent = '';
  },

  switchLeague: (leagueId, { silent = false } = {}) => {
    if (!leagueId) return;
    appState.activeLeagueId = parseInt(leagueId);
    localStorage.setItem('quiniela_activeLeagueId', leagueId);
    
    // Update names in views
    const leagueName = appState.myLeagues.find(l => l.id === appState.activeLeagueId)?.name;
    if(elements.currentLeagueName) elements.currentLeagueName.textContent = leagueName;
    if(elements.rankingLeagueName) elements.rankingLeagueName.textContent = leagueName;
    const detailLg = document.getElementById('detail-league-name');
    if (detailLg) detailLg.textContent = leagueName;

    // Only refresh current view if not called silently during startup
    if (!silent) {
      const activeEl = document.querySelector('.view:not(.hidden)');
      if (!activeEl) return;
      const currentActive = activeEl.id;
      if (currentActive === 'matches-view') loadMatches();
      if (currentActive === 'ranking-view') loadRanking();
      if (currentActive === 'match-detail-view') loadMatchDetail(appState.currentMatchId);
    }
  }
};

// --- AUTHENTICATION ---
elements.authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  elements.authError.textContent = '';
  const email = elements.emailInput.value;
  const password = elements.passwordInput.value;
  
  let error = null;

  if (authMode === 'login') {
    const res = await api.auth.signInWithPassword({ email, password });
    error = res.error;
  } else {
    const res = await api.auth.signUp({ email, password });
    error = res.error;
    if (!error) {
      alert("Registro exitoso. Ya puedes entrar.");
      app.switchAuthTab('login');
      return;
    }
  }

  if (error) {
    elements.authError.textContent = error.message;
  }
});

elements.logoutBtn.addEventListener('click', async () => {
  localStorage.removeItem('quiniela_currentView');
  localStorage.removeItem('quiniela_activeLeagueId');
  localStorage.removeItem('quiniela_currentMatchId');
  await api.auth.signOut();
});

// Token para cancelar ejecuciones paralelas del callback
let authCallToken = 0;

api.auth.onAuthStateChange((event, session) => {
  console.log("Auth state changed:", event, !!session);

  // Cada nueva llamada invalida la anterior
  authCallToken++;
  const myToken = authCallToken;

  // Pequeño delay para que varios eventos en ráfaga solo procesen el último
  setTimeout(() => {
    if (myToken !== authCallToken) return; // Cancelado por llamada más nueva
    handleAuthChange(event, session, myToken);
  }, 50);
});

async function handleAuthChange(event, session, myToken) {
  // Solo mostrar login cuando Supabase confirma SIGNED_OUT
  if (event === 'SIGNED_OUT') {
    appState.user = null;
    appState.profile = null;
    appState.myLeagues = [];
    elements.navbar.classList.add('hidden');
    app.showView('auth-view');
    return;
  }

  // Si no hay sesión, ignorar (puede pasar mientras refresca el token)
  if (!session) return;

  appState.user = session.user;

  try {
    elements.navbar.classList.remove('hidden');

    // Fetch profile
    const { data: profile, error: profileErr } = await api
      .from('profiles').select('*').eq('id', appState.user.id).single();
    if (profileErr) console.error("Error perfil:", profileErr);

    // Si llegó una llamada más nueva mientras esperábamos, abortar
    if (myToken !== authCallToken) return;

    appState.profile = profile;

    // Pedir apodo si es la primera vez
    if (!localStorage.getItem(`quiniela_nick_${appState.user.id}`)) {
      if (elements.nicknameModal) elements.nicknameModal.classList.remove('hidden');
      if (elements.nicknameInput) elements.nicknameInput.value = profile?.display_name || '';
    }

    // Panel admin
    if (profile?.is_admin) {
      elements.adminAddMatch.classList.remove('hidden');
    } else {
      elements.adminAddMatch.classList.add('hidden');
    }

    await loadUserLeagues();

    if (myToken !== authCallToken) return;

    if (appState.myLeagues.length > 0) {
      elements.leagueSelectorContainer.classList.remove('hidden');
      elements.navBtnMatches.style.display = 'block';
      elements.navBtnRanking.style.display = 'block';

      const savedLeagueId = localStorage.getItem('quiniela_activeLeagueId');
      let savedView = localStorage.getItem('quiniela_currentView') || 'matches-view';
      if (savedView === 'loading-view' || savedView === 'auth-view') {
        savedView = 'matches-view';
      }
      const savedMatchId = localStorage.getItem('quiniela_currentMatchId');

      if (savedMatchId) {
        appState.currentMatchId = parseInt(savedMatchId);
      }

      let targetLeagueId = null;
      if (savedLeagueId && appState.myLeagues.some(l => l.id == savedLeagueId)) {
        targetLeagueId = savedLeagueId;
      } else {
        targetLeagueId = appState.myLeagues[0].id;
      }

      elements.globalLeagueSelector.value = targetLeagueId;
      app.switchLeague(targetLeagueId, { silent: true });

      if (savedView === 'match-detail-view' && !appState.currentMatchId) {
        app.showView('matches-view');
      } else {
        app.showView(savedView);
      }
    } else {
      elements.leagueSelectorContainer.classList.add('hidden');
      elements.navBtnMatches.style.display = 'none';
      elements.navBtnRanking.style.display = 'none';
      app.showView('leagues-view');
    }

  } catch (err) {
    console.error("Error al cargar sesión:", err);
    if (appState.user) {
      app.showView('leagues-view');
    } else {
      elements.navbar.classList.add('hidden');
      app.showView('auth-view');
    }
  }
}

// --- LEAGUES ---

async function loadUserLeagues() {
  // Join query to get leagues the user is in
  const { data, error } = await api
    .from('league_members')
    .select('leagues(id, name, join_code)')
    .eq('user_id', appState.user.id);
    
  if (error) return console.error(error);
  
  appState.myLeagues = data.map(d => d.leagues).filter(Boolean);
  
  // Populate global selector
  elements.globalLeagueSelector.innerHTML = '<option value="" disabled>-- Elige Liguilla --</option>';
  appState.myLeagues.forEach(lg => {
    elements.globalLeagueSelector.innerHTML += `<option value="${lg.id}">${lg.name}</option>`;
  });
  
  if (appState.activeLeagueId) {
    elements.globalLeagueSelector.value = appState.activeLeagueId;
  }
}

async function loadLeaguesView() {
  await loadUserLeagues();
  
  elements.myLeaguesList.innerHTML = '';
  if (appState.myLeagues.length === 0) {
    elements.myLeaguesList.innerHTML = '<p class="text-muted">Aún no estás en ninguna liguilla.</p>';
  } else {
    appState.myLeagues.forEach(lg => {
      elements.myLeaguesList.innerHTML += `
        <div class="glass-panel" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4 style="color:var(--primary); font-size:1.2rem;">${lg.name}</h4>
            <span class="text-muted" style="font-size:0.8rem;">Código: ${lg.join_code}</span>
          </div>
          <button class="btn-outline" onclick="elements.globalLeagueSelector.value='${lg.id}'; app.switchLeague('${lg.id}'); app.showView('matches-view');">Ver</button>
        </div>
      `;
    });
  }
}

elements.createLeagueForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('create-league-name').value;
  // Generate random 6 char code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Create league
  const { data: newLeague, error } = await api.from('leagues').insert([{ name, join_code: code, created_by: appState.user.id }]).select().single();
  if (error) return alert("Error al crear: " + error.message);
  
  // Join as member
  await api.from('league_members').insert([{ league_id: newLeague.id, user_id: appState.user.id }]);
  
  alert(`Liguilla creada! Código para tus amigos: ${code}`);
  elements.createLeagueForm.reset();
  
  // Reload UI
  await loadUserLeagues();
  elements.leagueSelectorContainer.classList.remove('hidden');
  elements.navBtnMatches.style.display = 'block';
  elements.navBtnRanking.style.display = 'block';
  elements.globalLeagueSelector.value = newLeague.id;
  app.switchLeague(newLeague.id);
  app.showView('leagues-view');
});

elements.joinLeagueForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('join-league-code').value.toUpperCase();
  
  // Find league by code
  const { data: league, error } = await api.from('leagues').select('*').eq('join_code', code).single();
  
  if (error || !league) return alert("Código no válido o liguilla no encontrada.");
  
  // Join
  const { error: joinError } = await api.from('league_members').insert([{ league_id: league.id, user_id: appState.user.id }]);
  
  if (joinError) return alert("Ya estás en esta liguilla o hubo un error.");
  
  alert(`Te has unido a: ${league.name}`);
  elements.joinLeagueForm.reset();
  
  // Reload UI
  await loadUserLeagues();
  elements.leagueSelectorContainer.classList.remove('hidden');
  elements.navBtnMatches.style.display = 'block';
  elements.navBtnRanking.style.display = 'block';
  elements.globalLeagueSelector.value = league.id;
  app.switchLeague(league.id);
  app.showView('matches-view');
});


// --- LOAD MATCHES & PREDICTIONS (FILTERED BY LEAGUE) ---

async function loadMatches() {
  if (!appState.activeLeagueId) return;

  const { data: matches, error } = await api.from('matches').select('*').order('start_time', { ascending: true });
  if (error) return console.error(error);
  
  appState.matches = matches; // Guardar en estado global para usarlo al editar
  
  // Load predictions ONLY for the current user in the CURRENT LEAGUE
  const { data: userPredictions } = await api.from('predictions')
    .select('*')
    .eq('user_id', appState.user.id)
    .eq('league_id', appState.activeLeagueId);
  
  elements.matchesList.innerHTML = '';

  matches.forEach(match => {
    const prediction = userPredictions?.find(p => p.match_id === match.id);
    const hasStarted = new Date(match.start_time) <= new Date();

    const card = document.createElement('div');
    card.className = 'match-card';
    
    let predictionHtml = '';
    
    if (hasStarted) {
       predictionHtml = `
         <div class="match-score">${match.score_a ?? '-'} : ${match.score_b ?? '-'}</div>
         <p class="text-center" style="font-size:0.9rem; color:var(--text-muted);">Tu pronóstico: ${prediction ? prediction.score_a + '-' + prediction.score_b : 'Ninguno'}</p>
         ${prediction ? `<p class="text-center" style="color:var(--primary);">+${prediction.points} pts</p>` : ''}
       `;
    } else {
       predictionHtml = `
         <div class="prediction-inputs">
           <input type="number" id="pred-a-${match.id}" min="0" value="${prediction?.score_a ?? ''}" placeholder="0">
           <span>-</span>
           <input type="number" id="pred-b-${match.id}" min="0" value="${prediction?.score_b ?? ''}" placeholder="0">
         </div>
       `;
    }

    card.innerHTML = `
      <div class="match-time">${new Date(match.start_time).toLocaleString()}</div>
      <div class="match-teams">
        <span>${match.team_a}</span>
        <span class="match-vs">vs</span>
        <span>${match.team_b}</span>
      </div>
      ${predictionHtml}
      <div class="match-actions" style="margin-top: 1rem;">
        ${!hasStarted ? `<button class="btn-primary" onclick="savePrediction(${match.id})" style="flex:2;">Guardar</button>` : ''}
        <button class="btn-secondary" onclick="viewMatchDetails(${match.id})">Detalles</button>
        ${appState.profile?.is_admin ? `<button class="btn-secondary" onclick="openEditMatch(${match.id})" style="background:rgba(239, 68, 68, 0.2)">Editar</button>` : ''}
      </div>
    `;
    elements.matchesList.appendChild(card);
  });
}

async function loadRanking() {
  if (!appState.activeLeagueId) return;

  // Fetch only members of the current league
  const { data: membersData } = await api
    .from('league_members')
    .select('profiles(id, display_name, email)')
    .eq('league_id', appState.activeLeagueId);
    
  if (!membersData) return;
  const profiles = membersData.map(m => m.profiles).filter(Boolean);

  // Fetch predictions for the current league
  const { data: predictions } = await api
    .from('predictions')
    .select('user_id, points')
    .eq('league_id', appState.activeLeagueId);
  
  let ranking = profiles.map(p => {
    const userPreds = predictions.filter(pr => pr.user_id === p.id);
    const totalPoints = userPreds.reduce((acc, curr) => acc + (curr.points || 0), 0);
    return { ...p, totalPoints };
  });

  ranking.sort((a, b) => b.totalPoints - a.totalPoints);

  elements.rankingList.innerHTML = ranking.map((p, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${p.display_name || p.email}</td>
      <td style="font-weight:bold; color:var(--primary);">${p.totalPoints}</td>
    </tr>
  `).join('');
}

async function viewMatchDetails(matchId) {
  appState.currentMatchId = matchId;
  localStorage.setItem('quiniela_currentMatchId', matchId);
  app.showView('match-detail-view');
}

async function loadMatchDetail(matchId) {
  if (!appState.activeLeagueId) return;

  const { data: match } = await api.from('matches').select('*').eq('id', matchId).single();
  const hasStarted = new Date(match.start_time) <= new Date();

  elements.detailTeams.textContent = `${match.team_a} vs ${match.team_b}`;
  
  if (match.status === 'finished') {
    elements.detailStatus.textContent = `Finalizado (Resultado: ${match.score_a} - ${match.score_b})`;
  } else if (hasStarted) {
    elements.detailStatus.textContent = "En Juego";
  } else {
    elements.detailStatus.textContent = `Empieza el: ${new Date(match.start_time).toLocaleString()}`;
  }

  // Admin logic (Global)
  if (appState.profile?.is_admin && hasStarted) {
    elements.adminResultPanel.classList.remove('hidden');
    document.getElementById('admin-res-a').value = match.score_a ?? '';
    document.getElementById('admin-res-b').value = match.score_b ?? '';
  } else {
    elements.adminResultPanel.classList.add('hidden');
  }

  // Predictions (only for members of current league)
  const { data: membersData } = await api
    .from('league_members')
    .select('profiles(id, display_name, email)')
    .eq('league_id', appState.activeLeagueId);
  const profiles = membersData?.map(m => m.profiles).filter(Boolean) || [];

  const { data: predictions } = await api
    .from('predictions')
    .select('*')
    .eq('match_id', matchId)
    .eq('league_id', appState.activeLeagueId);

  elements.detailPredictionsList.innerHTML = '';
  
  if (hasStarted || appState.profile?.is_admin) {
    elements.detailPredictionsLocked.classList.add('hidden');
    document.querySelector('.predictions-table').classList.remove('hidden');

    profiles.forEach(p => {
      const pred = predictions?.find(pr => pr.user_id === p.id);
      if (pred) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${p.display_name || p.email}</td>
          <td>${pred.score_a} - ${pred.score_b}</td>
          <td style="color:var(--primary)">${match.status === 'finished' ? pred.points : '-'}</td>
        `;
        elements.detailPredictionsList.appendChild(row);
      }
    });
  } else {
    document.querySelector('.predictions-table').classList.add('hidden');
    elements.detailPredictionsLocked.classList.remove('hidden');
  }
}

// --- ACTIONS ---

async function savePrediction(matchId) {
  if (!appState.activeLeagueId) return alert("Selecciona una liguilla primero");

  const score_a = document.getElementById(`pred-a-${matchId}`).value;
  const score_b = document.getElementById(`pred-b-${matchId}`).value;

  if (score_a === '' || score_b === '') return alert("Introduce ambos goles");

  // Upsert for specific match + user + league
  const { error } = await api.from('predictions').upsert({
    user_id: appState.user.id,
    match_id: matchId,
    league_id: appState.activeLeagueId,
    score_a: parseInt(score_a),
    score_b: parseInt(score_b)
  }, { onConflict: 'user_id, match_id, league_id' });

  if (error) {
    alert("Error al guardar: " + error.message);
  } else {
    // Feedback visual rápido
    const btn = event.target;
    const oldText = btn.textContent;
    btn.textContent = "¡Guardado!";
    btn.style.background = "var(--primary-hover)";
    setTimeout(() => {
      btn.textContent = oldText;
      btn.style.background = "var(--primary)";
    }, 1500);
  }
}

// Admin: Add Match (Global)
elements.addMatchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const team_a = document.getElementById('admin-team-a').value;
  const team_b = document.getElementById('admin-team-b').value;
  const start_time = document.getElementById('admin-start-time').value;

  const { error } = await api.from('matches').insert([{ team_a, team_b, start_time: new Date(start_time).toISOString() }]);
  
  if (error) alert("Error: " + error.message);
  else {
    alert("Partido añadido");
    elements.addMatchForm.reset();
    loadMatches();
  }
});

// Admin: Open Edit Match Modal
function openEditMatch(matchId) {
  const match = appState.matches.find(m => m.id === matchId);
  if (!match) return;

  document.getElementById('edit-match-id').value = match.id;
  document.getElementById('edit-team-a').value = match.team_a;
  document.getElementById('edit-team-b').value = match.team_b;
  
  // Ajuste de zona horaria para datetime-local
  const dt = new Date(match.start_time);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  document.getElementById('edit-start-time').value = dt.toISOString().slice(0, 16);
  
  elements.editMatchModal.classList.remove('hidden');
}

// Admin: Save Edited Match
elements.editMatchForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-match-id').value;
  const team_a = document.getElementById('edit-team-a').value;
  const team_b = document.getElementById('edit-team-b').value;
  const start_time = document.getElementById('edit-start-time').value;

  const { error } = await api.from('matches').update({
    team_a,
    team_b,
    start_time: new Date(start_time).toISOString()
  }).eq('id', id);

  if (error) alert("Error: " + error.message);
  else {
    alert("Partido actualizado");
    elements.editMatchModal.classList.add('hidden');
    loadMatches();
  }
});

// Admin: Save Result (Global) -> Triggers points calculation across ALL leagues
elements.adminResultForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const score_a = parseInt(document.getElementById('admin-res-a').value);
  const score_b = parseInt(document.getElementById('admin-res-b').value);

  const { error } = await api.from('matches').update({
    score_a,
    score_b,
    status: 'finished'
  }).eq('id', appState.currentMatchId);

  if (error) alert("Error: " + error.message);
  else {
    alert("Resultado guardado. Los puntos de TODAS las liguillas han sido calculados automáticamente.");
    loadMatchDetail(appState.currentMatchId);
  }
});

// Nickname form
elements.nicknameForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newNick = elements.nicknameInput.value.trim();
  if (!newNick) return;

  const btn = e.target.querySelector('button');
  const oldText = btn.textContent;
  btn.textContent = "Guardando...";
  btn.disabled = true;

  const { error } = await api.from('profiles').update({ display_name: newNick }).eq('id', appState.user.id);
  
  btn.textContent = oldText;
  btn.disabled = false;

  if (error) {
    alert("Error al guardar el apodo: " + error.message);
  } else {
    appState.profile.display_name = newNick;
    localStorage.setItem(`quiniela_nick_${appState.user.id}`, 'true');
    elements.nicknameModal.classList.add('hidden');
    
    // Refresh ranking if active
    const currentActive = document.querySelector('.view:not(.hidden)')?.id;
    if (currentActive === 'ranking-view') loadRanking();
    if (currentActive === 'match-detail-view') loadMatchDetail(appState.currentMatchId);
  }
});

// Admin: Eliminar Partido
async function deleteMatch() {
  const matchId = document.getElementById('edit-match-id').value;
  const match = appState.matches.find(m => m.id == matchId);
  if (!match) return;

  const confirmed = confirm(`¿Seguro que quieres eliminar el partido "${match.team_a} vs ${match.team_b}"?\nEsto borrará también todos los pronósticos asociados.`);
  if (!confirmed) return;

  const { error } = await api.from('matches').delete().eq('id', matchId);

  if (error) {
    alert('Error al eliminar: ' + error.message);
  } else {
    elements.editMatchModal.classList.add('hidden');
    loadMatches();
  }
}

// Make globally available
window.app = app;
window.savePrediction = savePrediction;
window.viewMatchDetails = viewMatchDetails;
window.openEditMatch = openEditMatch;
window.deleteMatch = deleteMatch;
