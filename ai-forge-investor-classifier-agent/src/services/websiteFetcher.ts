import axios from 'axios';
import * as cheerio from 'cheerio';

const REQUEST_TIMEOUT = 15000; // 15 seconds

export async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    // Ensure URL has protocol
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    const response = await axios.get(normalizedUrl, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxRedirects: 5,
    });

    const html = response.data;
    return extractTextContent(html);
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      console.log(`  Timeout fetching ${url}`);
    } else if (error.response) {
      console.log(`  HTTP ${error.response.status} for ${url}`);
    } else {
      console.log(`  Error fetching ${url}: ${error.message}`);
    }
    return '';
  }
}

function extractTextContent(html: string): string {
  const $ = cheerio.load(html);

  // Remove script, style, and other non-content elements
  $('script, style, nav, footer, header, noscript, iframe, svg').remove();

  // Get text from important areas
  const importantSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '#content',
    '.main-content',
    'body',
  ];

  let text = '';

  // Try to find main content area first
  for (const selector of importantSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      text = element.text();
      if (text.length > 500) {
        break;
      }
    }
  }

  // Fallback to body if no good content found
  if (text.length < 200) {
    text = $('body').text();
  }

  return cleanText(text);
}

function cleanText(text: string): string {
  return text
    // Replace multiple whitespace with single space
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim()
    // Limit to reasonable length for AI processing (roughly 10k chars)
    .slice(0, 10000);
}

export async function fetchMultiplePages(baseUrl: string): Promise<string> {
  // Fetch main page
  const mainContent = await fetchWebsiteContent(baseUrl);

  // Try to fetch about page for more context
  let aboutContent = '';
  const aboutUrls = [
    `${baseUrl}/about`,
    `${baseUrl}/about-us`,
    `${baseUrl}/team`,
    `${baseUrl}/what-we-do`,
    `${baseUrl}/investment-criteria`,
    `${baseUrl}/portfolio`,
  ];

  for (const aboutUrl of aboutUrls.slice(0, 2)) {
    const content = await fetchWebsiteContent(aboutUrl);
    if (content.length > 200) {
      aboutContent += ' ' + content;
      break;
    }
  }

  return (mainContent + ' ' + aboutContent).trim();
}
