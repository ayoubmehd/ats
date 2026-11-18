import { buttonVariants } from "@/components/ui/button";

export function BoardHeader() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <a href="/" className="text-lg font-semibold">
        ATS
      </a>
      <a href="/signin" className={buttonVariants({ variant: "outline" })}>
        Sign in
      </a>
    </header>
  );
}
