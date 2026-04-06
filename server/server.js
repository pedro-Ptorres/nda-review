import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdir } from 'fs/promises';
import { parsePdf } from './parser.js';
import { runAnalysis } from './analyzer.js';
import { applyRules } from './flagEngine.js';
import { CONFIG_DIR } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Auto-discover baselines at startup — drop baseline-{type}.pdf in config/ and restart
const BASELINES = {};
async function loadBaselines() {
  const files = await readdir(CONFIG_DIR);
  const pattern = /^baseline-(.+)\.pdf$/;

  for (const filename of files) {
    const match = filename.match(pattern);
    if (!match) continue;
    try {
      BASELINES[match[1]] = await parsePdf(path.join(CONFIG_DIR, filename), { fromPath: true });
      console.log(`[startup] Loaded baseline: ${filename} → type "${match[1]}"`);
    } catch (err) {
      console.warn(`[startup] Failed to parse ${filename}: ${err.message}`);
    }
  }

  // Legacy fallback — baseline.pdf maps to "nda"
  if (!BASELINES.nda && files.includes('baseline.pdf')) {
    try {
      BASELINES.nda = await parsePdf(path.join(CONFIG_DIR, 'baseline.pdf'), { fromPath: true });
      console.log('[startup] Loaded baseline: baseline.pdf (legacy → nda)');
    } catch {
      console.warn('[startup] Failed to parse legacy baseline.pdf');
    }
  }

  const types = Object.keys(BASELINES);
  console.log(`[startup] ${types.length} baseline(s) ready: ${types.join(', ') || 'none'}`);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted'));
  },
});

app.post('/api/v1/analyze', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

    const docType = (req.body.docType || 'nda').toLowerCase();
    const baselineText = BASELINES[docType];
    if (!baselineText) {
      return res.status(400).json({
        error: `No baseline loaded for doc type "${docType}". Add baseline-${docType}.pdf to config/ and restart the server.`
      });
    }

    const uploadedText = await parsePdf(req.file.buffer);
    const rawFindings = await runAnalysis(uploadedText, baselineText, docType);
    const flags = applyRules(rawFindings);

    const summary = flags.reduce(
      (acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        acc.total++;
        return acc;
      },
      { high: 0, medium: 0, low: 0, info: 0, total: 0 }
    );

    res.json({ flags, summary, filename: req.file.originalname, docType });
  } catch (err) {
    console.error('[/api/v1/analyze] Error:', err.message);
    res.status(500).json({
      error: err.message || 'Analysis failed. Check the server console for details.'
    });
  }
});

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', version: '1.0' }));

// Catch multer and other middleware errors — return JSON instead of raw HTML
app.use((err, _req, res, _next) => {
  console.error(`[error] ${err.message}`);
  res.status(err.status || 500).json({ error: err.message });
});

loadBaselines().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
