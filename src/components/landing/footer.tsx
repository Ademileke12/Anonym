import Link from "next/link";
import { Container } from "@/components/ui/section";
import { AnonymLogo } from "@/components/brand/logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-base py-12">
      <Container className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <Link href="/" className="flex items-center">
          <AnonymLogo size={28} />
        </Link>
        <p className="text-sm text-muted">
          Private payments via vaults. Private fundraising. Built on Monad.
        </p>
        <div className="flex gap-4 text-sm text-muted">
          <Link href="/app" className="hover:text-ink">
            App
          </Link>
          <a href="#faq" className="hover:text-ink">
            FAQ
          </a>
        </div>
      </Container>
    </footer>
  );
}
