// [graft] RECOVERED: invoice-ocr-service.ts (Vanessa's work).
// Source: massCode fragment "invoice-ocr-service.ts" (the more complete of the
// two recovered OCR versions — it carries the full system prompt + json_schema
// response_format and richer JSDoc; the alternate "2invoice-ocr-service.ts"
// only had a short user prompt). Adaptations are marked with `// [graft]`.

// [graft] Import path corrected from the recovered "./server/_core/llm" to
// "./_core/llm": this file lives in server/, so the path is relative to server/.
import { invokeLLM } from "./_core/llm";

export interface OCRExtractedData {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  contractorName?: string;
  contractorEmail?: string;
  contractorPhone?: string;
  subtotal?: number;
  gstAmount?: number;
  totalAmount?: number;
  description?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    category?: string;
  }>;
  confidence: number; // 0-100
  warnings: string[]; // Any issues detected during extraction
}

export class InvoiceOCRService {
  /**
   * Extract invoice data from PDF or image URL using LLM vision
   */
  static async extractFromDocument(documentUrl: string): Promise<OCRExtractedData> {
    try {
      const response = await invokeLLM({
        messages: [
          // [graft] The recovered fragment put the system instructions and the
          // file content under TWO `content` keys on a single object, so the
          // string (the prompt) was silently overwritten by the array (the
          // file). Preserved verbatim, that prompt would never reach the model.
          // Faithful fix: keep Vanessa's exact system prompt as a `system`
          // message, and attach the document as a separate `user` message —
          // the structure the alternate recovered version was reaching for.
          {
            role: "system",
            content: `You are an expert invoice processing system. Extract all relevant invoice information from the provided document.

Return a JSON object with the following structure:
{
  "invoiceNumber": "string",
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "contractorName": "string",
  "contractorEmail": "string",
  "contractorPhone": "string",
  "subtotal": number,
  "gstAmount": number,
  "totalAmount": number,
  "description": "string (overall invoice description/notes)",
  "lineItems": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "lineTotal": number,
      "category": "labour|materials|equipment|other"
    }
  ],
  "confidence": 0-100,
  "warnings": ["array of any issues found"]
}

Be precise with numbers. If GST is not shown but total is higher than subtotal, calculate it. If line items exist, verify they sum correctly.
Return ONLY valid JSON, no markdown formatting.`,
          },
          {
            role: "user",
            content: [
              {
                type: "file_url",
                // [graft] The local llm.ts FileContent type exposes `mime_type`
                // (not the recovered `detail`). Cast preserves Vanessa's intent
                // of passing a high-detail document reference; the alternate
                // recovered version also cast this part `as any`.
                file_url: {
                  url: documentUrl,
                  detail: "high",
                },
              } as any,
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "invoice_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                invoiceNumber: { type: "string" },
                invoiceDate: { type: "string" },
                dueDate: { type: "string" },
                contractorName: { type: "string" },
                contractorEmail: { type: "string" },
                contractorPhone: { type: "string" },
                subtotal: { type: "number" },
                gstAmount: { type: "number" },
                totalAmount: { type: "number" },
                description: { type: "string" },
                lineItems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      quantity: { type: "number" },
                      unitPrice: { type: "number" },
                      lineTotal: { type: "number" },
                      category: { type: "string" }
                    },
                    required: ["description", "quantity", "unitPrice", "lineTotal"]
                  }
                },
                confidence: { type: "number" },
                warnings: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["invoiceNumber", "totalAmount", "confidence", "warnings"],
              additionalProperties: false
            }
          }
        }
      });

      const content = response.choices[0].message.content;
      if (typeof content !== "string") {
        throw new Error("Unexpected response format from LLM");
      }

      const extracted = JSON.parse(content) as OCRExtractedData;

      // Validate extracted data
      if (!extracted.invoiceNumber) {
        extracted.warnings.push("Could not extract invoice number");
        extracted.confidence = Math.max(0, extracted.confidence - 10);
      }

      if (!extracted.totalAmount || extracted.totalAmount <= 0) {
        extracted.warnings.push("Invalid total amount");
        extracted.confidence = Math.max(0, extracted.confidence - 20);
      }

      // Verify math if we have subtotal and GST
      if (extracted.subtotal && extracted.gstAmount) {
        const calculated = extracted.subtotal + extracted.gstAmount;
        if (Math.abs(calculated - (extracted.totalAmount || 0)) > 0.01) {
          extracted.warnings.push(`Math check failed: subtotal (${extracted.subtotal}) + GST (${extracted.gstAmount}) != total (${extracted.totalAmount})`);
        }
      }

      // Verify line items sum
      if (extracted.lineItems && extracted.lineItems.length > 0) {
        const lineItemsTotal = extracted.lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
        if (Math.abs(lineItemsTotal - (extracted.subtotal || 0)) > 0.01) {
          extracted.warnings.push(`Line items total (${lineItemsTotal}) doesn't match subtotal (${extracted.subtotal})`);
        }
      }

      return extracted;
    } catch (error) {
      console.error("OCR extraction failed:", error);
      throw new Error(`Failed to extract invoice data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate GST amount if not provided
   */
  static calculateGST(subtotal: number, gstRate: number = 0.15): number {
    return Math.round(subtotal * gstRate * 100) / 100;
  }

  /**
   * Validate extracted invoice data
   */
  static validateExtraction(data: OCRExtractedData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.invoiceNumber) {
      errors.push("Invoice number is required");
    }

    if (!data.totalAmount || data.totalAmount <= 0) {
      errors.push("Total amount must be greater than 0");
    }

    if (data.invoiceDate && isNaN(new Date(data.invoiceDate).getTime())) {
      errors.push("Invalid invoice date format");
    }

    if (data.dueDate && isNaN(new Date(data.dueDate).getTime())) {
      errors.push("Invalid due date format");
    }

    if (data.confidence < 50) {
      errors.push(`Low confidence score (${data.confidence}%) - manual review recommended`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
