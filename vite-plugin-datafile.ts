import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const DATA_FILE = path.resolve(__dirname, 'taskmind-data.json');

export default function dataFilePlugin(): Plugin {
  return {
    name: 'taskmind-datafile',
    configureServer(server) {
      server.middlewares.use('/api/data', (req, res) => {
        if (req.method === 'GET') {
          if (fs.existsSync(DATA_FILE)) {
            const content = fs.readFileSync(DATA_FILE, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(content);
          } else {
            res.statusCode = 404;
            res.end('{}');
          }
        } else if (req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            // Validate JSON before writing
            JSON.parse(body);
            fs.writeFileSync(DATA_FILE, body, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end('{"ok":true}');
          });
        } else {
          res.statusCode = 405;
          res.end();
        }
      });
    },
  };
}
