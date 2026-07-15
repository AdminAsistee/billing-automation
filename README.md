# Intelligent Document Processing Solution

physical scan of mail bills/ online invoice PDF / Auto-Deduction Log -> AI/OCR Extraction Agent -> Central Databasei -> Dashboard

INPUT: PDFs
OUTPUT: JSON -> Sent to a database

Solution includes the following:
- MultiChannel Input, can take a pdfs
- AI solution must read Japanese Text, understand financial layout, and extract the output
- Storage -> Sent to a Google Sheet or database (Supabase)
- Frontend -> Dashboard to flag upcoming payment deadlines, tracks total costs per unit, and
    automatically categorizes auto-deductions for true financial standing
    - Must connect to a database like a google sheet/Supabase
- Automated, entire workflow must trigger upon uploading a Scan or PDF

Requirements:
- Python3.12
- get python packages

# Workflow of the Pipeline
Plan to extract files from Google Drive
Afterwhich, Gemini is used directly to observe and extract information that is relevant.
This makes it easy to extract info and compile to an external source, like Supabase or
google sheets.

In this case, we package it into a google sheet format and append data. 

## Output of AI after parsing
JSON:
- Property/Unit ID
- Billing Purpose (Taxes, Utils)
- Total Amount
- Deadline (exact due date or scheduled auto-debit date)
- Payment Method/Status (To Be Paid Manually, Online Pending, Auto-Deducted)

## Automation options
https://developers.google.com/identity/protocols/oauth2/service-account#authorizingrequests
note: Your new public/private key pair is generated and downloaded to your machine; it serves as the only copy of the private key.

Specific scanner in office is JDL if-8170 so the following is necessary:

PaperStream Capture 6.0.2 only for Windows 11 & 10
Network Setup Tool only for Windows 11 & 10
Use it to watch the scanner and when you scan this will get it and upload to
the appropiate location

If the USB is working, you can do this easily, but I had to most rouble with the USB,
the only fix was forcing it to be USB 2.0

You can change this setting by powering on the scanner, pressing menu, then holding the up
and down buttons at the same time, this will open the admin menu, in which you can scroll
down and change the USB usage to automatic

Requires the scanner selection tool for fi series to select the printer, if you need redo
