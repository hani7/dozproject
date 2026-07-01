import os
from PIL import Image

src_img = r"C:\Users\PC\.gemini\antigravity\brain\df7508ab-1f3d-4366-abce-aa3a9465abac\media__1782913205988.jpg"
res_dir = r"c:\Users\PC\Documents\forcli1\forcli_android\app\src\main\res"

sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

try:
    img = Image.open(src_img).convert("RGBA")
    
    for folder, size in sizes.items():
        folder_path = os.path.join(res_dir, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
            
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Save as ic_launcher.png
        resized.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
        
        # Save as ic_launcher_round.png (creating a circle mask)
        mask = Image.new("L", (size, size), 0)
        from PIL import ImageDraw
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size, size), fill=255)
        
        round_img = resized.copy()
        round_img.putalpha(mask)
        round_img.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
        
    print("Icons generated successfully!")
except Exception as e:
    print("Error:", e)
