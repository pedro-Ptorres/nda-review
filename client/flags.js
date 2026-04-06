let pendingCount = 0;

export function renderFlags(flags) {
  pendingCount = flags.length;
  document.getElementById('flags').innerHTML = flags.map(f => flagHTML(f)).join('');
  updatePendingCount();
}

export function updateSummary(summary) {
  document.getElementById('cnt-high').textContent = summary.high ?? 0;
  document.getElementById('cnt-med').textContent = summary.medium ?? 0;
  document.getElementById('cnt-low-info').textContent = (summary.low ?? 0) + (summary.info ?? 0);
  document.getElementById('cnt-pend').textContent = summary.total ?? 0;
}

export function bulkAct(status) {
  document.querySelectorAll('.flag-row[data-status="pending"]').forEach(el =>
    applyStatus(el.id, status)
  );
}

function sevClass(s) {
  return { high: 'sev-high', medium: 'sev-med', low: 'sev-low', info: 'sev-info' }[s] ?? 'sev-info';
}

function truncate(str, max = 72) {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function docPreviewHTML(f) {
  return [
    { t: `${f.clause} — extracted`, c: 'section-head' },
    { t: '', c: 'dim' },
    { t: `− ${truncate(f.original)}`, c: 'highlight-rem' },
    { t: '', c: 'dim' },
    { t: `+ ${truncate(f.modified)}`, c: 'highlight-add' },
  ].map(l => `<div class="doc-line ${l.c}">${l.t || '&nbsp;'}</div>`).join('');
}

function flagHTML(f) {
  return `
    <div class="flag-row" id="${f.id}" data-status="pending">
      <div class="flag-summary" onclick="toggleFlag('${f.id}')">
        <svg class="flag-chevron" viewBox="0 0 16 16" stroke-width="1.5"><path d="M6 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="severity ${sevClass(f.severity)}">${f.sevLabel}</span>
        <span class="flag-title">${f.title}</span>
        <span class="flag-clause">${f.clause}</span>
        <span class="flag-status-dot" id="${f.id}-dot"></span>
      </div>
      <div class="flag-body">
        <div class="flag-inner">
          <div class="flag-detail">
            <p class="flag-desc">${f.desc}</p>
            <div class="flag-diff">
              <div class="diff-rem">− ${f.original}</div>
              <div class="diff-add">+ ${f.modified}</div>
            </div>
            <div class="flag-actions">
              <button class="btn btn-success" id="${f.id}-app" onclick="flagAct('${f.id}','approved')">Approve</button>
              <button class="btn btn-danger" id="${f.id}-rej" onclick="flagAct('${f.id}','rejected')">Reject</button>
            </div>
          </div>
          <div class="doc-preview">
            <div class="preview-label">Document location</div>
            <div class="doc-page">${docPreviewHTML(f)}</div>
            <div class="preview-page-num">Page ${f.page}</div>
          </div>
        </div>
      </div>
    </div>`;
}

function applyStatus(id, status) {
  const el = document.getElementById(id);
  if (!el || el.dataset.status !== 'pending') return;
  el.dataset.status = status;
  el.classList.remove('approved', 'rejected');
  el.classList.add(status);
  document.getElementById(`${id}-app`).disabled = true;
  document.getElementById(`${id}-rej`).disabled = true;
  pendingCount = Math.max(0, pendingCount - 1);
  updatePendingCount();
}

function updatePendingCount() {
  document.getElementById('cnt-pend').textContent = pendingCount;
}

window.toggleFlag = function (id) {
  const el = document.getElementById(id);
  const wasOpen = el.classList.contains('open');
  document.querySelectorAll('.flag-row.open').forEach(r => r.classList.remove('open'));
  if (!wasOpen) el.classList.add('open');
};

window.flagAct = applyStatus;
