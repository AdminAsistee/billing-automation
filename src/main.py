#-- main.py
import config
from gemini_client import genai_process
from external_api import download_file, append_to_supabase
from flask import Flask, request, jsonify
from postgrest.exceptions import APIError
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AutoBilling") 

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def handle_batch():
    payload = request.get_json()

    ocr_results = []
    for file in payload.get("files", []):
        fileID = file["id"]
        filename = file["name"]
        logger.info(f"---DOWNLOADING {filename}---") 
        file_contents = download_file(fileID) 
       
        logger.info(f"---PROCESSING {filename}---") 
        genai_response = genai_process(file_contents, fileID, filename)
        ocr_results.append(genai_response)
     
    try:
        response = append_to_supabase(ocr_results)
        logger.info(f"Successfully appended {len(ocr_results)} invoices to supabase.")

    except APIError as db_err:
        # Supabase specific errors 
        logging.error(f"Supabase DB Error [Code {db_err.code}]: {db_err.message}")
        logging.error(f"Details: {db_err.details}")
    
    # All Done
    return jsonify({"status": "success"}), 200

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=config.PORT)




