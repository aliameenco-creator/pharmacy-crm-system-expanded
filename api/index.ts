import app from '../server.js';

export default function handler(req: any, res: any) {
  // Vercel rewrites every /api/* request to this single function. Restore the
  // captured path so Express can match routes such as /api/sheets/status.
  const url = new URL(req.url || '/api', 'http://localhost');
  const rewrittenPath = url.searchParams.get('__path');

  if (rewrittenPath) {
    url.searchParams.delete('__path');
    const query = url.searchParams.toString();
    req.url = `/api/${rewrittenPath.replace(/^\/+/, '')}${query ? `?${query}` : ''}`;
  }

  return app(req, res);
}
