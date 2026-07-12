#!/usr/bin/env python3
"""
upload_to_pinata.py

Uploads each badge image to Pinata IPFS, generates ERC-721 metadata JSON,
uploads that too, then writes badge_uris.json for register_badges.ts.

FIXED: the previous version assigned badgeId by alphabetically sorting the
stitch_avax_hero_quest_design folder names. That put the leaderboard badges
("mini_hack_leaderboard_first_place_champion", etc.) at positions 8-10 and
marked them `isSoulbound: True` (since i <= 17) — the exact opposite of what
they should be. Leaderboard badges (18-20) must be transferable; quest
badges (1-17) must be soulbound. This version uses an explicit mapping so
badge IDs are stable and correct regardless of folder sort order, and match
the IDs already registered against the deployed contract and referenced by
`quests.badge_token_id` in the Supabase migration.

Usage:
    pip install requests python-dotenv --break-system-packages
    PINATA_JWT=<your_jwt> python upload_to_pinata.py
"""

import os
import json
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

PINATA_JWT = os.environ["PINATA_JWT"]
BADGES_DIR = Path("stitch_avax_hero_quest_design")

PINATA_FILE_URL = "https://uploads.pinata.cloud/v3/files"
PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
HEADERS = {"Authorization": f"Bearer {PINATA_JWT}"}

# badgeId -> (folder_name, display_name, description, isSoulbound)
# Matches supabase/migrations/20260710190452_real_badge_catalog_and_claim_hardening.sql
BADGE_REGISTRY: dict[int, tuple[str, str, str, bool]] = {
    1: ("a_high_fidelity_nft_collectible_for_week_1_session_1_quest_deploy_your_first",
        "Week 1 S1: Deploy Your First Contract",
        "Awarded for deploying your first smart contract on Avalanche Fuji.", True),
    2: ("a_high_fidelity_nft_collectible_for_week_1_session_2_quest_register_as_a",
        "Week 1 S2: Register as a Builder",
        "Awarded for registering as an official MiniHack builder.", True),
    3: ("a_high_fidelity_nft_collectible_for_week_2_session_3_quest_build_and_submit_a",
        "Week 2 S3: Build and Submit a Project",
        "Awarded for building and submitting a Week 2 project.", True),
    4: ("a_high_fidelity_nft_collectible_for_week_2_session_4_quest_scaffold_foundry",
        "Week 2 S4: Scaffold with Foundry",
        "Awarded for scaffolding a project using Foundry.", True),
    5: ("a_high_fidelity_nft_collectible_for_week_3_session_5_quest._a_cluster_of",
        "Week 3 S5 Quest", "Awarded for completing the Week 3 Session 5 challenge.", True),
    6: ("a_high_fidelity_nft_collectible_for_week_3_session_6_quest._a_complex_web_of",
        "Week 3 S6 Quest", "Awarded for completing the Week 3 Session 6 challenge.", True),
    7: ("a_high_fidelity_nft_collectible_for_week_4_advanced_subnet_configuration._a",
        "Week 4: Advanced Subnet Configuration",
        "Awarded for configuring an advanced Avalanche subnet.", True),
    8: ("a_high_fidelity_nft_collectible_for_week_5_cross_chain_communication._two",
        "Week 5: Cross-Chain Communication",
        "Awarded for implementing cross-chain messaging.", True),
    9: ("a_high_fidelity_nft_collectible_for_gaming_week_5_game_loop_design._a_glowing",
        "Gaming Week 5: Game Loop Design", "Awarded for designing an on-chain game loop.", True),
    10: ("a_high_fidelity_nft_collectible_for_gaming_week_6_nft_integration._a",
         "Gaming Week 6: NFT Integration", "Awarded for integrating NFTs into a game.", True),
    11: ("a_high_fidelity_nft_collectible_for_gaming_week_7_leaderboard_contract._a",
         "Gaming Week 7: Leaderboard Contract",
         "Awarded for building and deploying an on-chain leaderboard contract.", True),
    12: ("a_high_fidelity_nft_collectible_for_agentic_ai_week_9_agent_architecture._a",
         "Agentic AI Week 9: Agent Architecture",
         "Awarded for designing a robust agentic AI architecture.", True),
    13: ("a_high_fidelity_nft_collectible_for_agentic_ai_week_10_on_chain_ai_action._a",
         "Agentic AI Week 10: On-Chain AI Action",
         "Awarded for executing an on-chain AI action successfully.", True),
    14: ("a_high_fidelity_nft_collectible_for_week_10_decentralized_governance._a",
         "Week 10: Decentralized Governance",
         "Awarded for implementing a decentralized governance mechanism.", True),
    15: ("a_high_fidelity_nft_collectible_for_week_11_production_mainnet_deployment._a",
         "Week 11: Production Mainnet Deployment",
         "Awarded for deploying a project to Avalanche mainnet.", True),
    16: ("a_high_fidelity_nft_collectible_for_agentic_ai_week_12_agentic_product_demo._a",
         "Agentic AI Week 12: Product Demo", "Awarded for delivering an agentic AI product demo.", True),
    17: ("a_high_fidelity_nft_collectible_for_final_capstone_project_master_of_the_forge.",
         "Final Capstone: Master of the Forge",
         "Awarded for completing the final MiniHack capstone project.", True),
    # Leaderboard badges — transferable, one-of-a-kind, awarded (not self-claimed)
    18: ("a_high_fidelity_nft_collectible_for_mini_hack_leaderboard_first_place_champion.",
         "MiniHack Champion — 1st Place",
         "Awarded to the first-place winner of the Avalanche MiniHack leaderboard.", False),
    19: ("a_high_fidelity_nft_collectible_for_mini_hack_leaderboard_second_place_runner",
         "MiniHack Runner-Up — 2nd Place",
         "Awarded to the second-place finisher of the Avalanche MiniHack leaderboard.", False),
    20: ("a_high_fidelity_nft_collectible_for_mini_hack_leaderboard_third_place_finisher.",
         "MiniHack Finalist — 3rd Place",
         "Awarded to the third-place finisher of the Avalanche MiniHack leaderboard.", False),
}


def pin_file(image_path: Path, badge_name: str) -> str:
    with open(image_path, "rb") as f:
        response = requests.post(
            PINATA_FILE_URL,
            headers=HEADERS,
            files={"file": (image_path.name, f, "image/png")},
        )
    response.raise_for_status()
    cid = response.json()["data"]["cid"]
    print(f"  \u2713 Image uploaded: ipfs://{cid}")
    return f"ipfs://{cid}"


def pin_metadata(metadata: dict, badge_name: str) -> str:
    response = requests.post(
        PINATA_JSON_URL,
        headers=HEADERS,
        json={
            "pinataMetadata": {"name": f"{badge_name} metadata"},
            "pinataContent": metadata,
        },
    )
    response.raise_for_status()
    cid = response.json()["IpfsHash"]
    print(f"  \u2713 Metadata uploaded: ipfs://{cid}")
    return f"ipfs://{cid}"


def main() -> None:
    if not BADGES_DIR.exists():
        raise FileNotFoundError(f"{BADGES_DIR} not found. Unzip the artifact bundle first.")

    output: dict[str, dict] = {}

    for badge_id, (folder, name, description, is_soulbound) in sorted(BADGE_REGISTRY.items()):
        image_path = BADGES_DIR / folder / "screen.png"
        if not image_path.exists():
            print(f"[WARN] Missing image for badgeId {badge_id}: {image_path}")
            continue

        print(f"\n[{badge_id:02d}] {name}")
        image_uri = pin_file(image_path, name)

        metadata = {
            "name": name,
            "description": description,
            "image": image_uri,
            "attributes": [
                {"trait_type": "Badge ID", "value": badge_id},
                {"trait_type": "Type", "value": "Quest" if is_soulbound else "Leaderboard"},
                {"trait_type": "Soulbound", "value": is_soulbound},
                {"trait_type": "Collection", "value": "Avalanche MiniHack"},
            ],
        }
        metadata_uri = pin_metadata(metadata, name)

        output[str(badge_id)] = {
            "badgeId": badge_id,
            "name": name,
            "imageUri": image_uri,
            "metadataUri": metadata_uri,
            "isSoulbound": is_soulbound,
        }
        time.sleep(0.3)

    Path("badge_uris.json").write_text(json.dumps(output, indent=2))
    print(f"\n\u2705 Done. Wrote badge_uris.json with {len(output)} entries.")


if __name__ == "__main__":
    main()
