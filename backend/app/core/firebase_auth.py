"""
Firebase Authentication for Backend
Verifies Firebase ID tokens and manages user sessions
"""
import firebase_admin
from firebase_admin import auth, credentials
from typing import Optional, Dict, Any
from app.config import settings

# Initialize Firebase Admin SDK
# In production, use service account JSON file
if not firebase_admin._apps:
    if settings.FIREBASE_SERVICE_ACCOUNT_KEY:
        # Production: use service account
        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_KEY)
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


async def get_or_create_user(firebase_user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get existing user or create new one from Firebase user data.
    
    Args:
        firebase_user: User info from Firebase
        
    Returns:
        User dict with backend user data
    """
    from app.db.session import AsyncSessionLocal
    from app.models.user import User
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
            return {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'role': user.role,
                'organizationId': user.organization_id,
                'createdAt': user.created_at.isoformat(),
            }
        
        # Create new user
        # For now, create a default organization
        from app.models.organization import Organization
        from uuid import uuid4
        from datetime import datetime
        
        org = Organization(
            id=uuid4(),
            name='My Organization',
            plan='free',
            created_at=datetime.utcnow()
        )
        db.add(org)
        await db.flush()
        
        user = User(
            id=uuid4(),
            firebase_uid=firebase_user['uid'],
            email=firebase_user['email'],
            name=firebase_user['display_name'] or firebase_user['email'],
            avatar_url=firebase_user['photo_url'],
            role='owner',  # First user is owner
            organization_id=org.id,
            provider=firebase_user['provider'],
            created_at=datetime.utcnow(),
            last_login_at=datetime.utcnow()
        )
        db.add(user)
        await db.commit()
        
        return {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role,
            'organizationId': user.organization_id,
            'organizationName': org.name,
            'plan': org.plan,
            'createdAt': user.created_at.isoformat(),
        }
