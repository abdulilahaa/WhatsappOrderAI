import * as cheerio from 'cheerio';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required for product extraction');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ScrapedProduct {
  name: string;
  description: string;
  price: string;
  imageUrl?: string;
  category?: string;
}

export interface ScrapeResult {
  success: boolean;
  products: ScrapedProduct[];
  error?: string;
  url: string;
}

export class WebScraper {
  
  async scrapeProductsFromUrl(url: string): Promise<ScrapeResult> {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        return {
          success: false,
          products: [],
          error: 'Invalid URL provided',
          url
        };
      }

      // Fetch the webpage
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        return {
          success: false,
          products: [],
          error: `Failed to fetch page: ${response.status} ${response.statusText}`,
          url
        };
      }

      const html = await response.text();
      
      // Parse HTML and extract content
      const $ = cheerio.load(html);
      
      // Extract text content and structured data
      const pageContent = this.extractPageContent($);
      
      // Use AI to intelligently extract product information
      const products = await this.extractProductsWithAI(pageContent, url);
      
      return {
        success: true,
        products,
        url
      };
      
    } catch (error: any) {
      return {
        success: false,
        products: [],
        error: error.message || 'Unknown error occurred during scraping',
        url
      };
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  private extractPageContent($: cheerio.CheerioAPI): string {
    // Remove script and style elements
    $('script, style, noscript').remove();
    
    // Try to find product-specific containers
    const productSelectors = [
      '.product',
      '.item',
      '[data-product]',
      '.service',
      '.menu-item',
      '.price',
      '.product-card',
      '.product-item',
      '.service-item'
    ];
    
    let productContent = '';
    
    // Extract content from potential product containers
    productSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const elementText = $(element).text().trim();
        if (elementText.length > 10 && elementText.length < 1000) {
          productContent += elementText + '\n\n';
        }
      });
    });
    
    // If no specific product content found, extract from common sections
    if (!productContent) {
      const fallbackSelectors = ['main', '.content', '.container', 'body'];
      for (const selector of fallbackSelectors) {
        const content = $(selector).first().text().trim();
        if (content.length > 100) {
          productContent = content.substring(0, 2000); // Limit content size
          break;
        }
      }
    }
    
    // Extract images that might be product images
    const images: string[] = [];
    $('img').each((_, element) => {
      const src = $(element).attr('src');
      const alt = $(element).attr('alt');
      if (src && (alt?.toLowerCase().includes('product') || alt?.toLowerCase().includes('service'))) {
        // Convert relative URLs to absolute
        try {
          const absoluteUrl = new URL(src, $('base').attr('href') || '').href;
          images.push(absoluteUrl);
        } catch {
          // Skip invalid URLs
        }
      }
    });
    
    if (images.length > 0) {
      productContent += '\n\nImages found: ' + images.slice(0, 5).join(', ');
    }
    
    return productContent.substring(0, 3000); // Limit to prevent token overflow
  }

  private async extractProductsWithAI(content: string, url: string): Promise<ScrapedProduct[]> {
    try {
      const prompt = `
You are a product extraction expert. Analyze the following webpage content and extract nail salon services/products.

Website URL: ${url}
Content: ${content}

Extract all nail salon services, beauty treatments, or products you can find. For each item, provide:
1. name: The service/product name
2. description: Brief description of what it includes
3. price: The price in the original currency (convert to KWD if needed, 1 USD ≈ 0.31 KWD)
4. category: Type of service (e.g., "Manicure", "Pedicure", "Nail Art", "Extensions")

Important guidelines:
- Only extract items that are clearly beauty/nail services or products
- Convert prices to KWD format (e.g., "25.00")
- Make descriptions concise but informative
- If multiple similar services exist, extract them as separate items
- Skip any non-beauty related items

Respond with a JSON array of products. Example format:
[
  {
    "name": "Classic Manicure",
    "description": "Traditional nail care with shaping, cuticle care, and polish application",
    "price": "15.00",
    "category": "Manicure"
  }
]

If no beauty/nail services are found, return an empty array [].
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a product extraction expert specializing in beauty and nail salon services. Extract only relevant beauty/nail services and products from webpage content. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = response.choices[0].message.content;
      if (!result) {
        return [];
      }

      // Parse the JSON response
      const parsed = JSON.parse(result);
      
      // Handle both array format and object with products array
      let products = Array.isArray(parsed) ? parsed : (parsed.products || []);
      
      // Validate and clean the extracted products
      return products
        .filter((product: any) => 
          product.name && 
          product.description && 
          product.price &&
          typeof product.name === 'string' &&
          typeof product.description === 'string'
        )
        .map((product: any) => ({
          name: product.name.trim().substring(0, 100),
          description: product.description.trim().substring(0, 500),
          price: this.cleanPrice(product.price),
          category: product.category?.trim().substring(0, 50) || 'Service'
        }))
        .slice(0, 10); // Limit to 10 products per scrape
        
    } catch (error: any) {
      console.error('AI extraction failed:', error);
      return [];
    }
  }

  private cleanPrice(price: string): string {
    if (typeof price !== 'string') {
      price = String(price);
    }
    
    // Remove currency symbols and extract numbers
    const numericPrice = price.replace(/[^\d.,]/g, '');
    const cleanedPrice = parseFloat(numericPrice.replace(',', '.'));
    
    if (isNaN(cleanedPrice)) {
      return '0.00';
    }
    
    // If price seems to be in USD, convert to KWD (approximate rate)
    if (cleanedPrice > 100) {
      return (cleanedPrice * 0.31).toFixed(2);
    }
    
    return cleanedPrice.toFixed(2);
  }
}

export const webScraper = new WebScraper();