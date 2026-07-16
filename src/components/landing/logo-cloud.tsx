import { Container } from "@/components/ui/section";

const logos = [
  "Monad",
  "Open builders",
  "Shield Labs",
  "Creator DAO",
  "ZK Guild",
  "Privacy First",
];

export function LogoCloud() {
  return (
    <div className="border-t border-line py-12">
      <Container>
        <p className="mb-8 text-center text-sm text-muted">
          Built for teams who take privacy seriously
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {logos.map((name) => (
            <span
              key={name}
              className="text-sm font-semibold tracking-wide text-faint"
            >
              {name}
            </span>
          ))}
        </div>
      </Container>
    </div>
  );
}
