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

* Explain the ohter stuff here
