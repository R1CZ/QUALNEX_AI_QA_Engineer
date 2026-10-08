"""
Security Module - OAuth, JWT, Session Management
"""
import jwt
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.jwt_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except jwt.PyJWTError:
        return None

# ============ Google OAuth ============

async def google_exchange_code(code: str) -> Optional[Dict[str, Any]]:
    """Exchange Google OAuth authorization code for tokens"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            }
        )
        if response.status_code != 200:
            return None
        tokens = response.json()
        
        # Get user info
        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        if userinfo_response.status_code != 200:
            return None
        
        user_info = userinfo_response.json()
        return {
            "provider": "google",
            "provider_id": user_info["id"],
            "email": user_info["email"],
            "name": user_info.get("name", ""),
            "avatar": user_info.get("picture", ""),
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token"),
        }

def get_google_auth_url(state: str) -> str:
    """Generate Google OAuth authorization URL"""
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

# ============ GitHub OAuth ============

async def github_exchange_code(code: str) -> Optional[Dict[str, Any]]:
    """Exchange GitHub OAuth authorization code for tokens"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_redirect_uri,
            },
            headers={"Accept": "application/json"}
        )
        if response.status_code != 200:
            return None
        tokens = response.json()
        access_token = tokens.get("access_token")
        if not access_token:
            return None
        
        # Get user info
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        if user_response.status_code != 200:
            return None
        
        user_data = user_response.json()
        
        # Get email if not public
        email = user_data.get("email")
        if not email:
            emails_response = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json"
                }
            )
            if emails_response.status_code == 200:
                emails = emails_response.json()
                primary = next((e for e in emails if e.get("primary")), None)
                if primary:
                    email = primary["email"]
        
        return {
            "provider": "github",
            "provider_id": str(user_data["id"]),
            "email": email,
            "name": user_data.get("name") or user_data.get("login", ""),
            "avatar": user_data.get("avatar_url", ""),
            "access_token": access_token,
            "refresh_token": tokens.get("refresh_token"),
            "username": user_data.get("login"),
        }

def get_github_auth_url(state: str) -> str:
    """Generate GitHub OAuth authorization URL"""
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": settings.github_redirect_uri,
        "scope": "read:user user:email",
        "state": state,
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"https://github.com/login/oauth/authorize?{query}"

# ============ GitHub App ============

async def github_app_installation_token(installation_id: str) -> Optional[str]:
    """Get installation access token for GitHub App"""
    import time
    import json
    
    # Create JWT for GitHub App
    now = int(time.time())
    payload = {
        "iat": now - 60,
        "exp": now + (10 * 60),
        "iss": settings.github_app_id,
    }
    
    # In production, use proper JWT with RS256 and the app's private key
    # This is simplified for the reference implementation
    app_jwt = jwt.encode(
        payload,
        settings.github_app_private_key,
        algorithm="RS256"
    )
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.github.com/app/installations/{installation_id}/access_tokens",
            headers={
                "Authorization": f"Bearer {app_jwt}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        if response.status_code == 201:
            return response.json().get("token")
    return None

# ============ Security Utilities ============

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def generate_csrf_token() -> str:
    """Generate CSRF token"""
    import secrets
    return secrets.token_urlsafe(32)

def validate_csrf_token(token: str, expected: str) -> bool:
    """Validate CSRF token"""
    import hmac
    return hmac.compare_digest(token, expected)
