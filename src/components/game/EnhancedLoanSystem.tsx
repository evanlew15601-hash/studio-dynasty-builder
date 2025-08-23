import React, { useState } from 'react';
import { Studio, GameState } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, TrendingUp, AlertTriangle, Calendar, Banknote } from 'lucide-react';

interface Loan {
  id: string;
  amount: number;
  interestRate: number;
  termWeeks: number;
  weeklyPayment: number;
  remainingBalance: number;
  weeksRemaining: number;
  missedPayments: number;
  status: 'active' | 'paid' | 'defaulted';
}

interface EnhancedLoanSystemProps {
  gameState: GameState;
  onBudgetUpdate: (newBudget: number) => void;
  onReputationChange: (change: number) => void;
  onLoansUpdate?: (loans: Loan[]) => void;
}

export const EnhancedLoanSystem: React.FC<EnhancedLoanSystemProps> = ({
  gameState,
  onBudgetUpdate,
  onReputationChange,
  onLoansUpdate
}) => {
  const { toast } = useToast();
  const [loanAmount, setLoanAmount] = useState([5000000]); // $5M default
  const [loanTerm, setLoanTerm] = useState([52]); // 1 year default

  const calculateLoanTerms = (amount: number, weeks: number) => {
    const baseRate = 0.08; // 8% base annual rate
    const riskMultiplier = Math.max(0.5, (100 - gameState.studio.reputation) / 100);
    const interestRate = baseRate * riskMultiplier;
    
    const weeklyRate = interestRate / 52;
    const weeklyPayment = (amount * weeklyRate * Math.pow(1 + weeklyRate, weeks)) / 
                         (Math.pow(1 + weeklyRate, weeks) - 1);
    
    return {
      interestRate: interestRate * 100,
      weeklyPayment,
      totalPayment: weeklyPayment * weeks
    };
  };

  const getActiveLoans = (): Loan[] => {
    return gameState.studio.loans?.filter(loan => loan.status === 'active') || [];
  };

  const getTotalWeeklyPayments = () => {
    return getActiveLoans().reduce((total, loan) => total + loan.weeklyPayment, 0);
  };

  const canAffordLoan = (weeklyPayment: number) => {
    const totalPayments = getTotalWeeklyPayments() + weeklyPayment;
    const estimatedWeeklyIncome = gameState.studio.budget * 0.02; // Estimate 2% weekly income
    return totalPayments < estimatedWeeklyIncome * 0.8; // Don't exceed 80% of income
  };

  const takeLoan = () => {
    const amount = loanAmount[0];
    const weeks = loanTerm[0];
    const terms = calculateLoanTerms(amount, weeks);

if (!canAffordLoan(terms.weeklyPayment)) {
  toast({
    title: "High Risk Loan",
    description: "Approved, but payments may be hard to sustain",
    variant: "destructive"
  });
}


    if (getActiveLoans().length >= 3) {
      toast({
        title: "Too Many Loans",
        description: "You can only have 3 active loans at once",
        variant: "destructive"
      });
      return;
    }

const newLoan: Loan = {
  id: `loan-${Date.now()}`,
  amount,
  interestRate: terms.interestRate,
  termWeeks: weeks,
  weeklyPayment: terms.weeklyPayment,
  remainingBalance: amount,
  weeksRemaining: weeks,
  missedPayments: 0,
  status: 'active'
};

const existingLoans = gameState.studio.loans || [];
if (onLoansUpdate) {
  onLoansUpdate([...existingLoans, newLoan]);
}

onBudgetUpdate(gameState.studio.budget + amount);

toast({
  title: "Loan Approved",
  description: `$${(amount / 1000000).toFixed(1)}M loan approved. Weekly payment: $${(terms.weeklyPayment / 1000000).toFixed(2)}M`,
});
  };

  const makePayment = (loanId: string, amount?: number) => {
    const activeLoans = getActiveLoans();
    const loan = activeLoans.find(l => l.id === loanId);
    
    if (!loan) return;

    const paymentAmount = amount || loan.weeklyPayment;
    
    if (paymentAmount > gameState.studio.budget) {
      toast({
        title: "Insufficient Funds",
        description: "Not enough budget to make this payment",
        variant: "destructive"
      });
      return;
    }

    const newBalance = Math.max(0, loan.remainingBalance - paymentAmount);
    const isPaidOff = newBalance === 0;

    const updatedLoan = {
      ...loan,
      remainingBalance: newBalance,
      weeksRemaining: isPaidOff ? 0 : loan.weeksRemaining - 1,
      status: isPaidOff ? 'paid' as const : loan.status,
      missedPayments: 0 // Reset missed payments on successful payment
    };

const updatedLoans = gameState.studio.loans?.map(l => 
  l.id === loanId ? updatedLoan : l
) || [];

if (onLoansUpdate) {
  onLoansUpdate(updatedLoans);
}

    
    if (isPaidOff) {
      onReputationChange(5); // Bonus for paying off loan
      toast({
        title: "Loan Paid Off",
        description: `Congratulations! You've paid off your loan. +5 reputation.`,
      });
    } else {
      toast({
        title: "Payment Made",
        description: `Payment of $${(paymentAmount / 1000000).toFixed(2)}M applied to loan`,
      });
    }
  };

  const processWeeklyPayments = () => {
    const activeLoans = getActiveLoans();
    let totalPayments = 0;
    let missedPayments = 0;

const updatedLoans = activeLoans.map(loan => {
  if (gameState.studio.budget >= loan.weeklyPayment) {
    totalPayments += loan.weeklyPayment;
    const newBalance = Math.max(0, loan.remainingBalance - loan.weeklyPayment);
    return {
      ...loan,
      remainingBalance: newBalance,
      weeksRemaining: loan.weeksRemaining - 1,
      status: newBalance === 0 ? 'paid' as const : loan.status,
      missedPayments: 0
    };
  } else {
    missedPayments++;
    return {
      ...loan,
      weeksRemaining: loan.weeksRemaining - 1,
      missedPayments: loan.missedPayments + 1
    };
  }
});

if (onLoansUpdate) {
  onLoansUpdate(updatedLoans);
}


    if (totalPayments > 0) {
      onBudgetUpdate(gameState.studio.budget - totalPayments);
    }

    if (missedPayments > 0) {
      onReputationChange(-missedPayments * 3);
      toast({
        title: "Missed Loan Payments",
        description: `Missed ${missedPayments} payments. -${missedPayments * 3} reputation.`,
        variant: "destructive"
      });
    }
  };

  const getFinancialHealth = () => {
    const activeLoans = getActiveLoans();
    const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    const weeklyPayments = getTotalWeeklyPayments();
    const debtToAssetRatio = totalDebt / Math.max(gameState.studio.budget, 1);
    
    if (debtToAssetRatio > 2) return { status: 'critical', color: 'text-red-600' };
    if (debtToAssetRatio > 1) return { status: 'poor', color: 'text-orange-600' };
    if (debtToAssetRatio > 0.5) return { status: 'fair', color: 'text-yellow-600' };
    return { status: 'good', color: 'text-green-600' };
  };

  const currentTerms = calculateLoanTerms(loanAmount[0], loanTerm[0]);
  const financialHealth = getFinancialHealth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
          Studio Financing
        </h2>
        <p className="text-muted-foreground">Manage loans and studio finances</p>
      </div>

      {/* Financial Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Financial Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current Budget</p>
              <p className="text-xl font-bold">${(gameState.studio.budget / 1000000).toFixed(1)}M</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Weekly Payments</p>
              <p className="text-xl font-bold">${(getTotalWeeklyPayments() / 1000000).toFixed(2)}M</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className={`text-xl font-bold capitalize ${financialHealth.color}`}>
                {financialHealth.status}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Loans */}
      {getActiveLoans().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Active Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getActiveLoans().map((loan) => {
                const progress = ((loan.termWeeks - loan.weeksRemaining) / loan.termWeeks) * 100;
                
                return (
                  <div key={loan.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">
                          ${(loan.amount / 1000000).toFixed(1)}M Loan
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {loan.interestRate.toFixed(1)}% APR • {loan.weeksRemaining} weeks remaining
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${(loan.remainingBalance / 1000000).toFixed(2)}M remaining
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ${(loan.weeklyPayment / 1000000).toFixed(2)}M/week
                        </p>
                      </div>
                    </div>
                    
                    <Progress value={progress} className="mb-3" />
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => makePayment(loan.id)}
                        disabled={gameState.studio.budget < loan.weeklyPayment}
                      >
                        Make Payment
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => makePayment(loan.id, loan.remainingBalance)}
                        disabled={gameState.studio.budget < loan.remainingBalance}
                      >
                        Pay Off Early
                      </Button>
                    </div>
                    
                    {loan.missedPayments > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{loan.missedPayments} missed payments</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Loan Application */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Apply for Loan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Loan Amount: ${(loanAmount[0] / 1000000).toFixed(1)}M
            </label>
            <Slider
              value={loanAmount}
              onValueChange={setLoanAmount}
              max={50000000}
              min={1000000}
              step={1000000}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Term: {Math.round(loanTerm[0] / 4.33)} months ({loanTerm[0]} weeks)
            </label>
            <Slider
              value={loanTerm}
              onValueChange={setLoanTerm}
              max={208} // 4 years
              min={26}  // 6 months
              step={26}
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Loan Terms</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Interest Rate:</span>
                <span className="ml-2 font-medium">{currentTerms.interestRate.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Weekly Payment:</span>
                <span className="ml-2 font-medium">${(currentTerms.weeklyPayment / 1000000).toFixed(2)}M</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Payment:</span>
                <span className="ml-2 font-medium">${(currentTerms.totalPayment / 1000000).toFixed(1)}M</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Interest:</span>
                <span className="ml-2 font-medium">${((currentTerms.totalPayment - loanAmount[0]) / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          </div>

<Button 
  onClick={takeLoan}
  disabled={getActiveLoans().length >= 3}
  className="w-full"
>
  Apply for Loan
</Button>

          {!canAffordLoan(currentTerms.weeklyPayment) && (
            <p className="text-sm text-red-600">
              Weekly payment exceeds recommended debt-to-income ratio
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};