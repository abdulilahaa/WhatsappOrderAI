import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
}

export default function StatsCard({ title, value, change, icon, iconBgColor, iconColor }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-600 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            {change && (
              <p className="text-green-600 text-sm mt-1">
                <i className="fas fa-arrow-up mr-1"></i>{change}
              </p>
            )}
          </div>
          <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
            <i className={`fas ${icon} ${iconColor} text-xl`}></i>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
