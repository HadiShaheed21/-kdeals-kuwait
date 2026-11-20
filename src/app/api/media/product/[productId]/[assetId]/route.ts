import { NextResponse } from 'next/server';
import { signPublishedProductDocument, signPublishedProductImage } from '@/lib/supabase/cms/media';
import { streamPrivateMedia } from '@/lib/supabase/cms/media-response';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MediaRouteContext = {
  params: Promise<{ productId: string; assetId: string }>;
};

/**
 * Public delivery endpoint for a published product's private asset. It validates
 * the public product/media relationship before the server creates a short-lived
 * Storage URL, so neither a service-role credential nor a bucket path reaches
 * the browser.
 */
export async function GET(request: Request, { params }: MediaRouteContext) {
  const { productId, assetId } = await params;
  if (!uuidPattern.test(productId) || !uuidPattern.test(assetId)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const kind = new URL(request.url).searchParams.get('kind');
  if (kind !== null && kind !== 'document') {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const signed = kind === 'document'
      ? await signPublishedProductDocument(productId, assetId)
      : await signPublishedProductImage(productId, assetId);
    return streamPrivateMedia(signed, kind === 'document');
  } catch {
    // Do not disclose product publication, media, or Storage configuration state.
    return new NextResponse('Not found', { status: 404 });
  }
}
