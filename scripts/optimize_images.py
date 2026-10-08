"""Optional artwork preparation. Never modifies the supplied PNG originals."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
output = root / "images" / "web"
output.mkdir(exist_ok=True)
for name in ("start", "first_error", "second_error", "game_lost", "game_won"):
    source = "game_lost_new_v2" if name == "game_lost" else f"{name}_v2"
    with Image.open(root / "images" / f"{source}.png") as image:
        image.save(output / f"{name}.webp", "WEBP", quality=90, method=6)
    print(f"Created {name}.webp")
