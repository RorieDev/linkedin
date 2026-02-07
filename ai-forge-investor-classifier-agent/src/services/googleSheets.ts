import { google, sheets_v4 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { InvestorRow } from '../types/index.js';

let sheetsClient: sheets_v4.Sheets | null = null;

export async function initializeSheets(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient;

  const keyFilePath = path.join(process.cwd(), 'service-account.json');

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(
      'Missing service-account.json file. Please download your service account key from Google Cloud Console and save it as service-account.json in the project root.'
    );
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

export async function readInvestorData(spreadsheetId: string): Promise<InvestorRow[]> {
  const sheets = await initializeSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A:D', // Read columns A, B, C, and D
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    console.log('No data found in spreadsheet.');
    return [];
  }

  // Skip header row (index 0), process data rows
  const investors: InvestorRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = row[0] || '';
    const websiteUrl = row[1] || '';
    const classification = row[2] || '';
    const foundUrl = row[3] || '';

    if (name) {
      investors.push({
        rowIndex: i + 1, // 1-indexed for Sheets API
        name,
        websiteUrl,
        classification,
        foundUrl,
      });
    }
  }

  return investors;
}

export async function writeClassification(
  spreadsheetId: string,
  rowIndex: number,
  classification: string
): Promise<void> {
  const sheets = await initializeSheets();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `C${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[classification]],
    },
  });
}

export async function writeFoundUrl(
  spreadsheetId: string,
  rowIndex: number,
  url: string
): Promise<void> {
  const sheets = await initializeSheets();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `D${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[url]],
    },
  });
}
