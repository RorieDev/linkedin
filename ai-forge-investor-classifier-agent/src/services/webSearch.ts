import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function searchForInvestorWebsite(investorName: string): Promise<string | null> {
  try {
    console.log(`  Searching web for ${investorName} website...`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Find the official website URL for this UK investor/investment firm: "${investorName}"

Return ONLY the website URL (e.g., https://example.com) and nothing else.
If you cannot find a website, return "NOT_FOUND".
Do not include any explanation or additional text.`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      return null;
    }

    const result = response.text.trim();

    if (result === 'NOT_FOUND' || !result.includes('.')) {
      return null;
    }

    // Clean up and validate the URL
    let url = result;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Remove any trailing punctuation or extra text
    url = url.split(/[\s,\n]/)[0];

    console.log(`  Found website: ${url}`);
    return url;
  } catch (error: any) {
    console.error(`  Error searching for ${investorName}:`, error.message);
    return null;
  }
}
