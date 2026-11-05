"""Copy selected NASJ repository assets as optimized, traceable preview images."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageOps
parser=argparse.ArgumentParser()
parser.add_argument('--platform-root',type=Path,required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
sources=['marketplace/kilim.jpg','marketplace/gift-basket.jpg','marketplace/ceramic-mug.jpg','brand/artisan-weaving.jpg','brand/nasj-logo-white.png']
manifest=[]
for relative in sources:
 source=args.platform_root/'apps/web/public'/relative
 image=ImageOps.exif_transpose(Image.open(source))
 image.thumbnail((800,800),Image.Resampling.LANCZOS)
 output=root/'public/platform'/(source.stem+'.webp')
 image.save(output,format='WEBP',quality=88,method=6)
 manifest.append({'source':relative,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'output':'/platform/'+output.name,'bytes':output.stat().st_size})
(root/'public/platform/provenance.json').write_text(json.dumps({'origin':'wie-challenge/website','dataStatus':'Repository demo examples, not verified live inventory','assets':manifest},indent=2)+'\n')
print(json.dumps({'assets':len(manifest),'totalBytes':sum(x['bytes'] for x in manifest)}))
