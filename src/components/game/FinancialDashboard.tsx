import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Project } from '@/types/game';
import { FinancialEngine, Transaction, FinancialSummary } from './FinancialEngine';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Activity, PieChart as PieChartIcon, Ticket } from 'lucide-react';

interface FinancialDashboardProps {
  currentWeek: number;
  currentYear: number;
  projects: Project[];
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  currentWeek,
  currentYear,
  projects
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'4weeks' | '12weeks' | '1year'>('12weeks');
  
  const summary = FinancialEngine.getFinancialSummary(currentWeek, currentYear);
  const recentTransactions = FinancialEngine.getRecentTransactions(20);
  
  // Generate weekly financial data for charts
  const getWeeklyData = () => {
    const weeks = selectedTimeframe === '4weeks' ? 4 : selectedTimeframe === '12weeks' ? 12 : 52;
    const data = [];
    
    for (let i = weeks - 1; i >= 0; i--) {
      let week = currentWeek - i;
      let year = currentYear;
      
      if (week <= 0) {
        week += 52;
        year -= 1;
      }
      
      const weeklyFinancials = FinancialEngine.getWeeklyFinancials(week, year);
      data.push({
        week: `Y${year}W${week}`,
        revenue: weeklyFinancials.totalRevenue,
        expenses: weeklyFinancials.totalExpenses,
        profit: weeklyFinancials.netIncome,
        cumulativeProfit: data.length > 0 ? 
          data[data.length - 1].cumulativeProfit + weeklyFinancials.netIncome : 
          weeklyFinancials.netIncome
      });
    }
    
    return data;
  };

  const weeklyData = getWeeklyData();

  // Touring analytics (category-level)
  const getTouringWeeklyData = () => {
    const weeks = selectedTimeframe === '4weeks' ? 4 : selectedTimeframe === '12weeks' ? 12 : 52;
    const data: Array<{ week: string; touringRevenue: number; touringExpenses: number; net: number }> = [];
    for (let i = weeks - 1; i >= 0; i--) {
      let week = currentWeek - i;
      let year = currentYear;
      if (week <= 0) {
        week += 52;
        year -= 1;
      }
      const wf = FinancialEngine.getWeeklyFinancials(week, year);
      const touring = wf.transactions.filter(t => t.category === 'touring');
      const rev = touring.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0);
      const exp = touring.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      data.push({
        week: `Y${year}W${week}`,
        touringRevenue: rev,
        touringExpenses: exp,
        net: rev - exp
      });
    }
    return data;
  };

  const touringWeeklyData = getTouringWeeklyData();

  const touringSummary = (() => {
    const totals = touringWeeklyData.reduce(
      (acc, w) => {
        acc.revenue += w.touringRevenue;
        acc.expenses += w.touringExpenses;
        return acc;
      },
      { revenue: 0, expenses: 0 }
    );
    return { ...totals, net: totals.revenue - totals.expenses };
  })();

  // Reconciliation between ledger and project-level financial metrics
  const reconciliationRows = projects
    .filter(p => p.status === 'released' && p.metrics?.financials)
    .map(p => {
      const ledger = FinancialEngine.getFilmFinancials(p.id);
      const metricsNet = p.metrics!.financials!.netProfit;
      const budget = p.budget?.total || p.script?.budget || 0;

      const nearZeroLedger = budget > 0 ? Math.abs(ledger.profit) < budget * 0.05 : Math.abs(ledger.profit) < 1_000;
      const nearZeroMetrics = budget > 0 ? Math.abs(metricsNet) < budget * 0.05 : Math.abs(metricsNet) < 1_000;

      const signsDiffer =
        Math.sign(ledger.profit || 0) !== Math.sign(metricsNet || 0);
      const discrepancy = Math.abs((ledger.profit || 0) - (metricsNet || 0));
      const materialThreshold = budget > 0 ? budget * 0.25 : 5_000_000;

      const flagged =
        !nearZeroLedger &&
        !nearZeroMetrics &&
        signsDiffer &&
        discrepancy > materialThreshold;

      return {
        project: p,
        ledgerProfit: ledger.profit,
        metricsNet,
        discrepancy,
        flagged,
      };
    })
    .sort((a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy));
  
  // Category breakdown for pie chart
  const getCategoryBreakdown = () => {
    const categoryTotals: Record<string, number> = {};
    
    recentTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });
    
    return Object.entries(categoryTotals).map(([category, amount]) => ({
      name: category,
      value: amount
    }));
  };

  const categoryData = getCategoryBreakdown();
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  // Financial health indicators
  const getFinancialHealth = () => {
    const health = {
      cashFlow: summary.cashOnHand > summary.weeklyBurn * 4 ? 'good' : 
                summary.cashOnHand > summary.weeklyBurn * 2 ? 'warning' : 'critical',
      profitability: summary.netProfit > 0 ? 'good' : 'poor',
      efficiency: summary.profitableFilms / Math.max(summary.totalFilms, 1) > 0.6 ? 'good' : 
                 summary.profitableFilms / Math.max(summary.totalFilms, 1) > 0.3 ? 'warning' : 'poor'
    };
    
    return health;
  };

  const health = getFinancialHealth();

  return (
    <div className="space-y-6">
      {/* Financial Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash on Hand</p>
                <p className="text-2xl font-bold text-primary">
                  ${(summary.cashOnHand / 1000).toFixed(0)}k
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary/60" />
            </div>
            <div className="mt-2">
              <Badge variant={health.cashFlow === 'good' ? 'default' : health.cashFlow === 'warning' ? 'secondary' : 'destructive'}>
                {health.cashFlow === 'good' ? 'Healthy' : health.cashFlow === 'warning' ? 'Monitor' : 'Critical'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(summary.netProfit / 1000).toFixed(0)}k
                </p>
              </div>
              {summary.netProfit >= 0 ? 
                <TrendingUp className="h-8 w-8 text-green-600" /> : 
                <TrendingDown className="h-8 w-8 text-red-600" />
              }
            </div>
            <div className="mt-2">
              <Badge variant={health.profitability === 'good' ? 'default' : 'destructive'}>
                {health.profitability === 'good' ? 'Profitable' : 'Loss-making'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weekly Burn</p>
                <p className="text-2xl font-bold text-accent">
                  ${(summary.weeklyBurn / 1000).toFixed(0)}k
                </p>
              </div>
              <Activity className="h-8 w-8 text-accent/60" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                {Math.floor(summary.cashOnHand / summary.weeklyBurn)} weeks runway
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-primary">
                  {((summary.profitableFilms / Math.max(summary.totalFilms, 1)) * 100).toFixed(0)}%
                </p>
              </div>
              <PieChartIcon className="h-8 w-8 text-primary/60" />
            </div>
            <div className="mt-2">
              <Badge variant={health.efficiency === 'good' ? 'default' : health.efficiency === 'warning' ? 'secondary' : 'destructive'}>
                {summary.profitableFilms}/{summary.totalFilms} films
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Health Alerts */}
      {(health.cashFlow === 'critical' || health.cashFlow === 'warning') && (
        <Alert variant={health.cashFlow === 'critical' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {health.cashFlow === 'critical' ? 
              'Critical cash flow situation! You have less than 2 weeks of runway.' :
              'Cash flow warning: You have less than 4 weeks of runway. Consider reducing expenses or accelerating revenue.'
            }
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={selectedTimeframe} onValueChange={(value: any) => setSelectedTimeframe(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="4weeks">4 Weeks</TabsTrigger>
          <TabsTrigger value="12weeks">12 Weeks</TabsTrigger>
          <TabsTrigger value="1year">1 Year</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTimeframe} className="space-y-6">
          {/* Revenue vs Expenses Chart */}
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center font-studio text-primary">
                <Activity className="mr-2" size={20} />
                Financial Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`$${(value/1000).toFixed(0)}k`, '']} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                  <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Weekly Profit" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cumulative Profit Chart */}
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center font-studio text-primary">
                <TrendingUp className="mr-2" size={20} />
                Cumulative Profit Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${(value/1000).toFixed(0)}k`, 'Cumulative Profit']} />
                  <Line 
                    type="monotone" 
                    dataKey="cumulativeProfit" 
                    stroke="#8b5cf6" 
                    strokeWidth={3} 
                    name="Cumulative Profit" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Touring Analytics */}
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="flex items-center font-studio text-primary">
                <Ticket className="mr-2" size={20} />
                Touring Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded border border-border/50">
                  <div className="text-xs text-muted-foreground">Touring Revenue</div>
                  <div className="text-lg font-semibold text-green-600">${(touringSummary.revenue / 1000).toFixed(0)}k</div>
                </div>
                <div className="p-3 rounded border border-border/50">
                  <div className="text-xs text-muted-foreground">Touring Expenses</div>
                  <div className="text-lg font-semibold text-red-600">${(touringSummary.expenses / 1000).toFixed(0)}k</div>
                </div>
                <div className="p-3 rounded border border-border/50">
                  <div className="text-xs text-muted-foreground">Net Touring</div>
                  <div className={`text-lg font-semibold ${touringSummary.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${(touringSummary.net / 1000).toFixed(0)}k
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={touringWeeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value: number, name: string) => [`${(value/1000).toFixed(0)}k`, name === 'touringRevenue' ? 'Revenue' : name === 'touringExpenses' ? 'Expenses' : 'Net']} />
                  <Bar dataKey="touringRevenue" name="Revenue" fill="#10b981" />
                  <Bar dataKey="touringExpenses" name="Expenses" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Categories */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center font-studio text-primary">
              <PieChartIcon className="mr-2" size={20} />
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${(value/1000).toFixed(0)}k`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center font-studio text-primary">
              <Activity className="mr-2" size={20} />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentTransactions.map(transaction => (
                <div key={transaction.id} className="flex justify-between items-center p-2 rounded border border-border/50">
                  <div>
                    <div className="text-sm font-medium truncate max-w-48">
                      {transaction.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Y{transaction.year}W{transaction.week} • {transaction.category}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${
                    transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'revenue' ? '+' : '-'}${(transaction.amount / 1000).toFixed(0)}k
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger vs Metrics Reconciliation */}
      {reconciliationRows.length > 0 && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="flex items-center font-studio text-primary">
              <Activity className="mr-2" size={20} />
              Financial Reconciliation (Ledger vs Metrics)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
              {reconciliationRows.slice(0, 12).map(row => (
                <div
                  key={row.project.id}
                  className={`flex justify-between items-center p-2 rounded border ${
                    row.flagged
                      ? 'border-red-500/60 bg-red-50/60'
                      : 'border-border/50 bg-card/50'
                  }`}
                >
                  <div className="truncate max-w-[60%]">
                    <div className="font-medium truncate">
                      {row.project.title}
                    </div>
                    <div className="text-muted-foreground">
                      Metrics net: ${(row.metricsNet / 1000).toFixed(0)}k • Ledger profit:{' '}
                      ${(row.ledgerProfit / 1000).toFixed(0)}k
                    </div>
                  </div>
                  {row.flagged && (
                    <Badge variant="destructive" className="ml-2">
                      Mismatch
                    </Badge>
                  )}
                </div>
              ))}
              {reconciliationRows.filter(r => r.flagged).length === 0 && (
                <div className="text-muted-foreground">
                  No material sign mismatches between ledger profits and project metrics.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Panel */}
      <Card className="card-premium border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Debug Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const ledger = FinancialEngine.exportLedger();
                console.log('Financial Ledger:', ledger);
                alert(`Exported ${ledger.length} transactions to console`);
              }}
            >
              Export Ledger
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                projects.forEach(project => {
                  const filmFinancials = FinancialEngine.getFilmFinancials(project.id);
                  console.log(`${project.title}:`, filmFinancials);
                });
              }}
            >
              Film Financials
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};