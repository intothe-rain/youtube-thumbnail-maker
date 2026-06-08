// ── 상수 ──
const GRID_W    = 320;
const GRID_H    = 180;
const PREVIEW_W = 1280;
const PREVIEW_H = 720;

// ── 12개 템플릿 정의 ──
const TEMPLATES = [
  // 기본 스타일 (6)
  { id: 'overlay',     group: 'basic',    name: '풀 오버레이',  desc: '하단 그라데이션 + 텍스트' },
  { id: 'dark',        group: 'basic',    name: '다크 오버레이', desc: '전체 다크 + 중앙 텍스트' },
  { id: 'banner',      group: 'basic',    name: '배너',          desc: '하단 레드 배너 + 제목' },
  { id: 'split',       group: 'basic',    name: '분할',          desc: '우측 패널 + 텍스트' },
  { id: 'impact',      group: 'basic',    name: '임팩트',        desc: '상단 강조 + 하단 서브' },
  { id: 'neon',        group: 'basic',    name: '네온 글로우',   desc: '글로우 텍스트 효과' },
  // 유튜버 스타일 (6)
  { id: 'mrbeast',     group: 'youtuber', name: 'MrBeast',  hasPerson: true,  ref: 'references/mrbeast.jpg',           desc: '도전 / 충격형' },
  { id: 'mkbhd',       group: 'youtuber', name: 'MKBHD',    hasPerson: true,  ref: 'references/mkbhd.jpg',             desc: '미니멀 테크형' },
  { id: 'chimchakman', group: 'youtuber', name: '침착맨',   hasPerson: true,  ref: 'references/chimchakman.jpg',       desc: '예능 / 토크형' },
  { id: 'panibottle1', group: 'youtuber', name: '빠니보틀', hasPerson: false, ref: 'references/panibottle_india.jpg',  desc: '여행 비교형' },
  { id: 'panibottle2', group: 'youtuber', name: '빠니보틀', hasPerson: false, ref: 'references/panibottle_africa.jpg', desc: '여행 감성형' },
  { id: 'tzuyang',     group: 'youtuber', name: '쯔양',     hasPerson: true,  ref: 'references/tzuyang.jpg',           desc: '먹방형' },
];

// ── 상태 ──
let uploadedImage      = null;
let selectedTemplateId = null;
let currentGroup       = 'basic';
let placeholderImg     = null;

let foregroundImage = null;
let fgX = 640, fgY = 36, fgH = 648;
let isDraggingFg = false;
let dragStartX = 0, dragStartY = 0, dragStartFgX = 0, dragStartFgY = 0;

// ── DOM 참조 ──
const fileInput       = document.getElementById('file-input');
const uploadZone      = document.getElementById('upload-zone');
const uploadPreview   = document.getElementById('upload-preview');
const previewImg      = document.getElementById('preview-img');
const btnUpload       = document.getElementById('btn-upload');
const btnChange       = document.getElementById('btn-change');

const fgFileInput     = document.getElementById('fg-file-input');
const fgUploadSection = document.getElementById('fg-upload-section');
const fgUploadZone    = document.getElementById('fg-upload-zone');
const fgUploadPreview = document.getElementById('fg-upload-preview');
const fgPreviewImg    = document.getElementById('fg-preview-img');
const btnFgUpload     = document.getElementById('btn-fg-upload');
const btnFgChange     = document.getElementById('btn-fg-change');
const btnFgRemove     = document.getElementById('btn-fg-remove');

const templateGrid    = document.getElementById('template-grid');
const canvas          = document.getElementById('preview-canvas');
const inputTitle      = document.getElementById('input-title');
const inputSubtitle   = document.getElementById('input-subtitle');
const fgScaleGroup    = document.getElementById('fg-scale-group');
const fgScaleSlider   = document.getElementById('fg-scale');
const fgScaleVal      = document.getElementById('fg-scale-val');

// ── 유틸 ──
function showSection(id) {
  document.getElementById(id).classList.remove('hidden');
}

function loadImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });
}

// ── 플레이스홀더 이미지 생성 (기본 스타일 카드용) ──
async function getPlaceholder() {
  if (placeholderImg) return placeholderImg;
  const c = document.createElement('canvas');
  c.width = GRID_W; c.height = GRID_H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, GRID_W, GRID_H);
  g.addColorStop(0, '#374151');
  g.addColorStop(1, '#111827');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GRID_W, GRID_H);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => { placeholderImg = img; resolve(img); };
    img.src = c.toDataURL();
  });
}

// ── 템플릿 그리드 빌드 ──
async function buildTemplateGrid(group) {
  currentGroup = group;
  await document.fonts.ready;
  const ph = await getPlaceholder();
  templateGrid.innerHTML = '';

  TEMPLATES.filter(t => t.group === group).forEach(t => {
    const card = document.createElement('div');
    card.className = 'template-card';
    if (t.group === 'youtuber') card.classList.add('youtuber-card');
    card.dataset.id = t.id;

    if (t.group === 'youtuber') {
      const img = document.createElement('img');
      img.src = t.ref;
      img.alt = t.name;
      img.className = 'template-ref-img';
      card.appendChild(img);
    } else {
      const c = document.createElement('canvas');
      c.width = GRID_W; c.height = GRID_H;
      renderTemplate(c, uploadedImage || ph, t.id, '메인 제목', '서브 타이틀');
      card.appendChild(c);
    }

    const info = document.createElement('div');
    info.className = 'template-info';
    info.innerHTML = `<span class="template-name">${t.name}</span><span class="template-desc">${t.desc}</span>`;
    card.appendChild(info);

    if (selectedTemplateId === t.id) card.classList.add('selected');
    card.addEventListener('click', () => selectTemplate(t.id));
    templateGrid.appendChild(card);
  });
}

// ── 템플릿 선택 ──
function selectTemplate(id) {
  selectedTemplateId = id;
  const tmpl = TEMPLATES.find(t => t.id === id);

  document.querySelectorAll('.template-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.id === id);
  });

  // 인물 이미지 섹션 표시/숨김
  const showPerson = !tmpl || tmpl.hasPerson !== false;
  if (showPerson) {
    fgUploadSection.classList.remove('hidden');
  } else {
    fgUploadSection.classList.add('hidden');
    foregroundImage = null;
    fgUploadZone.classList.remove('hidden');
    fgUploadPreview.classList.add('hidden');
    fgScaleGroup.classList.add('hidden');
  }

  showSection('section-upload');
  document.getElementById('section-upload').scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderMainPreview();
}

// ── 배경 이미지 업로드 처리 ──
async function handleFile(file) {
  uploadedImage = await loadImage(file);
  previewImg.src = URL.createObjectURL(file);
  uploadZone.classList.add('hidden');
  uploadPreview.classList.remove('hidden');

  showSection('section-edit');
  renderMainPreview();

  // 기본 스타일 탭 카드 미리보기 실제 이미지로 갱신
  if (currentGroup === 'basic') buildTemplateGrid('basic');

  document.getElementById('section-edit').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── 인물 이미지 업로드 처리 ──
async function handleFgFile(file) {
  foregroundImage = await loadImage(file);
  fgPreviewImg.src = URL.createObjectURL(file);
  fgUploadZone.classList.add('hidden');
  fgUploadPreview.classList.remove('hidden');
  fgScaleGroup.classList.remove('hidden');
  renderMainPreview();
}

// ── 메인 캔버스 렌더 ──
function renderMainPreview() {
  if (!uploadedImage || !selectedTemplateId) return;
  const title    = inputTitle.value    || '메인 제목을 입력하세요';
  const subtitle = inputSubtitle.value || '';
  renderTemplate(canvas, uploadedImage, selectedTemplateId, title, subtitle);
}

// ── 다운로드 ──
function download(w, h) {
  if (!uploadedImage || !selectedTemplateId) return;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const title    = inputTitle.value    || '메인 제목을 입력하세요';
  const subtitle = inputSubtitle.value || '';
  renderTemplate(c, uploadedImage, selectedTemplateId, title, subtitle);
  c.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `thumbnail_${w}x${h}.png`;
    a.click();
  }, 'image/png');
}

// ═══════════════════════════════
//  이벤트 리스너
// ═══════════════════════════════

// 템플릿 탭
document.querySelectorAll('.template-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.template-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    buildTemplateGrid(tab.dataset.group);
  });
});

// 배경 이미지
btnUpload.addEventListener('click', () => fileInput.click());
btnChange.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

uploadZone.addEventListener('click', e => { if (e.target !== btnUpload) fileInput.click(); });
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

// 인물 이미지
btnFgUpload.addEventListener('click', () => fgFileInput.click());
btnFgChange.addEventListener('click', () => fgFileInput.click());
fgFileInput.addEventListener('change', e => { if (e.target.files[0]) handleFgFile(e.target.files[0]); });
fgUploadZone.addEventListener('click', e => { if (e.target !== btnFgUpload) fgFileInput.click(); });
btnFgRemove.addEventListener('click', () => {
  foregroundImage = null;
  fgPreviewImg.src = '';
  fgUploadZone.classList.remove('hidden');
  fgUploadPreview.classList.add('hidden');
  fgScaleGroup.classList.add('hidden');
  fgScaleSlider.value = 90;
  fgScaleVal.textContent = '90%';
  fgX = 640; fgY = 36; fgH = 648;
  fgFileInput.value = '';
  renderMainPreview();
});

// 텍스트 입력
inputTitle.addEventListener('input', renderMainPreview);
inputSubtitle.addEventListener('input', renderMainPreview);

// 인물 크기 슬라이더
fgScaleSlider.addEventListener('input', () => {
  const pct = Number(fgScaleSlider.value);
  fgScaleVal.textContent = pct + '%';
  fgH = Math.round(PREVIEW_H * pct / 100);
  renderMainPreview();
});

// 다운로드
document.getElementById('btn-720').addEventListener('click',  () => download(1280, 720));
document.getElementById('btn-1080').addEventListener('click', () => download(1920, 1080));

// ═══════════════════════════════
//  캔버스 인물 드래그
// ═══════════════════════════════
function isFgHit(px, py) {
  if (!foregroundImage) return false;
  const aspect = foregroundImage.width / foregroundImage.height;
  const fgW = fgH * aspect;
  return px >= fgX - fgW / 2 && px <= fgX + fgW / 2 && py >= fgY && py <= fgY + fgH;
}

function canvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = PREVIEW_W / rect.width;
  const scaleY = PREVIEW_H / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

canvas.addEventListener('mousedown', e => {
  const { x, y } = canvasCoords(e);
  if (isFgHit(x, y)) {
    isDraggingFg = true;
    dragStartX = x; dragStartY = y;
    dragStartFgX = fgX; dragStartFgY = fgY;
    canvas.style.cursor = 'grabbing';
  }
});
canvas.addEventListener('mousemove', e => {
  const { x, y } = canvasCoords(e);
  if (isDraggingFg) {
    fgX = dragStartFgX + (x - dragStartX);
    fgY = dragStartFgY + (y - dragStartY);
    renderMainPreview();
  } else {
    canvas.style.cursor = isFgHit(x, y) ? 'grab' : 'default';
  }
});
canvas.addEventListener('mouseup',    () => { isDraggingFg = false; canvas.style.cursor = 'default'; });
canvas.addEventListener('mouseleave', () => { isDraggingFg = false; });

canvas.addEventListener('touchstart', e => {
  const { x, y } = canvasCoords(e);
  if (isFgHit(x, y)) {
    isDraggingFg = true;
    dragStartX = x; dragStartY = y;
    dragStartFgX = fgX; dragStartFgY = fgY;
    e.preventDefault();
  }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  if (!isDraggingFg) return;
  const { x, y } = canvasCoords(e);
  fgX = dragStartFgX + (x - dragStartX);
  fgY = dragStartFgY + (y - dragStartY);
  renderMainPreview();
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchend', () => { isDraggingFg = false; });

// ═══════════════════════════════
//  공통 렌더 유틸
// ═══════════════════════════════
function drawImageCover(ctx, img, w, h) {
  const ir = img.width / img.height;
  const cr = w / h;
  let sw, sh, sx, sy;
  if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
  else          { sw = img.width;  sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function drawForeground(ctx, w, h) {
  if (!foregroundImage) return;
  const scale     = h / PREVIEW_H;
  const fgHScaled = fgH * scale;
  const aspect    = foregroundImage.width / foregroundImage.height;
  const fgWScaled = fgHScaled * aspect;
  const fx = fgX * (w / PREVIEW_W) - fgWScaled / 2;
  const fy = fgY * scale;
  ctx.drawImage(foregroundImage, fx, fy, fgWScaled, fgHScaled);
}

function computeLines(ctx, text, maxW) {
  const lines = [];
  text.split('\n').forEach(paragraph => {
    const words = paragraph.split('');
    let line = '';
    for (const ch of words) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = ch; }
      else line = test;
    }
    if (line) lines.push(line);
  });
  return lines;
}

// ── 메인 렌더 디스패처 ──
function renderTemplate(canvas, img, templateId, title, subtitle) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  drawImageCover(ctx, img, w, h);

  switch (templateId) {
    case 'overlay':     renderOverlay(ctx, w, h, title, subtitle);     break;
    case 'dark':        renderDark(ctx, w, h, title, subtitle);        break;
    case 'banner':      renderBanner(ctx, w, h, title, subtitle);      break;
    case 'split':       renderSplit(ctx, w, h, title, subtitle);       break;
    case 'impact':      renderImpact(ctx, w, h, title, subtitle);      break;
    case 'neon':        renderNeon(ctx, w, h, title, subtitle);        break;
    case 'mrbeast':     renderMrBeast(ctx, w, h, title, subtitle);     break;
    case 'mkbhd':       renderMKBHD(ctx, w, h, title, subtitle);       break;
    case 'chimchakman': renderChimchakman(ctx, w, h, title, subtitle); break;
    case 'panibottle1': renderPanibottle1(ctx, w, h, title, subtitle); break;
    case 'panibottle2': renderPanibottle2(ctx, w, h, title, subtitle); break;
    case 'tzuyang':     renderTzuyang(ctx, w, h, title, subtitle);     break;
  }

  drawForeground(ctx, w, h);
}

// ═══════════════════════════════
//  기본 스타일 렌더 함수 (6)
// ═══════════════════════════════

function renderOverlay(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;
  const grad = ctx.createLinearGradient(0, h * 0.45, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(64 * s)}px 'Black Han Sans', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 8 * s;
  const lines = computeLines(ctx, title, w * 0.85);
  const lineH = 72 * s;
  let y = h - (lines.length * lineH) - 48 * s;
  lines.forEach(l => { ctx.fillText(l, w / 2, y); y += lineH; });

  if (subtitle) {
    ctx.font = `600 ${Math.round(28 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = '#cccccc';
    ctx.fillText(subtitle, w / 2, h - 20 * s);
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
}

function renderDark(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(72 * s)}px 'Black Han Sans', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 12 * s;
  const lines = computeLines(ctx, title, w * 0.8);
  const lineH = 80 * s;
  let y = h / 2 - (lines.length * lineH / 2) + 8 * s;
  lines.forEach(l => { ctx.fillText(l, w / 2, y); y += lineH; });

  if (subtitle) {
    ctx.font = `600 ${Math.round(28 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(subtitle, w / 2, h / 2 + (lines.length * lineH / 2) + 36 * s);
  }
  ctx.shadowBlur = 0;
}

function renderBanner(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;
  const bh = h * 0.28;
  ctx.fillStyle = 'rgba(200,0,0,0.92)';
  ctx.fillRect(0, h - bh, w, bh);

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(58 * s)}px 'Black Han Sans', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6 * s;
  const lines = computeLines(ctx, title, w * 0.88);
  const lineH = 64 * s;
  let y = h - bh + (bh / 2) - ((lines.length - 1) * lineH / 2) + 4 * s;
  if (subtitle) y -= 16 * s;
  lines.forEach(l => { ctx.fillText(l, w / 2, y); y += lineH; });

  if (subtitle) {
    ctx.font = `600 ${Math.round(24 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = '#ffcccc';
    ctx.fillText(subtitle, w / 2, h - 14 * s);
  }
  ctx.shadowBlur = 0;
}

function renderSplit(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;
  const panelX = w * 0.52;
  const grad = ctx.createLinearGradient(panelX, 0, w, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.3, 'rgba(0,0,0,0.8)');
  grad.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'right';
  ctx.font = `bold ${Math.round(60 * s)}px 'Black Han Sans', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 8 * s;
  const lines = computeLines(ctx, title, w * 0.42);
  const lineH = 68 * s;
  let y = h / 2 - ((lines.length - 1) * lineH / 2);
  lines.forEach(l => { ctx.fillText(l, w - 36 * s, y); y += lineH; });

  if (subtitle) {
    ctx.font = `600 ${Math.round(24 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = '#cccccc';
    ctx.fillText(subtitle, w - 36 * s, h / 2 + (lines.length * lineH / 2) + 24 * s);
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
}

function renderImpact(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;
  const topH = h * 0.18;
  ctx.fillStyle = 'rgba(255,200,0,0.92)';
  ctx.fillRect(0, 0, w, topH);

  const grad = ctx.createLinearGradient(0, h * 0.6, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (subtitle) {
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(28 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText(subtitle, w / 2, topH / 2 + 10 * s);
  }

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(68 * s)}px 'Black Han Sans', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 10 * s;
  const lines = computeLines(ctx, title, w * 0.85);
  const lineH = 76 * s;
  let y = h - (lines.length * lineH) - 32 * s;
  lines.forEach(l => { ctx.fillText(l, w / 2, y); y += lineH; });
  ctx.shadowBlur = 0;
}

function renderNeon(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(74 * s)}px 'Black Han Sans', sans-serif`;
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 32 * s;
  ctx.fillStyle = '#00ffcc';
  const lines = computeLines(ctx, title, w * 0.82);
  const lineH = 82 * s;
  let y = h / 2 - (lines.length * lineH / 2) + 8 * s;
  lines.forEach(l => { ctx.fillText(l, w / 2, y); y += lineH; });

  if (subtitle) {
    ctx.font = `600 ${Math.round(28 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12 * s;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, w / 2, h / 2 + (lines.length * lineH / 2) + 36 * s);
  }
  ctx.shadowBlur = 0;
}

// ═══════════════════════════════
//  유튜버 스타일 렌더 함수 (6)
// ═══════════════════════════════

function renderMrBeast(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;

  const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.38);
  topGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
  topGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, h * 0.38);

  const btmGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
  btmGrad.addColorStop(0, 'rgba(0,0,0,0)');
  btmGrad.addColorStop(1, 'rgba(0,0,0,0.9)');
  ctx.fillStyle = btmGrad;
  ctx.fillRect(0, h * 0.6, w, h * 0.4);

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(78 * s)}px 'Black Han Sans', sans-serif`;
  ctx.fillStyle = '#ffe135';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 14 * s;
  const lines = computeLines(ctx, title, w * 0.88);
  const lineH = 84 * s;
  let y = 88 * s;
  lines.forEach(l => { ctx.fillText(l, w / 2, y); y += lineH; });

  if (subtitle) {
    ctx.font = `700 ${Math.round(32 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8 * s;
    ctx.fillText(subtitle, w / 2, h - 28 * s);
  }
  ctx.shadowBlur = 0;
}

function renderMKBHD(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(70 * s)}px 'Black Han Sans', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 10 * s;
  const lines = computeLines(ctx, title, w * 0.75);
  const lineH = 76 * s;
  let y = h / 2 - ((lines.length - 1) * lineH / 2);
  lines.forEach(l => { ctx.fillText(l, w / 2, y); y += lineH; });

  if (subtitle) {
    ctx.font = `600 ${Math.round(28 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = '#3b82f6';
    ctx.shadowBlur = 6 * s;
    ctx.fillText(subtitle, w / 2, h / 2 + (lines.length * lineH / 2) + 32 * s);
  }
  ctx.shadowBlur = 0;
}

function renderChimchakman(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;

  const panelW = w * 0.82;
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(0, 0, panelW, h);

  const feather = ctx.createLinearGradient(panelW - 80 * s, 0, panelW + 20 * s, 0);
  feather.addColorStop(0, 'rgba(0,0,0,0.82)');
  feather.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = feather;
  ctx.fillRect(panelW - 80 * s, 0, 100 * s, h);

  ctx.textAlign = 'left';
  ctx.font = `bold ${Math.round(82 * s)}px 'Black Han Sans', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4 * s;
  const lines = computeLines(ctx, title, panelW * 0.85);
  const lineH = 90 * s;
  let y = h / 2 - ((lines.length - 1) * lineH / 2);
  lines.forEach(l => { ctx.fillText(l, 48 * s, y); y += lineH; });

  if (subtitle) {
    ctx.font = `600 ${Math.round(28 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(subtitle, 48 * s, h / 2 + (lines.length * lineH / 2) + 28 * s);
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
}

function renderPanibottle1(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;

  const grad = ctx.createLinearGradient(w * 0.4, 0, w, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.75)');
  grad.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'right';
  ctx.font = `bold ${Math.round(60 * s)}px 'Black Han Sans', sans-serif`;
  ctx.fillStyle = '#ff9940';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10 * s;
  const lines = computeLines(ctx, title, w * 0.5);
  const lineH = 68 * s;
  let y = h / 2 - ((lines.length - 1) * lineH / 2);
  lines.forEach(l => { ctx.fillText(l, w - 36 * s, y); y += lineH; });

  if (subtitle) {
    ctx.font = `600 ${Math.round(24 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, w - 36 * s, h / 2 + (lines.length * lineH / 2) + 28 * s);
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
}

function renderPanibottle2(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;

  const barH = h * 0.14;
  ctx.fillStyle = 'rgba(0,0,0,0.92)';
  ctx.fillRect(0, 0, w, barH);
  ctx.fillRect(0, h - barH, w, barH);

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(46 * s)}px 'Black Han Sans', sans-serif`;
  ctx.fillStyle = '#f5c842';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6 * s;
  const lines = computeLines(ctx, title, w * 0.85);
  const lineH = 52 * s;
  let y = h - barH + (barH / 2) - ((lines.length - 1) * lineH / 2) + 4 * s;
  lines.forEach(l => { ctx.fillText(l, w / 2, y); y += lineH; });

  if (subtitle) {
    ctx.font = `600 ${Math.round(22 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, w / 2, barH / 2 + 10 * s);
  }
  ctx.shadowBlur = 0;
}

function renderTzuyang(ctx, w, h, title, subtitle) {
  const s = h / PREVIEW_H;

  const badgeH = h * 0.16;
  ctx.fillStyle = 'rgba(230,0,80,0.92)';
  ctx.fillRect(0, 0, w, badgeH);

  const grad = ctx.createLinearGradient(0, h * 0.55, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);

  if (subtitle) {
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(28 * s)}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, w / 2, badgeH / 2 + 10 * s);
  }

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(72 * s)}px 'Black Han Sans', sans-serif`;
  ctx.fillStyle = '#ffe135';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 14 * s;
  const lines = computeLines(ctx, title, w * 0.88);
  const lineH = 80 * s;
  let y = h - (lines.length * lineH) - 24 * s;
  lines.forEach(l => { ctx.fillText(l, w / 2, y); y += lineH; });
  ctx.shadowBlur = 0;
}

// ── 초기 실행 ──
buildTemplateGrid('basic');
