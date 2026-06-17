"""Clerk token verification for the MCP resource server.

The MCP server is an OAuth 2.1 Resource Server: it does not log users in, it
only validates the bearer token the client presents. Clerk is the Authorization
Server that issues those tokens. We reuse the exact same JWKS verification the
REST API uses (see backend/auth.py) so both surfaces trust tokens identically.
"""

from jose import jwt, JWTError

from mcp.server.auth.provider import AccessToken, TokenVerifier

from auth import find_signing_key, issuer  # backend/auth.py — shared JWKS


class ClerkTokenVerifier(TokenVerifier):
    async def verify_token(self, token: str) -> AccessToken | None:
        try:
            header = jwt.get_unverified_header(token)
            key = await find_signing_key(header.get("kid"))
            if key is None:
                return None
            # Issuer is pinned to our Clerk instance, blocking tokens from any
            # other issuer. Audience is left unpinned because Clerk OAuth
            # tokens' `aud` value isn't yet confirmed against this resource.
            payload = jwt.decode(
                token, key, algorithms=["RS256"], issuer=issuer(),
                options={"verify_aud": False},
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
