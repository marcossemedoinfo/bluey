# -*- coding: utf-8 -*-
"""
Scans all .png, .jpg, .jpeg, .webp files inside BlueyWeb/assets/colouring/
and automatically registers them in BlueyWeb/assets/game_data.json and BlueyWeb/assets/game_data.js!
"""
import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COL_DIR = os.path.join(BASE_DIR, "assets", "colouring")
JSON_PATH = os.path.join(BASE_DIR, "assets", "game_data.json")
JS_PATH = os.path.join(BASE_DIR, "assets", "game_data.js")

FRIENDLY_NAMES = {
    "Heelers": "Família Heeler",
    "Friends": "Amigos",
    "Animals": "Animais",
    "Dancemode": "Modo Dança",
    "Christmas": "Natal",
    "Easter": "Páscoa",
    "Familytrip": "Viagem em Família",
    "Food": "Comidas",
    "Jobs": "Profissões",
    "Letsmove": "Vamos Mexer",
    "Memories": "Memórias",
    "Pooltime": "Piscina",
    "Smoochykiss": "Beijinho",
    "Thisgame": "Brincadeiras",
    "Trickortreat": "Halloween",
}

def format_title(filename_no_ext):
    clean = filename_no_ext.replace("_HIGH_RES", "").replace("_LOW_RES", "")
    parts = clean.split("_")
    prefix = parts[0]
    rest = " ".join(parts[1:]) if len(parts) > 1 else ""
    cat = FRIENDLY_NAMES.get(prefix, prefix)
    return f"{cat} #{rest}".strip() if rest else cat, cat

def main():
    if not os.path.exists(JSON_PATH):
        print("Erro: assets/game_data.json nao encontrado.")
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    existing_by_sprite = {item["sprite"]: item for item in data.get("colouring", [])}
    valid_exts = (".png", ".jpg", ".jpeg", ".webp")
    files = sorted([
        f for f in os.listdir(COL_DIR)
        if f.lower().endswith(valid_exts)
    ])

    new_colouring = []
    added_count = 0
    for fname in files:
        rel_sprite = f"assets/colouring/{fname}"
        if rel_sprite in existing_by_sprite:
            new_colouring.append(existing_by_sprite[rel_sprite])
        else:
            stem = os.path.splitext(fname)[0]
            title, cat = format_title(stem)
            new_colouring.append({
                "id": stem,
                "name": title,
                "category": cat,
                "sprite": rel_sprite
            })
            added_count += 1
            print(f"[+] Novo desenho detectado: {fname} -> '{title}'")

    data["colouring"] = new_colouring

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write("window.BLUEY_GAME_DATA = ")
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print(f"\nConcluido! Total de desenhos no jogo: {len(new_colouring)} ({added_count} novos adicionados).")

if __name__ == "__main__":
    main()

