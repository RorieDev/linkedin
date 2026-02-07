import Anthropic from '@anthropic-ai/sdk';
import { INVESTOR_CATEGORIES, InvestorCategory } from '../types/index.js';

const anthropic = new Anthropic();

const CLASSIFICATION_PROMPT = `You are an expert at classifying UK-based investors based on their website content.

Analyze the provided website content for an investor and classify them into one or more of these categories:

1. **SEIS** - Seed Enterprise Investment Scheme investors
   - Look for: mentions of SEIS, Seed Enterprise Investment Scheme, SEIS tax relief, SEIS-qualifying investments, SEIS funds

2. **EIS** - Enterprise Investment Scheme investors
   - Look for: mentions of EIS, Enterprise Investment Scheme, EIS tax relief, EIS-qualifying investments, EIS funds

3. **Angel syndicates** - Groups of angel investors investing collectively
   - Look for: syndicate, angel network, angel group, collective investing, co-investment network, angel members, investment club

4. **Early Stage VCs** - Venture capital firms focused on seed/early stage
   - Look for: venture capital, VC fund, seed fund, pre-seed, seed stage, Series A, early stage fund, portfolio companies, startup investing, venture fund

5. **HNW** - High Net Worth individual investors
   - Look for: high net worth, private investor, family office, personal investments, individual investor, private capital

IMPORTANT INSTRUCTIONS:
- Return ONLY the matching category names as a comma-separated list
- If multiple categories apply, include all that match (e.g., "SEIS, EIS, Early Stage VCs")
- If no categories clearly match, return "Uncategorized"
- Do not include any explanation, just the categories
- Use the exact category names: SEIS, EIS, Angel syndicates, Early Stage VCs, HNW`;

export async function classifyInvestor(
  investorName: string,
  websiteContent: string
): Promise<string> {
  if (!websiteContent || websiteContent.length < 50) {
    return 'Unable to classify - insufficient website content';
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `${CLASSIFICATION_PROMPT}

Investor Name: ${investorName}

Website Content:
${websiteContent}

Classification:`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      return 'Uncategorized';
    }

    const classification = response.text.trim();

    // Validate the response contains valid categories
    const validatedCategories = validateClassification(classification);
    return validatedCategories;
  } catch (error: any) {
    console.error(`  Error classifying ${investorName}:`, error.message);
    return 'Error during classification';
  }
}

function validateClassification(classification: string): string {
  if (classification === 'Uncategorized' || classification.includes('Unable')) {
    return classification;
  }

  // Split by comma and validate each category
  const categories = classification.split(',').map((c) => c.trim());
  const validCategories = categories.filter((cat) =>
    INVESTOR_CATEGORIES.includes(cat as InvestorCategory)
  );

  if (validCategories.length === 0) {
    return 'Uncategorized';
  }

  return validCategories.join(', ');
}
