"""
Clerk JWT Authentication Middleware
=====================================
Provides a @require_auth decorator for Flask routes.

Strategy:
  1. Peek at the unverified JWT to extract the `iss` (issuer) claim.
  2. Derive the public JWKS URL:  {iss}/.well-known/jwks.json
     — This endpoint is PUBLIC, no secret key required.
  3. Fetch the JWKS and find the matching key by `kid`.
  4. Verify the JWT signature (RS256) and expiry fully.

This avoids the `403 Forbidden` that Clerk returns when you hit the
private `/v1/jwks` endpoint without the correct secret key.

Usage:
    from auth import require_auth

    @api.route("/complaints", methods=["POST"])
    @require_auth
    def create_complaint():
        ...
"""

import json
import functools
import requests
import jwt
from jwt.algorithms import RSAAlgorithm
from flask import request, jsonify

# ---------------------------------------------------------------------------
# Simple in-process JWKS cache  { jwks_url → list[key_data] }
# ---------------------------------------------------------------------------

_jwks_cache: dict = {}


def _get_public_key(token: str):
    """
    Extracts the public RSA key for the given JWT from Clerk's public JWKS.

    Steps:
      - Read kid from the unverified JWT header.
      - Read iss from the unverified JWT payload.
      - Fetch {iss}/.well-known/jwks.json  (no auth needed).
      - Return the RSA public key that matches the kid.
    """
    # --- 1. Unverified header → kid ---
    try:
        header = jwt.get_unverified_header(token)
    except jwt.DecodeError as exc:
        raise ValueError(f"Malformed JWT header: {exc}")

    kid = header.get("kid")
    if not kid:
        raise ValueError("JWT header is missing 'kid'.")

    # --- 2. Unverified payload → iss ---
    try:
        unverified = jwt.decode(
            token,
            options={"verify_signature": False, "verify_iat": False, "verify_nbf": False},
            algorithms=["RS256"],
            leeway=3600,
        )
    except jwt.DecodeError as exc:
        raise ValueError(f"Malformed JWT payload: {exc}")

    iss = unverified.get("iss", "").rstrip("/")
    if not iss:
        raise ValueError("JWT is missing 'iss' claim.")
    
    if not iss.startswith("http"):
        iss = f"https://{iss}"

    # --- 3. Fetch public JWKS (cached) ---
    jwks_url = f"{iss}/.well-known/jwks.json"
    # print(f"DEBUG: Fetching JWKS from {jwks_url}")

    if jwks_url not in _jwks_cache:
        try:
            resp = requests.get(jwks_url, timeout=10)
            resp.raise_for_status()
            _jwks_cache[jwks_url] = resp.json().get("keys", [])
        except Exception as exc:
            raise ValueError(f"Failed to fetch JWKS from {jwks_url}: {exc}")

    keys = _jwks_cache[jwks_url]

    # --- 4. Match by kid ---
    for key_data in keys:
        if key_data.get("kid") == kid:
            return RSAAlgorithm.from_jwk(json.dumps(key_data))

    # kid not found — keys may have rotated; bust cache and retry once
    resp = requests.get(jwks_url, timeout=10)
    resp.raise_for_status()
    keys = resp.json().get("keys", [])
    _jwks_cache[jwks_url] = keys

    for key_data in keys:
        if key_data.get("kid") == kid:
            return RSAAlgorithm.from_jwk(json.dumps(key_data))

    raise ValueError(f"No public key found for kid='{kid}' at {jwks_url}.")


# ---------------------------------------------------------------------------
# Decorator
# ---------------------------------------------------------------------------

def require_auth(fn):
    """Flask route decorator that enforces Clerk JWT authentication."""

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        if request.method == "OPTIONS":
            return fn(*args, **kwargs)

        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            print("DEBUG: Missing or malformed Authorization header.")
            return jsonify({
                "error": "Missing or malformed Authorization header. "
                         "Expected: 'Authorization: Bearer <token>'"
            }), 401

        token = auth_header[len("Bearer "):]

        try:
            public_key = _get_public_key(token)

            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                leeway=3600,
                options={
                    "require": ["exp", "sub"],
                    "verify_iat": False,
                    "verify_nbf": False,
                },
            )

            request.clerk_user_id = payload.get("sub")

        except jwt.ExpiredSignatureError:
            print("DEBUG: Token expired.")
            return jsonify({"error": "Token has expired. Please sign in again."}), 401
        except jwt.InvalidTokenError as exc:
            print(f"DEBUG: Invalid token: {exc}")
            return jsonify({"error": f"Invalid token: {exc}"}), 401
        except requests.RequestException as exc:
            print(f"DEBUG: Clerk JWKS unreachable: {exc}")
            return jsonify({"error": f"Could not reach Clerk JWKS endpoint: {exc}"}), 503
        except ValueError as exc:
            print(f"DEBUG: Auth Value Error: {exc}")
            return jsonify({"error": str(exc)}), 401
        except Exception as exc:
            print(f"DEBUG: Unexpected Auth Error: {exc}")
            return jsonify({"error": "Internal server error during authentication"}), 500

        return fn(*args, **kwargs)

    return wrapper
