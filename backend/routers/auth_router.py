from fastapi import APIRouter, HTTPException
from core import hash_password, verify_password, create_token
from repositories import create_user, get_user_by_email
from schemas import RegisterRequest, LoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(req: RegisterRequest):
    """Register a new user and return a JWT token."""
    try:
        existing = await get_user_by_email(req.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        password_hash = hash_password(req.password)
        user_id = await create_user(req.email, password_hash, req.display_name)
        token = create_token(user_id)

        return {
            "token": token,
            "user_id": user_id,
            "display_name": req.display_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login")
async def login(req: LoginRequest):
    """Login with email and password, return a JWT token."""
    try:
        user = await get_user_by_email(req.email)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_token(str(user["id"]))

        return {
            "token": token,
            "user_id": str(user["id"]),
            "display_name": user.get("display_name"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))