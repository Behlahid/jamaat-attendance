/**
 * Parses NDEF messages to extract a raw text identifier.
 * Why: NFC tags store data in various formats. This normalizes text records and raw text decodes.
 */
export function extractTextFromNfcMessage(message) {
  if (!message || !message.records) return null;

  for (const rec of message.records) {
    try {
      let rawText = '';
      if (rec.recordType === 'text') {
        const view = new DataView(rec.data.buffer, rec.data.byteOffset, rec.data.byteLength);
        const status = view.getUint8(0);
        const langLen = status & 0x3F;
        const textBytes = new Uint8Array(rec.data.buffer, rec.data.byteOffset + 1 + langLen, rec.data.byteLength - 1 - langLen);
        rawText = new TextDecoder('utf-8').decode(textBytes);
      } else {
        rawText = new TextDecoder('utf-8').decode(rec.data);
      }
      
      // Strict Sanitization: Only allow alphanumeric characters and hyphens. 
      // Strips out all HTML tags, script injections, and malicious characters.
      const sanitizedText = rawText.replace(/[^a-zA-Z0-9-]/g, '');
      
      if (sanitizedText.length > 2) return sanitizedText;

    } catch (e) {
      console.warn("Failed to parse NFC record", e);
    }
  }
  return null;
}
