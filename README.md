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

Use Antigravity to pull the repository and tell the agent to perform the setup process, 
it should install everything for you and setup the test server to run the dashboard.

If you don't use agents then the following commands will do:
```
npm install
npm build dev
npm run dev
```

## How to use Container Backend

This is not a program meant to be downloaded onto a local computer. Instead, this is designed to
be hosted on a server or within the cloud for connectivity with services such as Google Drive and
Supabase as a pod/container.  

## What's Next?

Google Cloud is a core point of friction as the company has little experience using it. Additionally,
the underlying infrastructure is splintered from company infrastructure. To address these points, the
following is suggested:

* Migrate Supabase, Scripts, and Google Cloud Services onto centralized admin account rather than a
single employee account
* Installing Google Cloud CLI to enable Antigravity assistance and ease of employee experience with Google Cloud
* Integrating Dashboard module into the Tokyo Stays Website as a dedicated tab rather than a local website
* Inserting a "refresh" function to observe new entries being entered for responsiveness
