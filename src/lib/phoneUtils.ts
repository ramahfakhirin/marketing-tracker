export function extractPhoneNumber(text: string): string | null {
  if (!text) return null;
  // Look for sequence of digits, spaces, hyphens, pluses
  const match = text.match(/(?:\+62|62|08)[0-9\s-]{8,15}/);
  if (!match) return null;
  
  // Clean non-digits
  let cleaned = match[0].replace(/[^0-9]/g, '');
  
  // Convert 08... to 628...
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  
  // If it starts with 8..., assume 628...
  if (cleaned.startsWith('8') && cleaned.length >= 9 && cleaned.length <= 13) {
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
