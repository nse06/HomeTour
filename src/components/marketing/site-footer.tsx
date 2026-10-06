import Link from "next/link";
import { Logo } from "@/components/logo";
import { LANDING_PAGES } from "@/content/landing-pages";
import { DEMO_PATH } from "@/lib/demo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-3">
            Interactive property walkthroughs from the photos you already have. Not a 3D scan — something you can make in minutes.
          </p>
        </div>
        <FooterCol title="Product">
          <FooterLink href="/create">Create a tour</FooterLink>
          <FooterLink href={DEMO_PATH}>Example tour</FooterLink>
          <FooterLink href="/pricing">Pricing</FooterLink>
          <FooterLink href="/#how-it-works">How it works</FooterLink>
        </FooterCol>
        <FooterCol title="Use cases">
          {LANDING_PAGES.map((p) => (
            <FooterLink key={p.slug} href={`/${p.slug}`}>
              {p.eyebrow}
            </FooterLink>
          ))}
        </FooterCol>
        <FooterCol title="Account">
          <FooterLink href="/login">Log in</FooterLink>
          <FooterLink href="/signup">Create account</FooterLink>
          <FooterLink href="/app">My tours</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-5 py-6 text-xs text-ink-4 sm:px-8">
          © {new Date().getFullYear()} HomeTour. Demo photography via Unsplash; 360° panorama via Poly Haven (CC0).
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-4">{title}</h3>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-ink-2 transition-colors hover:text-ink">
        {children}
      </Link>
    </li>
  );
}
