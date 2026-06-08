// ── 캔버스 기본 해상도 ──
const W = 1280;
const H = 720;

// ── 상태 ──
let bgMode   = 'image';  // 'image' | 'color'
let bgImage  = null;
let bgColor  = '#B8860B';

let personImage = null;
let personX     = 960;   // 기본: 오른쪽
let personY     = 0;
let personH     = 720;   // 기본: 전체 높이

let isDragging = false;
let dragOffX = 0, dragOffY = 0;

let titleSize = 220;

// ── DOM ──
const canvas       = document.getElementById('canvas');
const ctx          = canvas.getContext('2d');

const bgFile       = document.getElementById('bg-file');
const bgUploadZone = document.getElementById('bg-upload-zone');
const bgPreview    = document.getElementById('bg-preview');
const bgPreviewImg = document.getElementById('bg-preview-img');
const btnBgUpload  = document.getElementById('btn-bg-upload');
const btnBgChange  = document.getElementById('btn-bg-change');

const bgColorInput = document.getElementById('bg-color');
const bgColorVal   = document.getElementById('bg-color-val');

const personFile       = document.getElementById('person-file');
const personUploadZone = document.getElementById('person-upload-zone');
const personPreview    = document.getElementById('person-preview');
const personPreviewImg = document.getElementById('person-preview-img');
const btnPersonUpload  = document.getElementById('btn-person-upload');
const btnPersonChange  = document.getElementById('btn-person-change');
const btnPersonRemove  = document.getElementById('btn-person-remove');
const personControls   = document.getElementById('person-controls');
const personSizeSlider = document.getElementById('person-size');
const personSizeVal    = document.getElementById('person-size-val');

const inputTitle    = document.getElementById('input-title');
const inputSub      = document.getElementById('input-sub');
const titleSizeSlider = document.getElementById('title-size');
const titleSizeVal  = document.getElementById('title-size-val');

// ── 이미지 로드 ──
function loadImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });
}

// ── 렌더 ──
async function render() {
  await document.fonts.ready;
  ctx.clearRect(0, 0, W, H);

  // 1. 배경
  if (bgMode === 'image' && bgImage) {
    drawCover(ctx, bgImage, W, H);
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);
  }

  // 2. 인물 사진
  if (personImage) {
    const aspect = personImage.width / personImage.height;
    const pH = personH;
    const pW = pH * aspect;
    ctx.drawImage(personImage, personX - pW / 2, personY, pW, pH);
  }

  // 3. 텍스트
  drawText(ctx, W, H);
}

function drawCover(ctx, img, w, h) {
  const ir = img.width / img.height;
  const cr = w / h;
  let sw, sh, sx, sy;
  if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
  else          { sw = img.width;  sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function drawText(ctx, w, h) {
  const s      = h / H;
  const fs     = titleSize * s;
  const lh     = fs * 1.05;
  const margin = 40 * s;
  const maxW   = w * 0.58;

  // 메인 제목
  ctx.font      = `900 ${fs}px 'Black Han Sans', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const rawLines = (inputTitle.value || '메인 제목').split('\n');
  const lines = [];
  rawLines.forEach(line => {
    const wrapped = wrapLine(ctx, line, maxW);
    lines.push(...wrapped);
  });

  let y = margin * 0.8;
  lines.forEach(line => {
    drawOutlineText(ctx, line, margin, y, '#ffffff', '#000000', fs * 0.07);
    y += lh;
  });

  // 서브 제목
  if (inputSub.value.trim()) {
    const subFs = fs * 0.38;
    ctx.font = `900 ${subFs}px 'Black Han Sans', sans-serif`;
    const subY = h - subFs * 1.4;
    drawOutlineText(ctx, inputSub.value, margin, subY, '#ffffff', '#000000', subFs * 0.07);
  }
}

function wrapLine(ctx, text, maxW) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function drawOutlineText(ctx, text, x, y, fill, stroke, lineW) {
  ctx.lineJoin    = 'round';
  ctx.lineWidth   = lineW * 2;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

// ── 배경 탭 전환 ──
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    bgMode = tab.dataset.tab;
    document.getElementById('bg-image-panel').classList.toggle('hidden', bgMode !== 'image');
    document.getElementById('bg-color-panel').classList.toggle('hidden', bgMode !== 'color');
    render();
  });
});

// ── 배경 이미지 업로드 ──
btnBgUpload.addEventListener('click', () => bgFile.click());
btnBgChange.addEventListener('click', () => bgFile.click());
bgUploadZone.addEventListener('click', e => { if (e.target !== btnBgUpload) bgFile.click(); });
bgUploadZone.addEventListener('dragover', e => { e.preventDefault(); bgUploadZone.classList.add('dragover'); });
bgUploadZone.addEventListener('dragleave', () => bgUploadZone.classList.remove('dragover'));
bgUploadZone.addEventListener('drop', e => {
  e.preventDefault();
  bgUploadZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleBgFile(e.dataTransfer.files[0]);
});
bgFile.addEventListener('change', e => { if (e.target.files[0]) handleBgFile(e.target.files[0]); });

async function handleBgFile(file) {
  bgImage = await loadImage(file);
  bgPreviewImg.src = URL.createObjectURL(file);
  bgUploadZone.classList.add('hidden');
  bgPreview.classList.remove('hidden');
  render();
}

// ── 배경 색상 ──
bgColorInput.addEventListener('input', () => {
  bgColor = bgColorInput.value;
  bgColorVal.textContent = bgColor.toUpperCase();
  render();
});

// ── 인물 사진 업로드 ──
btnPersonUpload.addEventListener('click', () => personFile.click());
btnPersonChange.addEventListener('click', () => personFile.click());
personUploadZone.addEventListener('click', e => { if (e.target !== btnPersonUpload) personFile.click(); });
personFile.addEventListener('change', e => { if (e.target.files[0]) handlePersonFile(e.target.files[0]); });

btnPersonRemove.addEventListener('click', () => {
  personImage = null;
  personPreview.classList.add('hidden');
  personUploadZone.classList.remove('hidden');
  personControls.style.display = 'none';
  personFile.value = '';
  render();
});

async function handlePersonFile(file) {
  personImage = await loadImage(file);
  personPreviewImg.src = URL.createObjectURL(file);
  personUploadZone.classList.add('hidden');
  personPreview.classList.remove('hidden');
  personControls.style.display = 'flex';
  // 기본 위치: 오른쪽, 전체 높이
  personX = 960;
  personY = 0;
  personH = 720;
  personSizeSlider.value = 100;
  personSizeVal.textContent = '100%';
  render();
}

// ── 인물 크기 슬라이더 ──
personSizeSlider.addEventListener('input', () => {
  const pct = Number(personSizeSlider.value);
  personSizeVal.textContent = pct + '%';
  personH = Math.round(H * pct / 100);
  render();
});

// ── 텍스트 입력 ──
inputTitle.addEventListener('input', render);
inputSub.addEventListener('input', render);

// ── 제목 크기 슬라이더 ──
titleSizeSlider.addEventListener('input', () => {
  titleSize = Number(titleSizeSlider.value);
  titleSizeVal.textContent = titleSize;
  render();
});

// ── 캔버스 드래그 (인물 이동) ──
function canvasXY(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = W / rect.width;
  const sy = H / rect.height;
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
}

function hitPerson(px, py) {
  if (!personImage) return false;
  const pW = personH * (personImage.width / personImage.height);
  return px >= personX - pW / 2 && px <= personX + pW / 2
      && py >= personY && py <= personY + personH;
}

canvas.addEventListener('mousedown', e => {
  const { x, y } = canvasXY(e);
  if (hitPerson(x, y)) {
    isDragging = true;
    dragOffX = x - personX;
    dragOffY = y - personY;
    canvas.style.cursor = 'grabbing';
  }
});
canvas.addEventListener('mousemove', e => {
  const { x, y } = canvasXY(e);
  if (isDragging) {
    personX = x - dragOffX;
    personY = y - dragOffY;
    render();
  } else {
    canvas.style.cursor = hitPerson(x, y) ? 'grab' : 'default';
  }
});
canvas.addEventListener('mouseup',    () => { isDragging = false; canvas.style.cursor = 'default'; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

canvas.addEventListener('touchstart', e => {
  const { x, y } = canvasXY(e);
  if (hitPerson(x, y)) {
    isDragging = true;
    dragOffX = x - personX;
    dragOffY = y - personY;
    e.preventDefault();
  }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  if (!isDragging) return;
  const { x, y } = canvasXY(e);
  personX = x - dragOffX;
  personY = y - dragOffY;
  render();
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchend', () => { isDragging = false; });

// ── 다운로드 ──
function download(w, h) {
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const octx = offscreen.getContext('2d');

  // 배경
  if (bgMode === 'image' && bgImage) drawCover(octx, bgImage, w, h);
  else { octx.fillStyle = bgColor; octx.fillRect(0, 0, w, h); }

  // 인물
  if (personImage) {
    const scale = h / H;
    const pH = personH * scale;
    const pW = pH * (personImage.width / personImage.height);
    const px = personX * (w / W) - pW / 2;
    const py = personY * scale;
    octx.drawImage(personImage, px, py, pW, pH);
  }

  // 텍스트
  const s   = h / H;
  const fs  = titleSize * s;
  const lh  = fs * 1.05;
  const mg  = 40 * s;
  const mxW = w * 0.58;

  octx.font         = `900 ${fs}px 'Black Han Sans', sans-serif`;
  octx.textAlign    = 'left';
  octx.textBaseline = 'top';

  const rawLines = (inputTitle.value || '메인 제목').split('\n');
  const lines = [];
  rawLines.forEach(line => lines.push(...wrapLine(octx, line, mxW)));

  let y = mg * 0.8;
  lines.forEach(line => {
    drawOutlineText(octx, line, mg, y, '#ffffff', '#000000', fs * 0.07);
    y += lh;
  });

  if (inputSub.value.trim()) {
    const subFs = fs * 0.38;
    octx.font = `900 ${subFs}px 'Black Han Sans', sans-serif`;
    const subY = h - subFs * 1.4;
    drawOutlineText(octx, inputSub.value, mg, subY, '#ffffff', '#000000', subFs * 0.07);
  }

  offscreen.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `thumbnail_${w}x${h}.png`;
    a.click();
  }, 'image/png');
}

document.getElementById('btn-720').addEventListener('click',  () => download(1280, 720));
document.getElementById('btn-1080').addEventListener('click', () => download(1920, 1080));

// ── 초기 렌더 ──
render();
