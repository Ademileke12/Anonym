import { Container, Section } from "@/components/ui/section";
import { ShieldCheck } from "lucide-react";

export function PrivacySection() {
  return (
    <Section>
      <Container>
        <div className="mx-auto max-w-3xl rounded-[var(--radius-card)] border border-line bg-subtle px-8 py-12 text-center shadow-[var(--shadow-card)] md:px-14">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-card shadow-[var(--shadow-xs)]">
            <ShieldCheck className="size-6 text-ink" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            No private keys in the app. No direct P2P.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            You sign with your browser wallet (MetaMask, Rabby, etc.). Funds sit
            in smart-contract vaults or your claim queue, Anonym never asks for
            or stores private keys. Settlement is verified on Monad; relationships
            stay off the public payment graph.
          </p>
        </div>
      </Container>
    </Section>
  );
}
