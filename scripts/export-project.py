#!/usr/bin/env python3
"""Export the complete combined source; never include local credentials or old ZIPs."""
from pathlib import Path
import hashlib,json,re,subprocess,zipfile
root=Path(__file__).resolve().parents[1]
required=['index.html','contact.html','product.html','admin.html','styles.css','src/public.js','src/api.ts','src/images.ts','src/admin/main.tsx','src/admin/auth.tsx','src/admin/inventory.tsx','src/admin/product-form.tsx','src/admin/categories.tsx','src/admin/settings.tsx','supabase/migrations/20260911193029_catalog.sql','supabase/migrations/20260911193032_initial_collection.sql','package.json','package-lock.json','vite.config.js','tsconfig.json','vercel.json','.env.example','DEPLOYMENT.md','VERIFICATION.md']
for name in required:
 if not (root/name).is_file(): raise SystemExit('Incomplete combined source: '+name)
if (root/'.env.example').read_text()!='VITE_SUPABASE_URL=\nVITE_SUPABASE_PUBLISHABLE_KEY=\n': raise SystemExit('Environment template must be blank.')
try:
 names=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
 commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
 if subprocess.check_output(['git','status','--porcelain','--untracked-files=normal'],cwd=root,text=True).strip():raise SystemExit('Commit the complete source before exporting.')
except (subprocess.CalledProcessError,FileNotFoundError):
 names=[str(p.relative_to(root)) for p in root.rglob('*') if p.is_file()]
 commit=None
excluded={'.git','node_modules','build','exports','downloads','.openai','.sites-runtime'}
files=[]
for name in sorted(n for n in names if n):
 path=Path(name)
 if any(part in excluded for part in path.parts):continue
 if path.name.startswith('.env') and path.name!='.env.example':continue
 if path.suffix in {'.zip','.gz','.tar'}:continue
 if path.name=='export-downloads.py':continue
 files.append(name)
for name in required:
 if name not in files:raise SystemExit('Required source not tracked/exported: '+name)
for name in files:
 path=root/name
 if path.suffix.lower() in {'.png','.jpg','.jpeg','.webp','.ico'}:continue
 text=path.read_text(errors='ignore')
 if re.search(r'sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}',text):raise SystemExit('Credential-like content found in '+name)
 # Reject JWTs whose payload identifies a privileged role.
 for token in re.findall(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',text):
  import base64
  try: payload=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'==='))
  except Exception:continue
  if payload.get('role')=='service_role':raise SystemExit('Privileged JWT found in '+name)
manifest={'project':'Mahakal Drapery public + reconstructed admin','commit':commit,'validation':'See VERIFICATION.md; live authenticated/browser acceptance remains pending.','files':{name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in files}}
output=root/'exports/mahakal-drapery-combined-source.zip';output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
 for name in files:archive.write(root/name,'mahakal-drapery/'+name)
 archive.writestr('mahakal-drapery/SOURCE-MANIFEST.json',json.dumps(manifest,indent=2)+'\n')
with zipfile.ZipFile(output) as archive:
 assert archive.testzip() is None
 assert all('mahakal-drapery/'+name in archive.namelist() for name in required)
print(output)
print(f'{len(files)} source files; {output.stat().st_size} bytes; commit {commit}')
