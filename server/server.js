import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { parsePdf } from './parser.js';
import { runAnalysis } from './analyzer.js';
import { applyRules } from './flagEngine.js';
import { CONFIG_DIR } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Cache baselines at startup — restart server to pick up new files
const BASELINES = {};
async function loadBaselines() {
  const types = { nda: 'baseline-nda.pdf', da: 'baseline-da.pdf' };
  for (const [type, filename] of Object.entries(types)) {
    const filePath = path.join(CONFIG_DIR, filename);
    try {
      BASELINES[type] = await parsePdf(filePath, { fromPath: true });
      console.log(`[startup] Loaded baseline: ${filename}`);
    } catch {
      console.warn(`[startup] Baseline not found: config/${filename} — add this file and restart to enable ${type.toUpperCase()} analysis.`);
    }
  }
  if (!BASELINES.nda) {
    // Legacy fallback — support old baseline.pdf name
    try {
      BASELINES.nda = await parsePdf(path.join(CONFIG_DIR, 'baseline.pdf'), { fromPath: true });
      console.log('[startup] Loaded baseline: baseline.pdf (legacy)');
    } catch {
      console.warn('[startup] No NDA baseline found. Add config/baseline-nda.pdf (or legacy config/baseline.pdf) and restart the server.');
    }
  }
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

loadBaselines().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
