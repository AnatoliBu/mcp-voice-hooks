from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOG_FILE = "webhooks.log"
HOST = "0.0.0.0"
PORT = 8899


class Handler(BaseHTTPRequestHandler):
    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length) if length else b""

    def _log(self, body: bytes):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        entry = []
        entry.append("=" * 30)
        entry.append(f"{ts} | {self.client_address[0]}:{self.client_address[1]}")
        entry.append(f"{self.command} {self.path}")
        entry.append("")  # пустая строка

        try:
            text = body.decode("utf-8")
            entry.append(text if text else "<empty>")
        except UnicodeDecodeError:
            entry.append("<binary body>")
            entry.append(body.hex())

        entry.append("\n")

        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write("\n".join(entry))
            f.flush()

    def _ok(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"ok")

    # Ловим любые методы
    def do_POST(self):
        self._log(self._read_body())
        self._ok()

    def do_PUT(self):
        self._log(self._read_body())
        self._ok()

    def do_PATCH(self):
        self._log(self._read_body())
        self._ok()

    def do_DELETE(self):
        self._log(self._read_body())
        self._ok()

    def do_GET(self):
        self._log(self._read_body())
        self._ok()

    def log_message(self, format, *args):
        return  # чтобы не спамить в консоль


if __name__ == "__main__":
    print(f"Listening on http://{HOST}:{PORT}/  -> {LOG_FILE}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
