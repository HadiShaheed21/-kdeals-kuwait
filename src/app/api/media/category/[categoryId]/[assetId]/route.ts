import { NextResponse } from 'next/server';
import { signPublishedCategoryImage } from '@/lib/supabase/cms/media';
import { streamPrivateMedia } from '@/lib/supabase/cms/media-response';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ categoryId: string; assetId: string }> }) {
  const { categoryId, assetId } = await params;
  if (!uuidPattern.test(categoryId) || !uuidPattern.test(assetId)) return new NextResponse('Not found', { status: 404 });
  try {
    return streamPrivateMedia(await signPublishedCategoryImage(categoryId, assetId));
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
