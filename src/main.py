#-- main.py
import json
import config
from pathlib import Path
from gemini_client import genai_process
from google.oauth2 import service_account
from googleapiclient.discovery import build
import logging
logging.basicConfig(level=logging.INFO)

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = config.GOOGLE_AUTH
auth = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)

### INPUT, later this may be retrieving files from some cloud
# ping cloud
# if changed
# download files, put into some INPUT directory
# hand to here

ocr_results = []
for file in Path(config.INPUT_DIR).glob('*.pdf'):
    genai_response = genai_process(file)
    ocr_results.append(genai_response)

headers = ["property_unit_id", "billing_purpose", "total_figure_amount", "deadline_due", "payment_method"]
payload = []

for item in ocr_results:
    row = json.loads(item)
    proper_row = [row.get(key, "Not Specified") for key in headers]
    payload.append(proper_row)

## Upload to google sheet
service = build('sheets', 'v4', credentials=auth)

body = {
    'values': payload
}

request = service.spreadsheets().values().append(
    spreadsheetId=config.SHEET_ID,
    range='Sheet1!A1:E1',
    valueInputOption='USER_ENTERED', 
    insertDataOption='INSERT_ROWS', 
    body=body
)
response = request.execute()
logging.info(f"Successfully appended {response.get('updates').get('updatedCells')} cells.")


# delete files from cloud drive
# restart loop
