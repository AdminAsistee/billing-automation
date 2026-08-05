import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SAMPLES_FILE_PATH = path.join(process.cwd(), 'samples', 'Invoice Data_rows.json');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, newStatus, newPropertyId } = body;

    // Read current raw sample JSON
    const fileContent = fs.readFileSync(SAMPLES_FILE_PATH, 'utf-8');
    let sampleRows: any[] = JSON.parse(fileContent);

    if (action === 'UPDATE_STATUS') {
      sampleRows = sampleRows.map((row) => {
        if (String(row.id) === String(id) || String(row.invoice_row_id) === String(id)) {
          return {
            ...row,
            status: String(newStatus).toUpperCase(),
          };
        }
        return row;
      });
    } else if (action === 'UPDATE_PROPERTY_ID') {
      sampleRows = sampleRows.map((row) => {
        if (String(row.id) === String(id) || String(row.invoice_row_id) === String(id)) {
          return {
            ...row,
            property_id: newPropertyId,
          };
        }
        return row;
      });
    }

    // Write modified JSON back to disk for file persistence
    fs.writeFileSync(SAMPLES_FILE_PATH, JSON.stringify(sampleRows, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message: 'Sample file persisted successfully' });
  } catch (error: any) {
    console.error('Error mutating sample JSON file:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
