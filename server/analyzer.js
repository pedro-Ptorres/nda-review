import Anthropic from '@anthropic-ai/sdk';
import { mockAnalysis } from './mock.js';
import { rulebook } from './config.js';

const USE_MOCK = process.env.USE_MOCK !== 'false';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

export async function runAnalysis(uploadedText, baselineText, docType = 'nda') {
  if (USE_MOCK) {
    console.log('[analyzer] Mock mode — set USE_MOCK=false in .env when API key is ready');
    return mockAnalysis(uploadedText, baselineText);
  }
  return claudeAnalysis(uploadedText, baselineText, docType);
}

async function claudeAnalysis(uploadedText, baselineText, docType) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const rulesText = rulebook.rules.map(r =>
    `- ID: ${r.id} | Section: ${r.section} | Severity: ${r.severity}\n  Flag if: ${r.flagIf}`
  ).join('\n');

  const prompt = `
You are a legal document analyst specializing in NDAs.
Compare the UPLOADED ${docType.toUpperCase()} against the BASELINE and identify deviations matching the rules below.

RULES:
${rulesText}

BASELINE:
${baselineText}

UPLOADED DOCUMENT:
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
    model: CLAUDE_MODEL,
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
