import Image from 'next/image';

interface CategoryCardProps {
  image: string;
  title: string;
  subtitle?: string;
  badge?: string;
  className?: string;
}

export function CategoryCard({
  image,
  title,
  subtitle,
  badge,
  className = '',
}: CategoryCardProps) {
  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm
        hover:shadow-md hover:-translate-y-1 transition-all duration-300
        ${className}
      `}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        {badge && (
          <span className="inline-block text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full mb-2">
            {badge}
          </span>
        )}
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
