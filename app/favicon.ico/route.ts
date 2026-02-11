const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#e9692c"/><text x="16" y="21" text-anchor="middle" font-size="16" font-family="Arial" fill="white">S</text></svg>`;

export async function GET() {
  return new Response(fallbackSvg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
