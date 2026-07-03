import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import jwt
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
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
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 43200))

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_VIDEO_SIZE = 80 * 1024 * 1024  # 80 MB

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

app = FastAPI(title="The Legacy Lab API")
api_router = APIRouter(prefix="/api")

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
    {"city": "Milano", "region": "Lombardia", "venue": "Campus The Legacy Lab", "date": "2026-09-15",
     "title": "Kickoff Nazionale", "description": "Apertura ufficiale del Selection Tour e presentazione del format.", "seats": 200},
    {"city": "Torino", "region": "Piemonte", "venue": "OGR — Officine Grandi Riparazioni", "date": "2026-09-29",
     "title": "Saper Fare & Innovazione", "description": "Seminario dedicato a manifattura e passaggio generazionale.", "seats": 150},
    {"city": "Firenze", "region": "Toscana", "venue": "Palazzo dei Congressi", "date": "2026-10-13",
     "title": "Creatività & Heritage", "description": "Moda, artigianato e brand storici del territorio toscano.", "seats": 180},
    {"city": "Bologna", "region": "Emilia-Romagna", "venue": "Palazzo Re Enzo", "date": "2026-10-27",
     "title": "Il Gusto della Motor Valley", "description": "Food, wine e meccanica di precisione.", "seats": 160},
    {"city": "Venezia", "region": "Veneto", "venue": "Arsenale di Venezia", "date": "2026-11-10",
     "title": "Artigianato & Identità", "description": "Vetro, tessile e mestieri d'arte lagunari.", "seats": 140},
    {"city": "Roma", "region": "Lazio", "venue": "Auditorium Parco della Musica", "date": "2026-11-24",
     "title": "Commercio & Istituzioni", "description": "Impresa, export e dialogo con le istituzioni.", "seats": 220},
    {"city": "Napoli", "region": "Campania", "venue": "Mostra d'Oltremare", "date": "2026-12-09",
     "title": "Gusto & Tradizione", "description": "Le eccellenze del Sud tra cibo e artigianato.", "seats": 180},
    {"city": "Palermo", "region": "Sicilia", "venue": "Teatro Massimo", "date": "2026-12-15",
     "title": "Finale del Tour", "description": "Selezione finale e racconto delle storie migliori.", "seats": 200},
]


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ApplicationInput(BaseModel):
    business_name: str
    description: str
    category: str
    video_id: str
    location: Optional[str] = None


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


def public_user(user: dict) -> dict:
    return {"id": user["id"], "name": user["name"], "email": user["email"]}


async def serialize_application(doc: dict, viewer: Optional[dict]) -> dict:
    pillar = PILLAR_MAP.get(doc["category"], {})
    voters = doc.get("voters", [])
    return {
        "id": doc["id"],
        "business_name": doc["business_name"],
        "description": doc["description"],
        "category": doc["category"],
        "category_name": pillar.get("name", doc["category"]),
        "poster": pillar.get("image"),
        "video_id": doc["video_id"],
        "location": doc.get("location"),
        "author_name": doc.get("author_name", "Anonimo"),
        "votes": len(voters),
        "voted": bool(viewer and viewer["id"] in voters),
        "created_at": doc.get("created_at"),
    }


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.post("/auth/register")
async def register(data: RegisterInput):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    user = {
        "id": str(uuid.uuid4()),
        "name": data.name.strip(),
        "email": data.email.lower(),
        "hashed_password": pwd_context.hash(data.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"])
    return {"access_token": token, "user": public_user(user)}


@api_router.post("/auth/login")
async def login(data: LoginInput):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not pwd_context.verify(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Email o password errati")
    token = create_access_token(user["id"])
    return {"access_token": token, "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


# ---------------------------------------------------------------------------
# Content routes
# ---------------------------------------------------------------------------
@api_router.get("/categories")
async def categories():
    return PILLARS


@api_router.get("/home")
async def home(viewer: Optional[dict] = Depends(get_optional_user)):
    docs = await db.applications.find().to_list(1000)
    docs.sort(key=lambda d: len(d.get("voters", [])), reverse=True)
    featured = [await serialize_application(d, viewer) for d in docs[:6]]
    total_votes = sum(len(d.get("voters", [])) for d in docs)
    tour_count = await db.tour_stops.count_documents({})
    return {
        "featured": featured,
        "stats": {
            "applications": len(docs),
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
async def upload_video(video: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not (video.content_type or "").startswith("video/"):
        raise HTTPException(status_code=400, detail="Il file non è un video")
    contents = await video.read()
    if len(contents) > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=413, detail="Il video supera il limite di 80MB")
    ext = (video.filename or "video.mp4").split(".")[-1].lower()
    if ext not in {"mp4", "mov", "m4v", "webm", "qt"}:
        ext = "mp4"
    video_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{video_id}.{ext}"
    with open(file_path, "wb") as f:
        f.write(contents)
    await db.videos.insert_one({
        "id": video_id,
        "filename": f"{video_id}.{ext}",
        "content_type": video.content_type,
        "owner_id": user["id"],
        "created_at": now_iso(),
    })
    return {"video_id": video_id}


@api_router.get("/videos/{video_id}/file")
async def get_video_file(video_id: str):
    doc = await db.videos.find_one({"id": video_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Video non trovato")
    file_path = UPLOAD_DIR / doc["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    return FileResponse(str(file_path), media_type=doc.get("content_type") or "video/mp4")


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
async def list_applications(category: Optional[str] = None, viewer: Optional[dict] = Depends(get_optional_user)):
    query = {"category": category} if category and category in PILLAR_IDS else {}
    docs = await db.applications.find(query).to_list(1000)
    docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return [await serialize_application(d, viewer) for d in docs]


@api_router.get("/applications/leaderboard")
async def leaderboard(category: Optional[str] = None, viewer: Optional[dict] = Depends(get_optional_user)):
    query = {"category": category} if category and category in PILLAR_IDS else {}
    docs = await db.applications.find(query).to_list(1000)
    docs.sort(key=lambda d: (len(d.get("voters", [])), d.get("created_at", "")), reverse=True)
    return [await serialize_application(d, viewer) for d in docs]


@api_router.get("/applications/me")
async def my_applications(user: dict = Depends(get_current_user)):
    docs = await db.applications.find({"author_id": user["id"]}).to_list(1000)
    docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return [await serialize_application(d, user) for d in docs]


@api_router.post("/applications/{app_id}/vote")
async def vote(app_id: str, user: dict = Depends(get_current_user)):
    doc = await db.applications.find_one({"id": app_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidatura non trovata")
    voters = doc.get("voters", [])
    if user["id"] in voters:
        voters.remove(user["id"])
        voted = False
    else:
        voters.append(user["id"])
        voted = True
    await db.applications.update_one({"id": app_id}, {"$set": {"voters": voters}})
    return {"votes": len(voters), "voted": voted}


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
async def seed_data():
    if await db.tour_stops.count_documents({}) == 0:
        for stop in TOUR_SEED:
            await db.tour_stops.insert_one({
                "id": str(uuid.uuid4()),
                **stop,
                "attendees": [],
            })
        logger.info("Seeded tour stops")


@api_router.get("/")
async def root():
    return {"message": "The Legacy Lab API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
