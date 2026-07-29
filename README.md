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
Scanning Software (Windows 11 & 10)
- PaperStream Capture 6.0.2
- Network Setup Tool for fi Series 3.4.0
- PaperStream IP (TWAIN) 3.40.2
- fi Series Online Updated 1.2.40.0

Note: USB is how you would connect the scanner to the PC, I had trouble and fixed it
by forcing a USB 2.0 connection between the scanner and the Windows Desktop

You can change this setting by powering on the scanner, pressing menu, then holding the up
and down buttons at the same time, this will open the admin menu, in which you can scroll
down and change the USB usage to 2.0, or automatic (for 3.0 USB)

I have already created a job that automatically places scans to the destination
directory in Google Drive, but if for whatever reason it needs to be reset here
are the configurations using PaperStream Capture 6.0.2.

The job configuration is as follows:
1. Create Advanced Setup
2. Job Information
    * Name it: "asistee-scan-send"
3. Scan
    * Select your scanner; fi-8170 in my case
    * Make it color
    * Release on Scan/Finish -> all you need to do is press scan and it'll do it
4. Destination
    * Enter Folder Path & Edit Output Filename as desired
    * I pasted hte Virtual Google Drive Folder Path to the destination, and it worked 

Before scanning, ensure that Google Drive is installed, I had to create a separate
local folder, and sync that to google drive which is where the docs are stored.

**Note**: that the user using google drive must be signed in for syncing to happen, this
means the user must always be signed in

## Architecture of the Container
Directory Contents:
- Dockerfile
- requirements.txt
- package.sh 
- src
    * main.py
    * gemini_client.py
    * external_api.py
    * config.py

`package.sh` is a shell script that zips the above files required for Google
Cloud to build the container to be deployed. 

The `Dockerfile` and `requirements.txt` both allow the construction of the image. 
The `src` directory is what contains the python source code divided by 
the following responsibilities:
- Web server code (main.py)
- Gemini OCR logic (gemini_client.py)
- External API logic (external_api.py)
- configuration variables (config.py)

This handles the processing and uploading to a central database portion of the pipeline.
As of now, it is programmed as a webserver listening to POST /webhook requests
being authenticated through Google's OAuth token backend. 

For local testing, you would need to uncomment the appropiate code in `external_api.py` and `config.py` that utliize a local
JSON key file to authenticate with Google. 

Additionally, the local `.env` file must contain a `GENAI_KEY`, `SUPA_URL`, 
`SUPA_KEY`, `SUPA_TABLE`, `PORT`, and `GOOGLE_AUTH_FILE` entries.

**note**: In production, only GENAI_KEY (Gemini API key), SUPA_URL (Supabase project URL),
SUPA_KEY (Supabase API key), SUPA_TABLE (Name of Supabase table) is to be provided,
assuming we're deploying on Google Cloud.

The command I used to test the local flask server was:
`curl -X POST http://127.0.0.1:5000/webhook -H "Content-Type: application/json" -d {TEST PAYLOAD HERE}` 

## Google Cloud
For everything to work properly APIs, roles, and scopes must be given.

## Steps I took (Summary)
- Set up the secrets that the Cloud run will use via Secret Manager
- Setting up the Google Cloud Run via console, unpackaging the zip
    - two ways to deploy, deploying from source, and deploying an already built image
- Retrofitting the previous script to use OAuth instead through the Service Account
    - Needed to add the script to the project instead to authenticate OAuth
- Added a Cleanup policy to ensure our storage never grows more than the allowed free tier
    * Container is lightweight, only about 80 MB
    * Keep a cleanup policy to have a backup container and temper the storage used


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
- Owner of the Google Action Script
    - Service Account Token Creator role

Necessary oauthScopes for the Google Action Script
- https://www.googleapis.com/auth/script.external_request
- https://www.googleapis.com/auth/cloud-platform
- https://www.googleapis.com/auth/drive

TODO: Did the console automatically name the repository
cloud run source deploy?

TODO: How to add Action SCript to project for authentication?

## Deploy if building form source
```
gcloud run deploy autobilling-service \
  --source . \
  --region asia-northeast1 \
  --service-account SERVICE_EMAIL_ACCOUNT_HERE \
  --set-secrets GENAI_KEY=GENAI_KEY:latest,SUPA_URL=SUPA_URL:latest,SUPA_KEY=SUPA_KEY:latest,SUPA_TABLE=SUPA_TABLE:latest \
  --no-allow-unauthenticated
```

## Deploy if successful image
```
gcloud run deploy autobilling-service \
  --image asia-northeast1-docker.pkg.dev/`PROJECT_NAME`/cloud-run-source-deploy/autobilling-service:latest
  --region asia-northeast1 \
  --service-account SERVICE_EMAIL_ACCOUNT_HERE \
  --set-secrets GENAI_KEY=GENAI_KEY:latest,SUPA_URL=SUPA_URL:latest,SUPA_KEY=SUPA_KEY:latest,SUPA_TABLE=SUPA_TABLE:latest \
  --no-allow-unauthenticated
```

## Set up clean up policy
gcloud artifacts repositories set-cleanup-policies cloud-run-source-deploy \
  --location=asia-northeast1 \
  --policy=policy.json

where policy.json is
```
[
  {
    "name": "keep-2",
    "action": { "type": "Keep" },
    "mostRecentVersions": {
      "keepCount": 2
    }
  },
  {
    "name": "delete-older",
    "action": { "type": "Delete" },
    "condition": {
      "olderThan": "1h"
    }
  }
]
```

## Connecting to Supabase
For operation with Supabase table the program only requires:
    * Supabase Project URL
    * Supabase API Key
    * Supabase Table name to be appended

Columns of data:
    * id
    * created_at
    * property_id
    * billing_purpose
    * total
    * deadline_due
    * status
    * payment_method
    * fileID
    * filename
    * raw_json
