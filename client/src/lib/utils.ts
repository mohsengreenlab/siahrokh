import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes Persian/Farsi (۰–۹) and Arabic-Indic (٠–٩) numerals to ASCII digits (0–9)
 * @param input - String containing numerals to normalize
 * @returns String with normalized ASCII digits
 */
export function normalizeNumerals(input: string): string {
  if (!input) return input;
  
  // Persian/Farsi numerals (۰–۹) to ASCII (0–9)
  const persianToAscii: { [key: string]: string } = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };
  
  // Arabic-Indic numerals (٠–٩) to ASCII (0–9) 
  const arabicToAscii: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  
  // Combine both mappings
  const numeralMap = { ...persianToAscii, ...arabicToAscii };
  
  // Replace each character if it exists in the mapping
  return input.replace(/[۰-۹٠-٩]/g, (char) => numeralMap[char] || char);
}
