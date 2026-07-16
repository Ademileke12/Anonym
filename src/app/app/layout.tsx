import { AppSidebar } from "@/components/app/sidebar";
import { AppTopbar } from "@/components/app/topbar";
import { AppGate } from "@/components/app/gate";
import { NetworkBanner } from "@/components/wallet/network-banner";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh min-h-screen items-stretch bg-base">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <NetworkBanner />
        <main className="min-h-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <AppGate>{children}</AppGate>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
