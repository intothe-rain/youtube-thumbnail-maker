// ── 캔버스 해상도 ──
const W = 1280, H = 720;

// ── 템플릿 로드 ──
const params   = new URLSearchParams(location.search);
const tmplId   = params.get('id') || (TEMPLATES[0] && TEMPLATES[0].id);
const template = TEMPLATES.find(t => t.id === tmplId) || TEMPLATES[0];

// ── 상태 ──
let bgImage    = null;
let personImage = null;
let selected   = null;   // 'title' | 'subtitle' | 'person' | null
let isDragging = false;
let dragOffX   = 0, dragOffY = 0;

let state = null;

// ── DOM ──
const canvas         = document.getElementById('canvas');
const ctx            = canvas.getContext('2d');

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

const inputTitle    = document.getElementById('input-title');
const inputSub      = document.getElementById('input-sub');
const titleSizeSlider = document.getElementById('title-size');
const titleSizeVal  = document.getElementById('title-size-val');
const subSizeSlider = document.getElementById('sub-size');
const subSizeVal    = document.getElementById('sub-size-val');

// ── 초기화 ──
function init() {
  document.getElementById('template-name').textContent = template.name;
  const d = template.defaults;

  state = {
    bgMode:  d.bgMode  || 'color',
    bgColor: d.bgColor || '#000000',
    person:  { ...d.person },
    title:   { ...d.title,    text: '', color: '#ffffff', strokeWidth: 5,  strokeColor: '#000000' },
    subtitle:{ ...d.subtitle, text: '', color: '#ffffff', strokeWidth: 3,  strokeColor: '#000000' },
  };

  // UI 초기값 동기화
  bgColorInput.value     = state.bgColor;
  bgColorVal.textContent = state.bgColor.toUpperCase();

  // bgMode 탭 표시
  if (state.bgMode === 'color') {
    document.querySelector('.tab[data-tab="color"]').classList.add('active');
    document.querySelector('.tab[data-tab="image"]').classList.remove('active');
    document.getElementById('bg-image-panel').classList.add('hidden');
    document.getElementById('bg-color-panel').classList.remove('hidden');
  }

  titleSizeSlider.value     = state.title.fontSize;
  titleSizeVal.textContent  = state.title.fontSize;
  subSizeSlider.value       = state.subtitle.fontSize;
  subSizeVal.textContent    = state.subtitle.fontSize;

  document.getElementById('title-stroke-size').value       = state.title.strokeWidth;
  document.getElementById('title-stroke-size-val').textContent = state.title.strokeWidth;
  document.getElementById('sub-stroke-size').value         = state.subtitle.strokeWidth;
  document.getElementById('sub-stroke-size-val').textContent   = state.subtitle.strokeWidth;

  render();
}

// ── 렌더링 ──
function render() {
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // 1. 배경
  if (state.bgMode === 'image' && bgImage) {
    drawCover(ctx, bgImage, W, H);
  } else {
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, W, H);
  }

  // 2. 인물
  if (personImage) {
    const pW = state.person.h * (personImage.width / personImage.height);
    ctx.drawImage(personImage, state.person.x - pW / 2, state.person.y, pW, state.person.h);
    if (selected === 'person') {
      drawSelectionBox(ctx, state.person.x - pW / 2, state.person.y, pW, state.person.h, '#ff6666');
    }
  }

  // 3. 메인 제목
  {
    const { x, y, fontSize, text, color, strokeWidth, strokeColor } = state.title;
    const isPlaceholder = !text.trim();
    const fill   = isPlaceholder ? 'rgba(255,255,255,0.55)' : color;
    const stroke = isPlaceholder ? 'rgba(0,0,0,0.4)'        : strokeColor;
    const lw     = isPlaceholder ? fontSize * 0.025          : strokeWidth;
    ctx.font = `900 ${fontSize}px 'Black Han Sans', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lines = computeLines(isPlaceholder ? '메인 제목' : text);
    const boxW  = Math.max(...lines.map(l => ctx.measureText(l).width), 200);
    let ly = y;
    lines.forEach(line => {
      drawOutline(ctx, line, x, ly, fill, stroke, lw);
      ly += fontSize * 1.05;
    });
    if (selected === 'title') drawSelectionBox(ctx, x, y, boxW, lines.length * fontSize * 1.05, '#ffffff');
  }

  // 4. 서브 제목
  {
    const { x, y, fontSize, text, color, strokeWidth, strokeColor } = state.subtitle;
    const isPlaceholder = !text.trim();
    const fill   = isPlaceholder ? 'rgba(255,255,255,0.55)' : color;
    const stroke = isPlaceholder ? 'rgba(0,0,0,0.4)'        : strokeColor;
    const lw     = isPlaceholder ? fontSize * 0.025          : strokeWidth;
    ctx.font = `900 ${fontSize}px 'Black Han Sans', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const displayText = isPlaceholder ? '서브 제목' : text;
    drawOutline(ctx, displayText, x, y, fill, stroke, lw);
    if (selected === 'subtitle') {
      const tw = ctx.measureText(displayText).width;
      drawSelectionBox(ctx, x, y, Math.max(tw, 200), fontSize * 1.1, '#ffffff');
    }
  }

  ctx.restore();
}

// ── 렌더 유틸 ──
function drawCover(c, img, w, h) {
  const ir = img.width / img.height;
  const cr = w / h;
  let sw, sh, sx, sy;
  if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
  else          { sw = img.width;  sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
  c.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function drawOutline(c, text, x, y, fill, stroke, lw) {
  c.lineJoin    = 'round';
  c.lineWidth   = lw;
  c.strokeStyle = stroke;
  c.strokeText(text, x, y);
  c.fillStyle   = fill;
  c.fillText(text, x, y);
}

function drawSelectionBox(c, x, y, w, h, color) {
  c.save();
  c.strokeStyle = color;
  c.lineWidth   = 2;
  c.setLineDash([6, 3]);
  c.strokeRect(x - 4, y - 4, w + 8, h + 8);
  // 코너 핸들
  const s = 7;
  c.fillStyle = color;
  c.setLineDash([]);
  [[x-4, y-4], [x+w+4-s, y-4], [x-4, y+h+4-s], [x+w+4-s, y+h+4-s]].forEach(([hx, hy]) => {
    c.fillRect(hx, hy, s, s);
  });
  c.restore();
}

function computeLines(text) {
  const lines = text.split('\n');
  return lines.length ? lines : [''];
}

// ── 히트 테스트 ──
function getTitleBounds() {
  ctx.font = `900 ${state.title.fontSize}px 'Black Han Sans', sans-serif`;
  const text  = state.title.text.trim() || '메인 제목';
  const lines = computeLines(text);
  const w = Math.max(...lines.map(l => ctx.measureText(l).width), 200);
  return { x: state.title.x, y: state.title.y,
           w, h: lines.length * state.title.fontSize * 1.05 };
}

function getSubtitleBounds() {
  ctx.font = `900 ${state.subtitle.fontSize}px 'Black Han Sans', sans-serif`;
  const text = state.subtitle.text.trim() || '서브 제목';
  const w    = ctx.measureText(text).width;
  return { x: state.subtitle.x, y: state.subtitle.y,
           w: Math.max(w, 200), h: state.subtitle.fontSize * 1.2 };
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

// ── 캔버스 좌표 변환 ──
function canvasXY(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = W / rect.width;
  const sy = H / rect.height;
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
}

// ── 드래그 이벤트 ──
canvas.addEventListener('mousedown', e => {
  const { x, y } = canvasXY(e);
  const hit = hitTest(x, y);
  selected = hit;
  if (hit) {
    isDragging = true;
    if (hit === 'person') { dragOffX = x - state.person.x;     dragOffY = y - state.person.y; }
    if (hit === 'title')  { dragOffX = x - state.title.x;      dragOffY = y - state.title.y; }
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
    const hit = hitTest(x, y);
    canvas.style.cursor = hit ? 'grab' : 'default';
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

// ── 배경 탭 전환 ──
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

// ── 배경 이미지 ──
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

// ── 배경 색상 ──
bgColorInput.addEventListener('input', () => {
  state.bgColor = bgColorInput.value;
  bgColorVal.textContent = state.bgColor.toUpperCase();
  render();
});

// ── 인물 사진 ──
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
  // 템플릿 기본 위치로 초기화
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

// ── 텍스트 입력 ──
inputTitle.addEventListener('input', () => { state.title.text = inputTitle.value; render(); });
inputSub.addEventListener('input',   () => { state.subtitle.text = inputSub.value; render(); });

// ── 크기 / 폭 / 색상 슬라이더 ──
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

document.getElementById('title-color').addEventListener('input', e => {
  state.title.color = e.target.value;
  document.getElementById('title-color-val').textContent = e.target.value.toUpperCase();
  render();
});

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

document.getElementById('sub-color').addEventListener('input', e => {
  state.subtitle.color = e.target.value;
  document.getElementById('sub-color-val').textContent = e.target.value.toUpperCase();
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

// ── 다운로드 ──
function download(w, h) {
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const oc = off.getContext('2d');
  const sx = w / W, sy = h / H;

  // 배경
  if (state.bgMode === 'image' && bgImage) drawCover(oc, bgImage, w, h);
  else { oc.fillStyle = state.bgColor; oc.fillRect(0, 0, w, h); }

  // 인물
  if (personImage) {
    const pH = state.person.h * sy;
    const pW = pH * (personImage.width / personImage.height);
    oc.drawImage(personImage, state.person.x * sx - pW / 2, state.person.y * sy, pW, pH);
  }

  // 메인 제목
  {
    const fs = state.title.fontSize * sy;
    oc.font = `900 ${fs}px 'Black Han Sans', sans-serif`;
    oc.textAlign = 'left'; oc.textBaseline = 'top';
    const text  = state.title.text.trim() || '메인 제목';
    const lines = computeLines(text);
    let ly = state.title.y * sy;
    lines.forEach(line => {
      drawOutline(oc, line, state.title.x * sx, ly, state.title.color, state.title.strokeColor, state.title.strokeWidth * sy);
      ly += fs * 1.05;
    });
  }

  // 서브 제목
  if (state.subtitle.text.trim()) {
    const fs = state.subtitle.fontSize * sy;
    oc.font = `900 ${fs}px 'Black Han Sans', sans-serif`;
    oc.textAlign = 'left'; oc.textBaseline = 'top';
    drawOutline(oc, state.subtitle.text, state.subtitle.x * sx, state.subtitle.y * sy, state.subtitle.color, state.subtitle.strokeColor, state.subtitle.strokeWidth * sy);
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

// ── 시작 ──
init();
