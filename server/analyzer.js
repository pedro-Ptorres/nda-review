import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { mockAnalysis } from './mock.js';

// Toggle to false when API key is ready
const USE_MOCK = true;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rulebook = JSON.parse(readFileSync(path.join(__dirname, '../config/rules.json'), 'utf-8'));

export async function runAnalysis(uploadedText, baselineText) {
  if (USE_MOCK) {
    console.log('[analyzer] Using mock — set USE_MOCK=false when API key is ready');
    return mockAnalysis(uploadedText, baselineText);
  }
  return claudeAnalysis(uploadedText, baselineText);
}

async function claudeAnalysis(uploadedText, baselineText) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const rulesText = rulebook.rules.map(r =>
    `- ID: ${r.id} | Section: ${r.section} | Severity: ${r.severity}\n  Flag if: ${r.flagIf}`
  ).join('\n');

  const prompt = `
You are a legal document analyst specializing in NDAs.
Compare the UPLOADED NDA against the BASELINE NDA and identify deviations matching the rules below.

RULES:
${rulesText}

BASELINE NDA:
${baselineText}

UPLOADED NDA:
${uploadedText}

Return ONLY a valid JSON array of findings:
[
  {
    "ruleId": "",
    "clause": "",
    "original": "",
    "modified": "",
    "detail": "",
    "page": <number>
  }
]
Only include real deviations. No fabricated flags. No markdown or code fences.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content.find(b => b.type === 'text')?.text ?? '[]';
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('AI response was not valid JSON. Try again.');
  }
}
