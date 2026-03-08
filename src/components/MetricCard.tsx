import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number | string;
  variant?: "default" | "positive" | "neutral" | "negative";
}

const variantStyles = {
  default: "border-border",
  positive: "border-emerald-500/30 bg-emerald-500/5",
  neutral: "border-primary/30 bg-primary/5",
  negative: "border-red-500/30 bg-red-500/5",
};

export default function MetricCard({ label, value, variant = "default" }: MetricCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 animate-fade-in", variantStyles[variant])}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}
