export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-7xl font-light text-muted-foreground">404</h1>
        <p className="font-body text-foreground">الصفحة غير موجودة</p>
        <a href="/" className="inline-block font-body text-sm text-primary hover:underline">
          العودة للرئيسية
        </a>
      </div>
    </div>
  );
}
