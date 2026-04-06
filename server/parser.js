import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { readFile } from 'fs/promises';

export async function parsePdf(source, options = {}) {
  const buffer = options.fromPath ? await readFile(source) : source;
  const result = await pdfParse(buffer);
  return result.text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
