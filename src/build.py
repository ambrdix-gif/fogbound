import base64, json, glob, os
HERE=os.path.dirname(os.path.abspath(__file__))+'/'
A=HERE+'assets/'; GD=HERE+'game/'; OUT=HERE+'../index.html'
assets={}
for f in sorted(glob.glob(A+'*.png'))+sorted(glob.glob(A+'*.jpg')):
    n=os.path.basename(f)[:-4]
    assets[n]=('data:image/jpeg;base64,' if f.endswith('.jpg') else 'data:image/png;base64,')+base64.b64encode(open(f,'rb').read()).decode()
meta=json.load(open(A+'meta.json'))['files']
html='''<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#020605">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
@@OG@@
<title>Fogbound — Nusantara Berkabut</title>
<style>
html,body{margin:0;height:100%;background:#020605;overflow:hidden;overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#root{position:fixed;left:0;top:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;transform-origin:0 0}
#root.rot{transform:rotate(90deg) translateY(-100%)}
canvas{image-rendering:pixelated;image-rendering:crisp-edges;display:block;outline:none}
#touch{display:none;position:absolute;left:0;right:0;bottom:0;height:0;pointer-events:none}
body.touch #touch{display:block}
#touch>.b{position:absolute;bottom:calc(var(--u,1vw)*3.2);width:calc(var(--b,80px)*1.15);height:calc(var(--b,80px)*1.15);box-sizing:border-box;border-radius:50%;background:rgba(150,190,170,.10);border:2px solid rgba(232,166,58,.45);pointer-events:auto;display:flex;align-items:center;justify-content:center;color:rgba(232,166,58,.8);font:700 calc(var(--b,80px)*.4) monospace}
#bf{left:calc(var(--u,1vw)*3)}
#joy{position:absolute;right:0;bottom:0;width:calc(var(--u,1vw)*42);height:calc(var(--u,1vw)*30);pointer-events:auto}
#jb{position:absolute;right:calc(var(--u,1vw)*3);bottom:calc(var(--u,1vw)*2.6);width:calc(var(--b,80px)*1.9);height:calc(var(--b,80px)*1.9);box-sizing:border-box;border-radius:50%;background:rgba(150,190,170,.07);border:2px solid rgba(190,220,200,.22);pointer-events:none;transition:opacity .2s}
#jb i{position:absolute;color:rgba(220,235,225,.32);font:700 calc(var(--b,80px)*.22) monospace;font-style:normal}
#jb .u{top:4%;left:50%;transform:translateX(-50%)}#jb .l{left:7%;top:50%;transform:translateY(-50%)}#jb .r{right:7%;top:50%;transform:translateY(-50%)}
#jk{position:absolute;left:50%;top:50%;width:calc(var(--b,80px)*.78);height:calc(var(--b,80px)*.78);margin:calc(var(--b,80px)*-.39) 0 0 calc(var(--b,80px)*-.39);box-sizing:border-box;border-radius:50%;background:rgba(190,220,200,.20);border:2px solid rgba(220,235,225,.42)}
#jb.on{background:rgba(150,190,170,.12)}#jb.on #jk{background:rgba(220,235,225,.32)}
</style></head><body>
<div id="root"><canvas id="c" tabindex="0"></canvas>
<div id="touch"><div id="bf" class="b">E</div><div id="joy"><div id="jb"><i class="u">^</i><i class="l">&lt;</i><i class="r">&gt;</i><div id="jk"></div></div></div></div></div>
<script>
const ASSETS=@@ASSETS@@;
const META=@@META@@;
const FONT_GAEGU="data:font/woff2;base64,@@FONT@@";
</script>
<script>
@@GAME@@
</script>
</body></html>
'''
OG=os.environ.get('FOG_OG') or (open(HERE+'og.html').read() if os.path.exists(HERE+'og.html') else '')
GC=os.environ.get('FOG_GC','').strip()
GCTAG=('<script data-goatcounter="https://%s.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>'%GC) if GC else ''
html=html.replace('@@OG@@',OG+GCTAG).replace('@@FONT@@',base64.b64encode(open(HERE+'gaegu-latin-700-normal.woff2','rb').read()).decode()).replace('@@ASSETS@@',json.dumps(assets)).replace('@@META@@',json.dumps(meta)).replace('@@GAME@@','(function () {\n"use strict";\n'+open(GD+'game_a.js').read()+open(GD+'game_audio.js').read()+open(GD+'game_b.js').read()+open(GD+'game_ch5.js').read()+open(GD+'game_props.js').read()+open(GD+'game_c.js').read()+'\n})();')
open(OUT,'w').write(html)
print(len(html)//1024,'KB')
