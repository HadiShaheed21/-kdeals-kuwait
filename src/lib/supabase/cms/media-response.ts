import 'server-only';

import { NextResponse } from 'next/server';
import type { SignedMediaUrl } from './types';

/** Streams a server-signed object without disclosing its signed URL to clients. */
export async function streamPrivateMedia(signed: SignedMediaUrl, document = false): Promise<NextResponse> {
  const object = await fetch(signed.url, { cache: 'no-store' });
  if (!object.ok || !object.body) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(object.body, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': object.headers.get('Content-Type') || (document ? 'application/pdf' : 'application/octet-stream'),
      'X-Content-Type-Options': 'nosniff',
      ...(document ? { 'Content-Disposition': 'attachment' } : {}),
    },
  });
}
