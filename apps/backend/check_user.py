import asyncio
from app.db.session import SessionLocal
from app.models.all_models import User
from sqlalchemy.future import select
from app.core.security import verify_password

async def check():
    async with SessionLocal() as db:
        res = await db.execute(select(User).where(User.email == "haritmandaliya@gmail.com"))
        user = res.scalar_one_or_none()
        if user:
            print("FOUND USER:")
            print("  username:", user.username)
            print("  email:", user.email)
            print("  role:", user.role)
            print("  hashed_password:", user.hashed_password)
            match = verify_password("xufg mfgf vbug hsmz", user.hashed_password)
            print("  Password matches 'xufg mfgf vbug hsmz'?", match)
        else:
            print("USER NOT FOUND")

if __name__ == "__main__":
    asyncio.run(check())
