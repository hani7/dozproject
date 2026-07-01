import os
from PIL import Image

src_img = r"C:\Users\PC\.gemini\antigravity\brain\df7508ab-1f3d-4366-abce-aa3a9465abac\media__1782913205988.jpg"
res_img = r"c:\Users\PC\Documents\forcli1\frontend_vite\public\icon.png"

try:
    img = Image.open(src_img).convert("RGBA")
    
    # Make it a square for favicon
    w, h = img.size
    min_dim = min(w, h)
    left = (w - min_dim) / 2
    top = (h - min_dim) / 2
    right = (w + min_dim) / 2
    bottom = (h + min_dim) / 2
    img = img.crop((left, top, right, bottom))
    
    img = img.resize((128, 128), Image.Resampling.LANCZOS)
    img.save(res_img, "PNG")
    print("Favicon generated successfully!")
except Exception as e:
    print("Error:", e)
