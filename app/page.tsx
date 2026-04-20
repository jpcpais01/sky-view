import Link from "next/link";

export default function Home() {
  return (
    <div className="relative starfield min-h-[100dvh] flex flex-col px-6 pt-[max(env(safe-area-inset-top),20px)] pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <header className="float-in pt-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--accent-strong)]/80 font-semibold">
          Sky View
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-semibold leading-[1.05] tracking-tight">
          A pocket
          <br />
          <span className="bg-gradient-to-r from-[#a8c4ff] via-[#fff7d6] to-[#ffaf68] bg-clip-text text-transparent">
            planetarium.
          </span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--foreground)]/85 max-w-[36ch]">
          Identify the stars, planets, the Moon and constellations above you in
          real time — using nothing but your phone.
        </p>
      </header>

      <section className="mt-10 grid gap-3">
        <ActionCard
          href="/sky"
          accent="#7aa2ff"
          eyebrow="Live"
          title="Sky View"
          description="Point your phone at the sky to identify what's above you."
          icon={
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
          }
        />
        <ActionCard
          href="/explore"
          accent="#ffaf68"
          eyebrow="Browse"
          title="Explore the sky"
          description="Pan and zoom freely. Tap any star, planet or constellation."
          icon={
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" />
            </svg>
          }
        />
      </section>

      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-[0.22em] text-[var(--muted)] font-semibold">
          What you can find
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-2.5 text-[13px]">
          <Tag color="#ffd267">Sun</Tag>
          <Tag color="#f4ecd0">Moon &amp; phase</Tag>
          <Tag color="#ff7a55">Mars · Jupiter · Saturn</Tag>
          <Tag color="#a8c4ff">Brightest stars</Tag>
          <Tag color="#7aa2ff">12 constellations</Tag>
          <Tag color="#cfa6ff">Andromeda · Pleiades</Tag>
        </ul>
      </section>

      <p className="mt-auto pt-10 text-[12px] text-[var(--muted)] leading-relaxed">
        Works best on a phone outdoors, away from city lights. Add to your home
        screen for a full-screen experience.
      </p>
    </div>
  );
}

function ActionCard({
  href,
  accent,
  eyebrow,
  title,
  description,
  icon,
}: {
  href: string;
  accent: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="group glass relative overflow-hidden rounded-3xl px-5 py-5 flex items-start gap-4 transition-transform active:scale-[0.99]"
      style={{ borderColor: `${accent}33` }}
    >
      <div
        className="shrink-0 size-12 rounded-2xl flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${accent}33, ${accent}10)`,
          color: accent,
          border: `1px solid ${accent}44`,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] uppercase tracking-[0.22em] font-semibold"
          style={{ color: accent }}
        >
          {eyebrow}
        </p>
        <h3 className="mt-1 text-lg font-semibold leading-tight">{title}</h3>
        <p className="mt-1 text-[13.5px] text-[var(--foreground)]/75 leading-snug">
          {description}
        </p>
      </div>
      <svg
        className="self-center text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <li className="glass rounded-xl px-3 py-2.5 flex items-center gap-2 text-[var(--foreground)]/85">
      <span
        className="size-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}AA` }}
      />
      <span className="truncate">{children}</span>
    </li>
  );
}
