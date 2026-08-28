from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background squircle or full rect
    if maskable:
        # Full coverage for maskable
        draw.rectangle([0, 0, size, size], fill=(6, 9, 18, 255))
    else:
        # Rounded squircle
        corner_radius = int(size * 0.22)
        draw.rounded_rectangle([2, 2, size - 2, size - 2], radius=corner_radius, fill=(6, 9, 18, 255), outline=(255, 255, 255, 30), width=int(size * 0.015))

    # Center Prism Logo
    cx = size / 2
    cy = size / 2
    pw = size * 0.44
    ph = size * 0.44

    # Top Face (Cyan to Blue)
    top_poly = [
        (cx, cy - ph * 0.48),
        (cx + pw * 0.46, cy - ph * 0.16),
        (cx, cy + ph * 0.16),
        (cx - pw * 0.46, cy - ph * 0.16)
    ]
    draw.polygon(top_poly, fill=(56, 189, 248, 255))

    # Left Face (Deep Blue)
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
    draw.line([(cx, cy - ph * 0.38), (cx, cy + ph * 0.54)], fill=(255, 255, 255, 220), width=max(2, int(size * 0.032)))

    # Core Quantum Orb
    r1 = size * 0.052
    draw.ellipse([cx - r1, cy + ph * 0.16 - r1, cx + r1, cy + ph * 0.16 + r1], fill=(255, 255, 255, 255))
    r2 = size * 0.03
    draw.ellipse([cx - r2, cy + ph * 0.16 - r2, cx + r2, cy + ph * 0.16 + r2], fill=(0, 242, 254, 255))

    img.save(filename, "PNG")
    print(f"Generated: {filename} ({size}x{size})")

def create_screenshot(width, height, filename, title_text, sub_text):
    img = Image.new("RGBA", (width, height), (6, 9, 18, 255))
    draw = ImageDraw.Draw(img)

    # Gradient background simulated with bands
    for y in range(height):
        ratio = y / height
        r = int(6 + ratio * 12)
        g = int(9 + ratio * 18)
        b = int(18 + ratio * 32)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # App Card Container Mockup
    cw = int(width * 0.86)
    ch = int(height * 0.62)
    cx = int(width * 0.07)
    cy = int(height * 0.22)

    draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=24, fill=(15, 23, 42, 240), outline=(37, 99, 235, 120), width=3)

    # Inner upload box
    uw = int(cw * 0.88)
    uh = int(ch * 0.44)
    ux = cx + int((cw - uw) / 2)
    uy = cy + int(ch * 0.12)
    draw.rounded_rectangle([ux, uy, ux + uw, uy + uh], radius=16, fill=(30, 41, 59, 200), outline=(56, 189, 248, 80), width=2)

    # Center upload button
    bw = int(cw * 0.65)
    bh = int(ch * 0.14)
    bx = cx + int((cw - bw) / 2)
    by = cy + int(ch * 0.72)
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=12, fill=(37, 99, 235, 255))

    img.save(filename, "PNG")
    print(f"Generated Screenshot: {filename} ({width}x{height})")

os.makedirs("public", exist_ok=True)
for sz in [72, 96, 128, 144, 152, 192, 256, 384, 512]:
    create_icon(sz, f"public/icon-{sz}.png", False)
    create_icon(sz, f"public/icon-maskable-{sz}.png", True)

create_icon(180, "public/apple-touch-icon.png", False)

create_screenshot(750, 1334, "public/screenshot-mobile.png", "DropLync Mobile", "10GB Secure Transfers")
create_screenshot(1280, 800, "public/screenshot-desktop.png", "DropLync Desktop", "Fast Encrypted File Transfers")
