#-- config.py
import os
from dotenv import load_dotenv

load_dotenv()

# --- API KEYS ---
GENAI_KEY = os.getenv("GENAI_KEY")
if not GENAI_KEY:
    raise ValueError("Missing Gemini API Key, check .env")

SUPA_KEY = os.getenv("SUPA_KEY")
if not SUPA_KEY:
    raise ValueError("Missing Supabase API Key, check .env")

SUPA_URL = os.getenv("SUPA_URL")
if not SUPA_URL:
    raise ValueError("Missing Supabase URL, check .env")

SUPA_TABLE = os.getenv("SUPA_TABLE")
if not SUPA_TABLE:
    raise ValueError("Missing Supabase Table, check .env")

PORT = os.getenv("PORT")
if not PORT:
    raise ValueError("Missing port for environment, check .env")

# Uncomment below for local authentication (JSON file)
# --- GOOGLE SERVICE ACCOUNT KEY FILE ---
#GOOGLE_AUTH = os.getenv("GOOGLE_AUTH_FILE")

