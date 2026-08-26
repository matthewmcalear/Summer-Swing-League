import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  const htmlPath = join(process.cwd(), 'public', 'westmount-draft.html');
  const html = readFileSync(htmlPath, 'utf-8');
  
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  });
}
