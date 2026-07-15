#-- gemini_client.py
import config
import logging
import base64
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List, Optional
logging.basicConfig(level=logging.INFO)

### GEMINI SETUP
client = genai.Client(api_key=config.GENAI_KEY)
sys_instruction = """
You are to extract exactly 5 pieces of information from an invoice document, and
output the info strictly within json. Extract: 
property_unit_id:Specific property or apartment unit being billed
billing_purpose:What the charge is for. (Utilities, Taxes, Maintenance, etc.)
total_figure_amount:Final Monetary Figure Due
deadline_due:Exact Due date for bills or scheduled auto-debit date, ISO format only
payment_method:Categorized as 'To Be Paid Manually', 'Online Pending', or 'Auto-Deducted'

All pieces of information are required, do not deviate from the structure, use minimal wording
with the property unit id being the exception for long addresses (In english).

Note that: Names following 御中 (Onchu) or 様 (Sama) at the top of Japanese invoices represent corporate client entities, 
but property unit names are introduced with 回収場所 (Collection Location) or 物件名 (Property Name).
"""

class Invoice(BaseModel):
    property_unit_id: str = Field(description = "Specific property or apartment unit being billed.")
    billing_purpose: str = Field(description = "What the charge is for. (Utilities, Taxes, Maintenance, etc.)")
    total_figure_amount: int = Field(description = "Final Monetary Figure Due.")
    deadline_due: str = Field(description = "Exact Due date for bills or scheduled auto-debit date, format: YYYY-MM-DD")
    payment_method: str = Field(description = "Categorized as 'To Be Paid Manually', 'Online Pending', or 'Auto-Deducted'")


### GEMINI LOOP
# Suggestion: Strict Address Filtering: The pipeline needs a negative constraint ruleset preventing it from attaching corporate recipient addresses (like ノア道玄坂)
#to the property_unit_id field.
def genai_process(file):
    logging.info(f"---PROCESSING {file}---") 

    with open(file, "rb") as f:
        pdf_bytes = base64.b64encode(f.read()).decode("utf-8")

    document = {
        "type": "document",
        "data": pdf_bytes,
        "mime_type": "application/pdf"
    }
    
    prompt = {
        "type": "text",
        "text": "Please extract the invoice data from this document. Only output english"
    }

    input_payload = [document, prompt]

    interaction = client.interactions.create(
        model="gemini-3.5-flash",
        input=input_payload,
        response_format={
            "type": "text",
            "mime_type": "application/json",
            "schema": Invoice.model_json_schema()
        },
        generation_config={ "thinking_level": "low" },
        system_instruction=sys_instruction
    )

    return interaction.output_text
