import siteData from '../data/siteData.json';
import { generateLlmsTxt } from '../utils/seoAndContent.js';

export function GET() {
  return new Response(generateLlmsTxt(siteData), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
