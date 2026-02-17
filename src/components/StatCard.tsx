import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "profit" | "loss" | "neutral";
  icon: LucideIcon;
}

const StatCard = ({ label, value, change, changeType = "neutral", icon: Icon }: StatCardProps) => {
  const changeColor =
    changeType === "profit"
      ? "text-profit"
      : changeType === "loss"
      ? "text-loss"
      : "text-muted-foreground";

  return (
    <div className="glass-card stat-glow p-4 sm:p-5 animate-slide-up">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 sm:space-y-2 min-w-0">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          <p className="font-mono text-base sm:text-2xl font-bold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">{value}</p>
          {change && (
            <p className={`font-mono text-[10px] sm:text-xs font-medium ${changeColor} truncate`}>
              {change}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-2 sm:p-2.5 shrink-0">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
