#-- main.py
import config
from gemini_client import genai_process
from google_api import download_file, append_to_sheet
from flask import Flask, request, jsonify
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AutoBilling") 

# TODO:
# The ai tends to make hte dates into integers because that's how google does it
# programatically convert them into dates, check oiut gemini_client
app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def handle_batch():
    payload = request.get_json()

    ocr_results = []
    for file in payload.get("files", []):
        filename = file["name"]
        logger.info(f"---DOWNLOADING {filename}---") 
        file_contents = download_file(file["id"]) 
       
        logger.info(f"---PROCESSING {filename}---") 
        genai_response = genai_process(file_contents)
        ocr_results.append(genai_response)
      
    try:
        response = append_to_sheet(ocr_results)
        logger.info(f"Successfully appended {response.get('updates').get('updatedCells')} cells.")
    except HttpError as error: 
        if error.status_code == 404:
            print("""Either Spreadsheet does not exist or you do not have permissions
                  to modify it. Double check if account is shared to the correct SHEET_ID""")
            print(f"Details: {error.reason}")
        else:
            print(f"An HTTP error occurred: {error}")


    return jsonify({"status": "batch completed successfully"}), 200

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=config.PORT)




