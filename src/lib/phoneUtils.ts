export function extractPhoneNumber(text: string): string | null {
  if (!text) return null;

  // Look for a sequence starting with +62/62/08, allowing space/hyphen/dot/slash separators
  let match = text.match(/(?:\+62|62|08)[0-9\s.\-\/]{7,15}/);
  // Fallback: a bare mobile number starting with 8 but missing the leading 0, e.g. "812-3456-7890"
  if (!match) {
    match = text.match(/\b8[0-9\s.\-\/]{7,14}/);
  }
  if (!match) return null;

  // Clean non-digits
  let cleaned = match[0].replace(/[^0-9]/g, '');
  if (cleaned.length < 9) return null;

  // Convert 08... to 628...
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    // Bare local number without country/trunk prefix, e.g. "8123456789"
    cleaned = '62' + cleaned;
  }

  return cleaned;
}

export function generateWhatsAppLink(phoneNumber: string, schoolName: string, status: string): string {
  const cleanNum = extractPhoneNumber(phoneNumber);
  if (!cleanNum) return '';
  
  const text = `Halo, saya Account Executive dari tim Marketing. Terkait penawaran layanan kami untuk sekolah *${schoolName}*, bagaimana kabarnya ya kak? Semoga sehat selalu.`;
  return `https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`;
}

export function formatIndonesianDate(dateString: string | Date): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) {
    return String(dateString); // Return raw string if not a valid JS date
  }
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
