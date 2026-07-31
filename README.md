# Intelligent Document Processing Solution

- INPUT: Invoice/Billing PDFs
- OUTPUT: JSON payload
    - Property/Unit ID
    - Billing Purpose (Taxes, Utils)
    - Total Finacial Amount
    - Deadline (exact due date or scheduled auto-debit date)
    - Status (Pending/Paid)
    - Payment Method/Status (To Be Paid Manually, Online Pending, Auto-Deducted)
    - File ID of Document Processed
    - Filename of Document Processed
    - backup RAW JSON result from Gemini

Solution includes the following:
- MultiChannel Input
- MultiLingual support, Understands Japanese and returns English
- Google Drive Environment
- Automated, entire workflow is triggered upon scans/uploads to the drive folder
- Supabase backend, scalable and efficient database technology
- Dashboard, see immediate deadlines, change status to PAID and analysis

Overall workflow when the pipeline is setup properly:
- Scan Documents using the office scanner, the only manual input necessary
- Files are uploaded to a Google Drive Folder (Alternative manual input path)
- Google Apps script will detect changes, move files to an Archive, and send
files to the container within Google Cloud Run
- Google Cloud Run container will recieve these files, process them using Gemini
then send the results to the Supabase Database
- Supabase will process the results and append them to the appropiate tables

The following sections is documentation about the various stages of the pipeline.

## Scanning Files

Specific scanner in office is JDL fi-8170 so the following is necessary:
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
are the configurations using PaperStream Capture 6.0.2 job editing functions.

The job configuration is as follows:
1. Create Advanced Setup
2. Job Information
    * Name it: "asistee-scan-send"
3. Scan
    * Select your scanner; fi-8170 in my case
    * Make it color
    * Release on Scan/Finish (Automation)
    * Duplex Scanning (Both sides of the document)
4. Destination
    * Enter Folder Path 
    * Edit Output Filename as desired

Before scanning, ensure that Google Drive is installed and properly syncing with
the target folder. I made a folder within the C: drive for global access and synced
that folder. This is so no matter which user is logged in, the scanner is able to
resolve the path. 

**Note**: The user using google drive must be signed in for syncing to happen.
Meaning that this user must always be signed in for continuous syncing.

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
- Google & Supabase API logic (external_api.py)
- configuration variables (config.py)

This handles the processing and uploading to a central database portion of the pipeline.
As of now, it is programmed as a webserver listening to POST /webhook requests
being authenticated through Google's OAuth token backend. 

For the container to succesfully launch and operate it only requires at most
6 environment variables.

If deploying to the Cloud:
- GENAI_KEY (Gemini API Key)
- SUPA_KEY (Supabase Service KEY)
- SUPA_URL (Supabase project URL)
- SUPA_TABLE (Supabase table name)

For the cloud, I inserted these values into Google's Secret Manager service,
which is used within the command to deploy the image.

If deploying locally:
- GENAI_KEY (Gemini API Key)
- SUPA_KEY (Supabase Service KEY)
- SUPA_URL (Supabase project URL)
- SUPA_TABLE (Supabase table name)
- PORT (port the server will run on)
- GOOGLE_AUTH_FILE (JSON key file for service account)

For local testing, it requires an extra two variables, mainly to determine the
port for the web server and the key file to authenticate to the service account
from Google Cloud. Before launching the test server, you would define these
variables within a .env file, which is then evaluated by the config.py code.

Additinally, for local testing, you would need to uncomment the appropiate code 
in `external_api.py` and `config.py` to utilize a local JSON key file
to authenticate with Google. 

**note**: In production, it's easier to utilize Google's Authentication backend
the above instructions is only for local testing.

The command to launch the local flask server was: `python3 src/main.py`

The command I used to test the local flask server on port 5000 was:
`curl -X POST http://127.0.0.1:5000/webhook -H "Content-Type: application/json" -d {TEST PAYLOAD HERE}` 

## Google Cloud
For everything to work properly APIs, roles, and scopes must be given.

## Steps I took (Summary)
- Set up a Service Account
    * Ensure the Service Account email is shared with the appropiate google drive folders
    for a successful pipeline
    * The two necessary folders are an Archive and a Scanned Folder
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

Necessary oauthScopes for the Google Action Script once OAuth has been setup.
Additionally, it needs to be added to the Cloud Run project via project number.
- https://www.googleapis.com/auth/script.external_request
- https://www.googleapis.com/auth/cloud-platform
- https://www.googleapis.com/auth/drive

## Deploy if building form source
```
gcloud run deploy autobilling-service \
  --source . \
  --region asia-northeast1 \
  --service-account SERVICE_EMAIL_ACCOUNT_HERE \
  --set-secrets GENAI_KEY=GENAI_KEY:latest,SUPA_URL=SUPA_URL:latest,SUPA_KEY=SUPA_KEY:latest,SUPA_TABLE=SUPA_TABLE:latest \
  --no-allow-unauthenticated
```

## Deploy if image already exists from an existin repository
**Note**: This assumes the repository is "cloud-run-source-deploy"
```
gcloud run deploy autobilling-service \
  --image asia-northeast1-docker.pkg.dev/`PROJECT_NAME`/cloud-run-source-deploy/autobilling-service:latest
  --region asia-northeast1 \
  --service-account SERVICE_EMAIL_ACCOUNT_HERE \
  --set-secrets GENAI_KEY=GENAI_KEY:latest,SUPA_URL=SUPA_URL:latest,SUPA_KEY=SUPA_KEY:latest,SUPA_TABLE=SUPA_TABLE:latest \
  --no-allow-unauthenticated
```

## Set up clean up policy
Google Cloud Bulid has a free tier, but only for a set amount of storage.
This allows us to trim the total storage for our containers to stay under
the free tier. The amount of stored containers increase when uploading
updated source code.

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

## Connecting the Google Apps Script to the project
- Had to enable the OAuth consent through Google's OAuth service, this let's
the app script authenticate with the google drive and create tokens for the
container
- Within the Google Cloud project overview, you can obtain the Project Number
which is what you insret into teh Apps Script settings for a particular script
to enable services for google drive and token creation.

The Google Apps Script required four configuration variables:
- Archive Folder ID from google drive
- Scanned Folder ID from google drive
- Service Account Email
- Cloud Run App URL

## Connecting to Supabase
For operation with Supabase table the program only requires:
* Supabase Project URL
* Supabase API Key
* Supabase Table name to be appended

The "Invoice Data" table has the following data:
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

Additionally, the other table is a "masterlist" of the properties and its assoicated
Token IDs for identifying unique properties. This was imported from a csv, so ensure
to update regularly.
