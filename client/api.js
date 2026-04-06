const BASE = '/api/v1';

export async function analyzeDocument(file, docType = 'nda') {
  const form = new FormData();
  form.append('document', file);
  form.append('docType', docType);

  let res;
  try {
    res = await fetch(`${BASE}/analyze`, { method: 'POST', body: form });
  } catch {
    throw new Error('Could not reach the server. Make sure it is running on localhost:3000.');
  }

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `Server error ${res.status}`);
    }
    throw new Error(`Server returned an unexpected response (${res.status}). Try restarting the server.`);
  }

  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`);
  return res.ok;
}
