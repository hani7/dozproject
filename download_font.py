import urllib.request
import base64
import os

url = 'https://github.com/notofonts/noto-fonts/raw/main/hinted/ttf/NotoNaskhArabic/NotoNaskhArabic-Regular.ttf'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
res = urllib.request.urlopen(req)
data = res.read()
b64 = base64.b64encode(data).decode('utf-8')

out_path = os.path.join('frontend_vite', 'src', 'lib', 'amiriFont.ts')
with open(out_path, 'w') as f:
    f.write("export const amiriFont = '" + b64 + "';\n")

print("Font generated successfully.")
