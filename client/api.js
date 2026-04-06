const BASE = 'http://localhost:3000';

export async function analyzeDocument(file) {
  const form = new FormData();
  form.append('document', file);
  const res = await fetch(`${BASE}/api/analyze`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error ${res.status}`);
  }
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/api/health`);
  return res.ok;
}
