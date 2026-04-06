let allFlags = [];
let selectedId = null;
let pendingCount = 0;
let totalFlags = 0;

export function renderFlags(flags) {
  allFlags = flags;
  pendingCount = flags.length;
  totalFlags = flags.length;
  document.getElementById('flags').innerHTML = flags.map(f => flagItemHTML(f)).join('');
  updatePendingCount();
  if (flags.length > 0) selectFlag(flags[0].id);
}

export function updateSummary(summary) {
  document.getElementById('cnt-high').textContent = summary.high ?? 0;
  document.getElementById('cnt-med').textContent = summary.medium ?? 0;
  document.getElementById('cnt-low-info').textContent = (summary.low ?? 0) + (summary.info ?? 0);
  document.getElementById('cnt-pend').textContent = summary.total ?? 0;
}

export function bulkAct(status) {
  allFlags.forEach(f => {
    const el = document.getElementById(f.id);
    if (el && el.dataset.status === 'pending') applyStatus(f.id, status);
  });
}

function sevClass(s) {
  return { high: 'sev-high', medium: 'sev-med', low: 'sev-low', info: 'sev-info' }[s] ?? 'sev-info';
}

// ── Left pane: compact flag list item ──
function flagItemHTML(f) {
  return `
    <div class="flag-item" id="${f.id}" data-status="pending" onclick="selectFlag('${f.id}')">
      <span class="severity ${sevClass(f.severity)}">${f.sevLabel}</span>
      <div class="flag-item-text">
        <div class="flag-item-title">${f.title}</div>
        <div class="flag-item-clause">${f.clause}</div>
      </div>
      <span class="flag-status-dot" id="${f.id}-dot"></span>
    </div>`;
}

// ── Right pane: full detail view ──
function detailHTML(f) {
  const index = allFlags.findIndex(x => x.id === f.id);
  const total = allFlags.length;
  const isActed = f._status && f._status !== 'pending';

  return `
    <div class="detail-header">
      <span class="detail-clause">${f.clause} — ${f.title}</span>
      <span class="detail-page">Page ${f.page}</span>
      <span class="detail-counter">${index + 1} of ${total}</span>
    </div>
    <div class="detail-body">
      <div class="detail-block">
        <div class="detail-block-label">Baseline (Appning NDA)</div>
        <div class="detail-text"><span class="diff-add">+ ${f.original}</span></div>
      </div>
      <div class="detail-block">
        <div class="detail-block-label">Uploaded document</div>
        <div class="detail-text"><span class="diff-rem">− ${f.modified}</span></div>
      </div>
      <div class="detail-block">
        <div class="detail-block-label">Why this matters</div>
        <div class="detail-why">${f.desc}</div>
      </div>
    </div>
    <div class="detail-actions">
      <button class="btn btn-success" id="${f.id}-app" onclick="flagAct('${f.id}','approved')" ${isActed ? 'disabled' : ''}>✓ Approve</button>
      <button class="btn btn-danger"  id="${f.id}-rej" onclick="flagAct('${f.id}','rejected')" ${isActed ? 'disabled' : ''}>✕ Reject</button>
      <button class="btn" style="margin-left:auto" onclick="skipFlag('${f.id}')">Skip →</button>
    </div>`;
}

function applyStatus(id, status) {
  const el = document.getElementById(id);
  if (!el || el.dataset.status !== 'pending') return;
  el.dataset.status = status;
  el.classList.remove('approved', 'rejected');
  el.classList.add(status);
  const flag = allFlags.find(f => f.id === id);
  if (flag) flag._status = status;
  const appBtn = document.getElementById(`${id}-app`);
  const rejBtn = document.getElementById(`${id}-rej`);
  if (appBtn) appBtn.disabled = true;
  if (rejBtn) rejBtn.disabled = true;
  pendingCount = Math.max(0, pendingCount - 1);
  updatePendingCount();
  // Auto-advance to next pending flag
  advanceToNext(id);
}

function advanceToNext(currentId) {
  const currentIndex = allFlags.findIndex(f => f.id === currentId);
  for (let i = currentIndex + 1; i < allFlags.length; i++) {
    if (!allFlags[i]._status || allFlags[i]._status === 'pending') {
      selectFlag(allFlags[i].id);
      return;
    }
  }
  // No more pending — refresh detail to show disabled state
  if (selectedId === currentId) refreshDetail(currentId);
}

function refreshDetail(id) {
  const flag = allFlags.find(f => f.id === id);
  if (flag) document.getElementById('detail-pane').innerHTML = detailHTML(flag);
}

function updatePendingCount() {
  document.getElementById('cnt-pend').textContent = pendingCount;
  const btnNext = document.getElementById('btn-next');
  if (btnNext) btnNext.disabled = (pendingCount === totalFlags);
}

window.selectFlag = function(id) {
  selectedId = id;
  const flag = allFlags.find(f => f.id === id);
  if (!flag) return;

  // If already acted on — undo back to pending on re-click
  if (flag._status && flag._status !== 'pending') {
    flag._status = 'pending';
    const el = document.getElementById(id);
    if (el) {
      el.dataset.status = 'pending';
      el.classList.remove('approved', 'rejected');
    }
    pendingCount++;
    updatePendingCount();
  }

  // Update active state in list
  document.querySelectorAll('.flag-item').forEach(el => el.classList.remove('active'));
  const item = document.getElementById(id);
  if (item) {
    item.classList.add('active');
    item.scrollIntoView({ block: 'nearest' });
  }

  document.getElementById('detail-pane').innerHTML = detailHTML(flag);
};

window.flagAct = applyStatus;

window.skipFlag = function(currentId) {
  const currentIndex = allFlags.findIndex(f => f.id === currentId);
  const next = allFlags[currentIndex + 1];
  if (next) selectFlag(next.id);
};
