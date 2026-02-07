import 'dotenv/config';
import { readInvestorData, writeClassification, writeFoundUrl } from './services/googleSheets.js';
import { fetchMultiplePages } from './services/websiteFetcher.js';
import { classifyInvestor } from './services/classifier.js';
import { searchForInvestorWebsite } from './services/webSearch.js';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1GTRWHzfxvXajKDpICn7DTc4tQRjBRIy8IR125yTtW_s';
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds to be respectful to servers

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log('===========================================');
  console.log('   Investor Classifier Agent Starting');
  console.log('===========================================\n');

  // Validate environment
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    console.error('Please create a .env file with your Anthropic API key.');
    process.exit(1);
  }

  console.log('Spreadsheet ID:', SPREADSHEET_ID);
  console.log('\nReading investor data from Google Sheets...\n');

  try {
    // Read all investors from spreadsheet
    const investors = await readInvestorData(SPREADSHEET_ID);

    if (investors.length === 0) {
      console.log('No investors found in the spreadsheet.');
      return;
    }

    console.log(`Found ${investors.length} investors to process.\n`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    let urlsFound = 0;

    for (const investor of investors) {
      console.log(`[${processed + skipped + 1}/${investors.length}] Processing: ${investor.name}`);

      // Skip if already successfully classified (but retry "Unable to fetch website" entries)
      const existingClassification = investor.classification?.trim() || '';
      if (existingClassification && !existingClassification.includes('Unable to fetch')) {
        console.log(`  Skipping - already classified as: ${existingClassification}`);
        skipped++;
        continue;
      }

      // Determine which URL to use
      let urlToFetch = investor.websiteUrl;
      let websiteContent = '';
      let usedSearchedUrl = false;

      // Try the original URL first (if it exists)
      if (urlToFetch && urlToFetch.trim() !== '') {
        console.log(`  Fetching website: ${urlToFetch}`);
        websiteContent = await fetchMultiplePages(urlToFetch);
      }

      // If original URL failed or was empty, try to find one via web search
      if (!websiteContent || websiteContent.length < 50) {
        if (urlToFetch && urlToFetch.trim() !== '') {
          console.log('  Warning: Could not fetch content from original URL');
        } else {
          console.log('  No website URL provided');
        }

        // Search for the investor's website
        const foundUrl = await searchForInvestorWebsite(investor.name);

        if (foundUrl) {
          console.log(`  Trying found URL: ${foundUrl}`);
          websiteContent = await fetchMultiplePages(foundUrl);

          if (websiteContent && websiteContent.length >= 50) {
            // Save the found URL to column D
            await writeFoundUrl(SPREADSHEET_ID, investor.rowIndex, foundUrl);
            usedSearchedUrl = true;
            urlsFound++;
            console.log(`  Saved found URL to column D`);
          }
        }
      }

      // If still no content, mark as unable to classify
      if (!websiteContent || websiteContent.length < 50) {
        console.log('  Error: Could not fetch website content from any source');
        const classification = 'Unable to fetch website';
        await writeClassification(SPREADSHEET_ID, investor.rowIndex, classification);
        errors++;
        await sleep(DELAY_BETWEEN_REQUESTS);
        continue;
      }

      console.log(`  Fetched ${websiteContent.length} characters of content${usedSearchedUrl ? ' (from searched URL)' : ''}`);

      // Classify the investor
      console.log('  Classifying with AI...');
      const classification = await classifyInvestor(investor.name, websiteContent);
      console.log(`  Classification: ${classification}`);

      // Write result to spreadsheet
      await writeClassification(SPREADSHEET_ID, investor.rowIndex, classification);
      console.log('  Written to spreadsheet\n');

      processed++;

      // Rate limiting delay
      await sleep(DELAY_BETWEEN_REQUESTS);
    }

    console.log('\n===========================================');
    console.log('           Processing Complete');
    console.log('===========================================');
    console.log(`Processed: ${processed}`);
    console.log(`URLs found via search: ${urlsFound}`);
    console.log(`Skipped (already classified): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${investors.length}`);

  } catch (error: any) {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  }
}

main();
