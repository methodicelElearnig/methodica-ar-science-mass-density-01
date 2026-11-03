"""Local dev server for the lomda (serves the project root on :8765).
Avoids os.getcwd(), which fails for sandboxed processes in OneDrive folders."""
import functools, http.server, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # Dev only: always revalidate, so a plain refresh picks up edits (no Cmd+Shift+R).
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()
Handler = functools.partial(NoCacheHandler, directory=ROOT)
http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
