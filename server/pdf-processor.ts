import PDFParser from 'pdf2json';
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
  return new Promise((resolve) => {
    try {
      console.log(`Processing PDF: ${filename}, Size: ${fileBuffer.length} bytes`);
      
      const pdfParser = new PDFParser();
      
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        console.error('PDF parsing error:', errData.parserError);
        resolve({
          success: false,
          services: [],
          error: 'Failed to parse PDF. The file might be corrupted or unsupported.'
        });
      });
      
      pdfParser.on("pdfParser_dataReady", async (pdfData: any) => {
        try {
          // Extract text from PDF
          const extractedText = pdfParser.getRawTextContent();
          
          if (!extractedText || extractedText.trim().length < 50) {
            resolve({
              success: false,
              services: [],
              error: 'No readable text found in PDF.',
              extractedText: extractedText
            });
            return;
          }
          
          console.log(`Extracted ${extractedText.length} characters from PDF`);
          
          // Use AI to extract services
          const services = await extractServicesWithAI(extractedText, filename);
          
          resolve({
            success: true,
            services,
            extractedText: extractedText.substring(0, 1000)
          });
          
        } catch (error: any) {
          console.error('Service extraction error:', error);
          resolve({
            success: false,
            services: [],
            error: 'Failed to extract services from PDF content'
          });
        }
      });
      
      // Parse the PDF buffer
      pdfParser.parseBuffer(fileBuffer);
      
    } catch (error: any) {
      console.error('PDF processing error:', error);
      resolve({
        success: false,
        services: [],
        error: error.message || 'Unknown error occurred during PDF processing'
      });
    }
  });
}

async function extractServicesWithAI(text: string, filename: string): Promise<ExtractedService[]> {
  try {
    const prompt = `
You are a service menu extraction expert for nail salons and beauty services. Analyze the following text from a PDF service menu and extract all beauty/nail services.

Filename: ${filename}
Text Content:
${text.substring(0, 6000)}

Extract all nail salon services, beauty treatments, or related services you can find. For each service, provide:

1. name: The service name (clean and professional)
2. description: Brief description of what the service includes
3. price: The price in numerical format (convert to KWD if needed, 1 USD ≈ 0.31 KWD)
4. category: Type of service (e.g., "Manicure", "Pedicure", "Nail Art", "Extensions", "Facial", "Massage")

Important guidelines:
- Only extract legitimate beauty/nail salon services
- Clean up service names (remove bullet points, numbers, special characters)
- Convert all prices to KWD format (e.g., "25.00")
- Make descriptions concise but informative
- Skip any non-service items (headers, contact info, policies, etc.)

Respond with a JSON object containing a "services" array. Example format:
{
  "services": [
    {
      "name": "Classic Manicure",
      "description": "Nail shaping, cuticle care, and polish application",
      "price": "15.00",
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
          content: "You are an expert at extracting service information from beauty salon menus. Always respond with valid JSON format. Focus only on actual services with pricing."
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
        category: service.category || 'Service'
      }))
      .filter((service: ExtractedService) => 
        service.name.length > 2 && 
        service.name.length < 100
      )
      .slice(0, 30);
      
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
  
  const numericPrice = price.replace(/[^\d.,]/g, '');
  const cleanedPrice = parseFloat(numericPrice.replace(',', '.'));
  
  if (isNaN(cleanedPrice) || cleanedPrice <= 0) {
    return '0.00';
  }
  
  if (cleanedPrice > 100) {
    return (cleanedPrice * 0.31).toFixed(2);
  }
  
  return cleanedPrice.toFixed(2);
}