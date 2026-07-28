#!/usr/bin/env python3
"""统一服务器 - 静态文件 + 市场数据代理"""
import http.server
import urllib.request
import json
import re
import os

STATIC_DIR = "/workspace"

class UnifiedHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        if self.path == "/api/market":
            self.handle_market_api()
        elif self.path.startswith("/api/stock"):
            self.handle_stock_api()
        else:
            super().do_GET()

    def handle_market_api(self):
        try:
            url = "https://hq.sinajs.cn/list=gb_inx,gb_ixic,s_sh000300,s_sh000001,rt_hkHSI,int_nikkei"
            req = urllib.request.Request(url, headers={"Referer": "https://finance.sina.com.cn"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = resp.read().decode("gbk")

            result = {}
            for line in data.strip().split("\n"):
                m = re.match(r'var hq_str_(\w+)=\"(.+)\"', line)
                if not m:
                    continue
                code, fields_str = m.group(1), m.group(2)
                fields = fields_str.split(",")
                if len(fields) < 4:
                    continue

                key_map = {"gb_inx": "spx", "gb_ixic": "nasdaq", "s_sh000300": "hs300", "s_sh000001": "sh", "rt_hkHSI": "hsi", "int_nikkei": "nikkei"}
                key = key_map.get(code)
                if not key:
                    continue

                price = None; change = 0; changePct = 0
                if code.startswith("gb_"):
                    price = float(fields[1])
                    changePct = float(fields[2])
                    change = float(fields[4])
                elif code == "s_sh000300" or code == "s_sh000001" or code == "int_nikkei":
                    price = float(fields[1])
                    change = float(fields[2])
                    changePct = float(fields[3])
                elif code == "rt_hkHSI":
                    price = float(fields[2])
                    prev = float(fields[3])
                    change = price - prev
                    changePct = float(fields[8]) if len(fields) > 8 and fields[8] else round(change/prev*100, 2)

                if price:
                    result[key] = {"price": round(price, 2), "change": round(change, 2), "changePct": round(changePct, 2)}

            body = json.dumps(result).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "public, max-age=180")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            body = json.dumps({"error": str(e)}).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def handle_stock_api(self):
        """代理个股股价查询"""
        try:
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            codes = qs.get('codes', [''])[0]
            if not codes:
                raise ValueError("Missing codes")

            url = f"https://hq.sinajs.cn/list={codes}"
            req = urllib.request.Request(url, headers={"Referer": "https://finance.sina.com.cn"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = resp.read().decode("gbk")

            result = {}
            for line in data.strip().split("\n"):
                m = re.match(r'var hq_str_(\w+)="(.+)"', line)
                if not m:
                    continue
                code, fields_str = m.group(1), m.group(2)
                fields = fields_str.split(",")
                if len(fields) < 4:
                    continue

                price = None; change = 0; changePct = 0; name = ""
                if code.startswith("gb_"):
                    name = fields[0]
                    price = float(fields[1]) if fields[1] else None
                    changePct = float(fields[2]) if fields[2] else 0
                    change = float(fields[4]) if len(fields) > 4 and fields[4] else 0
                elif code.startswith("s_sh") or code.startswith("s_sz"):
                    name = fields[0]
                    price = float(fields[1]) if fields[1] else None
                    change = float(fields[2]) if fields[2] else 0
                    changePct = float(fields[3]) if fields[3] else 0
                elif code.startswith("rt_hk"):
                    name = fields[1]
                    price = float(fields[2]) if fields[2] else None
                    prev = float(fields[3]) if fields[3] else price
                    change = price - prev if price else 0
                    changePct = float(fields[8]) if len(fields) > 8 and fields[8] else (round(change/prev*100, 2) if prev else 0)

                if price:
                    # 用原始 symbol 做 key
                    sym = code.replace("gb_", "").replace("s_sh", "").replace("s_sz", "").replace("rt_hk", "")
                    result[sym.upper()] = {
                        "price": round(price, 2), "change": round(change, 2),
                        "changePct": round(changePct, 2), "name": name,
                    }

            body = json.dumps(result).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "public, max-age=60")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            body = json.dumps({"error": str(e)}).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = http.server.HTTPServer(("0.0.0.0", port), UnifiedHandler)
    print(f"Server on port {port}")
    server.serve_forever()
