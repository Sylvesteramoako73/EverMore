export function AuthHeading({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="text-4xl text-navy">{title}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
    </header>
  );
}
