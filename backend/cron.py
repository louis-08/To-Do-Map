"""Railway cron: 0 2 * * * — calls POST /backup/drive"""
import httpx
import os


def run():
    base = os.environ.get("SELF_URL", "http://localhost:8000")
    resp = httpx.post(f"{base}/backup/drive", timeout=120)
    resp.raise_for_status()
    print(resp.json())


if __name__ == "__main__":
    run()
