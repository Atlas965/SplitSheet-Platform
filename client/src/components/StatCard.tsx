interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  "data-testid"?: string;
}

export default function StatCard({ title, value, icon, iconBg, iconColor, "data-testid": testId }: StatCardProps) {
  return (
    <div
      className="bg-card p-6 rounded-xl border border-border hover:shadow-md hover:-translate-y-0.5 transition-all"
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center text-lg`}>
          <i className={`${icon} ${iconColor}`}></i>
        </div>
      </div>
    </div>
  );
}
