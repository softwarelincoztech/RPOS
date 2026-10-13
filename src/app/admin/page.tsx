"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Utensils
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { DEMO_STATS } from "@/lib/demo-data"; // Fallback for chart

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/admin/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard metrics");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  const { totalRevenue, totalOrders, averageOrderValue, activeOrdersCount, recentOrders, staffCount } = data || {};

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Overview</h1>
          <p className="text-muted">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary text-sm">Download Report</button>
          <div className="px-4 py-2 bg-surface-2 rounded-lg border border-border text-sm font-semibold">
            <span suppressHydrationWarning>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger-children">
        <StatCard 
          title="Today's Revenue" 
          value={formatCurrency(totalRevenue || 0)}
          trend="Live"
          isPositive={true}
          icon={CreditCard}
          colorClass="text-primary bg-primary-muted"
        />
        <StatCard 
          title="Total Orders" 
          value={totalOrders?.toString() || "0"}
          trend="Live"
          isPositive={true}
          icon={ShoppingBag}
          colorClass="text-accent bg-accent-muted"
        />
        <StatCard 
          title="Average Ticket" 
          value={formatCurrency(averageOrderValue || 0)}
          trend="Live"
          isPositive={true}
          icon={TrendingUp}
          colorClass="text-success bg-success-muted"
        />
        <StatCard 
          title="Active Orders" 
          value={activeOrdersCount?.toString() || "0"}
          trend="Cooking"
          isPositive={true}
          icon={Utensils}
          colorClass="text-info bg-info-muted"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        {/* Main Chart Area */}
        <div className="xl:col-span-2 glass-card p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Revenue Today (Simulation)</h2>
            <select className="bg-surface-3 border border-border text-sm rounded-md px-3 py-1 outline-none">
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>
          
          {/* Simple CSS Chart Visualization */}
          <div className="flex-1 flex items-end gap-2 pt-4 relative">
            <div className="absolute top-0 left-0 w-full h-px bg-border/50"></div>
            <div className="absolute top-1/4 left-0 w-full h-px bg-border/30 border-dashed"></div>
            <div className="absolute top-2/4 left-0 w-full h-px bg-border/30 border-dashed"></div>
            <div className="absolute top-3/4 left-0 w-full h-px bg-border/30 border-dashed"></div>
            
            {DEMO_STATS.revenueByHour.map((data, i) => {
              const maxAmt = Math.max(...DEMO_STATS.revenueByHour.map(d => d.amount));
              const height = `${(data.amount / maxAmt) * 100}%`;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 relative group z-10">
                  <div className="w-full bg-surface-3 rounded-t-md relative overflow-hidden transition-all duration-500 ease-out flex-1 flex items-end" style={{ height: '100%' }}>
                    <div 
                      className="w-full bg-gradient-primary rounded-t-md group-hover:opacity-80 transition-opacity" 
                      style={{ height }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-muted font-medium">{data.hour}</span>
                  
                  {/* Tooltip */}
                  <div className="absolute -top-10 bg-surface border border-border text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    {formatCurrency(data.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Items & Recent Activity */}
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 flex-1">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users size={18} className="text-accent" /> Staff Status
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-semibold text-sm">Total Staff Enrolled</span>
                <span className="font-bold text-primary">{staffCount || 0}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-semibold text-sm">Active Tables</span>
                <span className="font-bold text-warning">{activeOrdersCount || 0}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clock size={18} className="text-info" /> Recent Orders
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {recentOrders && recentOrders.length > 0 ? recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 border-dashed">
                  <div>
                    <p className="font-bold text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-muted">By {order.user?.name || "Server"} {order.table ? `• Table ${order.table.name}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(order.total)}</p>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase",
                      order.status === "COMPLETED" || order.status === "SERVED" ? "bg-emerald-500/10 text-emerald-500" :
                      order.status === "PENDING" ? "bg-blue-500/10 text-blue-500" :
                      order.status === "READY" ? "bg-success-muted text-success" :
                      "bg-warning-muted/50 text-warning"
                    )}>
                      {order.status}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted text-center py-4">No recent orders found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, isPositive, icon: Icon, colorClass }: any) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", colorClass)}>
          <Icon size={24} />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
          isPositive ? "bg-success-muted text-success" : "bg-danger-muted text-danger"
        )}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div>
        <h3 className="text-muted text-sm font-semibold tracking-wider uppercase mb-1">{title}</h3>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
