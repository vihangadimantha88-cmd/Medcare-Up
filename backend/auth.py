from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import models
from database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
SECRET_KEY = "your-super-secret-key-here" # ඔයාගේ පරණ කේතයේ ඇති කී එක
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 🚨 FIX: පැය 24ක කාලයක් Token එකට ලබා දීම

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
    
    # 1. Database එකෙන් Session එක Active ද කියලා Check කිරීම (Zero-Trust Rule)
    session_record = db.query(models.UserSession).filter(
        models.UserSession.session_token == token,
        models.UserSession.is_active == True
    ).first()
    
    if not session_record:
        raise credentials_exception # Session එක මකලා නම් අනිවාර්යයෙන්ම එළියට විසි කරනවා!

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="මෙම ක්‍රියාව කිරීමට අවසර ඇත්තේ Admin ට පමණි!"
        )
    return current_user