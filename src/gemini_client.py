#-- gemini_client.py
import config
import base64
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List, Optional

### GEMINI SETUP
client = genai.Client(api_key=config.GENAI_KEY)
sys_instruction = """
You are to extract exactly 5 pieces of information from an invoice document, and
output the info strictly within json. Extract: 
property_unit_id:Specific property or apartment unit being billed
billing_purpose:What the charge is for. (Utilities, Taxes, Maintenance, etc.)
total_figure_amount:Final Monetary Figure Due
deadline_due:Exact Due date for bills or scheduled auto-debit date, ISO format only (YYYY/MM/DD), if in integer
    format, reset it to ISO only
payment_method:Categorized as 'To Be Paid Manually', 'Online Pending', or 'Auto-Deducted'

All pieces of information are required, do not deviate from the structure, use minimal wording
with the property unit id being the exception for FULL addresses (In english).

Note that: Names following 御中 (Onchu) or 様 (Sama) at the top of Japanese invoices represent corporate client entities, 
but property unit names are introduced with 回収場所 (Collection Location) or 物件名 (Property Name). The corporate
entity you are for is Asistee with its sister businesses, Tokyo Stays, and Tokyo Cleaner.
"""

# References to company addresses should be replaced with the singular token
# Later evaluated within Supabase for a proper token
alias="Asistee, Asistee KK, Tokyo Stays, Tokyo Cleaner, both lower and uppercase"
room_id="HQ"

class Invoice(BaseModel):
    property_unit_id: str = Field(description = "Specific property or apartment unit being billed.")
    billing_purpose: str = Field(description = "What the charge is for. (Utilities, Taxes, Maintenance, etc.)")
    total_figure_amount: int = Field(description = "Final Monetary Figure Due.")
    deadline_due: str = Field(description = "Exact Due date for bills or scheduled auto-debit date, format: YYYY-MM-DD")
    payment_method: str = Field(description = "Categorized as 'To Be Paid Manually', 'Online Pending', or 'Auto-Deducted'")
    filename: str = Field(description = "Filename provided within the prompt.")
    fileID: str = Field(description = "Fileid provided within the prompt.")


### GEMINI LOOP
def genai_process(file, fileID, filename):
    pdf_bytes = base64.b64encode(file.read()).decode("utf-8")

    document = {
        "type": "document",
        "data": pdf_bytes,
        "mime_type": "application/pdf"
    }
    
    prompt = {
        "type": "text",
        "text": f"""
    Please extract the invoice data from this document.
    Only output English.
    Enforce ISO format (YYYY-MM-DD) for dates.
    Ignore Handwriting on Invoices. 
    filename: {filename}
    fileID: {fileID}
    
    ### RULES FOR property_unit_id EXTRACTION:
    1. PRIMARY TARGET (Service Location): 
       Look specifically for the service site, property name, or usage address 
       (e.g., "〜様分", "回収場所:", "作業場所:", "物件名:", "ご使用場所:", or line item detail addresses).
       If a specific property address or building name is found, extract its full address, building name, and room number.
    
    2. FALLBACK / EDGE CASE ({alias}):
        ONLY if no specific service site or property location is mentioned anywhere 
        on the document AND the invoice is for general corporate operations/head office ({alias}), set property_unit_id to "{room_id}".
        DO NOT default to "{room_id}" for non-corporate operations related to the specified names
    
    3. AMAZON INVOICES directed to Itopia Shibuya-Sakuragaoka #202, 4-18 Sakuragaoka-cho, Shibuya, Tokyo 150-0031:
        That is an old address, insert {room_id} for property_unit_id
    """
}

    input_payload = [document, prompt]

    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input=input_payload,
        response_format={
            "type": "text",
            "mime_type": "application/json",
            "schema": Invoice.model_json_schema()
        },
        generation_config={ "thinking_level": "medium" },
        system_instruction=sys_instruction
    )

    #print(f"Used about {interaction.usage.total_input_tokens} tokens")
    return interaction.output_text
