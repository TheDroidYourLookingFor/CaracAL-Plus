#!/usr/bin/env python3
"""Private Docker-bridge TCP relay for the LAN-only Ollama chat service."""

import ipaddress
import logging
import os
import socket
import socketserver
import threading


LISTEN_HOST = os.environ.get("CARACAL_RELAY_LISTEN_HOST", "localhost")
LISTEN_PORT = int(os.environ.get("LISTEN_PORT", "18001"))
UPSTREAM_HOST = os.environ.get("CARACAL_OLLAMA_HOST")
if not UPSTREAM_HOST: raise SystemExit("Missing required environment variable: CARACAL_OLLAMA_HOST")
UPSTREAM_PORT = 18002
ALLOWED_NETWORK_VALUE = os.environ.get("CARACAL_RELAY_ALLOWED_NETWORK")
if not ALLOWED_NETWORK_VALUE: raise SystemExit("Missing required environment variable: CARACAL_RELAY_ALLOWED_NETWORK")
ALLOWED_NETWORK = ipaddress.ip_network(ALLOWED_NETWORK_VALUE)
CONNECTION_TIMEOUT = 300
MAX_CONNECTIONS = 32

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
admission = threading.BoundedSemaphore(MAX_CONNECTIONS)


class RelayHandler(socketserver.BaseRequestHandler):
    def handle(self):
        try:
            client_address = ipaddress.ip_address(self.client_address[0])
        except ValueError:
            logging.warning("Rejected client with invalid address")
            return
        if client_address not in ALLOWED_NETWORK:
            logging.warning("Rejected connection outside Docker network: %s", client_address)
            return
        if not admission.acquire(blocking=False):
            logging.warning("Rejected connection because the relay is at capacity")
            return

        upstream = None
        try:
            upstream = socket.create_connection((UPSTREAM_HOST, UPSTREAM_PORT), timeout=5)
            self.request.settimeout(CONNECTION_TIMEOUT)
            upstream.settimeout(CONNECTION_TIMEOUT)
            directions = (
                threading.Thread(target=self._copy, args=(self.request, upstream), daemon=True),
                threading.Thread(target=self._copy, args=(upstream, self.request), daemon=True),
            )
            for direction in directions:
                direction.start()
            for direction in directions:
                direction.join()
        except OSError as error:
            logging.info("Relay connection ended (%s)", error.__class__.__name__)
        finally:
            if upstream is not None:
                upstream.close()
            admission.release()

    @staticmethod
    def _copy(source, destination):
        try:
            while True:
                data = source.recv(65536)
                if not data:
                    try:
                        destination.shutdown(socket.SHUT_WR)
                    except OSError:
                        pass
                    return
                destination.sendall(data)
        except OSError:
            try:
                destination.shutdown(socket.SHUT_WR)
            except OSError:
                pass


class RelayServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 64


if __name__ == "__main__":
    with RelayServer((LISTEN_HOST, LISTEN_PORT), RelayHandler) as server:
        logging.info(
            "Listening on %s:%s for %s; forwarding only to the loopback SSH tunnel",
            LISTEN_HOST,
            LISTEN_PORT,
            ALLOWED_NETWORK,
        )
        server.serve_forever(poll_interval=1)
