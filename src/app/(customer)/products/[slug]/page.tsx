import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/services/products-extended';
import ProductDetailClient from './ProductDetailClient';

export const instant = false;

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    variant?: string | string[];
  }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: 'Product — K DEALS' };
  }

  return {
    title: `${product.nameEn} — K DEALS`,
    description: product.descriptionEn || 'Shop at K DEALS Kuwait',
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const { variant } = await searchParams;

  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const initialVariantId = Array.isArray(variant)
    ? variant[0]
    : variant;

  return (
    <ProductDetailClient
      product={product}
      initialVariantId={initialVariantId}
    />
  );
}
