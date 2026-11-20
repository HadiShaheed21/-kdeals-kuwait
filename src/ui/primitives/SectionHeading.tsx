interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  icon,
  action,
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex gap-3 items-center">
        {icon && <span className="text-2xl">{icon}</span>}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="self-start sm:self-center">{action}</div>}
    </div>
  );
}
