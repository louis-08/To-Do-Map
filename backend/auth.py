import os
import httpx
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

security = HTTPBearer()

_jwks_cache: dict | None = None


def issuer() -> str:
    """Clerk issuer == the JWKS URL without the well-known suffix."""
    return os.environ["CLERK_JWKS_URL"].replace("/.well-known/jwks.json", "")


async def get_jwks(force: bool = False) -> dict:
    global _jwks_cache
    if _jwks_cache is not None and not force:
        return _jwks_cache
    url = os.environ["CLERK_JWKS_URL"]
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache


async def find_signing_key(kid: str | None) -> dict | None:
    """Return the JWK matching `kid`, refreshing the cache once on a miss so
    Clerk key rotation doesn't require a server restart."""
    if not kid:
        return None
    jwks = await get_jwks()
    key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    if key is None:
        jwks = await get_jwks(force=True)
        key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    return key


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        key = await find_signing_key(header.get("kid"))
        if key is None:
            raise HTTPException(status_code=401, detail="Unknown signing key")
        payload = jwt.decode(
            token, key, algorithms=["RS256"], issuer=issuer()
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Missing sub claim")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
