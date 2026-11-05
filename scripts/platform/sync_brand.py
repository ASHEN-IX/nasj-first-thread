"""Import the platform's exact logo files and already-built font subsets."""
import argparse,hashlib,json,re,shutil
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--platform-root',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[2];web=a.platform_root/'apps/web';brand=root/'public/brand';fonts=root/'public/fonts';brand.mkdir(exist_ok=True);fonts.mkdir(exist_ok=True)
records=[]
for name in ['nasj-logo.png','nasj-logo-white.png','nasj-mark.png']:
 src=web/'public/brand'/name;shutil.copy2(src,brand/name);records.append({'source':'apps/web/public/brand/'+name,'output':'/brand/'+name,'sha256':hashlib.sha256(src.read_bytes()).hexdigest()})
css=[]
for path in sorted((web/'.next/static/chunks').glob('*.css')):
 for block in re.findall(r'@font-face\{[^}]+\}',path.read_text()):
  family=re.search(r'font-family:([^;]+)',block).group(1)
  match=re.search(r'url\(\.\./media/([^\)]+\.woff2)\)',block)
  if family not in ['Inter','Manrope','Tajawal'] or not match:continue
  name=match.group(1);src=web/'.next/static/media'/name;shutil.copy2(src,fonts/name)
  css.append(block.replace('../media/','/fonts/'))
  records.append({'family':family,'source':str(src.relative_to(a.platform_root)),'output':'/fonts/'+name,'sha256':hashlib.sha256(src.read_bytes()).hexdigest()})
if not css:raise SystemExit('Build the platform first so its actual font assets are available.')
(root/'app/platform-fonts.css').write_text('/* Exact font subsets from the NASJ platform build. */\n'+'\n'.join(css)+'\n')
src=root/'First Thread Mascot Badge.png';im=Image.open(src);im.thumbnail((480,480),Image.Resampling.LANCZOS);im.save(brand/'first-thread-mascot.webp',quality=92,method=6)
records.append({'source':src.name,'output':'/brand/first-thread-mascot.webp','sha256':hashlib.sha256(src.read_bytes()).hexdigest()})
(brand/'provenance.json').write_text(json.dumps(records,indent=2)+'\n');print({'fontFaces':len(css),'brandFiles':4})
