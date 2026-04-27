import streamlit as st
import os
import json
import pandas as pd
import requests
import random
from config.settings import settings

# --- CONSTANTS & CONFIG ---
NVIDIA_API_KEY = settings.NVIDIA_API_KEY
NVIDIA_API_URL = settings.NVIDIA_API_URL

# --- UNIFIED AI BRAIN (INLINED) ---
def call_llm_MASTER(description, tone="Professional", temperature=0.1):
    headers = {"Authorization": f"Bearer {NVIDIA_API_KEY}", "Content-Type": "application/json"}
    prompt = f"""Analyze disaster report: "{description}"
    Return JSON with: 
    "category": ["Health", "Relief", "Logistics", "Safety", "Mental Health", "Environment", "Admin", "Education", "General"],
    "urgency": ["Critical", "High", "Medium", "Low"],
    "people_count": int,
    "thought_process": "Your reasoning in {tone} tone",
    "understood_reasoning": "Summary in {tone} tone"
    Return ONLY JSON."""
    
    payload = {"model": "meta/llama-3.1-8b-instruct", "messages": [{"role": "user", "content": prompt}], "temperature": temperature, "max_tokens": 512}
    try:
        r = requests.post(NVIDIA_API_URL, headers=headers, json=payload, timeout=10)
        c = r.json()['choices'][0]['message']['content'].replace("```json", "").replace("```", "").strip()
        return json.loads(c)
    except: return {"category": "General", "urgency": "Medium", "people_count": 5, "thought_process": "Fallback mode.", "understood_reasoning": "Standard parsing applied."}

# --- UNIFIED MATCHER (INLINED) ---
def find_matches_MASTER(description, category, volunteers):
    results = []
    category = str(category).lower()
    for v in volunteers:
        score = 50 if any(category in str(s).lower() for s in v.get('skills', [])) else 20
        score += random.randint(1, 40)
        results.append({**v, "match_score": min(98, score)})
    return sorted(results, key=lambda x: x['match_score'], reverse=True)

# --- UNIFIED ENGINE (INLINED) ---
def process_mission_MASTER(description, people_override, all_volunteers, tone="Professional"):
    res = call_llm_MASTER(description, tone=tone)
    
    # Sanitizer
    category = res.get("category", "General")
    if isinstance(category, list): category = category[0] if category else "General"
    
    urgency = res.get("urgency", "Medium")
    if isinstance(urgency, list): urgency = urgency[0] if urgency else "Medium"
    
    people_count = people_override if people_override > 0 else (res.get("people_count") or 1)
    
    p_map = {"Critical": 90, "High": 70, "Medium": 40, "Low": 20}
    base_priority = p_map.get(str(urgency), 40)
    priority = min(100, base_priority + (people_count * 2))
    
    matches = find_matches_MASTER(description, category, all_volunteers)
    squad = matches[:3] if priority < 60 else matches[:6]
    alts = matches[len(squad):len(squad)+3]
    
    return {
        "category": category, "priority": priority, "urgency": urgency, "count": people_count,
        "squad": squad, "alts": alts, "points": int(priority * 1.5),
        "reasoning": res.get("understood_reasoning", "Strategic matching complete."),
        "thoughts": res.get("thought_process", "No trace.")
    }

# --- UI BOILERPLATE ---
st.set_page_config(page_title="NGO AI MASTER", layout="wide")
st.markdown("""<style>
    :root { --background: #030712; --accent: #10b981; --border: #1f2937; }
    .stApp { background-color: var(--background); color: white; }
    .bento-card { background: rgba(17, 24, 39, 0.7); border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem; margin-bottom: 1rem; }
    .status-tag { font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; display: inline-block; }
    .skill-badge { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #d1d5db; padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; margin-right: 4px; margin-bottom: 4px; display: inline-block; }
    .stamina-bar-bg { background: rgba(255,255,255,0.05); border-radius: 99px; height: 6px; width: 100%; margin-top: 8px; overflow: hidden; }
    .stamina-bar-fill { height: 100%; border-radius: 99px; }
    .analytics-table { width: 100%; border-collapse: separate; border-spacing: 0 4px; }
    .analytics-table td { padding: 10px; font-size: 0.8rem; background: rgba(255,255,255,0.02); }
    .analytics-table th { color: #9ca3af; text-transform: uppercase; font-size: 0.65rem; padding: 10px; text-align: left; }
    .energy-bubble { padding: 2px 8px; border-radius: 4px; font-weight: 800; color: #000; font-size: 0.7rem; text-align: center; }
</style>""", unsafe_allow_html=True)

# --- ENERGY PROFILER ---
def get_energy_style(e):
    if e >= 80: return {"c": "#22C55E", "l": "OPERATIONAL", "bg": "rgba(34, 197, 94, 0.1)"}
    if e >= 60: return {"c": "#4ADE80", "l": "READY", "bg": "rgba(74, 222, 128, 0.1)"}
    if e >= 40: return {"c": "#FACC15", "l": "LIMITED", "bg": "rgba(250, 204, 21, 0.1)"}
    if e >= 20: return {"c": "#FB923C", "l": "LOW", "bg": "rgba(251, 146, 60, 0.1)"}
    return {"c": "#EF4444", "l": "CRITICAL", "bg": "rgba(239, 68, 68, 0.1)"}

# --- DATA LOAD ---
from src.core.service import VolunteerService
vol_service = VolunteerService()
if 'vols' not in st.session_state: st.session_state.vols = vol_service.get_all_volunteers()

with st.sidebar:
    st.title("🛡️ Command")
    desc = st.text_area("Report", height=100)
    count = st.number_input("Count", min_value=0)
    tone = st.radio("Tone", ["Professional", "Funny", "Sarcastic"], horizontal=True)
    if st.button("🚀 DEPLOY", use_container_width=True):
        st.session_state.res = process_mission_MASTER(desc, count, st.session_state.vols, tone=tone)
        st.session_state.tab = "MISSION"
        st.session_state.dispatched = False
        st.rerun()

# --- DASHBOARD ---
st.header("Strategic Dashboard")
avg_e = int(sum(v['energy'] for v in st.session_state.vols) / max(1, len(st.session_state.vols)))
k1, k2, k3 = st.columns(3)
k1.markdown(f'<div class="bento-card"><small>READINESS</small><h3>{avg_e}%</h3></div>', unsafe_allow_html=True)
k2.markdown(f'<div class="bento-card"><small>UNITS</small><h3>{len(st.session_state.vols)}</h3></div>', unsafe_allow_html=True)

if 'res' in st.session_state:
    k3.markdown(f'<div class="bento-card"><small>PRIORITY</small><h3>{st.session_state.res["priority"]}</h3></div>', unsafe_allow_html=True)
    
    st.markdown("---")
    c_brief, c_dispatch = st.columns([3, 1])
    with c_brief:
        st.info(f"**AI TACTICAL BRIEF:** {st.session_state.res['reasoning']}")
    with c_dispatch:
        if not st.session_state.get('dispatched', False):
            if st.button("🛰️ CONFIRM DISPATCH", use_container_width=True, type="primary"):
                # Deduct Energy & Add Points
                from src.core.gamifier import update_volunteer_after_task
                for m in st.session_state.res['squad']:
                    update_volunteer_after_task(m['id'], st.session_state.res['points'], st.session_state.res['category'])
                st.session_state.dispatched = True
                st.session_state.vols = vol_service.get_all_volunteers()
                st.balloons()
                st.rerun()
        else:
            st.success("✅ Squad Deployed!")
    st.markdown("---")

c_main, c_alt = st.columns([2, 1])

with c_main:
    st.subheader("⚔️ Active Squad")
    if 'res' in st.session_state:
        r = st.session_state.res
        s_cols = st.columns(2)
        for i, m in enumerate(r['squad']):
            s = get_energy_style(m['energy'])
            with s_cols[i % 2]:
                html = f'<div class="bento-card"><div style="display:flex;justify-content:space-between"><b>{m["name"]}</b><span style="color:var(--accent)">🎯 {m["match_score"]}%</span></div>'
                html += f'<div class="status-tag" style="background:{s["bg"]};color:{s["c"]}">{s["l"]}</div><div style="margin-top:8px">'
                for sk in m.get('skills', [])[:3]: html += f'<span class="skill-badge">{sk}</span>'
                html += f'</div><div class="stamina-bar-bg"><div class="stamina-bar-fill" style="width:{m["energy"]}%;background:{s["c"]}"></div></div></div>'
                st.markdown(html, unsafe_allow_html=True)
                
                if st.button(f"🔄 SWAP {m['name'][:5]}", key=f"sw_{m['id']}"):
                    if r['alts']:
                        new_m = r['alts'].pop(0)
                        r['squad'][i] = new_m
                        r['alts'].append(m)
                        st.rerun()

with c_alt:
    st.subheader("🕵️ Reserve")
    if 'res' in st.session_state:
        for a in st.session_state.res['alts']:
            s = get_energy_style(a['energy'])
            html = f'<div class="bento-card" style="border-style:dashed;padding:1rem"><b>{a["name"]}</b><br><small style="color:{s["c"]}">{s["l"]} ({a["energy"]}%)</small><br>'
            for sk in a.get('skills', [])[:2]: html += f'<span class="skill-badge">{sk}</span>'
            html += '</div>'
            st.markdown(html, unsafe_allow_html=True)

st.subheader("📊 Full Roster")
if st.button("🔋 RESTORE ENERGY"):
    db_path = os.path.join(os.getcwd(), 'data', 'volunteer_stats.json')
    if os.path.exists(db_path):
        with open(db_path, 'r') as f: stats = json.load(f)
        for v in stats: stats[v]['energy'] = 100
        with open(db_path, 'w') as f: json.dump(stats, f, indent=4)
        st.session_state.vols = vol_service.get_all_volunteers()
        st.rerun()

v_sorted = sorted(st.session_state.vols, key=lambda x: x['energy'])
table_html = '<table class="analytics-table"><thead><tr><th>Status</th><th>Name</th><th>Skills</th><th>XP</th><th>Energy</th></tr></thead><tbody>'
for v in v_sorted:
    s = get_energy_style(v['energy'])
    skills_html = "".join([f'<span class="skill-badge">{sk}</span>' for sk in v.get("skills", [])[:3]])
    table_html += f'<tr><td><small style="color:{s["c"]}">{v.get("current_level",1)}</small></td><td>{v["name"]}</td><td>{skills_html}</td><td>{v.get("total_points",0)}</td><td><div class="energy-bubble" style="background:{s["c"]}">{v["energy"]}%</div></td></tr>'
st.markdown(table_html + '</tbody></table>', unsafe_allow_html=True)
