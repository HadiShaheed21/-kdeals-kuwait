
interface PromotionalBannerProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref?: string;
  className?: string;
}

export function PromotionalBanner({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  className = '',
}: PromotionalBannerProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 text-white
        min-h-[220px] sm:min-h-[300px] flex flex-col justify-center items-center text-center
        ${className}
      `}
    >
      {/* Decorative shapes */}
      <div className="absolute top-0 right-0 w-40 h-40 opacity-20 rounded-full bg-white blur-2xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10 rounded-full bg-white blur-2xl" />

      <div className="relative z-10 px-4">
        <h3 className="text-2xl sm:text-3xl font-bold leading-tight">{title}</h3>
        <p className="mt-2 text-sm sm:text-base opacity-95 max-w-xl">{subtitle}</p>
        {ctaHref ? (
          <a
            href={ctaHref}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-orange-600 font-semibold hover:bg-orange-50 transition-colors"
          >
            {ctaLabel}
          </a>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 text-white font-semibold backdrop-blur-sm">
            {ctaLabel}
          </div>
        )}
      </div>
    </div>
  );
}
