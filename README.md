# Intelligent Document Processing Solution

- INPUT: Invoice/Billing PDFs
- OUTPUT: JSON -> Sent to a database
    - Property/Unit ID
    - Billing Purpose (Taxes, Utils)
    - Total Amount
    - Deadline (exact due date or scheduled auto-debit date)
    - Payment Method/Status (To Be Paid Manually, Online Pending, Auto-Deducted)

Solution includes the following:
- MultiChannel Input
- MultiLingual support, converts Japanese to English
- Frontend -> Dashboard to flag upcoming payment deadlines, tracks total costs per unit, and
    automatically categorizes auto-deductions for true financial standing
    - Must connect to a database like a google sheet/Supabase
- Automated, entire workflow triggers upon uploading a Scan or PDF

The overall workflow is to have scanned files placed within a Google Drive Folder.
They are then downloaded to the program's memory and evaluated using Gemini OCR 
capabilities. Afterwards, they are compiled and appended to the destination Google Sheet file.

## Scanning Files

Specific scanner in office is JDL if-8170 so the following is necessary:

Scanning Software (Windows 11 & 10) (there was more)
- PaperStream Capture 6.0.2
- Network Setup Tool
- Twain
- something

Note: USB is how you would connect the scanner to the PC, I had trouble and fixed it
by forcing a USB 2.0 connection between the scanner and the Windows Desktop

You can change this setting by powering on the scanner, pressing menu, then holding the up
and down buttons at the same time, this will open the admin menu, in which you can scroll
down and change the USB usage to 2.0, or automatic (for 3.0 USB)

hopefully you can just scan and it'll upload to a specified goolge drive

## Architecture of the Container
Directory Contents:
- Dockerfile
- requirements.txt
- package.sh 
- src
    * main.py
    * gemini_client.py
    * google_api.py
    * config.py

`package.sh` is a shell script that zips the above files required for Google
Cloud to build the container to be deployed. 

The `Dockerfile` and `requirements.txt` both allow the construction of the image. 
The `src` directory is what contains the python source code divided by 
the following responsibilities:
- Web server code (main.py)
- Gemini OCR logic (gemini_client.py)
- Google API logic (google_api.py)
- configuration variables (config.py)

This handles the processing and uploading to a central database portion of the pipeline.
As of now, it is programmed as a webserver listening to POST /webhook requests
being authenticated through Google's OAuth token backend. 

For local testing, you would need to uncomment the appropiate code in `google_api.py` and `config.py` that utliize a local
JSON key file to authenticate with Google. 

Additinoally, the local `.env` file must contain a `GENAI_KEY`, `SHEET_ID`, `PORT`,
and `GOOGLE_AUTH_FILE` entries.

The command I used to test the flask server was:
`curl -X POST http://127.0.0.1:5000/webhook -H "Content-Type: application/json" -d {CONTENT HERE}` 


## Google Cloud
For everything to work properly APIs, roles, and scopes must be given.

Enabled APIs: 
* **Cloud Build API:** Automatically builds, tests, and packages your source code into containers or artifacts.
* **Cloud Run Admin API:** Deploys and manages stateless, serverless containers that auto-scale based on incoming traffic.
* **Artifact Registry API:** Stores, manages, and secures container images and language packages (like npm, Maven, or Python packages).
* **Cloud Logging API:** Collects, views, and analyzes log data and metrics from your applications and services.
* **Secret Manager API:** Securely stores and retrieves sensitive data like API keys, passwords, and database credentials.
* **Google Drive API:** Allows your application to read, upload, and manage files stored in Google Drive.
* **Identity and Access Management (IAM) API:** Manages roles, permissions, and access controls across your Google Cloud resources.
* **Cloud Pub/Sub API:** Provides real-time, asynchronous messaging between decoupled applications and microservices.
* **IAM Service Account Credentials API:** Generates short-lived credentials, tokens, and digital signatures for service accounts.
* **Service Usage API:** Controls, enables, and monitors access to Google Cloud APIs and services for your project.
* **Google Sheets API:** Allows your application to read, write, and manipulate data within Google Sheets spreadsheets.

Roles for the following:
- The Service account
    * Cloud Run Invoker role
    * Secret Manager Secret Accessor role
- Owner of Google Action Script
    - Service Account Token Creator role

Necessary oauthScopes for the Google Action Script
- https://www.googleapis.com/auth/script.external_request
- https://www.googleapis.com/auth/cloud-platform
- https://www.googleapis.com/auth/drive


## Deploy if building form source
gcloud run deploy autobilling-service \
  --source . \
  --region asia-northeast1 \
  --service-account `EMAIL_ACCOUNT_HERE` \
  --set-secrets SHEET_ID=SHEET_ID:latest,GENAI_KEY=GENAI_KEY:latest \
  --no-allow-unauthenticated

## Deploy if successful image
gcloud run deploy autobilling-service \
  --image asia-northeast1-docker.pkg.dev/`PROJECT_NAME`/cloud-run-source-deploy/autobilling-service:latest
  --region asia-northeast1 \
  --service-account `EMAIL_ACCOUNT_HERE` \
  --set-secrets SHEET_ID=SHEET_ID:latest,GENAI_KEY=GENAI_KEY:latest \
  --no-allow-unauthenticated

