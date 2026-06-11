import { useNavigate } from "react-router-dom";
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <PackageSearch className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Page not found</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          This page does not exist. Head back to Discover.
        </p>
      </div>
      <Button onClick={() => navigate("/")}>Go to Discover</Button>
    </div>
  );
}
