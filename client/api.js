const BASE = '/api/v1';

export async function analyzeDocument(file, docType = 'nda') {
  const form = new FormData();
  form.append('document', file);
  form.append('docType', docType);
  const res = await fetch(`${BASE}/analyze`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error ${res.status}`);
  }
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`);
  return res.ok;
}
