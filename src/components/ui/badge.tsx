import { cn } from "@/utils/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        variant === "default" &&
          "bg-accent text-accent-foreground",
        variant === "secondary" &&
          "bg-muted text-muted-foreground",
        variant === "outline" &&
          "border border-border text-muted-foreground",
        variant === "success" &&
          "bg-success/10 text-success",
        variant === "warning" &&
          "bg-warning/10 text-warning",
        variant === "destructive" &&
          "bg-destructive/10 text-destructive",
        className,
      )}
      {...props}
    />
  );
}
