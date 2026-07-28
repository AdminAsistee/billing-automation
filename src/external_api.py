#-- external_api.py
import json
import io
import config
import google.auth
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from supabase import create_client

SCOPES = ["https://www.googleapis.com/auth/drive"]

# Uncomment below for Local Authentication using JSON file
#SERVICE_ACCOUNT_FILE = config.GOOGLE_AUTH
#auth = service_account.Credentials.from_service_account_file(
#        SERVICE_ACCOUNT_FILE, scopes=SCOPES)

# Cloud Authentication using Google's backend
auth, _ = google.auth.default(scopes=SCOPES)

drive = build('drive', 'v3', credentials=auth)
supabase = create_client(config.SUPA_URL, config.SUPA_KEY)

# Returns the file contents
def download_file(fileID):
    file_buf = io.BytesIO()
    request = drive.files().get_media(fileId=fileID)
    downloader = MediaIoBaseDownload(file_buf, request)

    done = False
    while not done:
        status, done = downloader.next_chunk()

    file_buf.seek(0)
    return file_buf

def append_to_supabase(ocr_results):
    payloads = []
    for item in ocr_results:
        row = json.loads(item)
        payloads.append(
            {
                "property_id": row.get("property_unit_id"),
                "billing_purpose": row.get("billing_purpose"),
                "total": row.get("total_figure_amount"),
                "deadline_due": row.get("deadline_due"),
                "payment_method": row.get("payment_method"),
                "fileID": row.get("fileID"),
                "filename": row.get("filename"),
                "raw_json": row,  # Stores the parsed JSON dictionary
            }
        )


    response = supabase.table(config.SUPA_TABLE).insert(payloads).execute()
    return response.data
