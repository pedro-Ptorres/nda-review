import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { parsePdf } from './parser.js';
import { runAnalysis } from './analyzer.js';
import { applyRules } from './flagEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

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

app.post('/api/analyze', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

    const uploadedText = await parsePdf(req.file.buffer);
    const baselinePath = path.join(__dirname, '../config/baseline.pdf');
    const baselineText = await parsePdf(baselinePath, { fromPath: true });

    const rawFindings = await runAnalysis(uploadedText, baselineText);
    const flags = applyRules(rawFindings);

    const summary = flags.reduce(
      (acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        acc.total++;
        return acc;
      },
      { high: 0, medium: 0, low: 0, info: 0, total: 0 }
    );

    res.json({ flags, summary, filename: req.file.originalname });
  } catch (err) {
    console.error('[/api/analyze]', err.message);
    res.status(500).json({ error: err.message || 'Analysis failed.' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0' }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
