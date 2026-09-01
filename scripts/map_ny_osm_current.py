from pathlib import Path

base = Path(__file__).resolve().parent / 'map_ny_osm_v2.py'
src = base.read_text(encoding='utf-8')
src = src.replace(
    "endpoints = ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter']",
    "endpoints = ['https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter']"
)
src = src.replace("with urllib.request.urlopen(req, timeout=240) as r:", "with urllib.request.urlopen(req, timeout=120) as r:")
exec(compile(src, str(base), 'exec'), {'__name__':'__main__', '__file__':str(base)})
