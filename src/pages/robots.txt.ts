import siteData from '../data/siteData.json';
import { generateRobotsTxt } from '../utils/seoAndContent.js';

export function GET() {
  return new Response(generateRobotsTxt(siteData), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
