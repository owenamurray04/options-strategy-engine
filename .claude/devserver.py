#!/usr/bin/env python3
"""Static dev server that disables caching, so edited ES modules always reload fresh.
Plain `python3 -m http.server` lets the browser cache modules aggressively, which makes
local changes appear not to take effect. Used by the Claude preview (.claude/launch.json)."""
import http.server
import socketserver

PORT = 4178


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'dev server (no-cache) on http://localhost:{PORT}')
    httpd.serve_forever()
