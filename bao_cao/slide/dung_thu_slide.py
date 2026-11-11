"""Dựng thử slide: ảnh PNG từng slide (kiểm tra tràn) hoặc --pdf <tệp>: một PDF vector, mỗi slide một trang 1920x1080."""
import re, sys
from playwright.sync_api import sync_playwright
H = "/home/claude/cs411v_final-project_ecommerce-recommender-system/bao_cao/hinh/"
src = open("/home/claude/deck/gen.py").read()
ids = {i: H + f for i, f in re.findall(r'"\w+": \("/_blob/([0-9a-f]+)", \d+, \d+, "([^"]+)"\)', src)}
CSS = ('*{margin:0;box-sizing:border-box} section{width:1920px;height:1080px;overflow:hidden;position:relative;'
       'page-break-after:always;break-after:page} table{border-collapse:collapse} td,th{padding:6px 10px} aside{display:none}'
       '@page{size:1920px 1080px;margin:0} html,body{width:1920px}')
args = sys.argv[1:]
pdf = None
if args and args[0] == "--pdf":
    pdf, args = args[1], args[2:]


def doc(s):
    html = open("/home/claude/deck/project/slides/%s.html" % s).read()
    for i, f in ids.items():
        html = html.replace("/_blob/" + i, "file://" + f)
    return html


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    if pdf:
        open("/tmp/deck_all.html", "w").write('<html><head><meta charset="utf-8"><style>%s</style></head><body>%s</body></html>'
                                             % (CSS, "".join(doc(s) for s in args)))
        pg.goto("file:///tmp/deck_all.html", wait_until="networkidle")
        pg.pdf(path=pdf, width="1920px", height="1080px", print_background=True, margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        print("pdf", pdf)
    else:
        for s in args:
            open("/tmp/sl_%s.html" % s, "w").write('<html><head><meta charset="utf-8"><style>%s</style></head><body>%s</body></html>' % (CSS, doc(s)))
            pg.goto("file:///tmp/sl_%s.html" % s, wait_until="networkidle")
            sh = pg.evaluate("()=>{const s=document.querySelector('section');let m=0;s.querySelectorAll('*').forEach(e=>{const r=e.getBoundingClientRect();if(r.bottom>m)m=r.bottom});return [s.scrollHeight,Math.round(m)]}")
            pg.screenshot(path="/tmp/sl_%s.png" % s)
            print(s, sh, "TRAN" if sh[0] > 1080 or sh[1] > 1016 else "")
    b.close()
