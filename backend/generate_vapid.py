"""Generate a VAPID keypair for Web Push.

Run once:  python generate_vapid.py

Prints the three backend env vars and the one public key the frontend needs.
The private key is emitted as base64url of the raw 32-byte EC private value;
notifications.py reconstructs the PEM from it at runtime.
"""

import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def main() -> None:
    key = ec.generate_private_key(ec.SECP256R1())

    private_value = key.private_numbers().private_value.to_bytes(32, "big")
    public_point = key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )

    print("# --- Backend (Railway) env vars ---")
    print("VAPID_PRIVATE_KEY=" + b64url(private_value))
    print("VAPID_PUBLIC_KEY=" + b64url(public_point))
    print("VAPID_SUBJECT=mailto:louis.i.dengler@gmail.com")
    print()
    print("# --- Frontend (Vercel) env var ---")
    print("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + b64url(public_point))


if __name__ == "__main__":
    main()
