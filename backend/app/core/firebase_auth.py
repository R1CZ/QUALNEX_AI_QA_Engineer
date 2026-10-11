
"""
Firebase Authentication for Backend
Verifies Firebase ID tokens and manages user sessions.
"""

import firebase_admin
from firebase_admin import auth, credentials
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings


# ============================================================
# Firebase Admin SDK Initialization
# ============================================================

if not firebase_admin._apps:
    if settings.firebase_service_account_key:
        # Use the configured service-account JSON file or credential data.
        cred = credentials.Certificate(
            settings.firebase_service_account_key
        )
        firebase_admin.initialize_app(cred)
    else:
        # Development: attempt to use Application Default Credentials.
        try:
            firebase_admin.initialize_app()
        except Exception:
            # Token verification will report the missing initialization.
            pass


# ============================================================
# Firebase Token Verification
# ============================================================

async def verify_firebase_token(
    id_token: str,
) -> Optional[Dict[str, Any]]:
    """
    Verify a Firebase ID token and return the corresponding user data.

    Args:
        id_token: Firebase ID token received from the frontend.

    Returns:
        A dictionary containing verified Firebase user information,
        or None if verification fails.
    """
    try:
        if not firebase_admin._apps:
            raise RuntimeError(
                "Firebase Admin SDK is not initialized. Configure "
                "FIREBASE_SERVICE_ACCOUNT_KEY in backend/.env."
            )

        decoded_token = auth.verify_id_token(id_token)
        user = auth.get_user(decoded_token["uid"])

        return {
            "uid": user.uid,
            "email": user.email,
            "display_name": user.display_name,
            "photo_url": user.photo_url,
            "provider": decoded_token.get("firebase", {}).get(
                "sign_in_provider", "unknown"
            ),
            "email_verified": user.email_verified,
        }

    except Exception as exc:
        print(f"Firebase token verification failed: {exc}")
        return None


# ============================================================
# Serialization Helpers
# ============================================================

def _serialize(value: Any) -> Any:
    """Convert database values into JSON-safe values."""

    if value is None:
        return None

    if isinstance(value, datetime):
        return value.isoformat()

    # Check Enum before str because UserRole inherits from str.
    if isinstance(value, PyEnum):
        return value.value

    if isinstance(value, (str, int, float, bool, dict, list)):
        return value

    # Handles values such as SQLAlchemy UUID objects.
    return str(value)


# ============================================================
# Get or Create Application User
# ============================================================

async def get_or_create_user(
    firebase_user: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Retrieve an existing application user or create one from
    verified Firebase user information.

    Existing users retain their current organization and role.

    For new users, reuse the earliest existing organization when
    one exists. Otherwise, create a default organization.
    """

    from app.db.session import AsyncSessionLocal
    from app.models.models import User
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as db:
        # Try to find existing user by Firebase UID
        result = await db.execute(
            select(User).where(User.firebase_uid == firebase_user['uid'])
        )

    async with AsyncSessionLocal() as db:

        # ----------------------------------------------------
        # Find an existing user by Firebase UID.
        # Eager-load organization to avoid async lazy-loading errors.
        # ----------------------------------------------------

        result = await db.execute(
            select(User)
            .options(selectinload(User.organization))
            .where(User.firebase_uid == firebase_uid)
        )

        user = result.scalar_one_or_none()

        if user:
            user.last_login_at = datetime.utcnow()

            await db.commit()

            organization = user.organization

            return {
                "id": _serialize(user.id),
                "email": user.email,
                "name": user.name,
                "role": _serialize(user.role),
                "organizationId": _serialize(user.organization_id),
                "organizationName": (
                    organization.name if organization else None
                ),
                "plan": organization.plan if organization else None,
                "createdAt": (
                    user.created_at.isoformat()
                    if user.created_at
                    else None
                ),
            }
        
        # Create new user. Reuse the first existing organization when one
        # is present so all users in this deployment share one tenant;
        # otherwise create a default organization.
        # NOTE: Organization lives in app.models.models (there is no
        # app/models/organization.py module — that import variant caused
        # ModuleNotFoundError at login).
        from app.models.models import Organization
        from uuid import uuid4
        
        org_result = await db.execute(select(Organization).order_by(Organization.created_at).limit(1))
        org = org_result.scalar_one_or_none()
        created_new_org = False
        if org is None:
            org = Organization(
                id=uuid4(),
                name="My Organization",
                plan="free",
                created_at=datetime.utcnow(),
            )
            db.add(org)
            created_new_org = True
        await db.flush()
        
        user = User(
            id=uuid4(),
            firebase_uid=firebase_uid,
            email=email,
            name=(
                firebase_user.get("display_name")
                or email
            ),
            avatar_url=firebase_user.get("photo_url"),
            organization_id=organization.id,
            role=role,
            provider=firebase_user.get("provider", "unknown"),
            created_at=datetime.utcnow(),
            last_login_at=datetime.utcnow(),
        )

        db.add(user)
        await db.commit()

        # Ensure generated and persisted values are available.
        await db.refresh(user)

        return {
            "id": _serialize(user.id),
            "email": user.email,
            "name": user.name,
            "role": _serialize(user.role),
            "organizationId": _serialize(user.organization_id),
            "organizationName": organization.name,
            "plan": organization.plan,
            "createdAt": (
                user.created_at.isoformat()
                if user.created_at
                else None
            ),
        }
