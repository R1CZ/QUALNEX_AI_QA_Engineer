"""
Firebase Authentication for Backend
Verifies Firebase ID tokens and manages user sessions
"""
import firebase_admin
from firebase_admin import auth, credentials
from typing import Optional, Dict, Any
from datetime import datetime
from app.config import settings

# Initialize Firebase Admin SDK
# In production, use service account JSON file
if not firebase_admin._apps:
    if settings.firebase_service_account_key:
        # Production: use service account
        cred = credentials.Certificate(settings.firebase_service_account_key)
        firebase_admin.initialize_app(cred)
    else:
        # Development: use default credentials
        try:
            firebase_admin.initialize_app()
        except Exception:
            # If no credentials available, skip Firebase init
            pass


async def verify_firebase_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verify a Firebase ID token and return user info.
    
    Args:
        id_token: Firebase ID token from client
        
    Returns:
        User info dict or None if invalid
    """
    try:
        if not firebase_admin._apps:
            # Firebase Admin was never initialized (no service account /
            # default credentials). Fail with a clear message instead of an
            # opaque error that surfaces as "Request failed" in the UI.
            raise RuntimeError(
                'Firebase Admin SDK is not initialized. Set FIREBASE_SERVICE_ACCOUNT_KEY '
                '(path to a service account JSON) in backend/.env.'
            )

        # Verify the token
        decoded_token = auth.verify_id_token(id_token)
        
        # Get user info
        user = auth.get_user(decoded_token['uid'])
        
        return {
            'uid': user.uid,
            'email': user.email,
            'display_name': user.display_name,
            'photo_url': user.photo_url,
            'provider': decoded_token.get('firebase', {}).get('sign_in_provider', 'unknown'),
            'email_verified': user.email_verified,
        }
    except Exception as e:
        print(f"Firebase token verification failed: {e}")
        return None


def _serialize(value: Any) -> Any:
    """JSON-safe value (SQLAlchemy/Python enums are not JSON serializable)."""
    if value is None:
        return None
    # str-based Enums must be converted to their plain string value,
    # otherwise FastAPI's jsonable_encoder raises "Object of type UserRole
    # is not JSON serializable" and login fails with a 500.
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, 'value') and not isinstance(value, (str, int, float, bool, dict, list)):
        return value.value
    return str(value) if not isinstance(value, (str, int, float, bool, dict, list)) else value


async def get_or_create_user(firebase_user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get existing user or create new one from Firebase user data.
    
    Args:
        firebase_user: User info from Firebase
        
    Returns:
        User dict with backend user data
    """
    from app.db.session import AsyncSessionLocal
    from app.models.models import User, UserRole
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as db:
        # Try to find existing user by Firebase UID
        result = await db.execute(
            select(User).where(User.firebase_uid == firebase_user['uid'])
        )
        user = result.scalar_one_or_none()
        
        if user:
            # Update last login
            user.last_login_at = datetime.utcnow()
            await db.commit()
            org_name = None
            if user.organization:
                org_name = user.organization.name
            return {
                'id': _serialize(user.id),
                'email': user.email,
                'name': user.name,
                'role': _serialize(user.role),
                'organizationId': _serialize(user.organization_id),
                'organizationName': org_name,
                'createdAt': user.created_at.isoformat() if user.created_at else None,
            }
        
        # Create new user. Reuse the first existing organization when one
        # is present so all users in this deployment share one tenant;
        # otherwise create a default organization.
        from app.models.organization import Organization
        from uuid import uuid4
        
        org_result = await db.execute(select(Organization).order_by(Organization.created_at).limit(1))
        org = org_result.scalar_one_or_none()
        created_new_org = False
        if org is None:
            org = Organization(
                id=uuid4(),
                name='My Organization',
                plan='free',
                created_at=datetime.utcnow()
            )
            db.add(org)
            created_new_org = True
        await db.flush()
        
        try:
            role = UserRole.MEMBER
        except ValueError:
            role = 'member'
        
        user = User(
            id=uuid4(),
            firebase_uid=firebase_user['uid'],
            email=firebase_user['email'],
            name=firebase_user['display_name'] or firebase_user['email'],
            avatar_url=firebase_user['photo_url'],
            role=role,
            organization_id=org.id,
            provider=firebase_user['provider'],
            created_at=datetime.utcnow(),
            last_login_at=datetime.utcnow()
        )
        db.add(user)
        await db.commit()
        
        return {
            'id': _serialize(user.id),
            'email': user.email,
            'name': user.name,
            'role': _serialize(role),
            'organizationId': _serialize(org.id),
            'organizationName': org.name,
            'plan': org.plan,
            'createdAt': user.created_at.isoformat() if user.created_at else None,
        }
