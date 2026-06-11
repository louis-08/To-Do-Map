"""Clerk token verification for the MCP resource server.

The MCP server is an OAuth 2.1 Resource Server: it does not log users in, it
only validates the bearer token the client presents. Clerk is the Authorization
Server that issues those tokens. We reuse the exact same JWKS verification the
REST API uses (see backend/auth.py) so both surfaces trust tokens identically.
"""

from jose import jwt, JWTError

from mcp.server.auth.provider import AccessToken, TokenVerifier

from auth import get_jwks  # backend/auth.py — shared JWKS cache


class ClerkTokenVerifier(TokenVerifier):
    async def verify_token(self, token: str) -> AccessToken | None:
        try:
            jwks = await get_jwks()
            header = jwt.get_unverified_header(token)
            key = next(
                (k for k in jwks["keys"] if k["kid"] == header["kid"]), None
            )
            if key is None:
                return None
            # verify_aud is off because Clerk OAuth tokens carry an `aud` we
            # don't pin yet; we tighten this in Step 3 once we see a real token.
            payload = jwt.decode(
                token, key, algorithms=["RS256"], options={"verify_aud": False}
            )
        except (JWTError, KeyError):
            return None

        subject = payload.get("sub")
        if not subject:
            return None

        scope_claim = payload.get("scope", "")
        scopes = scope_claim.split() if isinstance(scope_claim, str) else []

        return AccessToken(
            token=token,
            client_id=payload.get("azp") or subject,
            subject=subject,
            scopes=scopes,
            expires_at=payload.get("exp"),
            claims=payload,
        )
