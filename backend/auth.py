from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import models
from database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
SECRET_KEY = "your-super-secret-key-here" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or Session Expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    session_record = db.query(models.UserSession).filter(
        models.UserSession.session_token == token,
        models.UserSession.is_active == True
    ).first()
    
    if not session_record:
        raise credentials_exception 

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        
        # ටෝකන් එකේ වර්ගය මොකක්ද කියලා ගන්නවා
        token_type: str = payload.get("type") 
        
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception

    # 🔴 100% නිවැරදි MFA BYPASS DETECTION ලොජික් එක 🔴
    # දැන් මේක බ්ලොක් කරන්නේ කවුරුහරි අර "mfa_pending" කියන හොර ටෝකන් එකෙන් ආවොත් විතරයි!
    if token_type == "mfa_pending":
        try:
            bypass_log = models.SecurityLog( 
                event_type="MFA_BYPASS_BLOCKED",
                user_id=user.id,
                description=f"Unauthorized MFA bypass attempt by {username} using temp token",
                timestamp=datetime.utcnow()
            )
            db.add(bypass_log)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Failed to log MFA Bypass: {e}")

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA Bypass Detected! Access Denied."
        )

    return user
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or Session Expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    session_record = db.query(models.UserSession).filter(
        models.UserSession.session_token == token,
        models.UserSession.is_active == True
    ).first()
    
    if not session_record:
        raise credentials_exception 

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        
        # 1. ටෝකන් එකේ MFA status එක තියෙනවද බලනවා
        # (ඔයා Login වෙද්දී දෙන ටෝකන් එකේ 'mfa_verified': False කියලා යවන්න ඕනේ)
        mfa_verified: bool = payload.get("mfa_verified", False) 
        
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception

    # 🔴 2. MFA BYPASS DETECTION LOGIC 🔴
    # යූසර් ලොග් වෙලා ඉන්නේ MFA නැතුව නම්, ඒක Bypass Attempt එකක්!
    if not mfa_verified:
        try:
            # අර Dashboard එකේ පෙන්නන්න ඕන කරන Security Log එක මෙතන සේව් කරනවා
            # (models.SecurityLog කියන එක ඔයාගේ Database Table එකේ නමට වෙනස් කරගන්න)
            bypass_log = models.SecurityLog( 
                event_type="MFA_BYPASS_BLOCKED",
                user_id=user.id,
                description=f"Unauthorized bypass attempt by {username}",
                timestamp=datetime.utcnow()
            )
            db.add(bypass_log)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Failed to log MFA Bypass: {e}")

        # 3. ඩේටාබේස් එකට ලොග් කළාට පස්සේ, රික්වෙස්ට් එක බ්ලොක් කරනවා
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA verification is strictly required!"
        )

    return user

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only Admin is allowed to perform this action!"
        )
    return current_user