import pdf from 'pdf-parse-new';
import OpenAI from 'openai';
import { Buffer } from 'buffer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ExtractedService {
  name: string;
  description: string;
  price: string;
  category?: string;
}

export interface PDFProcessResult {
  success: boolean;
  services: ExtractedService[];
  error?: string;
  extractedText?: string;
}

export async function processPDFServices(fileBuffer: Buffer, filename: string): Promise<PDFProcessResult> {
  try {
    console.log(`Processing PDF: ${filename}, Size: ${fileBuffer.length} bytes`);
    
    // Parse PDF
    const data = await pdf(fileBuffer);
    
    if (!data.text || data.text.trim().length < 50) {
      return {
        success: false,
        services: [],
        error: 'No readable text found in PDF. The PDF might be image-based or contain non-extractable content.',
        extractedText: data.text
      };
    }
    
    console.log(`Extracted ${data.text.length} characters from ${data.numpages} pages`);
    
    // Use AI to extract services
    const services = await extractServicesWithAI(data.text, filename);
    
    return {
      success: true,
      services,
      extractedText: data.text.substring(0, 1000)
    };
    
  } catch (error: any) {
    console.error('PDF processing error:', error);
    return {
      success: false,
      services: [],
      error: error.message || 'Unknown error occurred during PDF processing'
    };
  }
}

async function extractServicesWithAI(text: string, filename: string): Promise<ExtractedService[]> {
  try {
    const prompt = `
You are a service menu extraction expert for nail salons and beauty services. Analyze the following text from a PDF service menu and extract all beauty/nail services.

Filename: ${filename}
Text Content:
${text.substring(0, 8000)}

Extract all nail salon services, beauty treatments, or related services you can find. For each service, provide:

1. name: The service name (clean and professional)
2. description: Brief description of what the service includes
3. price: The price in numerical format (convert to KWD if needed, 1 USD ≈ 0.31 KWD)
4. category: Type of service (e.g., "Manicure", "Pedicure", "Nail Art", "Extensions", "Facial", "Massage")

Important guidelines:
- Only extract legitimate beauty/nail salon services
- Look for patterns like service names followed by prices
- Clean up service names (remove bullet points, numbers, special characters)
- Convert all prices to KWD format (e.g., "25.00")
- Make descriptions concise but informative
- If a price range is given, use the starting price
- Skip any non-service items (headers, contact info, policies, etc.)

Respond with a JSON object containing a "services" array. Example format:
{
  "services": [
    {
      "name": "Classic Manicure",
      "description": "Nail shaping, cuticle care, and polish application",
      "price": "0.00",
      "category": "Manicure"
    },
    {
      "name": "Gel Extensions",
      "description": "Full set gel nail extensions with shaping and polish",
      "price": "35.00",
      "category": "Extensions"
    }
  ]
}

If no services are found, return {"services": []}.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at extracting service information from beauty salon menus. Always respond with valid JSON format. Focus only on actual services with pricing. Be thorough in finding all services even if the text formatting is messy."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const result = response.choices[0].message.content;
    if (!result) {
      return [];
    }

    const parsed = JSON.parse(result);
    const services = parsed.services || [];
    
    return services
      .filter((service: any) => 
        service.name && 
        service.description && 
        service.price &&
        typeof service.name === 'string' &&
        typeof service.description === 'string'
      )
      .map((service: any) => ({
        name: cleanServiceName(service.name),
        description: cleanDescription(service.description),
        price: cleanPrice(service.price),
        category: cleanCategory(service.category)
      }))
      .filter((service: ExtractedService) => 
        service.name.length > 2 && 
        service.name.length < 100
      )
      .slice(0, 50); // Allow up to 50 services
      
  } catch (error: any) {
    console.error('AI extraction failed:', error);
    return [];
  }
}

function cleanServiceName(name: string): string {
  if (typeof name !== 'string') return 'Service';
  
  return name
    .replace(/^[\d\.\-\*\+\s]+/, '')
    .replace(/[^\w\s\-\&\(\)]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
}

function cleanDescription(description: string): string {
  if (typeof description !== 'string') return '';
  
  return description
    .replace(/[^\w\s\-\,\.\(\)]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

function cleanPrice(price: string): string {
  if (typeof price !== 'string') {
    price = String(price);
  }
  
  // Remove currency symbols and extract numbers
  const numericPrice = price.replace(/[^\d.,]/g, '');
  const cleanedPrice = parseFloat(numericPrice.replace(',', '.'));
  
  if (isNaN(cleanedPrice) || cleanedPrice <= 0) {
    return '0.00';
  }
  
  // Assume prices over 100 are likely in a different currency (not KWD)
  if (cleanedPrice > 100) {
    return (cleanedPrice * 0.31).toFixed(2);
  }
  
  return cleanedPrice.toFixed(2);
}

function cleanCategory(category: any): string {
  if (typeof category !== 'string') return 'Service';
  
  const standardCategories = [
    'Manicure', 'Pedicure', 'Nail Art', 'Extensions', 
    'Facial', 'Massage', 'Waxing', 'Eyebrows', 'Eyelashes'
  ];
  
  const categoryStr = String(category).trim();
  const normalized = categoryStr.toLowerCase();
  
  for (const cat of standardCategories) {
    if (normalized.includes(cat.toLowerCase())) {
      return cat;
    }
  }
  
  return categoryStr.substring(0, 30) || 'Service';
}