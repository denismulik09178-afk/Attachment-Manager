import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-rose-400" />
        </div>
        <h1 className="text-2xl font-bold">Сторінку не знайдено</h1>
        <p className="text-sm text-muted-foreground">Ця сторінка не існує або була видалена</p>
        <Link href="/">
          <button className="mt-4 px-6 py-2.5 rounded-xl gradient-accent text-sm font-semibold text-background" data-testid="link-home">
            На головну
          </button>
        </Link>
      </div>
    </div>
  );
}
