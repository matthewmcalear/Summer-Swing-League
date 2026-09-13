#!/usr/bin/env python3
"""
SSL Open Monte Carlo Simulation - NEW PAYOUT RULES
Computes expected Open finish bonus points under new payout structure:
- Normal: 5/3/1  Hard: 10/6/2  God: 25/12/6
- Double Down: doubles Open finish bonus (no +14 cap)
"""
import numpy as np
from pathlib import Path
import json

# ────────────────────────────────────────────────────────────────────────────
# Configuration
# ────────────────────────────────────────────────────────────────────────────

N_SIMS = 10_000
FIELD_SIZE = 17
RNG_SEED = 42

# NEW PAYOUT RULES
PAYOUTS = {
    "Normal": {1: 5, 2: 3, 3: 1},
    "Hard": {1: 10, 2: 6, 3: 2},
    "God": {1: 25, 2: 12, 3: 6},
}

# Field mix B: ~50% Normal, ~35% Hard, ~15% God
FIELD_MIX_B = {"Normal": 0.50, "Hard": 0.35, "God": 0.15}

# Curse penalties (strokes added to net score)
CURSE_PENALTIES = {"Normal": 0.0, "Hard": 1.9, "God": 4.8}

# Player skill: mean net score and std dev
# Using generic skill distribution for median/average player
SKILL_MEAN_NET = 82.0
SKILL_STD = 8.0

# Matthew McAlear's skill (season leader, better than average)
MATTHEW_MEAN_NET = 79.6
MATTHEW_STD = 7.5

# Front-back correlation for DD analysis
FRONT_BACK_CORR = 0.4


# ────────────────────────────────────────────────────────────────────────────
# Simulation Functions
# ────────────────────────────────────────────────────────────────────────────

def simulate_round_score(mean_net, std, curse_penalty, rng):
    """Simulate a player's net score for a round."""
    base_score = rng.normal(mean_net, std)
    return base_score + curse_penalty


def simulate_field_round(field_config, rng):
    """
    Simulate one Open round with given field configuration.
    
    Args:
        field_config: List of (tier, mean_net, std) tuples for each player
        rng: numpy random generator
    
    Returns:
        List of (player_idx, tier, net_score, finish_place, points_earned)
    """
    results = []
    
    for idx, (tier, mean_net, std) in enumerate(field_config):
        curse = CURSE_PENALTIES[tier]
        net_score = simulate_round_score(mean_net, std, curse, rng)
        results.append((idx, tier, net_score))
    
    # Sort by net score (lower is better) to determine finish places
    results.sort(key=lambda x: x[2])
    
    # Award points based on finish position
    final_results = []
    for finish_pos, (idx, tier, net_score) in enumerate(results, start=1):
        points = PAYOUTS[tier].get(finish_pos, 0)
        final_results.append((idx, tier, net_score, finish_pos, points))
    
    return final_results


def run_ev_by_tier_simulation(n_sims=N_SIMS):
    """
    Compute expected Open finish bonus by tier under field mix B.
    Each sim: random field composition from mix B, all players median skill.
    """
    rng = np.random.default_rng(RNG_SEED)
    tier_points = {tier: [] for tier in PAYOUTS.keys()}
    
    for _ in range(n_sims):
        # Generate random field following mix B
        field_config = []
        for _ in range(FIELD_SIZE):
            tier = rng.choice(
                list(FIELD_MIX_B.keys()),
                p=list(FIELD_MIX_B.values())
            )
            field_config.append((tier, SKILL_MEAN_NET, SKILL_STD))
        
        # Simulate round
        results = simulate_field_round(field_config, rng)
        
        # Collect points by tier
        for idx, tier, net_score, finish_pos, points in results:
            tier_points[tier].append(points)
    
    # Compute expected values
    ev_by_tier = {
        tier: np.mean(tier_points[tier]) if tier_points[tier] else 0.0
        for tier in PAYOUTS.keys()
    }
    
    return ev_by_tier


def run_matthew_dd_simulation(n_sims=N_SIMS):
    """
    Compute Matthew McAlear's EV by tier and DD strategy.
    Matthew has skill (79.6 ± 7.5), others follow mix B with median skill.
    """
    rng = np.random.default_rng(RNG_SEED + 1)
    
    results_by_tier_and_strategy = {
        tier: {"none": [], "always": [], "if_front_worse": []}
        for tier in PAYOUTS.keys()
    }
    
    for _ in range(n_sims):
        # Generate field: Matthew + 16 others on mix B
        field_config = [(None, MATTHEW_MEAN_NET, MATTHEW_STD)]  # Matthew at idx 0
        
        for _ in range(FIELD_SIZE - 1):
            tier = rng.choice(
                list(FIELD_MIX_B.keys()),
                p=list(FIELD_MIX_B.values())
            )
            field_config.append((tier, SKILL_MEAN_NET, SKILL_STD))
        
        # Simulate Matthew on each tier
        for matt_tier in PAYOUTS.keys():
            field_config[0] = (matt_tier, MATTHEW_MEAN_NET, MATTHEW_STD)
            
            # Simulate front and back nine (with correlation)
            matt_curse = CURSE_PENALTIES[matt_tier]
            
            # Generate correlated front/back scores
            z = rng.standard_normal(2)
            z_corr = np.array([z[0], FRONT_BACK_CORR * z[0] + np.sqrt(1 - FRONT_BACK_CORR**2) * z[1]])
            front_score = MATTHEW_MEAN_NET / 2 + (MATTHEW_STD / np.sqrt(2)) * z_corr[0] + matt_curse / 2
            back_score = MATTHEW_MEAN_NET / 2 + (MATTHEW_STD / np.sqrt(2)) * z_corr[1] + matt_curse / 2
            
            matt_total = front_score + back_score
            
            # Simulate rest of field (single round scores for them)
            field_scores = [matt_total]
            for idx in range(1, FIELD_SIZE):
                tier, mean_net, std = field_config[idx]
                curse = CURSE_PENALTIES[tier]
                score = simulate_round_score(mean_net, std, curse, rng)
                field_scores.append(score)
            
            # Determine Matthew's finish position
            matt_finish = 1 + sum(1 for s in field_scores[1:] if s < matt_total)
            
            base_points = PAYOUTS[matt_tier].get(matt_finish, 0)
            
            # Strategy: no DD
            results_by_tier_and_strategy[matt_tier]["none"].append(base_points)
            
            # Strategy: always DD
            dd_success = back_score < front_score
            dd_points = 2 * base_points if dd_success else 0
            results_by_tier_and_strategy[matt_tier]["always"].append(dd_points)
            
            # Strategy: DD if front > median
            median_front = MATTHEW_MEAN_NET / 2 + matt_curse / 2
            if front_score > median_front:
                results_by_tier_and_strategy[matt_tier]["if_front_worse"].append(dd_points)
            else:
                results_by_tier_and_strategy[matt_tier]["if_front_worse"].append(base_points)
    
    # Compute EVs
    matthew_ev = {
        tier: {
            strategy: np.mean(results_by_tier_and_strategy[tier][strategy])
            for strategy in ["none", "always", "if_front_worse"]
        }
        for tier in PAYOUTS.keys()
    }
    
    return matthew_ev


def compute_median_player_win_probs(n_sims=N_SIMS):
    """
    Compute P(win) and P(top3) for median player choosing each tier.
    Median player: Sophie Therien skill level (average).
    """
    rng = np.random.default_rng(RNG_SEED + 2)
    
    results = {tier: {"wins": 0, "top3": 0} for tier in PAYOUTS.keys()}
    
    for _ in range(n_sims):
        for player_tier in PAYOUTS.keys():
            # Field: median player + 16 others on mix B
            field_config = [(player_tier, SKILL_MEAN_NET, SKILL_STD)]
            
            for _ in range(FIELD_SIZE - 1):
                tier = rng.choice(
                    list(FIELD_MIX_B.keys()),
                    p=list(FIELD_MIX_B.values())
                )
                field_config.append((tier, SKILL_MEAN_NET, SKILL_STD))
            
            # Simulate round
            sim_results = simulate_field_round(field_config, rng)
            
            # Check median player's finish (idx=0)
            player_result = [r for r in sim_results if r[0] == 0][0]
            finish_pos = player_result[3]
            
            if finish_pos == 1:
                results[player_tier]["wins"] += 1
            if finish_pos <= 3:
                results[player_tier]["top3"] += 1
    
    # Convert to probabilities
    median_probs = {
        tier: {
            "p_win": results[tier]["wins"] / n_sims,
            "p_top3": results[tier]["top3"] / n_sims,
        }
        for tier in PAYOUTS.keys()
    }
    
    return median_probs


def compute_dd_breakeven():
    """
    Compute DD breakeven success rates.
    With no cap: breakeven = base / (2 * base) = 0.5 for all tiers/places.
    
    Formula: EV(DD) = p * 2*base + (1-p) * 0 >= base
             => p >= base / (2*base) = 0.5
    """
    breakeven = {}
    for tier in PAYOUTS.keys():
        breakeven[tier] = {}
        for place in [1, 2, 3]:
            base = PAYOUTS[tier].get(place, 0)
            if base > 0:
                # No cap anymore, so breakeven is always 50%
                breakeven[tier][f"{place}"] = 0.5
            else:
                breakeven[tier][f"{place}"] = None
    
    return breakeven


# ────────────────────────────────────────────────────────────────────────────
# Main Execution
# ────────────────────────────────────────────────────────────────────────────

def main():
    print("Running SSL Open Monte Carlo Simulation...")
    print(f"N = {N_SIMS:,} sims · Field size = {FIELD_SIZE} · Mix B = {FIELD_MIX_B}")
    print(f"NEW PAYOUTS: Normal {PAYOUTS['Normal']}, Hard {PAYOUTS['Hard']}, God {PAYOUTS['God']}")
    print()
    
    # 1. EV by tier
    print("1. Computing EV by tier (field mix B, median skill)...")
    ev_by_tier = run_ev_by_tier_simulation(N_SIMS)
    print(f"   Normal: {ev_by_tier['Normal']:.4f}")
    print(f"   Hard:   {ev_by_tier['Hard']:.4f}")
    print(f"   God:    {ev_by_tier['God']:.4f}")
    print()
    
    # 2. Matthew EV by tier and DD strategy
    print("2. Computing Matthew McAlear EV by tier × DD strategy...")
    matthew_ev = run_matthew_dd_simulation(N_SIMS)
    for tier in ["Normal", "Hard", "God"]:
        print(f"   {tier}:")
        for strategy in ["none", "always", "if_front_worse"]:
            print(f"      {strategy:15s}: {matthew_ev[tier][strategy]:.4f}")
    print()
    
    # 3. Median player win probabilities
    print("3. Computing median player P(win) and P(top3) by tier choice...")
    median_probs = compute_median_player_win_probs(N_SIMS)
    for tier in ["Normal", "Hard", "God"]:
        print(f"   {tier}: P(win)={median_probs[tier]['p_win']:.4f}, P(top3)={median_probs[tier]['p_top3']:.4f}")
    print()
    
    # 4. DD breakeven (analytical, no simulation needed)
    print("4. Computing DD breakeven success rates...")
    breakeven = compute_dd_breakeven()
    for tier in ["Normal", "Hard", "God"]:
        print(f"   {tier}: 1st={breakeven[tier]['1']:.2f}, 2nd={breakeven[tier]['2']:.2f}, 3rd={breakeven[tier]['3']:.2f}")
    print()
    
    # Save summary
    summary = {
        "n_sims": N_SIMS,
        "field_size": FIELD_SIZE,
        "payouts": PAYOUTS,
        "curse_penalties": CURSE_PENALTIES,
        "field_mix_b": FIELD_MIX_B,
        "ev_by_tier": {k: round(v, 4) for k, v in ev_by_tier.items()},
        "matthew_ev": {
            tier: {strat: round(matthew_ev[tier][strat], 4) for strat in ["none", "always", "if_front_worse"]}
            for tier in ["Normal", "Hard", "God"]
        },
        "median_player_probs": {
            tier: {k: round(v, 4) for k, v in median_probs[tier].items()}
            for tier in ["Normal", "Hard", "God"]
        },
        "dd_breakeven": {
            tier: {place: round(breakeven[tier][place], 2) for place in ["1", "2", "3"]}
            for tier in ["Normal", "Hard", "God"]
        },
    }
    
    out_path = Path("ssl_open_summary.json")
    out_path.write_text(json.dumps(summary, indent=2))
    print(f"✓ Summary saved to {out_path}")
    
    return summary


if __name__ == "__main__":
    main()
