import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any
from app.core.config import settings

security = HTTPBearer()

jwks_url = f"{settings.CLERK_FRONTEND_API}/.well-known/jwks.json"
jwks_client = PyJWKClient(jwks_url)


async def get_current_user(
    auth: HTTPAuthorizationCredentials = Security(security),
) -> Dict[str, Any]:
    token = auth.credentials

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
            leeway=60,
        )

        return {
            "user_id": payload.get("sub"),
            "metadata": payload.get("metadata"),
            "org_id": payload.get("org_id"),
            "role": payload.get("org_metadata", {}).get("designation", "Associate"),
            "email": payload.get("email"),
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")


def is_admin(user: dict):
    metadata = user.get("metadata", {})
    if metadata.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return True
