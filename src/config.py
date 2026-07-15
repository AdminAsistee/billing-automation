#-- config.py
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# --- API KEYS ---
GENAI_KEY = os.getenv("GENAI_KEY")
if not GENAI_KEY:
    raise ValueError("Missing Gemini API Key, check .env")

# --- PATH CONFIGURATIONS ---
ROOT_DIR = os.getenv("root_dir")
INPUT_DIR = ROOT_DIR + os.getenv("input_dir")

# --- GOOGLE SERVICE ACCOUNT KEY FILE ---
GOOGLE_AUTH_FILE = os.getenv("GOOGLE_AUTH_FILE")
if not GOOGLE_AUTH_FILE:
    raise ValueError("Missing Service account file, make one and insert to .env")
GOOGLE_AUTH = ROOT_DIR + GOOGLE_AUTH_FILE

SHEET_ID = os.getenv("SHEET_ID")
if not SHEET_ID:
    raise ValueError("Missing SHEET ID for google sheets, check .env")


Path(INPUT_DIR).mkdir(parents=True, exist_ok=True)
