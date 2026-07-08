import { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/20 to-secondary/10 p-5 shadow-panel lg:flex lg:items-end lg:justify-between lg:gap-6">
      <div className="max-w-4xl">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">{eyebrow}</p>
        <h1 className="text-balance text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="mt-5 flex shrink-0 flex-wrap gap-2 lg:mt-0">{actions}</div> : null}
    </header>
  );
}
