import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const rulebook = JSON.parse(
  readFileSync(path.join(__dirname, '../config/rules.json'), 'utf-8')
);

export const RULE_MAP = Object.fromEntries(rulebook.rules.map(r => [r.id, r]));

export const CONFIG_DIR = path.join(__dirname, '../config');
