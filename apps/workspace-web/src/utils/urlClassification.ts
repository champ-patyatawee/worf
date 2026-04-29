const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const IMAGE_DOMAINS = ['imgur.com', 'giphy.com', 'tenor.com', 'i.imgur.com', 'i.redd.it'];

export interface ClassifiedUrl {
  url: string;
  isImage: boolean;
}

export function classifyUrls(text: string): ClassifiedUrl[] {
  const urlRegex = /https?:\/\/[^\s<>"]+/gi;
  const urls = text.match(urlRegex) || [];
  
  return urls.map(rawUrl => {
    const url = rawUrl.split('?')[0];
    const ext = url.split('.').pop()?.toLowerCase() || '';
    const isImage = IMAGE_EXTENSIONS.includes(ext) || 
                    IMAGE_DOMAINS.some(d => rawUrl.includes(d));
    return { url: rawUrl, isImage };
  });
}