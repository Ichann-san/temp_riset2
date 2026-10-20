import argparse
import os
from waitress import serve
from app import create_app

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5000)
    args = parser.parse_args()
    app = create_app()
    try:
        serve(app, host='127.0.0.1', port=args.port,
              threads=int(os.getenv('HTTP_THREADS', '16')),
              connection_limit=int(os.getenv('HTTP_CONNECTION_LIMIT', '256')),
              max_request_body_size=4096, clear_untrusted_proxy_headers=True)
    finally:
        app.extensions['db_pool'].close()
