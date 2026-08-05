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
You are a precise data extraction assistant specializing in Japanese financial 
documents, receipts, and utility bills. 
Extract exactly 5 fields from the invoice document and output strictly valid JSON.

Fields to Extract:
1. property_unit_id: The specific property or apartment unit being billed (Full 
English address, building name, and room number). Set to "N/A" if no specific property site is mentioned.
2. billing_purpose: Concise categorization of the charge (e.g., Utilities, Taxes, 
Maintenance, Cleaning, Consumables, Corporate Overhead).
3. total_figure_amount: Final monetary figure due as a number.
4. deadline_due: Exact payment due date or scheduled auto-debit date in ISO format 
ONLY (YYYY-MM-DD). Convert Japanese era dates (e.g., 令和8年7月29日 -> 2026-07-29).
5. payment_method: Categorize strictly as one of: 'To Be Paid Manually', 'Online Pending', or 'Auto-Deducted'.

Document Structural Notes:
- Recipient Header vs. Service Address: Headers following 御中 (Onchu) or 様 (Sama) 
denote billing recipients (Asistee, Tokyo Stays, Tokyo Cleaner, or corporate clients).
Look deeper into the body for property anchors (回収場所, 物件名, ご使用場所, 作業場所) 
to extract the actual physical client site.
- Service Locations: Ensure clear distinction between general corporate bills and client site bills.
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
    filename: {filename}
    fileID: {fileID}
    
    ### RULES FOR property_unit_id EXTRACTION:
    
    1. RECIPIENT vs. SERVICE LOCATION DISTINCTION:
       - Invoices are often addressed to the company (e.g., Asistee, Tokyo Stays, Tokyo Cleaner) 
       or to corporate client entities (found near top headers following 御中 or 様). 
       - Some invoices list the company address as the billing/mailing recipient, but are 
       actually intended for a specific client property site.
       - Do NOT extract the mailing/billing recipient address as property_unit_id unless it 
       is explicitly specified as the actual service/worksite.
    
    2. SERVICE LOCATION (Primary Target):
       - Search specifically for service locations, property names, or usage sites. Common 
       Japanese indicators include:
         "ご使用場所", "ご使用先", "作業場所", "回収場所", "物件名", "物件コード", "〜様分", 
         "納入先", "送付先住所", or line item details.
       - If a distinct client property site or building name is identified:
         Extract the full English address, building name, and room number (e.g., "1-2-3 
         Maruyama-cho, Shibuya-ku, Tokyo #101" or "Sumida Bell Flat #202").
    
    3. AMAZON INVOICES ONLY (Specific Former HQ Rule):
       - ONLY for Amazon invoices directed to:
         "Itopia Shibuya-Sakuragaoka #202, 4-18 Sakuragaoka-cho, Shibuya, Tokyo 150-0031" 
         (or イトーピア渋谷桜ヶ丘202):
         Set property_unit_id to "{room_id}".
    
    4. GENERAL CORPORATE OVERHEAD / UNKNOWN LOCATION (Fallback):
       - If the invoice is strictly for general corporate operations/head office ({alias}) 
       AND no specific client service site or property location is mentioned anywhere, set 
       property_unit_id to "{room_id}".
       - DEFAULT RULE: If no specific service location is found, and it is NOT an internal 
       corporate bill or an Amazon invoice to Sakuragaoka, set property_unit_id strictly to "N/A".
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
