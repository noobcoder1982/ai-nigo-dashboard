const API_BASE = "http://127.0.0.1:8000";

// --- STATE MANAGEMENT ---
let missionData = null;
let localRoster = [];
try { localRoster = JSON.parse(localStorage.getItem('roster')) || []; } catch(e) { localRoster = []; }
let allChats = [];
try { allChats = JSON.parse(localStorage.getItem('allChats')) || []; } catch(e) { allChats = []; }
let currentChatId = localStorage.getItem('currentChatId') || null;
let stats = { missionsCompleted: 0 };
try { stats = JSON.parse(localStorage.getItem('stats')) || { missionsCompleted: 0 }; } catch(e) { stats = { missionsCompleted: 0 }; }
let currentTheme = localStorage.getItem('theme') || 'light';
let map = null;
let activityMap = null;
let gauge = null;
let startTime = Date.now();
let markers = {};
let polylines = [];

// --- DOM ELEMENTS ---
const elements = {
    get landingView() { return document.getElementById('landing-view'); },
    get landingInput() { return document.getElementById('landing-input'); },
    get landingSendBtn() { return document.getElementById('landing-send-btn'); },
    get mainApp() { return document.getElementById('main-app'); },
    get chatMessages() { return document.getElementById('chat-messages'); },
    get historyList() { return document.getElementById('chat-history-list'); },
    get userInput() { return document.getElementById('user-input'); },
    get sendBtn() { return document.getElementById('send-btn'); },
    get creativitySlider() { return document.getElementById('creativity-slider'); },
    get tempValDisplay() { return document.getElementById('temp-val'); },
    get profileModal() { return document.getElementById('profile-modal'); },
    get modalBody() { return document.getElementById('modal-body'); },
    get closeModal() { return document.getElementById('close-modal'); },
    get deployBtn() { return document.getElementById('deploy-btn'); },
    get newChatBtn() { return document.getElementById('start-new-chat'); },
    get mainThemeBtn() { return document.getElementById('main-theme-btn'); },
    get rosterSearch() { return document.getElementById('roster-search'); },
    get inventoryTbody() { return document.getElementById('inventory-tbody'); }
};

const views = {
    mission: document.getElementById('mission-view'),
    analytics: document.getElementById('analytics-view'),
    roster: document.getElementById('roster-view'),
    welcome: document.getElementById('welcome-view'),
    inventory: document.getElementById('inventory-view'),
    activities: document.getElementById('activities-view')
};

// --- INITIALIZATION ---
function init() {
    try {
        console.log("Initializing NGO AI Command Center...");
        bindEvents();
        
        if (currentTheme === 'dark') document.documentElement.classList.add('dark');
        
        if (allChats.length === 0) {
            createNewChat("Neural uplink active. Awaiting coordinates.");
        } else {
            if (!currentChatId) currentChatId = allChats[0].id;
            loadChat(currentChatId);
        }

        renderHistoryList();
        if (localRoster.length === 0) fetchRoster();
        else renderRoster();

        try { initMap(); } catch(e) { console.error("Map init failed", e); }
        try { initActivityMap(); } catch(e) { console.error("Activity Map init failed", e); }
        try { initGauge(); } catch(e) { console.error("Gauge init failed", e); }
        
        updateAnalytics();
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
        startHealthTimer();
    } catch(e) {
        console.error("Initialization failed:", e);
    }

    // Auto-Recovery Timer
    setInterval(() => {
        try {
            localRoster.forEach(v => {
                if (v.energy < 100) v.energy = Math.min(100, v.energy + 5);
            });
            localStorage.setItem('roster', JSON.stringify(localRoster));
            renderRoster();
            updateAnalytics();
            updateMap();
        } catch(e) {}
    }, 120000);
}

function bindEvents() {
    if (elements.landingSendBtn) elements.landingSendBtn.onclick = handleLandingSend;
    if (elements.sendBtn) elements.sendBtn.onclick = handleSend;
    if (elements.userInput) {
        elements.userInput.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
    }
    if (elements.landingInput) {
        elements.landingInput.onkeydown = e => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleLandingSend(); 
            } 
        };
    }
    if (elements.creativitySlider) {
        elements.creativitySlider.oninput = e => { elements.tempValDisplay.innerText = e.target.value; };
    }
    if (elements.closeModal) {
        elements.closeModal.onclick = () => elements.profileModal.classList.add('hidden');
    }
    if (elements.mainThemeBtn) elements.mainThemeBtn.onclick = toggleTheme;
    if (elements.rosterSearch) elements.rosterSearch.oninput = renderRoster;
    if (elements.deployBtn) elements.deployBtn.onclick = () => window.confirmDispatch();
    if (elements.newChatBtn) elements.newChatBtn.onclick = () => createNewChat();
    
    const addAssetBtn = document.getElementById('add-asset-btn');
    if (addAssetBtn) {
        addAssetBtn.onclick = () => {
            const itemName = prompt("Enter asset name to update:");
            if (itemName) {
                const qty = prompt("Enter additional quantity:");
                if (qty) {
                    alert(`Stock request submitted for ${itemName}. Updated by ${qty} units.`);
                    // In a real app, this would be a POST to /inventory/update
                }
            }
        };
    }

    const traceBtn = document.getElementById('show-thinking-btn');
    if (traceBtn) {
        traceBtn.onclick = () => {
            if (missionData && missionData.ai_reasoning) {
                elements.modalBody.innerHTML = `
                    <h2 style="margin-bottom:16px">Neural Trace Log</h2>
                    <div class="bento-card" style="background:var(--ds-background-200); font-family:var(--font-mono); font-size:12px; white-space:pre-wrap; max-height:400px; overflow-y:auto">
                        ${missionData.ai_reasoning.raw_thinking || "No trace data available for this operation."}
                    </div>
                `;
                elements.profileModal.classList.remove('hidden');
            }
        };
    }

    document.querySelectorAll('.tab').forEach(t => {
        t.onclick = () => {
            showView(t.dataset.tab);
            if (t.dataset.tab === 'inventory') fetchInventory();
            if (t.dataset.tab === 'activities') fetchActivities();
            if (t.dataset.tab === 'analytics' && map) setTimeout(() => map.invalidateSize(), 100);
            if (t.dataset.tab === 'activities' && activityMap) setTimeout(() => activityMap.invalidateSize(), 100);
        };
    });

    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        if (!btn.onclick) {
            btn.onclick = () => {
                const q = btn.getAttribute('data-query');
                if (q && elements.landingInput) {
                    elements.landingInput.value = q;
                    handleLandingSend();
                }
            };
        }
    });

    // Dropdown
    const modelToggle = document.getElementById('model-toggle');
    const modelMenu = document.getElementById('model-menu');
    const currentModelLabel = document.getElementById('current-model');
    if (modelToggle && modelMenu) {
        modelToggle.onclick = (e) => { e.stopPropagation(); const isOpen = modelToggle.classList.toggle('open'); modelMenu.classList.toggle('hidden', !isOpen); };
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.onclick = (e) => { e.stopPropagation(); currentModelLabel.innerText = item.getAttribute('data-model'); document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active')); document.querySelectorAll('.check-icon').forEach(i => i.classList.add('hidden')); item.classList.add('active'); item.querySelector('.check-icon').classList.remove('hidden'); modelToggle.classList.remove('open'); modelMenu.classList.add('hidden'); };
        });
        window.onclick = (e) => { if (modelToggle.classList.contains('open') && !modelToggle.contains(e.target) && !modelMenu.contains(e.target)) { modelToggle.classList.remove('open'); modelMenu.classList.add('hidden'); } };
    }
}

// --- VIEW MANAGEMENT ---
function showView(id) {
    Object.values(views).forEach(v => { if (v) v.classList.add('hidden'); });
    if (views[id]) views[id].classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === id);
    });
}

// --- ENERGY HELPERS ---
function getEnergyColor(p) {
    if (p >= 80) return "var(--energy-100)";
    if (p >= 60) return "var(--energy-80)";
    if (p >= 40) return "var(--energy-60)";
    if (p >= 20) return "var(--energy-40)";
    return "var(--energy-20)";
}

function getStatusInfo(p) {
    if (p >= 90) return { label: "Energized", class: "ready" };
    if (p >= 75) return { label: "Ready", class: "ready" };
    if (p >= 40) return { label: "Moderate", class: "ready" };
    if (p >= 15) return { label: "Fatigued", class: "fatigued" };
    return { label: "Critical", class: "fatigued" };
}

// --- CHAT LOGIC ---
function createNewChat(initialSystemMessage = "New operational session initialized.") {
    const newId = "CHAT_" + Date.now();
    const newChat = {
        id: newId,
        title: "New Operation",
        messages: [{ role: 'system', content: initialSystemMessage }]
    };
    allChats.unshift(newChat);
    currentChatId = newId;
    saveChats();
    loadChat(newId);
    renderHistoryList();
}

function saveChats() {
    localStorage.setItem('allChats', JSON.stringify(allChats));
    localStorage.setItem('currentChatId', currentChatId);
}

function loadChat(id) {
    const chat = allChats.find(c => c.id === id);
    if (!chat) return;
    currentChatId = id;
    if (elements.chatMessages) {
        elements.chatMessages.innerHTML = '';
        chat.messages.forEach(msg => displayMessage(msg.role, msg.content));
    }
    renderHistoryList();
    saveChats();
}

function displayMessage(role, content) {
    if (!elements.chatMessages) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.innerHTML = `<div class="content">${content}</div>`;
    elements.chatMessages.appendChild(msgDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function addMessage(role, content) {
    const chat = allChats.find(c => c.id === currentChatId);
    if (!chat) return;
    chat.messages.push({ role, content });
    if (role === 'user' && chat.title === "New Operation") {
        chat.title = summarizeText(content);
        renderHistoryList();
    }
    displayMessage(role, content);
    saveChats();
}

function summarizeText(text) {
    const words = text.split(' ').slice(0, 4).join(' ');
    return words.length > 25 ? words.substring(0, 22) + "..." : words;
}

function renderHistoryList() {
    if (!elements.historyList) return;
    elements.historyList.innerHTML = '';
    allChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.innerHTML = `<i data-lucide="message-square"></i> ${chat.title}`;
        item.onclick = () => loadChat(chat.id);
        elements.historyList.appendChild(item);
    });
    lucide.createIcons();
}

// --- MISSION ENGINE ---
function handleLandingSend() {
    const text = elements.landingInput.value.trim();
    if (!text) return;
    
    console.log("Submit triggered from landing page:", text);
    
    // Visual feedback
    if (elements.landingSendBtn) {
        elements.landingSendBtn.innerHTML = '<div class="loader-small"></div>';
        elements.landingSendBtn.style.opacity = '0.7';
        elements.landingSendBtn.style.pointerEvents = 'none';
    }

    elements.landingView.classList.add('fade-out');
    
    setTimeout(() => {
        elements.landingView.classList.add('hidden');
        elements.mainApp.classList.remove('hidden');
        if (map) setTimeout(() => map.invalidateSize(), 100);
        
        // Ensure main app is ready
        createNewChat("Neural uplink active. Field coordinates received.");
        if (elements.userInput) {
            elements.userInput.value = text;
            handleSend();
        }
    }, 600);
}

async function handleSend() {
    const text = elements.userInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    elements.userInput.value = '';
    
    showView('welcome');
    updateLoader(10, 'Establishing neural bridge...');
    
    try {
        const response = await fetch(`${API_BASE}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                task: { task_id: "MISSION_" + Date.now(), description: text }, 
                volunteers: [] 
            })
        });
        const data = await response.json();
        
        updateLoader(100, 'Intelligence Synthesized');
        
        setTimeout(() => {
            if (data.intent === "QUESTION") {
                addMessage('system', data.message);
            } else {
                missionData = data;
                
                // Update Health Panel AI Mode
                const aiModeEl = document.getElementById('health-ai-mode');
                if (data.ai_reasoning && data.ai_reasoning.summary && data.ai_reasoning.summary.includes('Offline')) {
                    aiModeEl.innerHTML = '<span class="health-status-dot offline"></span> OFFLINE';
                } else {
                    aiModeEl.innerHTML = '<span class="health-status-dot online"></span> ONLINE';
                }

                revealMissionPlan(data);
                addMessage('system', `Tactical Intelligence generated for **${data.category}**.`);
            }
        }, 800);
    } catch (e) {
        addMessage('system', 'Neural uplink lost. Check backend status.');
    }
}

function updateLoader(percent, text) {
    const fill = document.getElementById('loader-progress');
    const label = document.getElementById('loader-text');
    const pc = document.getElementById('loader-percent');
    if (fill) fill.style.width = `${percent}%`;
    if (label) label.innerText = text;
    if (pc) pc.innerText = `${percent}%`;
}

function revealMissionPlan(data) {
    showView('mission');
    updateMissionView(data);
    fetchGearRecommendations(data.ai_reasoning.understood);
    if (typeof gsap !== 'undefined') {
        gsap.fromTo("#mission-view", 
            { opacity: 0, filter: "blur(20px)", y: 20 }, 
            { opacity: 1, filter: "blur(0px)", y: 0, duration: 1.2, ease: "expo.out" }
        );
    }
}

function updateMissionView(data) {
    const cat = document.getElementById('task-category');
    if (cat) cat.innerText = data.category;
    const pri = document.getElementById('priority-score');
    if (pri) pri.innerText = data.priority_score;
    const urgency = document.getElementById('urgency-tag');
    if (urgency) {
        urgency.innerText = data.urgency_level;
        urgency.className = `status-pill ${data.priority_score > 70 ? 'fatigued' : 'ready'}`;
    }
    const brief = document.getElementById('ai-briefing');
    if (brief) brief.innerText = data.ai_reasoning.understood;
    
    const squadList = document.getElementById('squad-list');
    if (squadList) {
        squadList.innerHTML = '';
        const members = data.recommended_squad.is_split ? data.recommended_squad.team_alpha : data.recommended_squad;
        members.forEach(m => {
            const card = document.createElement('div');
            card.className = 'unit-card';
            card.innerHTML = `
                <div class="unit-name">${m.name}</div>
                <div class="match-meta">
                    <span class="mono-label" style="font-size: 9px">Affinity</span>
                    <span class="score-pill">${m.match_score}%</span>
                </div>
            `;
            squadList.appendChild(card);
        });
    }

    const reserveList = document.getElementById('reserve-list');
    if (reserveList && data.reserve_volunteers) {
        reserveList.innerHTML = '';
        data.reserve_volunteers.slice(0, 4).forEach(m => {
            const card = document.createElement('div');
            card.className = 'unit-card';
            card.style.opacity = '0.7';
            card.innerHTML = `<div class="unit-name">${m.name}</div><div class="match-meta"><span class="mono-label" style="font-size:9px">Reserve</span><span class="score-pill" style="background:var(--ds-gray-100); color:var(--ds-gray-600)">${m.match_score}%</span></div>`;
            reserveList.appendChild(card);
        });
    }
}

// --- DISPATCH & SIMULATION ---
window.confirmDispatch = function() {
    if (!missionData) return;
    const squad = missionData.recommended_squad.is_split 
        ? [...missionData.recommended_squad.team_alpha, ...missionData.recommended_squad.team_beta]
        : missionData.recommended_squad;

    const loss = missionData.priority_score > 70 ? 25 : 12;
    applyEnergyLoss(squad, loss);
    
    stats.missionsCompleted++;
    localStorage.setItem('stats', JSON.stringify(stats));
    
    addMessage('system', 'Dispatch confirmed. Squad deployed to target zone.');
    renderRoster();
    updateAnalytics();
    showView('analytics');
};

function applyEnergyLoss(squad, amount) {
    squad.forEach(member => {
        const idx = localRoster.findIndex(v => v.name === member.name);
        if (idx !== -1) {
            localRoster[idx].energy = Math.max(0, localRoster[idx].energy - amount);
            localRoster[idx].total_points += 100;
        }
    });
    localStorage.setItem('roster', JSON.stringify(localRoster));
}

window.simulateMission = function(diff) {
    const loss = diff === 'easy' ? 8 : (diff === 'medium' ? 15 : 28);
    const subset = [...localRoster].sort(() => 0.5 - Math.random()).slice(0, 3);
    applyEnergyLoss(subset, loss);
    renderRoster();
    updateAnalytics();
};

window.recoverEnergy = function() {
    localRoster.forEach(v => v.energy = Math.min(100, v.energy + 15));
    localStorage.setItem('roster', JSON.stringify(localRoster));
    renderRoster();
    updateAnalytics();
};

window.resetEnergy = function() {
    localRoster.forEach(v => v.energy = 100);
    localStorage.setItem('roster', JSON.stringify(localRoster));
    renderRoster();
    updateAnalytics();
};

// --- ROSTER RENDERER ---
async function fetchRoster() {
    try {
        const res = await fetch(`${API_BASE}/roster`);
        const data = await res.json();
        localRoster = data.map(v => ({ ...v, energy: 100, total_points: v.total_points || 0 }));
        assignRanks();
        renderRoster();
    } catch (e) {}
}

function assignRanks() {
    localRoster.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
    localRoster.forEach((v, i) => {
        v.rank = i < 5 ? 'Elite Commander' : (i < 15 ? 'Field Specialist' : 'Active Agent');
    });
}

function renderRoster() {
    const tbody = document.getElementById('roster-tbody');
    const search = elements.rosterSearch ? elements.rosterSearch.value.toLowerCase() : "";
    if (!tbody) return;
    tbody.innerHTML = '';
    
    localRoster.forEach(v => {
        if (search && !v.name.toLowerCase().includes(search)) return;
        const tr = document.createElement('tr');
        tr.onclick = () => showProfile(v);
        
        const energyColor = getEnergyColor(v.energy || 0);
        const status = getStatusInfo(v.energy || 0);
        const rankClass = v.rank === 'Elite Commander' ? 'rank-elite' : (v.rank === 'Field Specialist' ? 'rank-specialist' : '');
        
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:12px">
                    <div class="roster-avatar"><i data-lucide="user"></i></div>
                    <b>${v.name}</b>
                </div>
            </td>
            <td><span class="rank-badge ${rankClass}">${v.rank}</span></td>
            <td><span class="status-pill ${status.class}">${status.label}</span></td>
            <td>
                <div class="energy-value ${v.energy < 15 ? 'critical-pulse' : ''}" style="color: ${energyColor}">
                    ${v.energy || 0}%
                </div>
                <div class="energy-mini-bar">
                    <div class="energy-fill" style="width: ${v.energy || 0}%; background: ${energyColor}"></div>
                </div>
            </td>
            <td><span class="mono-label" style="color:var(--ds-gray-900)">${v.total_points || 0} XP</span></td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function showProfile(v) {
    if (!elements.modalBody) return;
    elements.modalBody.innerHTML = `
        <h2 style="margin-bottom:8px">${v.name}</h2>
        <p class="mono-label" style="margin-bottom:24px">${v.rank}</p>
        <div class="bento-grid" style="grid-template-columns: 1fr 1fr">
            <div class="bento-card">
                <div class="mono-label">Capabilities</div>
                <div style="font-size:13px; margin-top:8px">${(v.skills || []).join(', ')}</div>
            </div>
            <div class="bento-card">
                <div class="mono-label">Energy Readiness</div>
                <div class="metric-value" style="color:${getEnergyColor(v.energy || 0)}">${v.energy || 0}%</div>
            </div>
        </div>
    `;
    elements.profileModal.classList.remove('hidden');
}

function updateAnalytics() {
    const avg = localRoster.length > 0 ? Math.round(localRoster.reduce((a, b) => a + (b.energy || 0), 0) / localRoster.length) : 0;
    const avgEl = document.getElementById('avg-energy');
    if (avgEl) {
        avgEl.innerText = `${avg}%`;
        avgEl.style.color = getEnergyColor(avg);
    }
    
    const missionsEl = document.getElementById('total-missions');
    if (missionsEl) missionsEl.innerText = stats.missionsCompleted;
    
    const activeUnitsEl = document.getElementById('active-units-count');
    if (activeUnitsEl) activeUnitsEl.innerText = localRoster.filter(v => v.energy > 40).length;

    updateGauge();
    updateMap();
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const icons = document.querySelectorAll('.theme-icon');
    icons.forEach(icon => { icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon'); });
    lucide.createIcons();
}

init();
/* --- MAP MODULE --- */
function initMap() {
    if (!document.getElementById('map-container')) return;
    map = L.map('map-container').setView([20.2961, 85.8245], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    
    // Add a default incident pulse marker
    const pulseIcon = L.divIcon({
        className: 'pulse-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    
    // Add mission location if it exists
    updateMap();
}

function updateMap(incidentLoc = null, squad = []) {
    if (!map || !document.getElementById('map-container')) return;
    
    // Clear old layers except markers we want to keep
    polylines.forEach(l => map.removeLayer(l));
    polylines = [];
    
    if (window.incidentMarker) {
        map.removeLayer(window.incidentMarker);
        window.incidentMarker = null;
    }

    const sectors = {
        "District Center": [20.2961, 85.8245],
        "North Sector (Patia)": [20.35, 85.81],
        "East Sector (Manchester)": [20.28, 85.85],
        "South Sector (Old Town)": [20.24, 85.83]
    };

    // Add Incident Marker if active
    if (incidentLoc) {
        const pulseIcon = L.divIcon({
            className: 'pulse-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        window.incidentMarker = L.marker(incidentLoc, { icon: pulseIcon }).addTo(map);
        window.incidentMarker.bindPopup("<b>Emergency Incident</b>").openPopup();
        map.setView(incidentLoc, 14);
    }

    localRoster.forEach(v => {
        const loc = sectors[v.location] || sectors["Sector Alpha"];
        if (!markers[v.id]) {
            markers[v.id] = L.marker(loc, {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
        }
        
        markers[v.id].setLatLng(loc);
        
        // Draw path if in squad
        if (incidentLoc && squad.some(m => m.name === v.name)) {
            const path = L.polyline([loc, incidentLoc], {
                color: v.energy < 30 ? 'orange' : '#0a72ef',
                weight: 3,
                dashArray: '10, 10',
                className: 'animated-path'
            }).addTo(map);
            polylines.push(path);
        }
    });
}

/* --- GAUGE MODULE --- */
function initGauge() {
    const data = [{
        domain: { x: [0, 1], y: [0, 1] },
        value: 0,
        title: { text: "NGO Readiness", font: { size: 14, color: '#888' } },
        type: "indicator",
        mode: "gauge+number",
        gauge: {
            axis: { range: [0, 100], tickwidth: 1, tickcolor: "#444" },
            bar: { color: "#10b981" },
            bgcolor: "transparent",
            borderwidth: 0,
            bordercolor: "transparent",
            steps: [
                { range: [0, 30], color: "#ef4444" },
                { range: [30, 60], color: "#f97316" },
                { range: [60, 80], color: "#84cc16" },
                { range: [80, 100], color: "#10b981" }
            ],
            threshold: {
                line: { color: "white", width: 4 },
                thickness: 0.75,
                value: 30
            }
        }
    }];

    const layout = { 
        width: 300, 
        height: 250, 
        margin: { t: 0, b: 0, l: 20, r: 20 },
        paper_bgcolor: 'transparent',
        font: { color: "#fff", family: "Geist" }
    };

    Plotly.newPlot('readiness-gauge', data, layout);
    updateGauge();
}

function updateGauge() {
    if (!document.getElementById('readiness-gauge')) return;
    try {
        const avgEnergy = localRoster.length > 0 
            ? Math.round(localRoster.reduce((sum, v) => sum + v.energy, 0) / localRoster.length)
            : 0;
            
        Plotly.restyle('readiness-gauge', 'value', [avgEnergy]);
        
        // Code Red Check
        toggleCodeRed(avgEnergy < 30);
    } catch(e) {}
}

function toggleCodeRed(active) {
    const banner = document.getElementById('code-red-banner');
    const mainApp = document.getElementById('main-app');
    if (active) {
        banner.classList.remove('hidden');
        mainApp.classList.add('code-red-active');
    } else {
        banner.classList.add('hidden');
        mainApp.classList.remove('code-red-active');
    }
}

/* --- HEALTH & UPTIME --- */
function startHealthTimer() {
    setInterval(() => {
        const elapsed = Date.now() - startTime;
        const h = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
        const m = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
        const uptimeStr = `${h}:${m}:${s}`;
        const uptimeEl = document.getElementById('health-uptime');
        if (uptimeEl) uptimeEl.innerText = uptimeStr;
    }, 1000);
}

/* --- INVENTORY MODULE --- */
async function fetchInventory() {
    try {
        const res = await fetch(`${API_BASE}/inventory`);
        const data = await res.json();
        
        const statsRes = await fetch(`${API_BASE}/inventory/stats`);
        const stats = await statsRes.json();
        
        if (document.getElementById('inv-total')) document.getElementById('inv-total').innerText = stats.total_items;
        if (document.getElementById('inv-low')) document.getElementById('inv-low').innerText = stats.low_stock;
        
        renderInventory(data);
    } catch (e) {
        console.error("Failed to fetch inventory", e);
    }
}

function renderInventory(categories) {
    console.log("Rendering Inventory with categories:", categories);
    const tbody = elements.inventoryTbody;
    if (!tbody) {
        console.error("inventory-tbody not found in DOM");
        return;
    }
    if (!categories || Object.keys(categories).length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--ds-gray-500)">No inventory data available. Check backend data/inventory.json</td></tr>';
        return;
    }
    tbody.innerHTML = '';

    Object.entries(categories).forEach(([catName, items]) => {
        if (!items || typeof items !== 'object') return;
        
        Object.entries(items).forEach(([itemName, details]) => {
            // Robust check for item vs subcategory
            if (details && typeof details === 'object') {
                const isItem = 'qty' in details || 'stock' in details || 'stock_count' in details || 'base_units' in details;
                
                if (isItem) {
                    addRow(catName, itemName, details);
                } else {
                    // It's a subcategory (like ppe_hazmat in the old structure)
                    Object.entries(details).forEach(([subName, subDetails]) => {
                        addRow(catName, subName, subDetails);
                    });
                }
            }
        });
    });

    function addRow(cat, name, details) {
        const tr = document.createElement('tr');
        let qty = 0;
        let unit = 'units';
        
        if (typeof details === 'number') qty = details;
        else if (details && typeof details === 'object') {
            qty = details.qty ?? details.stock ?? details.stock_count ?? details.base_units ?? 0;
            unit = details.unit || details.uom || 'units';
        }

        const statusClass = qty < 10 ? 'fatigued' : 'ready';
        
        tr.innerHTML = `
            <td><b>${name.replace(/_/g, ' ').toUpperCase()}</b></td>
            <td><span class="mono-label" style="font-size:10px">${cat}</span></td>
            <td><span class="score-pill ${statusClass}">${qty} ${unit}</span></td>
            <td>${details.condition || details.maintenance_status || 'Operational'}</td>
            <td>${details.location || details.storage_location || 'Sector 4 Vault'}</td>
            <td><button class="suggestion-btn" style="padding:4px 8px; font-size:10px">Details</button></td>
        `;
        tbody.appendChild(tr);
    }
}

/* --- NEARBY ACTIVITIES MODULE --- */
function initActivityMap() {
    const container = document.getElementById('activity-map');
    if (!container) return;
    activityMap = L.map('activity-map').setView([20.2961, 85.8245], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(activityMap);
}

async function fetchActivities() {
    try {
        const res = await fetch(`${API_BASE}/activities`);
        const data = await res.json();
        renderActivities(data);
    } catch (e) {
        console.error("Failed to fetch activities", e);
    }
}

function renderActivities(activities) {
    const list = document.getElementById('activity-list');
    if (!list) return;
    list.innerHTML = '';
    
    // Clear map markers
    if (activityMap) {
        activityMap.eachLayer(layer => {
            if (layer instanceof L.Marker) activityMap.removeLayer(layer);
        });
    }

    activities.forEach(act => {
        // Add Marker
        if (activityMap && act.coords) {
            const color = act.urgency === 'Critical' ? 'red' : (act.urgency === 'High' ? 'orange' : 'blue');
            const icon = L.icon({
                iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
            });
            L.marker(act.coords, { icon }).addTo(activityMap).bindPopup(`<b>${act.title}</b><br>${act.location}`);
        }

        // Add Card
        const card = document.createElement('div');
        card.className = 'bento-card';
        card.style.padding = '16px';
        card.style.gap = '12px';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start">
                <span class="mono-label" style="font-size:10px; color:var(--ds-gray-500)">${act.category} • ${act.distance}</span>
                <span class="status-pill ${act.urgency === 'Critical' ? 'fatigued' : 'ready'}" style="font-size:9px">${act.time_status}</span>
            </div>
            <h3 style="font-size:16px; line-height:1.2">${act.title}</h3>
            <div style="display:flex; align-items:center; gap:8px">
                <div class="score-pill" style="background:var(--ds-background-200); color:var(--ds-gray-600); font-size:10px">${act.organizer}</div>
                ${act.verified ? '<span class="score-pill ready" style="font-size:9px">VERIFIED</span>' : ''}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px">
                <div class="mono-label" style="font-size:10px">Need: ${act.volunteers_needed} Vol.</div>
                <button class="suggestion-btn" style="padding:6px 12px; font-size:11px; background:var(--ds-gray-900); color:white">JOIN ACTIVITY</button>
            </div>
        `;
        list.appendChild(card);
    });
}

async function fetchGearRecommendations(description) {
    const list = document.getElementById('loadout-list');
    if (list) list.innerHTML = '<p class="body-small">Analyzing tactical requirements...</p>';
    
    try {
        const res = await fetch(`${API_BASE}/recommend-gear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description })
        });
        const recommendations = await res.json();
        renderLoadout(recommendations);
    } catch (e) {
        console.error("Gear recommendation failed", e);
    }
}

function renderLoadout(items) {
    const list = document.getElementById('loadout-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (items.length === 0) {
        list.innerHTML = '<p class="body-small" style="opacity:0.6">No specialized gear recommended for this operation.</p>';
        return;
    }
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'unit-card';
        card.style.flex = '1 1 180px';
        card.style.padding = '12px';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start">
                <div class="unit-name" style="font-size:12px">${item.name}</div>
                <div class="score-pill ready" style="font-size:9px">Stock: ${item.qty}</div>
            </div>
            <div style="margin-top:8px; display:flex; gap:6px">
                <button class="suggestion-btn" style="padding:4px 8px; font-size:9px; background:var(--ds-gray-900); color:white">RESERVE</button>
            </div>
        `;
        list.appendChild(card);
    });
}
