#!/usr/bin/env python3
"""Loopback-only bridge for UGO Aider -> protected Hive FreeLLMAPI.

The agent speaks OpenAI Chat Completions to localhost. This proxy forwards
requests to the remote FreeLLMAPI using two distinct credentials: Hive access
via x-hive-token, and FreeLLMAPI inference via Authorization.
"""
import http.server
import json
import os
import urllib.error
import urllib.request

PORT = 18765
UPSTREAM = "https://ugo-hive-freeapi.onrender.com"
HIVE_TOKEN = os.environ.get("UGO_HIVE_TOKEN", "")
INFERENCE_KEY = os.environ.get("UGO_FREEAPI_API_KEY", "")


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Never log messages, URLs or headers; prompts may include secrets.
        pass

    def do_POST(self):
        if self.path != "/v1/chat/completions":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        if not 0 < length <= 4_000_000:
            self.send_error(413)
            return
        payload = self.rfile.read(length)
        request = urllib.request.Request(
            UPSTREAM + self.path,
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer " + INFERENCE_KEY,
                "x-hive-token": HIVE_TOKEN,
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                self.send_response(response.status)
                self.send_header("Content-Type", response.headers.get("Content-Type", "application/json"))
                self.end_headers()
                while chunk := response.read(8192):
                    self.wfile.write(chunk)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": {"message": "Upstream HTTP %s" % e.code}}).encode())
        except Exception:
            self.send_error(502, "FreeLLMAPI unreachable")


if __name__ == "__main__":
    if len(HIVE_TOKEN) < 32 or not INFERENCE_KEY:
        raise SystemExit("Missing required credentials")
    server = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    server.serve_forever()
