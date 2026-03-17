/**
 * Phone number utilities for Brazilian numbers
 * 
 * All phone numbers are stored in the database as: 55XXXXXXXXXXX (E.164 format)
 * Display format: (0XX) 9XXXX-XXXX
 */

/**
 * Normalize a phone number to E.164 format (55XXXXXXXXXXX)
 * 
 * Handles various input formats:
 * - "61999573221" → "5561999573221"
 * - "061999573221" → "5561999573221"
 * - "5561999573221" → "5561999573221"
 * - "61 99957-3221" → "5561999573221"
 * - "+55 61 99957-3221" → "5561999573221"
 */
export function normalizePhone(input: string): string {
  if (!input) return '';
  
  // Remove all non-digit characters
  let digits = input.replace(/\D/g, '');
  
  // Remove leading zeros
  digits = digits.replace(/^0+/, '');
  
  // If it doesn't start with 55, add it
  if (!digits.startsWith('55')) {
    digits = '55' + digits;
  }
  
  // Validate length (should be 13 digits: 55 + DDD + 9 digits number)
  // Or 12 digits for landlines (55 + DDD + 8 digits)
  if (digits.length < 12 || digits.length > 13) {
    console.warn(`[normalizePhone] Unusual phone length: ${digits} (input: ${input})`);
  }
  
  return digits;
}

/**
 * Format a phone number for display: (0XX) 9XXXX-XXXX
 * 
 * Input should be E.164 format: 55XXXXXXXXXXX
 * Output: (061) 99957-3221
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Extract parts (assuming 55XXXXXXXXXXX or XXXXXXXXXXX)
  let countryCode = '';
  let ddd = '';
  let number = '';
  
  if (digits.length === 13 && digits.startsWith('55')) {
    // 55 + DDD (2) + number (9)
    countryCode = '55';
    ddd = digits.slice(2, 4);
    number = digits.slice(4);
  } else if (digits.length === 12 && digits.startsWith('55')) {
    // 55 + DDD (2) + number (8) - landline
    countryCode = '55';
    ddd = digits.slice(2, 4);
    number = digits.slice(4);
  } else if (digits.length === 11) {
    // DDD (2) + number (9) - no country code
    ddd = digits.slice(0, 2);
    number = digits.slice(2);
  } else if (digits.length === 10) {
    // DDD (2) + number (8) - landline, no country code
    ddd = digits.slice(0, 2);
    number = digits.slice(2);
  } else {
    // Fallback: just return as-is with basic formatting
    return phone;
  }
  
  // Format number part
  let formattedNumber: string;
  if (number.length === 9) {
    // Mobile: 9XXXX-XXXX
    formattedNumber = `${number.slice(0, 5)}-${number.slice(5)}`;
  } else if (number.length === 8) {
    // Landline: XXXX-XXXX
    formattedNumber = `${number.slice(0, 4)}-${number.slice(4)}`;
  } else {
    formattedNumber = number;
  }
  
  return `(0${ddd}) ${formattedNumber}`;
}

/**
 * Format phone for WhatsApp/JID (just digits with @s.whatsapp.net)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const normalized = normalizePhone(phone);
  return `${normalized}@s.whatsapp.net`;
}

/**
 * Validate if a phone number looks like a valid Brazilian mobile number
 */
export function isValidMobilePhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // 55 + DDD (2) + 9 + 8 digits = 13 total
  return normalized.length === 13 && normalized[4] === '9';
}

/**
 * Strip the 55 country code for display (returns just DDD + number)
 */
export function stripCountryCode(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits.slice(2);
  }
  return digits;
}