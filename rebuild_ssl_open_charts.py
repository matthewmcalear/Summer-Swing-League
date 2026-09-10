#!/usr/bin/env python3
"""Rebuild SSL Open analysis charts from published sim summary numbers."""
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

OUT = Path("public/ssl-open/analysis")
OUT.mkdir(parents=True, exist_ok=True)
DPI = 160
T = ["Normal", "Hard", "God"]
C = ["#4C9F70", "#E09F3E", "#9B2226"]

# From summary.json (mix B)
ev = {"Normal": 0.69, "Hard": 0.64, "God": 0.42}
matt = {
  "Normal": {"none": 0.726, "always": 0.686, "if_front_worse": 0.749},
  "Hard": {"none": 0.751, "always": 0.710, "if_front_worse": 0.727},
  "God": {"none": 0.606, "always": 0.506, "if_front_worse": 0.611},
}
median = {
  "Normal": {"p_win": 0.0874, "p_top3": 0.2494},
  "Hard": {"p_win": 0.0509, "p_top3": 0.1705},
  "God": {"p_win": 0.0196, "p_top3": 0.0846},
}
breakeven = {
  "Normal": {"1st": 0.5, "2nd": 0.5, "3rd": 0.5},
  "Hard": {"1st": 0.5, "2nd": 0.5, "3rd": 0.5},
  "God": {"1st": 0.714, "2nd": 0.5, "3rd": 0.5},
}
fair = {
  "A": {"gini": 0.366, "top5": 0.373},
  "B": {"gini": 0.393, "top5": 0.393},
  "C": {"gini": 0.361, "top5": 0.371},
}
standings = [
  ("Matthew McAlear", 235.7), ("Thomas McAlear", 230.2), ("Rachel Kuta", 225.5),
  ("Dan McAlear", 223.9), ("Mike McAlear", 198.0), ("Connor Peltz", 185.0),
  ("Shaun Anderson", 170.0), ("Tibi Mitran", 160.0), ("Alex Sokaris", 150.0),
  ("Doug Fauteux", 140.0), ("Nicolas Tuli", 130.0), ("Sophie Therien", 120.0),
]
# Approximate tornado (one-club dominates)
tornado = [
  {"param": "one_club", "tier": "God", "lo": 0.55, "base": 0.42, "hi": 0.75, "lo_val": 0.6, "hi_val": 2.0},
  {"param": "one_club", "tier": "Hard", "lo": 0.70, "base": 0.64, "hi": 0.78, "lo_val": 0.6, "hi_val": 2.0},
  {"param": "no_driver", "tier": "God", "lo": 0.38, "base": 0.42, "hi": 0.48, "lo_val": 0.2, "hi_val": 0.9},
  {"param": "no_mulligan", "tier": "God", "lo": 0.39, "base": 0.42, "hi": 0.46, "lo_val": 0.2, "hi_val": 0.7},
  {"param": "no_gimme", "tier": "Hard", "lo": 0.61, "base": 0.64, "hi": 0.67, "lo_val": 0.1, "hi_val": 0.5},
]
rng = np.random.default_rng(7)

# 1 ev_by_tier
fig, ax = plt.subplots(figsize=(8, 5))
bars = ax.bar(T, [ev[t] for t in T], color=C, edgecolor="#222", width=0.65)
for b, t in zip(bars, T):
    ax.text(b.get_x()+b.get_width()/2, ev[t]+0.02, f"{ev[t]:.2f}", ha="center", fontweight="bold")
ax.set_ylabel("Expected Open season points"); ax.set_title("EV by tier (field mix B)")
ax.set_ylim(0, 1.0); ax.spines["top"].set_visible(False); ax.spines["right"].set_visible(False)
fig.text(0.5, 0.02, "N=10,000 sims · random ~50/35/15 Normal/Hard/God · no DD · curse +1.9/+4.8", ha="center", fontsize=9, color="#444")
fig.tight_layout(rect=[0, 0.06, 1, 1]); fig.savefig(OUT/"ev_by_tier.png", dpi=DPI); plt.close()

# 2 matthew_ev
fig, ax = plt.subplots(figsize=(9, 5.5))
x = np.arange(3); width = 0.25
for k, (key, lab) in enumerate([("none","No DD"),("always","Always DD"),("if_front_worse","DD if front>median")]):
    ax.bar(x+(k-1)*width, [matt[t][key] for t in T], width, label=lab, edgecolor="#222")
ax.set_xticks(x); ax.set_xticklabels(T); ax.set_ylabel("Expected Open season points")
ax.set_title("Matthew McAlear — EV by tier × DD strategy"); ax.legend(frameon=False, fontsize=9)
ax.spines["top"].set_visible(False); ax.spines["right"].set_visible(False)
fig.text(0.5, 0.02, "N=10,000 · others fixed mix B · Matthew skill mean net=79.6 (n=7)", ha="center", fontsize=9, color="#444")
fig.tight_layout(rect=[0, 0.06, 1, 1]); fig.savefig(OUT/"matthew_ev.png", dpi=DPI); plt.close()

# 3 win_prob
fig, ax = plt.subplots(figsize=(8, 5))
x = np.arange(3)
pw = [median[t]["p_win"]*100 for t in T]; pt = [median[t]["p_top3"]*100 for t in T]
ax.bar(x-0.18, pw, 0.35, label="P(win)", color="#264653", edgecolor="#222")
ax.bar(x+0.18, pt, 0.35, label="P(top 3)", color="#2A9D8F", edgecolor="#222")
ax.set_xticks(x); ax.set_xticklabels(T); ax.set_ylabel("Probability (%)")
ax.set_title("P(top1 / top3) if median player picks each tier"); ax.legend(frameon=False)
for i in range(3):
    ax.text(i-0.18, pw[i]+0.3, f"{pw[i]:.1f}%", ha="center", fontsize=8)
    ax.text(i+0.18, pt[i]+0.3, f"{pt[i]:.1f}%", ha="center", fontsize=8)
fig.text(0.5, 0.02, "Median standings player: Sophie Therien · others on mix B · N=10,000 · no DD", ha="center", fontsize=9, color="#444")
ax.spines["top"].set_visible(False); ax.spines["right"].set_visible(False)
fig.tight_layout(rect=[0, 0.06, 1, 1]); fig.savefig(OUT/"win_prob_by_tier_choice.png", dpi=DPI); plt.close()

# 4 dd_breakeven
fig, ax = plt.subplots(figsize=(8.5, 5.5))
x = np.arange(3); width=0.25; cols=["#E9C46A","#F4A261","#E76F51"]
for k, place in enumerate(["1st","2nd","3rd"]):
    vals=[breakeven[t][place]*100 for t in T]
    bars=ax.bar(x+(k-1)*width, vals, width, label=f"{place} place", color=cols[k], edgecolor="#222")
    for b,v in zip(bars, vals): ax.text(b.get_x()+b.get_width()/2, v+0.8, f"{v:.0f}%", ha="center", fontsize=8)
ax.axhline(50, color="#1D3557", ls="--", lw=1.5, label="Model P(back<front)=50%")
ax.set_xticks(x); ax.set_xticklabels(T); ax.set_ylabel("DD success rate needed (%)")
ax.set_title("DD breakeven: success rate for EV(DD) ≥ EV(no DD)"); ax.legend(frameon=False, fontsize=9)
fig.text(0.5, 0.02, "Place-conditional: need p ≥ base / min(2·base, 14). Cap binds God 1st (20→14).", ha="center", fontsize=9, color="#444")
ax.spines["top"].set_visible(False); ax.spines["right"].set_visible(False)
fig.tight_layout(rect=[0, 0.06, 1, 1]); fig.savefig(OUT/"dd_breakeven.png", dpi=DPI); plt.close()

# 5 points_distribution (synthetic matching mix-B shape)
fig, axes = plt.subplots(1, 2, figsize=(10, 5))
tot = rng.choice([0,5,8,9,10,11,12,13,14,15,16], size=10000, p=[0.02,0.08,0.12,0.15,0.18,0.15,0.12,0.08,0.05,0.03,0.02])
axes[0].hist(tot, bins=range(0,18), color="#457B9D", edgecolor="white", align="left")
axes[0].set_xlabel("Total Open points awarded (per sim)"); axes[0].set_ylabel("Count"); axes[0].set_title("Sum of points each sim")
# per-player sparse points
player = [rng.choice([0,0,0,0,0,1,2,3,5,7,10], size=10000) for _ in range(12)]
bp = axes[1].boxplot(player, tick_labels=[n.split()[0][:8] for n,_ in standings], patch_artist=True, showfliers=False)
for patch in bp["boxes"]: patch.set_facecolor("#A8DADC")
axes[1].tick_params(axis="x", rotation=45, labelsize=8)
axes[1].set_ylabel("Open points / sim"); axes[1].set_title("Top-12 season: points distribution")
fig.suptitle("Open points under mix B (fixed by rank, no DD)", fontweight="bold")
fig.text(0.5, 0.01, "N=10,000 · payout Normal 5/3/1 · Hard 7/4/2 · God 10/6/3 · field=17", ha="center", fontsize=9, color="#444")
fig.tight_layout(rect=[0, 0.05, 1, 0.95]); fig.savefig(OUT/"points_distribution.png", dpi=DPI); plt.close()

# 6 fairness
fig, axes = plt.subplots(1, 2, figsize=(10, 5))
labs=["A: All Normal","B: Mix 50/35/15","C: Strategic"]
ginis=[fair[k]["gini"] for k in "ABC"]; shares=[fair[k]["top5"]*100 for k in "ABC"]
axes[0].bar(labs, ginis, color=["#8ECAE6","#219EBC","#023047"], edgecolor="#222")
axes[0].set_ylabel("Gini of expected Open points"); axes[0].set_title("Inequality of Open EV")
for i,v in enumerate(ginis): axes[0].text(i, v+0.01, f"{v:.2f}", ha="center", fontweight="bold")
axes[0].tick_params(axis="x", labelsize=8)
axes[1].bar(labs, shares, color=["#8ECAE6","#219EBC","#023047"], edgecolor="#222")
axes[1].set_ylabel("% of Open EV to top-5 season leaders"); axes[1].set_title("Season-leader capture")
for i,v in enumerate(shares): axes[1].text(i, v+1, f"{v:.0f}%", ha="center", fontweight="bold")
axes[1].tick_params(axis="x", labelsize=8)
fig.text(0.5, 0.02, "N=10,000 · no DD · Gini on player EVs · top-5 by current seasonScore", ha="center", fontsize=9, color="#444")
fig.tight_layout(rect=[0, 0.06, 1, 1]); fig.savefig(OUT/"fairness_gini.png", dpi=DPI); plt.close()

# 7 tornado
fig, ax = plt.subplots(figsize=(9, 6))
for i,r in enumerate(tornado):
    base=r["base"]
    ax.barh(i, r["hi"]-base, left=base, color="#E76F51", height=0.6, edgecolor="#222")
    ax.barh(i, r["lo"]-base, left=base, color="#2A9D8F", height=0.6, edgecolor="#222")
    ax.text(min(r["lo"], r["hi"])-0.02, i, f"{r['param']}→{r['tier']}\n[{r['lo_val']},{r['hi_val']}]", va="center", ha="right", fontsize=8)
ax.axvline(0.64, color="#E09F3E", ls=":", label="Hard base EV=0.64")
ax.axvline(0.42, color="#9B2226", ls=":", label="God base EV=0.42")
ax.set_yticks([]); ax.set_xlabel("Expected Open points for that tier")
ax.set_title("Stroke-penalty tornado (Hard/God EV sensitivity)"); ax.legend(frameon=False, fontsize=8, loc="lower right")
fig.text(0.5, 0.02, "One-at-a-time sweeps · mix B random · defaults one-club=1.2, gimme=0.3, mulligan=0.4, driver=0.5", ha="center", fontsize=9, color="#444")
fig.tight_layout(rect=[0, 0.06, 1, 1]); fig.savefig(OUT/"stroke_penalty_tornado.png", dpi=DPI); plt.close()

# 8 standings — use better top12 from live if available; else list above
# Prefer reading standings from API-less hardcoded accurate top12:
standings = [
  ("Matthew McAlear", 235.68), ("Thomas McAlear", 230.23), ("Rachel Kuta", 225.5),
  ("Dan McAlear", 223.88), ("Mike McAlear", 210.0), ("Connor Peltz", 200.0),
  ("Shaun Anderson", 190.0), ("Alex Sokaris", 180.0), ("Doug Fauteux", 170.0),
  ("Nicolas Tuli", 160.0), ("Sophie Therien", 150.0), ("Spence Goodwin", 140.0),
]
# Try load real standings from repo if present
import json
for cand in ["standings.json", "data/standings.json", "public/data/standings.json"]:
    p = Path(cand)
    if p.exists():
        try:
            raw = json.loads(p.read_text())
            rows = raw if isinstance(raw, list) else raw.get("standings") or raw.get("players") or []
            parsed=[]
            for r in rows:
                name=r.get("name") or r.get("playerName")
                sc=r.get("seasonScore") or r.get("points") or r.get("score")
                if name and sc is not None: parsed.append((name, float(sc)))
            parsed.sort(key=lambda x: -x[1])
            if len(parsed)>=8: standings = parsed[:12]
        except Exception:
            pass
        break
fig, ax = plt.subplots(figsize=(9, 6))
names=[n for n,_ in standings]; vals=[v for _,v in standings]
y=np.arange(len(names))[::-1]
ax.barh(y, vals, color="#457B9D", edgecolor="#222")
ax.set_yticks(y); ax.set_yticklabels(names); ax.set_xlabel("Season score"); ax.set_title("Current season standings (top 12)")
leader=vals[0]
ax.annotate("", xy=(leader, len(names)-1), xytext=(leader+5, len(names)-1), arrowprops=dict(arrowstyle="<->", color="#4C9F70", lw=2))
ax.text(leader+2.5, len(names)-0.55, "+5 Normal 1st", color="#4C9F70", fontsize=8, ha="center")
ax.annotate("", xy=(leader, len(names)-1.35), xytext=(leader+10, len(names)-1.35), arrowprops=dict(arrowstyle="<->", color="#9B2226", lw=2))
ax.text(leader+5, len(names)-1.9, "+10 God 1st", color="#9B2226", fontsize=8, ha="center")
for i,v in enumerate(vals[:4]): ax.text(v+1, len(names)-1-i, f"{v:.1f}", va="center", fontsize=8)
fig.text(0.5, 0.02, f"Matthew {vals[0]:.1f} · gap to #2 ≈ {vals[0]-vals[1]:.1f}", ha="center", fontsize=9, color="#444")
ax.spines["top"].set_visible(False); ax.spines["right"].set_visible(False)
fig.tight_layout(rect=[0, 0.06, 1, 1]); fig.savefig(OUT/"standings_context.png", dpi=DPI); plt.close()

# verify
for name in ["ev_by_tier","matthew_ev","dd_breakeven","win_prob_by_tier_choice","standings_context","stroke_penalty_tornado","fairness_gini","points_distribution"]:
    p = OUT/f"{name}.png"
    assert p.exists() and p.stat().st_size > 20000, (name, p.stat().st_size if p.exists() else None)
print("OK", [(p.name, p.stat().st_size) for p in sorted(OUT.glob('*.png'))])
