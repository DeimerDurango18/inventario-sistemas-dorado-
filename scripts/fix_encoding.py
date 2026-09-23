import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGETS = list((ROOT / "frontend" / "src").rglob("*.jsx")) + list((ROOT / "frontend" / "src").rglob("*.js")) + [ROOT / "frontend" / "index.html"]

MAP = {
    "Ã¡": "á",
    "Ã©": "é",
    "Ã­": "í",
    "Ã³": "ó",
    "Ãº": "ú",
    "Ã¼": "ü",
    "Ã±": "ñ",
    "Ã‰": "É",
    "Ãš": "Ú",
    "Ã‘": "Ñ",
    "Â¿": "¿",
    "Â¡": "¡",
    "â€¦": "…",
    "â€”": "—",
    "â€“": "–",
    "â€™": "’",
    "â€œ": "“",
    "â€\u009d": "”",
    "â€": "”",
    "Â": "",
}

def fix(text):
    out = text
    for k, v in MAP.items():
        out = out.replace(k, v)
    return out

changed = 0
for fp in TARGETS:
    if not fp.exists():
        continue
    raw = fp.read_text(encoding="utf-8")
    n = fp.read_text(encoding="utf-8")
    fixed = fix(n)
    if fixed != raw:
        fp.write_text(fixed, encoding="utf-8")
        changed += 1
        print(f"OK  {fp.relative_to(ROOT)}")
print(f"Archivos corregidos: {changed}")