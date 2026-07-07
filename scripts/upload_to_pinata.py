import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

PINATA_JWT = os.getenv("PINATA_JWT")
if not PINATA_JWT:
    raise ValueError("PINATA_JWT not set in .env")

HEADERS = {
    "Authorization": f"Bearer {PINATA_JWT}"
}

def upload_to_pinata(file_path: Path):
    """Upload file to Pinata and return IPFS CID"""
    url = "https://uploads.pinata.cloud/v3/files"
    files = {"file": open(file_path, "rb")}
    response = requests.post(url, headers=HEADERS, files=files)
    response.raise_for_status()
    data = response.json()
    return f"ipfs://{data['data']['cid']}"

def main():
    base_dir = Path("stitch_avax_hero_quest_design")
    if not base_dir.exists():
        raise FileNotFoundError("stitch_avax_hero_quest_design directory not found. Unzip first.")

    badges = []
    badge_folders = sorted([d for d in base_dir.iterdir() if d.is_dir()])

    for i, folder in enumerate(badge_folders[:20], 1):
        screen_png = next(folder.glob("**/screen.png"), None)
        if not screen_png:
            print(f"Skipping {folder} - no screen.png")
            continue

        image_cid = upload_to_pinata(screen_png)
        name = folder.name.replace("_", " ").title()[:50]
        description = f"MiniHack Achievement Badge: {name}"

        metadata = {
            "name": name,
            "description": description,
            "image": image_cid,
            "attributes": [
                {"trait_type": "Badge ID", "value": str(i)},
                {"trait_type": "Type", "value": "Soulbound" if i <= 17 else "Transferable"}
            ]
        }

        metadata_path = Path(f"/tmp/badge_{i}.json")
        metadata_path.write_text(json.dumps(metadata, indent=2))
        metadata_cid = upload_to_pinata(metadata_path)

        badges.append({
            "badgeId": i,
            "name": name,
            "imageUri": image_cid,
            "metadataUri": metadata_cid,
            "isSoulbound": i <= 17
        })
        print(f"Uploaded badge {i}: {name}")

    with open("badge_uris.json", "w") as f:
        json.dump(badges, f, indent=2)

    print("✅ badge_uris.json generated")

if __name__ == "__main__":
    main()
