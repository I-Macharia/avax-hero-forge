export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-20 py-8 text-center text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>
          Built for <span className="font-semibold text-foreground">Team1 Africa</span> ·{" "}
          <span className="gradient-text font-semibold">AvaxAfrica</span> MiniHack.
        </p>
        <p className="text-xs">
          Powered by Avalanche · Fuji testnet · NFT badges are soulbound.
        </p>
      </div>
    </footer>
  );
}
