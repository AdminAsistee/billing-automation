#-- google_api.py
import json
import io
import config
import google.auth
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

SCOPES = ['https://www.googleapis.com/auth/spreadsheets', "https://www.googleapis.com/auth/drive"]

# Uncomment below for Local Authentication using JSON file
#SERVICE_ACCOUNT_FILE = config.GOOGLE_AUTH
#auth = service_account.Credentials.from_service_account_file(
#        SERVICE_ACCOUNT_FILE, scopes=SCOPES)

# Cloud Authentication using Google's backend
auth, _ = google.auth.default(scopes=SCOPES)

drive = build('drive', 'v3', credentials=auth)
service = build('sheets', 'v4', credentials=auth)

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

# Preps and Appends the data to the google sheet, by converting json to rows format
# Returns the response from executing appending API call 
def append_to_sheet(ocr_results):
    headers = ["property_unit_id", "billing_purpose", "total_figure_amount", "deadline_due", "payment_method", "fileID", "filename"]
    sheet_payload = []

    for item in ocr_results:
        row = json.loads(item)
        proper_row = [row.get(key, "Not Specified") for key in headers]
        sheet_payload.append(proper_row)
    
    body = {
        'values': sheet_payload
    }
    request = service.spreadsheets().values().append(
        spreadsheetId=config.SHEET_ID,
        range='Sheet1!A1:G1',
        valueInputOption='USER_ENTERED', 
        insertDataOption='INSERT_ROWS', 
        body=body
    )
    
    return request.execute()
