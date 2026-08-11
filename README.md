# Billing Automation

This is a project to automate invoice document scanning workflow to reduce manual input.
Currently, there is the container backend program and the Dashboard modules which are
distinct pieces of the pipeline.

The container backend utilizes Google Cloud Run, Gemini, Drive, and Supbase to 
extract data from invoice pdfs and insert into a central database. This program
is the backbone of the pipeline being able to run within the cloud, available
whenever a new document has been scanned.

The other module is the Dashboard which presents the data in a digestible manner
and enables analysis capabilities. 

## How to use Dashboard

Clone repository, open Dashboard within Antigravity, tell the agent to use first-time
agent setup workflow defined within Dashboard, it should install everything for you
and setup the test server.

Otherwise, utilize
```
npm install
npm build dev
npm run dev
```

## How to use Container Backend

This is not a program meant to be downloaded onto a local computer. Instead, this is designed to
be hosted on a server or within the cloud for connectivity with services such as Google Drive and
Supabase as a pod/container.  

