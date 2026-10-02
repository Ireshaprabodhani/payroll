import os
import bcrypt
from datetime import datetime, timezone, timedelta
from jose import jwt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import Users

JWT_SECRET = os.getenv("JWT_SECRET", "payroll-jwt-secret-change-in-production")
JWT_EXPIRY = int(os.getenv("JWT_EXPIRY", 28800))  # seconds


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(username: str, role: str, department: str | None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(seconds=JWT_EXPIRY)
    payload = {
        "sub": username,
        "role": role,
        "department": department,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def login(db: Session, username: str, password: str):
    user = db.query(Users).filter(Users.Username == username).first()
    if not user or not verify_password(password, user.Password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_access_token(user.Username, user.Role, user.Department)
    return {"access_token": token, "role": user.Role, "department": user.Department}
