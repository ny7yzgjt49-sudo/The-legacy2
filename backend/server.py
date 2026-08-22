import os
import uuid
import secrets
import logging
import subprocess
import asyncio
import requests as _requests
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import cloudinary
import cloudinary.uploader
import cloudinary.utils

import jwt
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Config / DB
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 10080))

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
THUMBNAIL_DIR = ROOT_DIR / "uploads" / "thumbnails"
THUMBNAIL_DIR.mkdir(exist_ok=True)
MAX_VIDEO_SIZE = 80 * 1024 * 1024  # 80 MB

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

_raw_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:8081,http://localhost:19006,http://localhost:3000",
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app = FastAPI(title="The Legacy Lab API")
api_router = APIRouter(prefix="/api")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("legacylab")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def strip_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Static: heritage pillars (categories)
# ---------------------------------------------------------------------------
PILLARS = [
    {
        "id": "saper-fare",
        "name": "Il Saper Fare",
        "tagline": "Artigianato & manifattura",
        "description": "Maestri artigiani, botteghe storiche e manifatture che custodiscono il saper fare italiano.",
        "image": "https://images.unsplash.com/photo-1611523794717-4d1f87dabf3b?crop=entropy&cs=srgb&fm=jpg&q=80&w=1200",
    },
    {
        "id": "gusto",
        "name": "Il Gusto",
        "tagline": "Food & wine",
        "description": "Eccellenze enogastronomiche, cantine e produttori che raccontano il territorio nel piatto.",
        "image": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?crop=entropy&cs=srgb&fm=jpg&q=80&w=1200",
    },
    {
        "id": "creativita",
        "name": "La Creatività",
        "tagline": "Moda, design & arte",
        "description": "Moda, design e arte che trasformano l'ingegno italiano in bellezza riconosciuta nel mondo.",
        "image": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?crop=entropy&cs=srgb&fm=jpg&q=80&w=1200",
    },
    {
        "id": "commercio",
        "name": "Il Commercio",
        "tagline": "Retail & export",
        "description": "Imprese che portano il Made in Italy sui mercati, dal retail all'export internazionale.",
        "image": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?crop=entropy&cs=srgb&fm=jpg&q=80&w=1200",
    },
    {
        "id": "identita",
        "name": "L'Identità",
        "tagline": "Brand & heritage",
        "description": "Marchi e famiglie imprenditoriali che incarnano l'eredità e i valori italiani.",
        "image": "https://images.unsplash.com/photo-1524398039352-5905418087d4?crop=entropy&cs=srgb&fm=jpg&q=80&w=1200",
    },
]
PILLAR_IDS = {p["id"] for p in PILLARS}
PILLAR_MAP = {p["id"]: p for p in PILLARS}


TOUR_SEED = [
    {"city": "Milano", "region": "Lombardia", "venue": "Aziende selezionate · Lombardia", "date": "2026-09-15",
     "title": "Tappa d'Apertura", "description": "Prima tappa del viaggio: raggiungiamo le imprese selezionate, riprese sul campo e interviste ai fondatori per il format TV.", "seats": 0},
    {"city": "Torino", "region": "Piemonte", "venue": "Aziende selezionate · Piemonte", "date": "2026-09-29",
     "title": "Saper Fare & Manifattura", "description": "Visitiamo botteghe e manifatture storiche: raccontiamo il saper fare e il passaggio generazionale con riprese e interviste.", "seats": 0},
    {"city": "Firenze", "region": "Toscana", "venue": "Aziende selezionate · Toscana", "date": "2026-10-13",
     "title": "Creatività & Heritage", "description": "Tra moda, artigianato e brand storici toscani: contenuti originali per il format e interviste ai protagonisti.", "seats": 0},
    {"city": "Bologna", "region": "Emilia-Romagna", "venue": "Aziende selezionate · Emilia-Romagna", "date": "2026-10-27",
     "title": "Gusto & Motor Valley", "description": "Food, wine e meccanica di precisione: entriamo nelle aziende per riprese e interviste esclusive.", "seats": 0},
    {"city": "Venezia", "region": "Veneto", "venue": "Aziende selezionate · Veneto", "date": "2026-11-10",
     "title": "Artigianato & Identità", "description": "Vetro, tessile e mestieri d'arte lagunari raccontati sul campo con riprese e interviste ai maestri.", "seats": 0},
    {"city": "Roma", "region": "Lazio", "venue": "Aziende selezionate · Lazio", "date": "2026-11-24",
     "title": "Impresa & Istituzioni", "description": "Storie d'impresa ed export nella Capitale: contenuti per il format TV e dialogo con le istituzioni.", "seats": 0},
    {"city": "Napoli", "region": "Campania", "venue": "Aziende selezionate · Campania", "date": "2026-12-09",
     "title": "Gusto & Tradizione", "description": "Le eccellenze del Sud tra cibo e artigianato: riprese nelle aziende e interviste ai fondatori.", "seats": 0},
    {"city": "Palermo", "region": "Sicilia", "venue": "Aziende selezionate · Sicilia", "date": "2026-12-15",
     "title": "Gran Finale del Viaggio", "description": "Ultima tappa: le storie migliori del tour raccontate con riprese finali e interviste per il format.", "seats": 0},
]


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ApplicationInput(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=120)
    description: str = Field(..., min_length=10, max_length=2000)
    category: str
    video_id: str
    location: Optional[str] = Field(None, max_length=100)


class VerifyEmailInput(BaseModel):
    token: str


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    token: str
    password: str


class PushTokenInput(BaseModel):
    token: str


class BroadcastInput(BaseModel):
    title: str
    body: str
    screen: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="Non autenticato")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token non valido")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return strip_id(user)


async def get_optional_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    if creds is None:
        return None
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload.get("sub")})
        return strip_id(user) if user else None
    except jwt.PyJWTError:
        return None


FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:8081")


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "email_verified": user.get("email_verified", False),
    }


async def send_email(to: str, subject: str, html: str) -> None:
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("RESEND_FROM", "onboarding@resend.dev")
    if not api_key:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return
    try:
        await asyncio.to_thread(
            lambda: _requests.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"from": sender, "to": [to], "subject": subject, "html": html},
                timeout=10,
            )
        )
    except Exception as e:
        logger.warning(f"Email send failed: {e}")


async def create_email_token(user_id: str, kind: str, hours: int = 24) -> str:
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=hours)
    await db.email_tokens.insert_one({
        "token": token,
        "user_id": user_id,
        "kind": kind,
        "expires_at": expires.isoformat(),
        "expires_at_dt": expires,
        "used": False,
    })
    return token


async def consume_token(token: str, kind: str) -> Optional[dict]:
    doc = await db.email_tokens.find_one({"token": token, "kind": kind, "used": False})
    if not doc:
        return None
    if doc["expires_at"] < datetime.now(timezone.utc).isoformat():
        return None
    await db.email_tokens.update_one({"token": token}, {"$set": {"used": True}})
    return doc


def generate_thumbnail(video_path: Path, video_id: str) -> bool:
    thumb_path = THUMBNAIL_DIR / f"{video_id}.jpg"
    for seek in ("1", "0"):
        try:
            result = subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", str(video_path),
                    "-ss", seek,
                    "-vframes", "1",
                    "-vf", "scale=720:-2",
                    "-q:v", "3",
                    str(thumb_path),
                ],
                capture_output=True,
                timeout=30,
            )
            if thumb_path.exists() and thumb_path.stat().st_size > 0:
                return True
        except Exception as e:
            logger.warning(f"Thumbnail generation failed (seek={seek}): {e}")
    return False


async def serialize_application(doc: dict, viewer: Optional[dict], video_doc: Optional[dict] = None) -> dict:
    if video_doc is None:
        video_doc = await db.videos.find_one({"id": doc["video_id"]})
    pillar = PILLAR_MAP.get(doc["category"], {})
    voters = doc.get("voters", [])
    video_id = doc["video_id"]
    has_thumbnail = bool(
        (video_doc and video_doc.get("cloudinary_public_id"))
        or (THUMBNAIL_DIR / f"{video_id}.jpg").exists()
    )
    return {
        "id": doc["id"],
        "business_name": doc["business_name"],
        "description": doc["description"],
        "category": doc["category"],
        "category_name": pillar.get("name", doc["category"]),
        "poster": pillar.get("image"),
        "video_id": video_id,
        "has_thumbnail": has_thumbnail,
        "location": doc.get("location"),
        "author_name": doc.get("author_name", "Anonimo"),
        "votes": len(voters),
        "voted": bool(viewer and viewer["id"] in voters),
        "created_at": doc.get("created_at"),
    }


async def serialize_many(docs: list, viewer: Optional[dict]) -> list:
    if not docs:
        return []
    video_ids = list({d["video_id"] for d in docs})
    video_docs = await db.videos.find({"id": {"$in": video_ids}}).to_list(len(video_ids))
    videos_map = {v["id"]: v for v in video_docs}
    return await asyncio.gather(*[
        serialize_application(d, viewer, videos_map.get(d["video_id"]))
        for d in docs
    ])


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.post("/auth/register")
@limiter.limit("5/hour")
async def register(request: Request, data: RegisterInput):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    user = {
        "id": str(uuid.uuid4()),
        "name": data.name.strip(),
        "email": data.email.lower(),
        "hashed_password": pwd_context.hash(data.password),
        "email_verified": False,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    verify_token = await create_email_token(user["id"], "verify", hours=24)
    verify_link = f"{FRONTEND_URL}/verify-email?token={verify_token}"
    await send_email(
        to=user["email"],
        subject="Verifica la tua email — The Legacy Lab",
        html=f"""
        <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0F1A2A;color:#fff;padding:32px;border-radius:12px">
          <h2 style="color:#F57C00;margin-top:0">The Legacy Lab</h2>
          <p>Ciao {user['name']},</p>
          <p>Clicca il bottone qui sotto per verificare la tua email.</p>
          <a href="{verify_link}" style="display:inline-block;background:#F57C00;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;margin:16px 0">
            Verifica email
          </a>
          <p style="color:#94a3b8;font-size:13px">Il link scade tra 24 ore. Se non hai creato un account, ignora questa email.</p>
        </div>
        """,
    )
    token = create_access_token(user["id"])
    return {"access_token": token, "user": public_user(user)}


@api_router.post("/auth/login")
@limiter.limit("10/hour")
async def login(request: Request, data: LoginInput):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not pwd_context.verify(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Email o password errati")
    token = create_access_token(user["id"])
    return {"access_token": token, "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api_router.post("/auth/verify-email")
@limiter.limit("10/hour")
async def verify_email(request: Request, data: VerifyEmailInput):
    doc = await consume_token(data.token, "verify")
    if not doc:
        raise HTTPException(status_code=400, detail="Link non valido o scaduto")
    await db.users.update_one({"id": doc["user_id"]}, {"$set": {"email_verified": True}})
    return {"message": "Email verificata con successo"}


@api_router.post("/auth/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(request: Request, data: ForgotPasswordInput):
    user = await db.users.find_one({"email": data.email.lower()})
    if user:
        reset_token = await create_email_token(user["id"], "reset", hours=1)
        reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        await send_email(
            to=user["email"],
            subject="Reset password — The Legacy Lab",
            html=f"""
            <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0F1A2A;color:#fff;padding:32px;border-radius:12px">
              <h2 style="color:#F57C00;margin-top:0">The Legacy Lab</h2>
              <p>Ciao {user['name']},</p>
              <p>Hai richiesto il reset della password. Clicca il bottone qui sotto.</p>
              <a href="{reset_link}" style="display:inline-block;background:#F57C00;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;margin:16px 0">
                Reimposta password
              </a>
              <p style="color:#94a3b8;font-size:13px">Il link scade tra 1 ora. Se non hai richiesto il reset, ignora questa email.</p>
            </div>
            """,
        )
    return {"message": "Se l'email è registrata, riceverai un link a breve"}


@api_router.post("/auth/resend-verify")
@limiter.limit("3/hour")
async def resend_verify(request: Request, user: dict = Depends(get_current_user)):
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email già verificata")
    verify_token = await create_email_token(user["id"], "verify", hours=24)
    verify_link = f"{FRONTEND_URL}/verify-email?token={verify_token}"
    await send_email(
        to=user["email"],
        subject="Verifica la tua email — The Legacy Lab",
        html=f"""
        <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0F1A2A;color:#fff;padding:32px;border-radius:12px">
          <h2 style="color:#F57C00;margin-top:0">The Legacy Lab</h2>
          <p>Ciao {user['name']},</p>
          <p>Clicca il bottone qui sotto per verificare la tua email.</p>
          <a href="{verify_link}" style="display:inline-block;background:#F57C00;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;margin:16px 0">
            Verifica email
          </a>
          <p style="color:#94a3b8;font-size:13px">Il link scade tra 24 ore.</p>
        </div>
        """,
    )
    return {"message": "Email di verifica inviata"}


@api_router.post("/auth/reset-password")
@limiter.limit("5/hour")
async def reset_password(request: Request, data: ResetPasswordInput):
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="La password deve avere almeno 8 caratteri")
    doc = await consume_token(data.token, "reset")
    if not doc:
        raise HTTPException(status_code=400, detail="Link non valido o scaduto")
    hashed = pwd_context.hash(data.password)
    await db.users.update_one({"id": doc["user_id"]}, {"$set": {"hashed_password": hashed}})
    return {"message": "Password aggiornata con successo"}


# ---------------------------------------------------------------------------
# Push notifications
# ---------------------------------------------------------------------------
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
VOTE_MILESTONES = {10, 50, 100, 250, 500, 1000}


async def send_push_notifications(tokens: list[str], title: str, body: str, data: Optional[dict] = None) -> None:
    if not tokens:
        return
    messages = [
        {"to": t, "title": title, "body": body, "data": data or {}, "sound": "default"}
        for t in tokens
        if t.startswith("ExponentPushToken[")
    ]
    if not messages:
        return
    try:
        await asyncio.to_thread(
            lambda: _requests.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Accept": "application/json", "Accept-Encoding": "gzip, deflate"},
                timeout=10,
            )
        )
    except Exception as e:
        logger.warning(f"Push send failed: {e}")


@api_router.post("/push/token")
async def register_push_token(data: PushTokenInput, user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"push_tokens": data.token}})
    return {"registered": True}


@api_router.delete("/push/token")
async def unregister_push_token(data: PushTokenInput, user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$pull": {"push_tokens": data.token}})
    return {"unregistered": True}


@api_router.post("/push/broadcast")
async def broadcast_push(request: Request, data: BroadcastInput):
    admin_key = os.environ.get("ADMIN_KEY")
    if not admin_key or request.headers.get("X-Admin-Key") != admin_key:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    users = await db.users.find({"push_tokens": {"$exists": True, "$ne": []}}).to_list(10000)
    tokens = [t for u in users for t in u.get("push_tokens", [])]
    push_data = {"screen": data.screen} if data.screen else {}
    await send_push_notifications(tokens, data.title, data.body, push_data)
    return {"sent_to": len(tokens)}


# ---------------------------------------------------------------------------
# Content routes
# ---------------------------------------------------------------------------
@api_router.get("/categories")
async def categories():
    return PILLARS


@api_router.get("/home")
async def home(viewer: Optional[dict] = Depends(get_optional_user)):
    top_docs = await db.applications.aggregate([
        {"$addFields": {"vote_count": {"$size": "$voters"}}},
        {"$sort": {"vote_count": -1, "created_at": -1}},
        {"$limit": 6},
    ]).to_list(6)
    featured = await serialize_many(top_docs, viewer)

    total_apps, total_votes_agg, tour_count = await asyncio.gather(
        db.applications.count_documents({}),
        db.applications.aggregate([
            {"$project": {"vote_count": {"$size": "$voters"}}},
            {"$group": {"_id": None, "total": {"$sum": "$vote_count"}}},
        ]).to_list(1),
        db.tour_stops.count_documents({}),
    )
    total_votes = total_votes_agg[0]["total"] if total_votes_agg else 0

    return {
        "featured": featured,
        "stats": {
            "applications": total_apps,
            "votes": total_votes,
            "tour_stops": tour_count,
            "regions": 20,
        },
        "pillars": PILLARS,
    }


# ---------------------------------------------------------------------------
# Video upload / streaming
# ---------------------------------------------------------------------------
@api_router.post("/videos/upload")
@limiter.limit("10/hour")
async def upload_video(request: Request, video: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not (video.content_type or "").startswith("video/"):
        raise HTTPException(status_code=400, detail="Il file non è un video")
    contents = await video.read()
    if len(contents) > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=413, detail="Il video supera il limite di 80MB")
    ext = (video.filename or "video.mp4").split(".")[-1].lower()
    if ext not in {"mp4", "mov", "m4v", "webm", "qt"}:
        ext = "mp4"
    video_id = str(uuid.uuid4())

    cloudinary_url = None
    cloudinary_public_id = None
    filename = f"{video_id}.{ext}"

    if os.environ.get("CLOUDINARY_CLOUD_NAME"):
        try:
            result = await asyncio.to_thread(
                cloudinary.uploader.upload,
                contents,
                resource_type="video",
                folder="legacylab",
                public_id=video_id,
                overwrite=True,
            )
            cloudinary_url = result["secure_url"]
            cloudinary_public_id = result["public_id"]
        except Exception as e:
            logger.warning(f"Cloudinary upload failed, falling back to disk: {e}")

    if not cloudinary_url:
        file_path = UPLOAD_DIR / filename
        await asyncio.to_thread(file_path.write_bytes, contents)
        await asyncio.to_thread(generate_thumbnail, file_path, video_id)

    await db.videos.insert_one({
        "id": video_id,
        "filename": filename,
        "content_type": video.content_type,
        "owner_id": user["id"],
        "cloudinary_url": cloudinary_url,
        "cloudinary_public_id": cloudinary_public_id,
        "created_at": now_iso(),
    })
    return {"video_id": video_id}


@api_router.get("/videos/{video_id}/file")
async def get_video_file(video_id: str):
    doc = await db.videos.find_one({"id": video_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Video non trovato")
    if doc.get("cloudinary_url"):
        return RedirectResponse(url=doc["cloudinary_url"])
    file_path = UPLOAD_DIR / doc["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(str(file_path), media_type=doc.get("content_type") or "video/mp4")


@api_router.get("/videos/{video_id}/thumbnail")
async def get_video_thumbnail(video_id: str):
    doc = await db.videos.find_one({"id": video_id})
    if doc and doc.get("cloudinary_public_id"):
        thumb_url, _ = cloudinary.utils.cloudinary_url(
            doc["cloudinary_public_id"],
            resource_type="video",
            format="jpg",
            transformation=[{"width": 720, "crop": "scale", "start_offset": "1"}],
        )
        return RedirectResponse(url=thumb_url)
    thumb_path = THUMBNAIL_DIR / f"{video_id}.jpg"
    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail="Miniatura non trovata")
    return FileResponse(str(thumb_path), media_type="image/jpeg")


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
@api_router.post("/applications")
async def create_application(data: ApplicationInput, user: dict = Depends(get_current_user)):
    if data.category not in PILLAR_IDS:
        raise HTTPException(status_code=400, detail="Categoria non valida")
    video = await db.videos.find_one({"id": data.video_id})
    if not video:
        raise HTTPException(status_code=400, detail="Video non trovato")
    if video.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Non autorizzato ad usare questo video")
    doc = {
        "id": str(uuid.uuid4()),
        "business_name": data.business_name.strip(),
        "description": data.description.strip(),
        "category": data.category,
        "video_id": data.video_id,
        "location": data.location,
        "author_id": user["id"],
        "author_name": user["name"],
        "voters": [],
        "created_at": now_iso(),
    }
    await db.applications.insert_one(doc)
    return await serialize_application(doc, user)


@api_router.get("/applications")
async def list_applications(
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    viewer: Optional[dict] = Depends(get_optional_user),
):
    query = {"category": category} if category and category in PILLAR_IDS else {}
    total = await db.applications.count_documents(query)
    skip = (page - 1) * limit
    docs = await db.applications.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    items = await serialize_many(docs, viewer)
    return {"items": items, "total": total, "page": page, "limit": limit, "has_more": skip + limit < total}


@api_router.get("/applications/leaderboard")
async def leaderboard(
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    viewer: Optional[dict] = Depends(get_optional_user),
):
    query = {"category": category} if category and category in PILLAR_IDS else {}
    total = await db.applications.count_documents(query)
    skip = (page - 1) * limit
    pipeline = [
        {"$match": query},
        {"$addFields": {"vote_count": {"$size": "$voters"}}},
        {"$sort": {"vote_count": -1, "created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
    ]
    docs = await db.applications.aggregate(pipeline).to_list(limit)
    items = await serialize_many(docs, viewer)
    return {"items": items, "total": total, "page": page, "limit": limit, "has_more": skip + limit < total}


@api_router.get("/applications/me")
async def my_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    total = await db.applications.count_documents({"author_id": user["id"]})
    skip = (page - 1) * limit
    docs = await db.applications.find({"author_id": user["id"]}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    items = await serialize_many(docs, user)
    return {"items": items, "total": total, "page": page, "limit": limit, "has_more": skip + limit < total}


@api_router.get("/applications/{app_id}")
async def get_application(app_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    doc = await db.applications.find_one({"id": app_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidatura non trovata")
    return await serialize_application(doc, viewer)


@api_router.post("/applications/{app_id}/vote")
@limiter.limit("60/minute")
async def vote(request: Request, app_id: str, user: dict = Depends(get_current_user)):
    doc = await db.applications.find_one({"id": app_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidatura non trovata")

    already_voted = user["id"] in doc.get("voters", [])
    if already_voted:
        updated = await db.applications.find_one_and_update(
            {"id": app_id},
            {"$pull": {"voters": user["id"]}},
            return_document=True,
        )
        voted = False
    else:
        updated = await db.applications.find_one_and_update(
            {"id": app_id},
            {"$addToSet": {"voters": user["id"]}},
            return_document=True,
        )
        voted = True

    new_count = len(updated.get("voters", []))

    if voted and new_count in VOTE_MILESTONES:
        author = await db.users.find_one({"id": doc["author_id"]})
        if author and author.get("push_tokens"):
            await send_push_notifications(
                author["push_tokens"],
                title="🎉 Nuovo traguardo!",
                body=f'"{doc["business_name"]}" ha raggiunto {new_count} voti su The Legacy Lab!',
                data={"screen": f"/c/{app_id}"},
            )

    return {"votes": new_count, "voted": voted}


@api_router.delete("/applications/{app_id}")
async def delete_application(app_id: str, user: dict = Depends(get_current_user)):
    doc = await db.applications.find_one({"id": app_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidatura non trovata")
    if doc["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Non autorizzato")

    video_id = doc.get("video_id")
    if video_id:
        video_doc = await db.videos.find_one({"id": video_id})
        if video_doc:
            if video_doc.get("cloudinary_public_id"):
                try:
                    await asyncio.to_thread(
                        cloudinary.uploader.destroy,
                        video_doc["cloudinary_public_id"],
                        resource_type="video",
                    )
                except Exception as e:
                    logger.warning(f"Cloudinary delete failed: {e}")
            else:
                video_path = UPLOAD_DIR / video_doc["filename"]
                if video_path.exists():
                    video_path.unlink()
                thumb_path = THUMBNAIL_DIR / f"{video_id}.jpg"
                if thumb_path.exists():
                    thumb_path.unlink()
            await db.videos.delete_one({"id": video_id})

    await db.applications.delete_one({"id": app_id})
    return {"deleted": True}


# ---------------------------------------------------------------------------
# Tour
# ---------------------------------------------------------------------------
@api_router.get("/tour")
async def get_tour(user: Optional[dict] = Depends(get_optional_user)):
    docs = await db.tour_stops.find().to_list(1000)
    docs.sort(key=lambda d: d.get("date", ""))
    result = []
    for d in docs:
        d = strip_id(d)
        registered = user and user["id"] in d.get("attendees", [])
        d.pop("attendees", None)
        d["registered"] = bool(registered)
        result.append(d)
    return result


@api_router.post("/tour/{stop_id}/register")
async def register_tour(stop_id: str, user: dict = Depends(get_current_user)):
    doc = await db.tour_stops.find_one({"id": stop_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Tappa non trovata")
    attendees = doc.get("attendees", [])
    if user["id"] in attendees:
        attendees.remove(user["id"])
        registered = False
    else:
        attendees.append(user["id"])
        registered = True
    await db.tour_stops.update_one({"id": stop_id}, {"$set": {"attendees": attendees}})
    return {"registered": registered}


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await _ensure_indexes()
    await _seed_tour()


async def _ensure_indexes():
    await db.users.create_index("email", unique=True, background=True)
    await db.users.create_index("id", unique=True, background=True)
    await db.applications.create_index("id", unique=True, background=True)
    await db.applications.create_index("author_id", background=True)
    await db.applications.create_index([("category", 1), ("created_at", -1)], background=True)
    await db.applications.create_index("created_at", background=True)
    await db.videos.create_index("id", unique=True, background=True)
    await db.email_tokens.create_index([("token", 1), ("kind", 1)], background=True)
    await db.email_tokens.create_index("expires_at_dt", expireAfterSeconds=0, background=True)
    await db.tour_stops.create_index("id", unique=True, background=True)
    logger.info("Indexes ensured")


async def _seed_tour():
    existing = await db.tour_stops.find_one({})
    if not existing or existing.get("v") != 2:
        await db.tour_stops.delete_many({})
        for stop in TOUR_SEED:
            await db.tour_stops.insert_one({
                "id": str(uuid.uuid4()),
                "v": 2,
                **stop,
                "attendees": [],
            })
        logger.info("Seeded tour stops (v2)")


@api_router.delete("/auth/me")
async def delete_account(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    apps = await db.applications.find({"author_id": user_id}).to_list(1000)
    for app_doc in apps:
        video_id = app_doc.get("video_id")
        if video_id:
            video_doc = await db.videos.find_one({"id": video_id})
            if video_doc:
                if video_doc.get("cloudinary_public_id"):
                    try:
                        await asyncio.to_thread(
                            cloudinary.uploader.destroy,
                            video_doc["cloudinary_public_id"],
                            resource_type="video",
                        )
                    except Exception as e:
                        logger.warning(f"Cloudinary delete on account deletion: {e}")
                else:
                    video_path = UPLOAD_DIR / video_doc["filename"]
                    if video_path.exists():
                        video_path.unlink(missing_ok=True)
                    thumb_path = THUMBNAIL_DIR / f"{video_id}.jpg"
                    if thumb_path.exists():
                        thumb_path.unlink(missing_ok=True)
                await db.videos.delete_one({"id": video_id})
    await db.applications.delete_many({"author_id": user_id})
    await db.email_tokens.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    return {"deleted": True}


@api_router.get("/")
async def root():
    return {"message": "The Legacy Lab API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "media-src 'self' https:; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    return response


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
