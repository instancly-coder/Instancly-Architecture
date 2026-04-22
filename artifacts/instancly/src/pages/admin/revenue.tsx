import { Link } from "wouter";
import { Box, TrendingUp } from "lucide-react";
import { mockAdminStats } from "@/lib/mock-data";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { name: 'Jan', profit: 4000, cost: 2400 },
  { name: 'Feb', profit: 3000, cost: 1398 },
  { name: 'Mar', profit: 2000, cost: 9800 },
  { name: 'Apr', profit: 2780, cost: 3908 },
  { name: 'May', profit: 1890, cost: 4800 },
  { name: 'Jun', profit: 2390, cost: 3800 },
  { name: 'Jul', profit: 3490, cost: 4300 },
];

export default function AdminRevenue() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-border bg-surface h-14 flex items-center px-6 sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 mr-8">
          <Box className="w-5 h-5 text-primary" />
          <span className="font-bold tracking-tight">instancly admin</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/admin" className="text-secondary hover:text-foreground">Overview</Link>
          <Link href="/admin/users" className="text-secondary hover:text-foreground">Users</Link>
          <Link href="/admin/models" className="text-secondary hover:text-foreground">Models</Link>
          <Link href="/admin/revenue" className="text-primary font-medium">Revenue</Link>
        </div>
      </nav>

      <main className="p-8 max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold tracking-tight mb-8">Revenue & Margins</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 border border-border bg-surface rounded-xl flex items-center justify-between">
            <div>
              <div className="text-secondary text-sm mb-1">Monthly Recurring Revenue</div>
              <div className="text-3xl font-bold font-mono">{mockAdminStats.mrr}</div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-surface-raised flex items-center justify-center text-primary">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="p-6 border border-border bg-surface rounded-xl flex items-center justify-between">
            <div>
              <div className="text-secondary text-sm mb-1">Compute Cost (30d)</div>
              <div className="text-3xl font-bold font-mono">£3,420</div>
            </div>
          </div>
          <div className="p-6 border border-border bg-surface rounded-xl flex items-center justify-between">
            <div>
              <div className="text-secondary text-sm mb-1">Est. Margin</div>
              <div className="text-3xl font-bold font-mono text-success">72.5%</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 border border-border bg-surface rounded-xl p-6 h-[400px] flex flex-col">
            <h2 className="font-bold mb-6">Profit vs Cost Margin</h2>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `£${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111111', borderColor: '#2A2A2A', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="profit" stackId="1" stroke="#00ffee" fill="#00ffee" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="cost" stackId="2" stroke="#555555" fill="#555555" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-border bg-surface rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border font-bold">Cost by Model (30d)</div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border hover:bg-surface-raised/30">
                  <td className="p-4 font-mono">Claude Sonnet 4.5</td>
                  <td className="p-4 text-right font-mono">£1,240.50</td>
                </tr>
                <tr className="border-b border-border hover:bg-surface-raised/30">
                  <td className="p-4 font-mono">GPT-4o</td>
                  <td className="p-4 text-right font-mono">£890.20</td>
                </tr>
                <tr className="border-b border-border hover:bg-surface-raised/30">
                  <td className="p-4 font-mono">Claude Opus</td>
                  <td className="p-4 text-right font-mono">£840.00</td>
                </tr>
                <tr className="border-b border-border hover:bg-surface-raised/30">
                  <td className="p-4 font-mono">Gemini 2.5 Pro</td>
                  <td className="p-4 text-right font-mono">£310.15</td>
                </tr>
                <tr className="hover:bg-surface-raised/30">
                  <td className="p-4 font-mono">GPT-4o mini</td>
                  <td className="p-4 text-right font-mono">£139.15</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}