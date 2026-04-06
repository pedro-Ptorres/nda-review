let allFlags = [];
let selectedId = null;
let pendingCount = 0;

const stripSection = s => s ? s.replace(/§\s*/g, '').trim() : s;
const esc = s => s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export function renderFlags(flags) {
  allFlags = flags;
  pendingCount = flags.length;
  document.getElementById('flags').innerHTML = flags.map(f => flagItemHTML(f)).join('');
  updatePendingCount();
  if (flags.length > 0) selectFlag(flags[0].id);
}

export function updateSummary(summary) {
  document.getElementById('cnt-high').textContent = summary.high ?? 0;
  document.getElementById('cnt-med').textContent = summary.medium ?? 0;
  document.getElementById('cnt-low-info').textContent = (summary.low ?? 0) + (summary.info ?? 0);
}

export function bulkAct(status) {
  allFlags.forEach(f => {
    if (f._status && f._status !== 'pending') return;
    f._status = status;
    const el = document.getElementById(f.id);
    if (el) { el.dataset.status = status; el.classList.add(status); }
  });
  pendingCount = allFlags.filter(f => !f._status || f._status === 'pending').length;
  updatePendingCount();
  const sel = allFlags.find(f => f.id === selectedId);
  if (sel) document.getElementById('detail-pane').innerHTML = detailHTML(sel);
}

function sevClass(s) {
  return { high: 'sev-high', medium: 'sev-med', low: 'sev-low', info: 'sev-info' }[s] ?? 'sev-info';
}

// ── Left pane: compact flag list item ──
function flagItemHTML(f) {
  return `
    <div class="flag-item" id="${f.id}" data-status="pending" onclick="selectFlag('${f.id}')">
      <div class="flag-sev-col">
        <span class="severity ${sevClass(f.severity)}">${esc(f.sevLabel)}</span>
        <span class="flag-act-icon"></span>
      </div>
      <div class="flag-item-body">
        <div class="flag-item-title">${esc(f.title)}</div>
        <div class="flag-item-clause">${esc(stripSection(f.clause))}</div>
      </div>
    </div>`;
}

// ── Right pane: full detail view ──
function detailHTML(f) {
  const index = allFlags.findIndex(x => x.id === f.id);
  const status = f._status || 'pending';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';

  const appBtn = isApproved
    ? `<button class="btn btn-undo-approve" onclick="flagAct('${f.id}','approved')">✓ Approved — undo</button>`
    : `<button class="btn btn-success" onclick="flagAct('${f.id}','approved')" ${isRejected ? 'disabled' : ''}>✓ Approve</button>`;

  const rejBtn = isRejected
    ? `<button class="btn btn-undo-reject" onclick="flagAct('${f.id}','rejected')">✕ Rejected — undo</button>`
    : `<button class="btn btn-danger" onclick="flagAct('${f.id}','rejected')" ${isApproved ? 'disabled' : ''}>✕ Reject</button>`;

  return `
    <div class="detail-header">
      <span class="detail-clause">${esc(stripSection(f.clause))} — ${esc(f.title)}</span>
      <span class="detail-page">Page ${f.page}</span>
      <span class="detail-counter">${index + 1} of ${allFlags.length}</span>
    </div>
    <div class="detail-body">
      <div class="detail-block">
        <div class="detail-block-label">Baseline (Appning NDA)</div>
        <div class="detail-text"><span class="diff-add">+ ${esc(f.original)}</span></div>
      </div>
      <div class="detail-block">
        <div class="detail-block-label">Uploaded document</div>
        <div class="detail-text"><span class="diff-rem">− ${esc(f.modified)}</span></div>
      </div>
      <div class="detail-block">
        <div class="detail-block-label">Why this matters</div>
        <div class="detail-why">${esc(f.desc)}</div>
      </div>
    </div>
    <div class="detail-actions">
      ${appBtn}
      ${rejBtn}
      <button class="btn" style="margin-left:auto" onclick="skipFlag('${f.id}')">Skip →</button>
    </div>`;
}

function applyStatus(id, newStatus) {
  const flag = allFlags.find(f => f.id === id);
  const el = document.getElementById(id);
  if (!flag || !el) return;

  const currentStatus = flag._status || 'pending';

  if (currentStatus === newStatus) {
    // Clicking active button = undo back to pending
    flag._status = 'pending';
    el.dataset.status = 'pending';
    el.classList.remove('approved', 'rejected');
    pendingCount++;
    updatePendingCount();
    document.getElementById('detail-pane').innerHTML = detailHTML(flag);
    return;
  }

  // New action (from pending)
  const wasPending = currentStatus === 'pending';
  flag._status = newStatus;
  el.dataset.status = newStatus;
  el.classList.remove('approved', 'rejected');
  el.classList.add(newStatus);

  if (wasPending) {
    pendingCount = Math.max(0, pendingCount - 1);
    updatePendingCount();
    advanceToNext(id);
  } else {
    document.getElementById('detail-pane').innerHTML = detailHTML(flag);
  }
}

function advanceToNext(currentId) {
  const currentIndex = allFlags.findIndex(f => f.id === currentId);
  for (let i = currentIndex + 1; i < allFlags.length; i++) {
    if (!allFlags[i]._status || allFlags[i]._status === 'pending') {
      selectFlagInternal(allFlags[i].id);
      return;
    }
  }
  // No more pending ahead — refresh detail in place
  const flag = allFlags.find(f => f.id === currentId);
  if (flag) document.getElementById('detail-pane').innerHTML = detailHTML(flag);
}

function updatePendingCount() {
  document.getElementById('cnt-pend').textContent = pendingCount;
  const btnNext = document.getElementById('btn-next');
  if (btnNext) btnNext.disabled = (pendingCount === allFlags.length);
}

function selectFlagInternal(id) {
  selectedId = id;
  const flag = allFlags.find(f => f.id === id);
  if (!flag) return;
  document.querySelectorAll('.flag-item').forEach(el => el.classList.remove('active'));
  const item = document.getElementById(id);
  if (item) { item.classList.add('active'); item.scrollIntoView({ block: 'nearest' }); }
  document.getElementById('detail-pane').innerHTML = detailHTML(flag);
}

// Public — just selects and shows current state, no side effects
window.selectFlag = selectFlagInternal;
window.flagAct = applyStatus;
window.skipFlag = function(currentId) {
  const next = allFlags[allFlags.findIndex(f => f.id === currentId) + 1];
  if (next) selectFlagInternal(next.id);
};
