import siteData from '../data/siteData.json';
import { generateSitemapXml } from '../utils/seoAndContent.js';

export function GET() {
  return new Response(generateSitemapXml(siteData), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
}
