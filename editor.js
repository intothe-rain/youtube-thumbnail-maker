const W = 1280, H = 720;
const SHEAR = 0.25; // 기울임 각도 (약 14도)

const params   = new URLSearchParams(location.search);
const tmplId   = params.get('id') || (TEMPLATES[0] && TEMPLATES[0].id);
const template = TEMPLATES.find(t => t.id === tmplId) || TEMPLATES[0];

let bgImage     = null;
let personImage = null;
let selected    = null;
let isDragging  = false;
let dragOffX    = 0, dragOffY = 0;
let state       = null;

// DOM
const canvas    = document.getElementById('canvas');
const ctx       = canvas.getContext('2d');

const bgFile         = document.getElementById('bg-file');
const bgUploadZone   = document.getElementById('bg-upload-zone');
const bgPreview      = document.getElementById('bg-preview');
const bgPreviewImg   = document.getElementById('bg-preview-img');
const btnBgUpload    = document.getElementById('btn-bg-upload');
const btnBgChange    = document.getElementById('btn-bg-change');
const bgColorInput   = document.getElementById('bg-color');
const bgColorVal     = document.getElementById('bg-color-val');

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

const inputTitle     = document.getElementById('input-title');
const inputSub       = document.getElementById('input-sub');
const titleSizeSlider = document.getElementById('title-size');
const titleSizeVal   = document.getElementById('title-size-val');
const subSizeSlider  = document.getElementById('sub-size');
const subSizeVal     = document.getElementById('sub-size-val');

// ── 초기화 ──────────────────────────────────────────────
function init() {
  document.getElementById('template-name').textContent = template.name;
  const d = template.defaults;

  state = {
    bgMode:  d.bgMode  || 'color',
    bgColor: d.bgColor || '#000000',
    font:    d.font    || 'Noto Sans KR',
    person:  { ...d.person },
    title:   { color: '#ffffff', strokeWidth: 14, strokeColor: '#000000', italic: false, text: '', ...d.title },
    subtitle:{ color: '#ffffff', strokeWidth: 6,  strokeColor: '#000000', italic: false, text: '', ...d.subtitle },
  };

  // UI 동기화
  bgColorInput.value     = state.bgColor;
  bgColorVal.textContent = state.bgColor.toUpperCase();

  if (state.bgMode === 'color') {
    document.querySelector('.tab[data-tab="color"]').classList.add('active');
    document.querySelector('.tab[data-tab="image"]').classList.remove('active');
    document.getElementById('bg-image-panel').classList.add('hidden');
    document.getElementById('bg-color-panel').classList.remove('hidden');
  }

  titleSizeSlider.value    = state.title.fontSize;
  titleSizeVal.textContent = state.title.fontSize;
  subSizeSlider.value      = state.subtitle.fontSize;
  subSizeVal.textContent   = state.subtitle.fontSize;

  document.getElementById('title-stroke-size').value          = state.title.strokeWidth;
  document.getElementById('title-stroke-size-val').textContent = state.title.strokeWidth;
  document.getElementById('title-stroke-color').value         = state.title.strokeColor;
  document.getElementById('sub-stroke-size').value            = state.subtitle.strokeWidth;
  document.getElementById('sub-stroke-size-val').textContent  = state.subtitle.strokeWidth;
  document.getElementById('sub-stroke-color').value           = state.subtitle.strokeColor;
  document.getElementById('title-italic').checked = state.title.italic;
  document.getElementById('sub-italic').checked   = state.subtitle.italic;
  document.getElementById('title-color').value    = state.title.color;
  document.getElementById('sub-color').value      = state.subtitle.color;

  inputTitle.value = state.title.text;
  inputSub.value   = state.subtitle.text;

  render();
  document.fonts.ready.then(() => render());
}

// ── 렌더링 유틸 ─────────────────────────────────────────
function buildFont(size) {
  const noWeight = ['Jua', 'Do Hyeon'];
  if (noWeight.includes(state.font)) return `${size}px '${state.font}', sans-serif`;
  return `900 ${size}px '${state.font}', sans-serif`;
}

function drawCover(c, img, w, h) {
  const ir = img.width / img.height, cr = w / h;
  let sw, sh, sx, sy;
  if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
  else          { sw = img.width;  sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
  c.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function drawOutline(c, text, x, y, fill, stroke, lw) {
  if (lw > 0) {
    c.lineJoin    = 'round';
    c.lineWidth   = lw;
    c.strokeStyle = stroke;
    c.strokeText(text, x, y);
  }
  c.fillStyle = fill;
  c.fillText(text, x, y);
}

function computeLines(text) {
  const lines = text.split('\n');
  return lines.length ? lines : [''];
}

function drawSelectionBox(c, x, y, w, h, color) {
  c.save();
  c.strokeStyle = color;
  c.lineWidth   = 2;
  c.setLineDash([6, 3]);
  c.strokeRect(x - 4, y - 4, w + 8, h + 8);
  const s = 7;
  c.fillStyle = color;
  c.setLineDash([]);
  [[x-4, y-4], [x+w+4-s, y-4], [x-4, y+h+4-s], [x+w+4-s, y+h+4-s]].forEach(([hx, hy]) => {
    c.fillRect(hx, hy, s, s);
  });
  c.restore();
}

// ── 메인 렌더 ────────────────────────────────────────────
function render() {
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // 배경
  if (state.bgMode === 'image' && bgImage) drawCover(ctx, bgImage, W, H);
  else { ctx.fillStyle = state.bgColor; ctx.fillRect(0, 0, W, H); }

  // 인물
  if (personImage) {
    const pW = state.person.h * (personImage.width / personImage.height);
    ctx.drawImage(personImage, state.person.x - pW / 2, state.person.y, pW, state.person.h);
    if (selected === 'person') drawSelectionBox(ctx, state.person.x - pW / 2, state.person.y, pW, state.person.h, '#ff6666');
  }

  // 메인 제목
  {
    const { x, y, fontSize, text, color, strokeWidth, strokeColor, italic } = state.title;
    const isPlaceholder = !text.trim();
    const fill   = isPlaceholder ? 'rgba(255,255,255,0.5)' : color;
    const stroke = isPlaceholder ? 'rgba(0,0,0,0.3)'       : strokeColor;
    const lw     = isPlaceholder ? fontSize * 0.05          : strokeWidth;
    ctx.font = buildFont(fontSize);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lines = computeLines(isPlaceholder ? '메인 제목' : text);
    const boxW  = Math.max(...lines.map(l => ctx.measureText(l).width), 200);
    ctx.save();
    if (italic) ctx.transform(1, 0, -SHEAR, 1, y * SHEAR, 0);
    let ly = y;
    lines.forEach(line => {
      drawOutline(ctx, line, x, ly, fill, stroke, lw);
      ly += fontSize * 1.05;
    });
    if (selected === 'title') drawSelectionBox(ctx, x, y, boxW, lines.length * fontSize * 1.05, '#ffffff');
    ctx.restore();
  }

  // 서브 제목
  {
    const { x, y, fontSize, text, color, strokeWidth, strokeColor, italic } = state.subtitle;
    const isPlaceholder = !text.trim();
    const fill   = isPlaceholder ? 'rgba(255,255,255,0.5)' : color;
    const stroke = isPlaceholder ? 'rgba(0,0,0,0.3)'       : strokeColor;
    const lw     = isPlaceholder ? fontSize * 0.05          : strokeWidth;
    ctx.font = buildFont(fontSize);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const displayText = isPlaceholder ? '서브 제목' : text;
    ctx.save();
    if (italic) ctx.transform(1, 0, -SHEAR, 1, y * SHEAR, 0);
    drawOutline(ctx, displayText, x, y, fill, stroke, lw);
    if (selected === 'subtitle') {
      const tw = ctx.measureText(displayText).width;
      drawSelectionBox(ctx, x, y, Math.max(tw, 200), fontSize * 1.1, '#ffffff');
    }
    ctx.restore();
  }

  ctx.restore();
}

// ── 히트 테스트 ──────────────────────────────────────────
function getTitleBounds() {
  ctx.font = buildFont(state.title.fontSize);
  const text  = state.title.text.trim() || '메인 제목';
  const lines = computeLines(text);
  const w = Math.max(...lines.map(l => ctx.measureText(l).width), 200);
  return { x: state.title.x, y: state.title.y, w, h: lines.length * state.title.fontSize * 1.05 };
}

function getSubtitleBounds() {
  ctx.font = buildFont(state.subtitle.fontSize);
  const text = state.subtitle.text.trim() || '서브 제목';
  const w    = Math.max(ctx.measureText(text).width, 200);
  return { x: state.subtitle.x, y: state.subtitle.y, w, h: state.subtitle.fontSize * 1.2 };
}

function getPersonBounds() {
  if (!personImage) return null;
  const pW = state.person.h * (personImage.width / personImage.height);
  return { x: state.person.x - pW / 2, y: state.person.y, w: pW, h: state.person.h };
}

function inBox(cx, cy, b) {
  return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h;
}

function hitTest(cx, cy) {
  const pb = getPersonBounds();
  if (pb && inBox(cx, cy, pb)) return 'person';
  if (inBox(cx, cy, getTitleBounds()))    return 'title';
  if (inBox(cx, cy, getSubtitleBounds())) return 'subtitle';
  return null;
}

// ── 캔버스 좌표 변환 ─────────────────────────────────────
function canvasXY(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = W / rect.width, sy = H / rect.height;
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
}

// ── 드래그 이벤트 ────────────────────────────────────────
canvas.addEventListener('mousedown', e => {
  const { x, y } = canvasXY(e);
  const hit = hitTest(x, y);
  selected = hit;
  if (hit) {
    isDragging = true;
    if (hit === 'person')   { dragOffX = x - state.person.x;   dragOffY = y - state.person.y; }
    if (hit === 'title')    { dragOffX = x - state.title.x;    dragOffY = y - state.title.y; }
    if (hit === 'subtitle') { dragOffX = x - state.subtitle.x; dragOffY = y - state.subtitle.y; }
    canvas.style.cursor = 'grabbing';
  }
  render();
});

canvas.addEventListener('mousemove', e => {
  const { x, y } = canvasXY(e);
  if (isDragging) {
    if (selected === 'person')   { state.person.x   = x - dragOffX; state.person.y   = y - dragOffY; }
    if (selected === 'title')    { state.title.x    = x - dragOffX; state.title.y    = y - dragOffY; }
    if (selected === 'subtitle') { state.subtitle.x = x - dragOffX; state.subtitle.y = y - dragOffY; }
    render();
  } else {
    canvas.style.cursor = hitTest(x, y) ? 'grab' : 'default';
  }
});

canvas.addEventListener('mouseup',    () => { isDragging = false; canvas.style.cursor = 'default'; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

canvas.addEventListener('touchstart', e => {
  const { x, y } = canvasXY(e);
  const hit = hitTest(x, y);
  selected = hit;
  if (hit) {
    isDragging = true;
    if (hit === 'person')   { dragOffX = x - state.person.x;   dragOffY = y - state.person.y; }
    if (hit === 'title')    { dragOffX = x - state.title.x;    dragOffY = y - state.title.y; }
    if (hit === 'subtitle') { dragOffX = x - state.subtitle.x; dragOffY = y - state.subtitle.y; }
    e.preventDefault();
  }
  render();
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  if (!isDragging) return;
  const { x, y } = canvasXY(e);
  if (selected === 'person')   { state.person.x   = x - dragOffX; state.person.y   = y - dragOffY; }
  if (selected === 'title')    { state.title.x    = x - dragOffX; state.title.y    = y - dragOffY; }
  if (selected === 'subtitle') { state.subtitle.x = x - dragOffX; state.subtitle.y = y - dragOffY; }
  render();
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', () => { isDragging = false; });

// ── 배경 탭 ──────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.bgMode = tab.dataset.tab;
    document.getElementById('bg-image-panel').classList.toggle('hidden', state.bgMode !== 'image');
    document.getElementById('bg-color-panel').classList.toggle('hidden', state.bgMode !== 'color');
    render();
  });
});

// ── 배경 이미지 ──────────────────────────────────────────
function loadImage(file) {
  return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = URL.createObjectURL(file); });
}

btnBgUpload.addEventListener('click', () => bgFile.click());
btnBgChange.addEventListener('click', () => bgFile.click());
bgUploadZone.addEventListener('click', e => { if (e.target !== btnBgUpload) bgFile.click(); });
bgUploadZone.addEventListener('dragover',  e => { e.preventDefault(); bgUploadZone.classList.add('dragover'); });
bgUploadZone.addEventListener('dragleave', () => bgUploadZone.classList.remove('dragover'));
bgUploadZone.addEventListener('drop', e => {
  e.preventDefault(); bgUploadZone.classList.remove('dragover');
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

// ── 배경 색상 ─────────────────────────────────────────────
bgColorInput.addEventListener('input', () => {
  state.bgColor = bgColorInput.value;
  bgColorVal.textContent = state.bgColor.toUpperCase();
  render();
});

// ── 인물 사진 ────────────────────────────────────────────
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
  if (selected === 'person') selected = null;
  render();
});

async function handlePersonFile(file) {
  personImage = await loadImage(file);
  personPreviewImg.src = URL.createObjectURL(file);
  personUploadZone.classList.add('hidden');
  personPreview.classList.remove('hidden');
  personControls.style.display = 'flex';
  const d = template.defaults.person;
  state.person.x = d.x; state.person.y = d.y; state.person.h = d.h;
  personSizeSlider.value = 100;
  personSizeVal.textContent = '100%';
  render();
}

personSizeSlider.addEventListener('input', () => {
  const pct = Number(personSizeSlider.value);
  personSizeVal.textContent = pct + '%';
  state.person.h = Math.round(H * pct / 100);
  render();
});

// ── 텍스트 입력 ──────────────────────────────────────────
inputTitle.addEventListener('input', () => { state.title.text = inputTitle.value; render(); });
inputSub.addEventListener('input',   () => { state.subtitle.text = inputSub.value; render(); });

// ── 크기 슬라이더 ────────────────────────────────────────
titleSizeSlider.addEventListener('input', () => {
  state.title.fontSize = Number(titleSizeSlider.value);
  titleSizeVal.textContent = state.title.fontSize;
  render();
});
subSizeSlider.addEventListener('input', () => {
  state.subtitle.fontSize = Number(subSizeSlider.value);
  subSizeVal.textContent = state.subtitle.fontSize;
  render();
});

// ── 색상 ────────────────────────────────────────────────
document.getElementById('title-color').addEventListener('input', e => {
  state.title.color = e.target.value;
  document.getElementById('title-color-val').textContent = e.target.value.toUpperCase();
  render();
});
document.getElementById('sub-color').addEventListener('input', e => {
  state.subtitle.color = e.target.value;
  document.getElementById('sub-color-val').textContent = e.target.value.toUpperCase();
  render();
});

// ── 윤곽선 ──────────────────────────────────────────────
document.getElementById('title-stroke-size').addEventListener('input', e => {
  state.title.strokeWidth = Number(e.target.value);
  document.getElementById('title-stroke-size-val').textContent = e.target.value;
  render();
});
document.getElementById('title-stroke-color').addEventListener('input', e => {
  state.title.strokeColor = e.target.value;
  document.getElementById('title-stroke-color-val').textContent = e.target.value.toUpperCase();
  render();
});
document.getElementById('sub-stroke-size').addEventListener('input', e => {
  state.subtitle.strokeWidth = Number(e.target.value);
  document.getElementById('sub-stroke-size-val').textContent = e.target.value;
  render();
});
document.getElementById('sub-stroke-color').addEventListener('input', e => {
  state.subtitle.strokeColor = e.target.value;
  document.getElementById('sub-stroke-color-val').textContent = e.target.value.toUpperCase();
  render();
});

// ── 기울임 ──────────────────────────────────────────────
document.getElementById('title-italic').addEventListener('change', e => {
  state.title.italic = e.target.checked;
  render();
});
document.getElementById('sub-italic').addEventListener('change', e => {
  state.subtitle.italic = e.target.checked;
  render();
});

// ── 다운로드 ────────────────────────────────────────────
function download(w, h) {
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const oc = off.getContext('2d');
  const sx = w / W, sy = h / H;

  if (state.bgMode === 'image' && bgImage) drawCover(oc, bgImage, w, h);
  else { oc.fillStyle = state.bgColor; oc.fillRect(0, 0, w, h); }

  if (personImage) {
    const pH = state.person.h * sy;
    const pW = pH * (personImage.width / personImage.height);
    oc.drawImage(personImage, state.person.x * sx - pW / 2, state.person.y * sy, pW, pH);
  }

  // 메인 제목
  if (state.title.text.trim()) {
    const fs = state.title.fontSize * sy;
    const ty = state.title.y * sy;
    oc.font = buildFont(Math.round(fs));
    oc.textAlign = 'left'; oc.textBaseline = 'top';
    const lines = computeLines(state.title.text);
    oc.save();
    if (state.title.italic) oc.transform(1, 0, -SHEAR, 1, ty * SHEAR, 0);
    let ly = ty;
    lines.forEach(line => {
      drawOutline(oc, line, state.title.x * sx, ly, state.title.color, state.title.strokeColor, state.title.strokeWidth * sy);
      ly += fs * 1.05;
    });
    oc.restore();
  }

  // 서브 제목
  if (state.subtitle.text.trim()) {
    const fs = state.subtitle.fontSize * sy;
    const ty = state.subtitle.y * sy;
    oc.font = buildFont(Math.round(fs));
    oc.textAlign = 'left'; oc.textBaseline = 'top';
    oc.save();
    if (state.subtitle.italic) oc.transform(1, 0, -SHEAR, 1, ty * SHEAR, 0);
    drawOutline(oc, state.subtitle.text, state.subtitle.x * sx, ty, state.subtitle.color, state.subtitle.strokeColor, state.subtitle.strokeWidth * sy);
    oc.restore();
  }

  off.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `thumbnail_${w}x${h}.png`;
    a.click();
  }, 'image/png');
}

document.getElementById('btn-720').addEventListener('click',  () => download(1280, 720));
document.getElementById('btn-1080').addEventListener('click', () => download(1920, 1080));

init();
