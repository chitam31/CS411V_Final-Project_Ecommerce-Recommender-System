// Vẽ biểu đồ đường và cột bằng SVG thuần, không cần thư viện ngoài.
// chuoi = [{ten: "Nhóm A", gia_tri: [..]}, ...]; nhan = nhãn trục ngang.
const MAU = ["#2563eb", "#d97706", "#15803d", "#b91c1c", "#7c3aed", "#0891b2"];

function _khung(idPhanTu, nhan, chuoi, tuyChon) {
  const rong = 900, cao = 260, le = {trai: 56, phai: 16, tren: 16, duoi: 48};
  const tatCa = chuoi.flatMap(c => c.gia_tri).filter(v => v !== null && v !== undefined);
  const lon = tatCa.length ? Math.max(...tatCa) * 1.1 || 1 : 1;
  const x0 = le.trai, x1 = rong - le.phai, y0 = cao - le.duoi, y1 = le.tren;
  const dinhDang = tuyChon.dinhDang || (v => v.toFixed(2));
  let svg = `<svg class="bieu-do" viewBox="0 0 ${rong} ${cao}" width="100%" height="${cao}">`;
  for (let i = 0; i <= 4; i++) {
    const y = y0 - (y0 - y1) * i / 4;
    svg += `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="#e4e7eb"/>`;
    svg += `<text x="${x0 - 6}" y="${y + 4}" text-anchor="end">${dinhDang(lon * i / 4)}</text>`;
  }
  const buoc = Math.max(1, Math.ceil(nhan.length / 12));
  return {svg, rong, cao, x0, x1, y0, y1, lon, buoc, dinhDang};
}

function _chuThich(svg, chuoi, x, y) {
  chuoi.forEach((c, i) => {
    svg += `<rect x="${x + i * 150}" y="${y}" width="10" height="10" fill="${MAU[i % MAU.length]}"/>`;
    svg += `<text x="${x + i * 150 + 14}" y="${y + 9}">${c.ten}</text>`;
  });
  return svg;
}

function veDuong(idPhanTu, nhan, chuoi, tuyChon = {}) {
  const el = document.getElementById(idPhanTu);
  if (!el || !nhan.length) { if (el) el.innerHTML = "<p class='mo'>Chưa có dữ liệu.</p>"; return; }
  let k = _khung(idPhanTu, nhan, chuoi, tuyChon);
  let svg = k.svg;
  const xp = i => nhan.length === 1 ? (k.x0 + k.x1) / 2 : k.x0 + (k.x1 - k.x0) * i / (nhan.length - 1);
  const yp = v => k.y0 - (k.y0 - k.y1) * v / k.lon;
  nhan.forEach((n, i) => { if (i % k.buoc === 0) svg += `<text x="${xp(i)}" y="${k.y0 + 16}" text-anchor="middle">${String(n).slice(-10)}</text>`; });
  chuoi.forEach((c, j) => {
    const diem = c.gia_tri.map((v, i) => v === null ? null : [xp(i), yp(v)]).filter(Boolean);
    svg += `<polyline fill="none" stroke="${MAU[j % MAU.length]}" stroke-width="2" points="${diem.map(p => p.join(",")).join(" ")}"/>`;
    diem.forEach(p => { svg += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${MAU[j % MAU.length]}"/>`; });
  });
  el.innerHTML = _chuThich(svg, chuoi, k.x0, k.cao - 18) + "</svg>";
}

function veCot(idPhanTu, nhan, chuoi, tuyChon = {}) {
  const el = document.getElementById(idPhanTu);
  if (!el || !nhan.length || !chuoi.length) { if (el) el.innerHTML = "<p class='mo'>Chưa có dữ liệu.</p>"; return; }
  let k = _khung(idPhanTu, nhan, chuoi, tuyChon);
  let svg = k.svg;
  const oRong = (k.x1 - k.x0) / nhan.length, cotRong = oRong * 0.8 / chuoi.length;
  nhan.forEach((n, i) => {
    svg += `<text x="${k.x0 + oRong * (i + 0.5)}" y="${k.y0 + 16}" text-anchor="middle">${n}</text>`;
    chuoi.forEach((c, j) => {
      const v = c.gia_tri[i] || 0, h = (k.y0 - k.y1) * v / k.lon;
      svg += `<rect x="${k.x0 + oRong * i + oRong * 0.1 + cotRong * j}" y="${k.y0 - h}" width="${cotRong}" height="${h}" fill="${MAU[j % MAU.length]}"><title>${c.ten}: ${k.dinhDang(v)}</title></rect>`;
    });
  });
  el.innerHTML = _chuThich(svg, chuoi, k.x0, k.cao - 18) + "</svg>";
}
