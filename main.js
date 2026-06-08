// ── 상수 ──
const GRID_W = 320;
const GRID_H = 180;
const PREVIEW_W = 1280;
const PREVIEW_H = 720;

const TEMPLATES = [
  { id: 'overlay', name: '풀 오버레이' },
  { id: 'dark',    name: '다크 오버레이' },
  { id: 'banner',  name: '배너' },
  { id: 'split',   name: '분할' },
  { id: 'impact',  name: '임팩트' },
  { id: 'neon',    name: '네온 글로우' },
];

// ── 상태 ──
let uploadedImage = null;
let selectedTemplateId = null;

let foregroundImage = null;
let fgX = 640, fgY = 36, fgH = 648;
let isDraggingFg = false;
let dragStartX = 0, dragStartY = 0, dragStartFgX = 0, dragStartFgY = 0;

// ── DOM ──
const uploadZone    = document.getElementById('upload-zone');
const fileInput     = document.getElementById('file-input');
const btnUpload     = document.getElementById('btn-upload');
const btnChange     = document.getElementById('btn-change');
const uploadPreview = document.getElementById('upload-preview');
const previewImg    = document.getElementById('preview-img');
const templateGrid  = document.getElementById('template-grid');
const previewCanvas = document.getElementById('preview-canvas');
const inputTitle    = document.getElementById('input-title');
const inputSubtitle = document.getElementById('input-subtitle');

const fgFileInput     = document.getElementById('fg-file-input');
const fgUploadZone    = document.getElementById('fg-upload-zone');
const fgUploadPreview = document.getElementById('fg-upload-preview');
const fgPreviewImg    = document.getElementById('fg-preview-img');
const fgScaleGroup    = document.getElementById('fg-scale-group');
const fgScaleInput    = document.getElementById('fg-scale');
const fgScaleVal      = document.getElementById('fg-scale-val');

// ── 초기화 ──
btnUpload.addEventListener('click', () => fileInput.click());
btnChange.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
uploadZone.addEventListener('click', e => { if (e.target === uploadZone) fileInput.click(); });

inputTitle.addEventListener('input', renderMainPreview);
inputSubtitle.addEventListener('input', renderMainPreview);

document.getElementById('btn-720').addEventListener('click', () => download(1280, 720));
document.getElementById('btn-1080').addEventListener('click', () => download(1920, 1080));

// ── 인물 이미지 이벤트 ──
document.getElementById('btn-fg-upload').addEventListener('click', () => fgFileInput.click());
document.getElementById('btn-fg-change').addEventListener('click', () => fgFileInput.click());
fgFileInput.addEventListener('change', e => { if (e.target.files[0]) handleFgFile(e.target.files[0]); });

document.getElementById('btn-fg-remove').addEventListener('click', () => {
  foregroundImage = null;
  fgUploadZone.classList.remove('hidden');
  fgUploadPreview.classList.add('hidden');
  fgScaleGroup.classList.add('hidden');
  renderMainPreview();
});

fgScaleInput.addEventListener('input', e => {
  fgH = Math.round(PREVIEW_H * e.target.value / 100);
  fgScaleVal.textContent = e.target.value + '%';
  renderMainPreview();
});

// ── 캔버스 드래그 (인물 위치 조정) ──
function getCanvasPos(e) {
  const rect = previewCanvas.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * (PREVIEW_W / rect.width),
    y: (src.clientY - rect.top)  * (PREVIEW_H / rect.height)
  };
}

function isFgHit(px, py) {
  if (!foregroundImage) return false;
  const dh = fgH;
  const dw = foregroundImage.width * (dh / foregroundImage.height);
  return px >= fgX - dw / 2 && px <= fgX + dw / 2 && py >= fgY && py <= fgY + dh;
}

previewCanvas.addEventListener('mousedown', e => {
  if (!foregroundImage) return;
  const pos = getCanvasPos(e);
  if (isFgHit(pos.x, pos.y)) {
    isDraggingFg = true;
    dragStartX = pos.x; dragStartY = pos.y;
    dragStartFgX = fgX; dragStartFgY = fgY;
    e.preventDefault();
  }
});

previewCanvas.addEventListener('mousemove', e => {
  if (!foregroundImage) return;
  const pos = getCanvasPos(e);
  previewCanvas.style.cursor = isDraggingFg ? 'grabbing' : isFgHit(pos.x, pos.y) ? 'grab' : 'default';
  if (!isDraggingFg) return;
  fgX = dragStartFgX + (pos.x - dragStartX);
  fgY = dragStartFgY + (pos.y - dragStartY);
  renderMainPreview();
});

previewCanvas.addEventListener('mouseleave', () => { if (!isDraggingFg) previewCanvas.style.cursor = 'default'; });
window.addEventListener('mouseup', () => { isDraggingFg = false; });

previewCanvas.addEventListener('touchstart', e => {
  if (!foregroundImage) return;
  const pos = getCanvasPos(e);
  if (isFgHit(pos.x, pos.y)) {
    isDraggingFg = true;
    dragStartX = pos.x; dragStartY = pos.y;
    dragStartFgX = fgX; dragStartFgY = fgY;
    e.preventDefault();
  }
}, { passive: false });

previewCanvas.addEventListener('touchmove', e => {
  if (!isDraggingFg) return;
  const pos = getCanvasPos(e);
  fgX = dragStartFgX + (pos.x - dragStartX);
  fgY = dragStartFgY + (pos.y - dragStartY);
  renderMainPreview();
  e.preventDefault();
}, { passive: false });

previewCanvas.addEventListener('touchend', () => { isDraggingFg = false; });

// ── 파일 처리 ──
async function handleFile(file) {
  uploadedImage = await loadImage(file);
  previewImg.src = URL.createObjectURL(file);
  uploadZone.classList.add('hidden');
  uploadPreview.classList.remove('hidden');
  document.getElementById('fg-upload-section').classList.remove('hidden');
  show('section-template');
  await buildTemplateGrid();
}

async function handleFgFile(file) {
  foregroundImage = await loadImage(file);
  fgH = Math.round(PREVIEW_H * 0.90);
  fgX = Math.round(PREVIEW_W * 0.75);
  fgY = Math.round(PREVIEW_H * 0.05);
  fgPreviewImg.src = URL.createObjectURL(file);
  fgUploadZone.classList.add('hidden');
  fgUploadPreview.classList.remove('hidden');
  fgScaleInput.value = 90;
  fgScaleVal.textContent = '90%';
  fgScaleGroup.classList.remove('hidden');
  renderMainPreview();
}

function loadImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });
}

// ── 템플릿 그리드 ──
async function buildTemplateGrid() {
  await document.fonts.ready;
  templateGrid.innerHTML = '';
  TEMPLATES.forEach(t => {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.dataset.id = t.id;

    const canvas = document.createElement('canvas');
    canvas.width  = GRID_W;
    canvas.height = GRID_H;
    renderTemplate(canvas, uploadedImage, t.id, '메인 제목', '서브 타이틀');

    const name = document.createElement('span');
    name.className = 'template-name';
    name.textContent = t.name;

    card.appendChild(canvas);
    card.appendChild(name);
    card.addEventListener('click', () => selectTemplate(t.id));
    templateGrid.appendChild(card);
  });
}

function selectTemplate(id) {
  selectedTemplateId = id;
  document.querySelectorAll('.template-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.id === id);
  });
  show('section-edit');
  renderMainPreview();
  document.getElementById('section-edit').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── 미리보기 렌더 ──
function renderMainPreview() {
  if (!uploadedImage || !selectedTemplateId) return;
  const title    = inputTitle.value.trim()    || '메인 제목';
  const subtitle = inputSubtitle.value.trim() || '서브 타이틀';
  renderTemplate(previewCanvas, uploadedImage, selectedTemplateId, title, subtitle);
}

// ── 다운로드 ──
function download(w, h) {
  if (!uploadedImage || !selectedTemplateId) return;
  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const title    = inputTitle.value.trim()    || '메인 제목';
  const subtitle = inputSubtitle.value.trim() || '서브 타이틀';
  renderTemplate(canvas, uploadedImage, selectedTemplateId, title, subtitle);
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `thumbnail_${w}x${h}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ── 인물 이미지 합성 ──
function drawForeground(ctx, w, h) {
  if (!foregroundImage) return;
  const s  = h / PREVIEW_H;
  const dh = fgH * s;
  const dw = foregroundImage.width * (fgH / foregroundImage.height) * s;
  const rx = w / PREVIEW_W;
  ctx.drawImage(foregroundImage, fgX * rx - dw / 2, fgY * s, dw, dh);
}

// ── 템플릿 렌더 디스패처 ──
function renderTemplate(canvas, img, templateId, title, subtitle) {
  const ctx = canvas.getContext('2d');
  const w   = canvas.width;
  const h   = canvas.height;
  ctx.clearRect(0, 0, w, h);
  drawImageCover(ctx, img, w, h);
  drawForeground(ctx, w, h);
  switch (templateId) {
    case 'overlay': renderOverlay(ctx, w, h, title, subtitle); break;
    case 'dark':    renderDark(ctx, w, h, title, subtitle);    break;
    case 'banner':  renderBanner(ctx, w, h, title, subtitle);  break;
    case 'split':   renderSplit(ctx, w, h, title, subtitle);   break;
    case 'impact':  renderImpact(ctx, w, h, title, subtitle);  break;
    case 'neon':    renderNeon(ctx, w, h, title, subtitle);    break;
  }
}

// ── 이미지 커버 피트 ──
function drawImageCover(ctx, img, w, h) {
  const scale  = Math.max(w / img.width, h / img.height);
  const sw     = img.width  * scale;
  const sh     = img.height * scale;
  const sx     = (w - sw) / 2;
  const sy     = (h - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh);
}

// ── 텍스트 유틸 ──
function computeLines(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTextBlock(ctx, text, cx, cy, maxWidth, fontSize, fillColor, strokeWidth) {
  const lineHeight = fontSize * 1.3;
  const lines      = computeLines(ctx, text, maxWidth);
  const totalH     = lines.length * lineHeight;
  const startY     = cy - totalH / 2 + lineHeight * 0.78;

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin     = 'round';
  ctx.lineWidth    = strokeWidth;
  ctx.strokeStyle  = 'rgba(0,0,0,0.9)';
  ctx.fillStyle    = fillColor;

  lines.forEach((ln, i) => {
    const y = startY + i * lineHeight;
    ctx.strokeText(ln, cx, y);
    ctx.fillText(ln, cx, y);
  });

  return lines.length * lineHeight;
}

// ── 템플릿 1: 풀 오버레이 ──
function renderOverlay(ctx, w, h, title, subtitle) {
  const grad = ctx.createLinearGradient(0, h * 0.35, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.90)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const subSize   = Math.round(w * 0.036);
  const titleSize = Math.round(w * 0.072);

  ctx.font = `700 ${subSize}px 'Noto Sans KR', sans-serif`;
  drawTextBlock(ctx, subtitle, w / 2, h * 0.76, w * 0.85, subSize, '#FFE234', Math.max(2, subSize * 0.1));

  ctx.font = `900 ${titleSize}px 'Black Han Sans', 'Noto Sans KR', sans-serif`;
  drawTextBlock(ctx, title, w / 2, h * 0.90, w * 0.85, titleSize, '#FFFFFF', Math.max(3, titleSize * 0.07));
}

// ── 템플릿 2: 다크 오버레이 ──
function renderDark(ctx, w, h, title, subtitle) {
  ctx.fillStyle = 'rgba(0,0,0,0.60)';
  ctx.fillRect(0, 0, w, h);

  const titleSize = Math.round(w * 0.072);
  const subSize   = Math.round(w * 0.036);

  ctx.font = `900 ${titleSize}px 'Black Han Sans', 'Noto Sans KR', sans-serif`;
  const titleH = drawTextBlock(ctx, title, w / 2, h * 0.42, w * 0.80, titleSize, '#FFFFFF', Math.max(3, titleSize * 0.07));

  ctx.font = `700 ${subSize}px 'Noto Sans KR', sans-serif`;
  drawTextBlock(ctx, subtitle, w / 2, h * 0.42 + titleH / 2 + subSize * 1.4, w * 0.80, subSize, '#7DD3FC', Math.max(2, subSize * 0.1));
}

// ── 템플릿 3: 배너 ──
function renderBanner(ctx, w, h, title, subtitle) {
  const bandH = h * 0.28;
  const bandY = h - bandH;

  ctx.fillStyle = 'rgba(190,10,10,0.93)';
  ctx.fillRect(0, bandY, w, bandH);

  const titleSize = Math.round(w * 0.065);
  const subSize   = Math.round(w * 0.034);

  ctx.font = `700 ${subSize}px 'Noto Sans KR', sans-serif`;
  drawTextBlock(ctx, subtitle, w / 2, bandY - subSize * 1.2, w * 0.85, subSize, '#FFE234', Math.max(2, subSize * 0.1));

  ctx.font = `900 ${titleSize}px 'Black Han Sans', 'Noto Sans KR', sans-serif`;
  drawTextBlock(ctx, title, w / 2, bandY + bandH / 2, w * 0.85, titleSize, '#FFFFFF', Math.max(2, titleSize * 0.05));
}

// ── 템플릿 4: 분할 ──
function renderSplit(ctx, w, h, title, subtitle) {
  const panelX = w * 0.52;
  const panelW = w * 0.48;

  ctx.fillStyle = 'rgba(10,12,50,0.88)';
  ctx.fillRect(panelX, 0, panelW, h);

  const titleSize = Math.round(w * 0.062);
  const subSize   = Math.round(w * 0.034);
  const cx        = panelX + panelW / 2;

  ctx.font = `900 ${titleSize}px 'Black Han Sans', 'Noto Sans KR', sans-serif`;
  const titleH = drawTextBlock(ctx, title, cx, h * 0.42, panelW * 0.85, titleSize, '#FFFFFF', Math.max(3, titleSize * 0.07));

  ctx.font = `700 ${subSize}px 'Noto Sans KR', sans-serif`;
  drawTextBlock(ctx, subtitle, cx, h * 0.42 + titleH / 2 + subSize * 1.6, panelW * 0.85, subSize, '#FBBF24', Math.max(2, subSize * 0.1));
}

// ── 템플릿 5: 임팩트 ──
function renderImpact(ctx, w, h, title, subtitle) {
  const gradT = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  gradT.addColorStop(0, 'rgba(0,0,0,0.88)');
  gradT.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradT;
  ctx.fillRect(0, 0, w, h);

  const gradB = ctx.createLinearGradient(0, h * 0.68, 0, h);
  gradB.addColorStop(0, 'rgba(0,0,0,0)');
  gradB.addColorStop(1, 'rgba(0,0,0,0.80)');
  ctx.fillStyle = gradB;
  ctx.fillRect(0, 0, w, h);

  const titleSize = Math.round(w * 0.086);
  const subSize   = Math.round(w * 0.038);

  ctx.font = `900 ${titleSize}px 'Black Han Sans', 'Noto Sans KR', sans-serif`;
  drawTextBlock(ctx, title, w / 2, h * 0.22, w * 0.90, titleSize, '#FFE234', Math.max(4, titleSize * 0.08));

  ctx.font = `700 ${subSize}px 'Noto Sans KR', sans-serif`;
  drawTextBlock(ctx, subtitle, w / 2, h * 0.89, w * 0.85, subSize, '#FFFFFF', Math.max(2, subSize * 0.1));
}

// ── 템플릿 6: 네온 글로우 ──
function renderNeon(ctx, w, h, title, subtitle) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, w, h);

  const titleSize = Math.round(w * 0.075);
  const subSize   = Math.round(w * 0.036);

  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur  = Math.round(w * 0.02);
  ctx.font = `900 ${titleSize}px 'Black Han Sans', 'Noto Sans KR', sans-serif`;
  const titleH = drawTextBlock(ctx, title, w / 2, h * 0.42, w * 0.82, titleSize, '#FFFFFF', 0);

  ctx.shadowColor = '#ff44cc';
  ctx.shadowBlur  = Math.round(w * 0.012);
  ctx.font = `700 ${subSize}px 'Noto Sans KR', sans-serif`;
  drawTextBlock(ctx, subtitle, w / 2, h * 0.42 + titleH / 2 + subSize * 1.5, w * 0.82, subSize, '#ff99ee', 0);

  ctx.shadowBlur  = 0;
  ctx.shadowColor = 'transparent';
}

// ── 유틸 ──
function show(sectionId) {
  document.getElementById(sectionId).classList.remove('hidden');
}

// ═══════════════════════════════
// 스타일 갤러리
// ═══════════════════════════════
const GALLERY_DATA = [
  {
    category: '해외',
    items: [
      { name: 'MrBeast', style: '도전 / 충격형',  file: 'references/mrbeast.jpg',           templateId: 'impact'  },
      { name: 'MKBHD',   style: '미니멀 테크형',  file: 'references/mkbhd.jpg',             templateId: 'dark'    },
    ]
  },
  {
    category: '국내',
    items: [
      { name: '침착맨',   style: '예능 / 토크형',  file: 'references/chimchakman.jpg',       templateId: 'split'   },
      { name: '빠니보틀', style: '여행 비교형',    file: 'references/panibottle_india.jpg',  templateId: 'overlay' },
      { name: '빠니보틀', style: '여행 감성형',    file: 'references/panibottle_africa.jpg', templateId: 'banner'  },
      { name: '쯔양',    style: '먹방형',          file: 'references/tzuyang.jpg',           templateId: 'neon'    },
    ]
  }
];

let currentGalleryCategory = '해외';
let currentCompareItem = null;

const modalGallery    = document.getElementById('modal-gallery');
const galleryGrid     = document.getElementById('gallery-grid');
const galleryCompare  = document.getElementById('gallery-compare');
const compareRef      = document.getElementById('compare-ref');
const compareCanvas   = document.getElementById('compare-canvas');
const compareLabel    = document.getElementById('compare-label');

// 갤러리 열기/닫기
document.getElementById('btn-gallery').addEventListener('click', () => {
  modalGallery.classList.add('active');
  renderGalleryGrid(currentGalleryCategory);
});
document.getElementById('btn-gallery-close').addEventListener('click', closeGallery);
modalGallery.addEventListener('click', e => { if (e.target === modalGallery) closeGallery(); });

function closeGallery() {
  modalGallery.classList.remove('active');
  showGalleryGrid();
}

// 탭 전환
document.querySelectorAll('.gallery-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentGalleryCategory = tab.dataset.cat;
    renderGalleryGrid(currentGalleryCategory);
    showGalleryGrid();
  });
});

// 그리드 렌더
function renderGalleryGrid(category) {
  const data = GALLERY_DATA.find(g => g.category === category);
  galleryGrid.innerHTML = '';
  data.items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'gallery-item';
    card.innerHTML = `
      <img src="${item.file}" alt="${item.name}" loading="lazy">
      <div class="gallery-item-info">
        <p class="gallery-item-name">${item.name}</p>
        <p class="gallery-item-style">${item.style}</p>
      </div>
    `;
    card.addEventListener('click', () => openCompare(item));
    galleryGrid.appendChild(card);
  });
}

// 비교 뷰 열기
function openCompare(item) {
  currentCompareItem = item;
  compareRef.src = item.file;
  compareLabel.textContent = `${item.name} — ${item.style}`;

  // 현재 내 작업을 compare-canvas에 복사
  if (uploadedImage && selectedTemplateId) {
    const title    = inputTitle.value.trim()    || '메인 제목';
    const subtitle = inputSubtitle.value.trim() || '서브 타이틀';
    renderTemplate(compareCanvas, uploadedImage, selectedTemplateId, title, subtitle);
  } else {
    const ctx = compareCanvas.getContext('2d');
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(0, 0, compareCanvas.width, compareCanvas.height);
    ctx.fillStyle = '#555';
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('작업 중인 썸네일 없음', compareCanvas.width / 2, compareCanvas.height / 2);
  }

  galleryGrid.classList.add('hidden');
  galleryCompare.classList.remove('hidden');
}

// 이 스타일로 만들기
document.getElementById('btn-apply-style').addEventListener('click', () => {
  if (!currentCompareItem || !uploadedImage) return;
  closeGallery();
  selectTemplate(currentCompareItem.templateId);
});

// 그리드로 돌아가기
document.getElementById('btn-compare-back').addEventListener('click', showGalleryGrid);

function showGalleryGrid() {
  galleryGrid.classList.remove('hidden');
  galleryCompare.classList.add('hidden');
}
