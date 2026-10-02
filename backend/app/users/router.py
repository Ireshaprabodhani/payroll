from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import UserOut, CreateUserRequest
from app.auth.dependencies import require_roles
from app.users import service

router = APIRouter(prefix="/users", tags=["users"])

admin_only = require_roles("Admin")


@router.get("", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db), _=Depends(admin_only)):
    rows = service.find_all(db)
    return [{"Username": r.Username, "Role": r.Role, "Department": r.Department} for r in rows]


@router.post("", response_model=UserOut, status_code=201)
def create_user(body: CreateUserRequest, db: Session = Depends(get_db), _=Depends(admin_only)):
    return service.create(db, body.username, body.password, body.role, body.department)


@router.delete("/{username}", status_code=204)
def delete_user(username: str, db: Session = Depends(get_db), _=Depends(admin_only)):
    service.remove(db, username)
