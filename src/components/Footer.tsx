export default function Footer() {
  return (
    <footer className="w-full border-t border-border mt-10 py-4 px-4">
      <div dir="rtl" className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
        <span>تطوير</span>
        <a
          href="https://linktr.ee/SalhabBrothers"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          Salhab Brothers
        </a>
      </div>
    </footer>
  );
}
