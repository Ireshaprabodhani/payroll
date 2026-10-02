from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import Users
from app.auth.service import hash_password


def find_all(db: Session):
    return (
        db.query(Users.Username, Users.Role, Users.Department)
        .order_by(Users.Username)
        .all()
    )


def create(db: Session, username: str, password: str, role: str, department: str | None):
    existing = db.query(Users).filter(Users.Username == username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    user = Users(
        Username=username,
        Password=hash_password(password),
        Role=role,
        Department=department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"Username": user.Username, "Role": user.Role, "Department": user.Department}


def remove(db: Session, username: str):
    user = db.query(Users).filter(Users.Username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{username}' not found")
    db.delete(user)
    db.commit()
