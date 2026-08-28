from PIL import Image, ImageDraw
import os

def create_icon(size, filename):
    # 100% pure transparent RGBA canvas
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Center Prism Logo Coordinates
    cx = size / 2
    cy = size / 2
    pw = size * 0.44
    ph = size * 0.44

    # Top Face (Cyan to Sky Blue)
    top_poly = [
        (cx, cy - ph * 0.48),
        (cx + pw * 0.46, cy - ph * 0.16),
        (cx, cy + ph * 0.16),
        (cx - pw * 0.46, cy - ph * 0.16)
    ]
    draw.polygon(top_poly, fill=(56, 189, 248, 255))

    # Left Face (Deep Sapphire Blue)
    left_poly = [
        (cx - pw * 0.46, cy - ph * 0.16),
        (cx, cy + ph * 0.16),
        (cx, cy + ph * 0.64),
        (cx - pw * 0.46, cy + ph * 0.32)
    ]
    draw.polygon(left_poly, fill=(37, 99, 235, 255))

    # Right Face (Vibrant Sky Blue)
    right_poly = [
        (cx, cy + ph * 0.16),
        (cx + pw * 0.46, cy - ph * 0.16),
        (cx + pw * 0.46, cy + ph * 0.32),
        (cx, cy + ph * 0.64)
    ]
    draw.polygon(right_poly, fill=(14, 165, 233, 255))

    # Laser Core Beam
    draw.line([(cx, cy - ph * 0.38), (cx, cy + ph * 0.54)], fill=(255, 255, 255, 230), width=max(2, int(size * 0.032)))

    # Core Quantum Shard Orb
    r1 = size * 0.052
    draw.ellipse([cx - r1, cy + ph * 0.16 - r1, cx + r1, cy + ph * 0.16 + r1], fill=(255, 255, 255, 255))
    r2 = size * 0.03
    draw.ellipse([cx - r2, cy + ph * 0.16 - r2, cx + r2, cy + ph * 0.16 + r2], fill=(0, 242, 254, 255))

    img.save(filename, "PNG")
    print(f"Generated 100% Transparent Icon: {filename} ({size}x{size})")

os.makedirs("public", exist_ok=True)
for sz in [72, 96, 128, 144, 152, 192, 256, 384, 512]:
    create_icon(sz, f"public/icon-{sz}.png")
    create_icon(sz, f"public/icon-maskable-{sz}.png")

create_icon(180, "public/apple-touch-icon.png")
print("SUCCESS: All PWA Icons generated with 100% transparent backgrounds!")
