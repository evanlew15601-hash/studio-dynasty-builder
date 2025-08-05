import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { GameState } from '@/types/game';
import { DollarSign, AlertTriangle, TrendingDown, Calculator, CreditCard } from 'lucide-react';

interface Loan {
  id: string;
  amount: number;
  interestRate: number;
  termWeeks: number;
  weeklyPayment: number;
  remainingBalance: number;
  weeksRemaining: number;
  status: 'active' | 'paid_off' | 'defaulted';
  startWeek: number;
  startYear: number;
  lender: string;
  purpose: string;
}

interface LoanOffer {
  lender: string;
  maxAmount: number;
  interestRate: number;
  termWeeks: number;
  requirements: {
    minReputation: number;
    maxDebtRatio: number;
  };
  description: string;
}

interface LoanSystemProps {
  gameState: GameState;
  onBudgetUpdate: (amount: number, reason: string) => void;
  onReputationUpdate?: (change: number, reason: string) => void;
}

export const LoanSystem: React.FC<LoanSystemProps> = ({
  gameState,
  onBudgetUpdate,
  onReputationUpdate
}) => {
  const { toast } = useToast();
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [loanOffers, setLoanOffers] = useState<LoanOffer[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanOffer | null>(null);
  const [loanAmount, setLoanAmount] = useState<number>(0);

  useEffect(() => {
    initializeLoanOffers();
  }, []);

  useEffect(() => {
    processWeeklyPayments();
  }, [gameState.currentWeek, gameState.currentYear]);

  const initializeLoanOffers = () => {
    const offers: LoanOffer[] = [
      {
        lender: 'First National Bank',
        maxAmount: 50000000,
        interestRate: 0.08, // 8% annual
        termWeeks: 260, // 5 years
        requirements: {
          minReputation: 60,
          maxDebtRatio: 0.3
        },
        description: 'Traditional bank loan with competitive rates for established studios'
      },
      {
        lender: 'Hollywood Investment Group',
        maxAmount: 100000000,
        interestRate: 0.12, // 12% annual
        termWeeks: 208, // 4 years
        requirements: {
          minReputation: 50,
          maxDebtRatio: 0.5
        },
        description: 'Entertainment industry specialists offering higher limits'
      },
      {
        lender: 'Emergency Film Finance',
        maxAmount: 20000000,
        interestRate: 0.18, // 18% annual
        termWeeks: 104, // 2 years
        requirements: {
          minReputation: 30,
          maxDebtRatio: 0.7
        },
        description: 'Quick approval for studios in financial distress'
      },
      {
        lender: 'Prestige Studio Credit',
        maxAmount: 150000000,
        interestRate: 0.06, // 6% annual
        termWeeks: 312, // 6 years
        requirements: {
          minReputation: 80,
          maxDebtRatio: 0.2
        },
        description: 'Premium lending for industry leaders with exceptional rates'
      },
      {
        lender: 'Bridge Capital',
        maxAmount: 30000000,
        interestRate: 0.15, // 15% annual
        termWeeks: 52, // 1 year
        requirements: {
          minReputation: 40,
          maxDebtRatio: 0.6
        },
        description: 'Short-term bridge financing for immediate needs'
      }
    ];

    setLoanOffers(offers);
  };

  const processWeeklyPayments = () => {
    setActiveLoans(prev => {
      return prev.map(loan => {
        if (loan.status !== 'active') return loan;

        const newBalance = loan.remainingBalance - loan.weeklyPayment;
        const newWeeksRemaining = loan.weeksRemaining - 1;

        // Deduct payment from budget
        onBudgetUpdate(-loan.weeklyPayment, `Loan Payment: ${loan.lender}`);

        if (newWeeksRemaining <= 0 || newBalance <= 0) {
          // Loan paid off
          toast({
            title: "Loan Paid Off",
            description: `Congratulations! You've fully repaid your loan from ${loan.lender}`,
          });
          
          onReputationUpdate?.(5, `Loan Completion: ${loan.lender}`);
          
          return {
            ...loan,
            status: 'paid_off' as const,
            remainingBalance: 0,
            weeksRemaining: 0
          };
        }

        // Check for default
        if (gameState.studio.budget < loan.weeklyPayment) {
          toast({
            title: "Loan Default Warning",
            description: `Unable to make payment to ${loan.lender}. Default proceedings may begin.`,
            variant: "destructive"
          });
          
          onReputationUpdate?.(-15, `Loan Default: ${loan.lender}`);
          
          return {
            ...loan,
            status: 'defaulted' as const
          };
        }

        return {
          ...loan,
          remainingBalance: newBalance,
          weeksRemaining: newWeeksRemaining
        };
      });
    });
  };

  const calculateWeeklyPayment = (amount: number, annualRate: number, weeks: number): number => {
    const weeklyRate = annualRate / 52;
    if (weeklyRate === 0) return amount / weeks;
    
    const payment = amount * (weeklyRate * Math.pow(1 + weeklyRate, weeks)) / 
                   (Math.pow(1 + weeklyRate, weeks) - 1);
    return Math.round(payment);
  };

  const getCurrentDebtRatio = (): number => {
    const totalWeeklyPayments = activeLoans
      .filter(loan => loan.status === 'active')
      .reduce((sum, loan) => sum + loan.weeklyPayment, 0);
    
    const estimatedWeeklyRevenue = gameState.studio.budget * 0.02; // Estimate 2% of budget as weekly revenue
    return estimatedWeeklyRevenue > 0 ? totalWeeklyPayments / estimatedWeeklyRevenue : 0;
  };

  const getEligibleOffers = (): LoanOffer[] => {
    const currentDebtRatio = getCurrentDebtRatio();
    
    return loanOffers.filter(offer => 
      gameState.studio.reputation >= offer.requirements.minReputation &&
      currentDebtRatio <= offer.requirements.maxDebtRatio
    );
  };

  const takeLoan = (offer: LoanOffer, amount: number) => {
    const weeklyPayment = calculateWeeklyPayment(amount, offer.interestRate, offer.termWeeks);
    
    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      amount,
      interestRate: offer.interestRate,
      termWeeks: offer.termWeeks,
      weeklyPayment,
      remainingBalance: amount,
      weeksRemaining: offer.termWeeks,
      status: 'active',
      startWeek: gameState.currentWeek,
      startYear: gameState.currentYear,
      lender: offer.lender,
      purpose: 'Studio Operations'
    };

    setActiveLoans(prev => [...prev, newLoan]);
    onBudgetUpdate(amount, `Loan from ${offer.lender}`);
    
    // Small reputation hit for taking on debt
    onReputationUpdate?.(-2, `New Debt: ${offer.lender}`);

    toast({
      title: "Loan Approved",
      description: `$${(amount / 1000000).toFixed(1)}M loan from ${offer.lender} has been added to your budget`,
    });

    setSelectedLoan(null);
    setLoanAmount(0);
  };

  const getFinancialHealthColor = (): string => {
    const debtRatio = getCurrentDebtRatio();
    if (debtRatio > 0.6) return 'text-red-600';
    if (debtRatio > 0.4) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTotalDebt = (): number => {
    return activeLoans
      .filter(loan => loan.status === 'active')
      .reduce((sum, loan) => sum + loan.remainingBalance, 0);
  };

  const getTotalWeeklyPayments = (): number => {
    return activeLoans
      .filter(loan => loan.status === 'active')
      .reduce((sum, loan) => sum + loan.weeklyPayment, 0);
  };

  const isInCrisis = (): boolean => {
    return gameState.studio.budget < 1000000 || // Less than 1M budget
           getCurrentDebtRatio() > 0.8 || // Debt payments over 80% of revenue
           activeLoans.some(loan => loan.status === 'defaulted');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Studio Financing
          </h2>
          <p className="text-muted-foreground">Manage loans and studio cash flow</p>
        </div>
      </div>

      {/* Financial Health Overview */}
      <Card className={isInCrisis() ? 'border-red-500 bg-red-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Financial Health {isInCrisis() && <AlertTriangle className="h-5 w-5 text-red-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${(gameState.studio.budget / 1000000).toFixed(1)}M
              </div>
              <p className="text-sm text-muted-foreground">Cash Available</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                ${(getTotalDebt() / 1000000).toFixed(1)}M
              </div>
              <p className="text-sm text-muted-foreground">Total Debt</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                ${(getTotalWeeklyPayments() / 1000).toFixed(0)}K
              </div>
              <p className="text-sm text-muted-foreground">Weekly Payments</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getFinancialHealthColor()}`}>
                {(getCurrentDebtRatio() * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground">Debt Ratio</p>
            </div>
          </div>

          {isInCrisis() && (
            <Alert className="mt-4 border-red-500">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Financial Crisis Detected!</strong> Your studio is in severe financial distress. 
                Consider emergency measures or restructuring existing debt.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Active Loans */}
      {activeLoans.filter(loan => loan.status === 'active').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Active Loans ({activeLoans.filter(loan => loan.status === 'active').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeLoans.filter(loan => loan.status === 'active').map(loan => {
                const progressPercent = ((loan.termWeeks - loan.weeksRemaining) / loan.termWeeks) * 100;
                
                return (
                  <div key={loan.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{loan.lender}</h4>
                        <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          ${(loan.remainingBalance / 1000000).toFixed(1)}M remaining
                        </div>
                        <div className="text-sm text-muted-foreground">
                          of ${(loan.amount / 1000000).toFixed(1)}M original
                        </div>
                      </div>
                    </div>
                    
                    <Progress value={progressPercent} className="mb-3" />
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Weekly Payment:</span>
                        <div className="font-medium">${(loan.weeklyPayment / 1000).toFixed(0)}K</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Interest Rate:</span>
                        <div className="font-medium">{(loan.interestRate * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Weeks Remaining:</span>
                        <div className="font-medium">{loan.weeksRemaining}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div>
                          <Badge variant={
                            gameState.studio.budget >= loan.weeklyPayment ? 'default' : 'destructive'
                          }>
                            {gameState.studio.budget >= loan.weeklyPayment ? 'Current' : 'At Risk'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Loan Offers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Available Financing Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getEligibleOffers().length > 0 ? (
            <div className="space-y-4">
              {getEligibleOffers().map(offer => (
                <div key={offer.lender} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{offer.lender}</h4>
                      <p className="text-sm text-muted-foreground">{offer.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedLoan(offer);
                        setLoanAmount(Math.min(offer.maxAmount, offer.maxAmount * 0.5)); // Default to 50% of max
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Max Amount:</span>
                      <div className="font-medium">${(offer.maxAmount / 1000000).toFixed(0)}M</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Interest Rate:</span>
                      <div className="font-medium">{(offer.interestRate * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Term:</span>
                      <div className="font-medium">{Math.round(offer.termWeeks / 52)} years</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Min Reputation:</span>
                      <div className="font-medium">{offer.requirements.minReputation}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingDown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Loan Offers Available</h3>
              <p className="text-muted-foreground">
                {gameState.studio.reputation < 30 
                  ? "Your studio reputation is too low to qualify for loans."
                  : "Your current debt level is too high for additional financing."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Application Modal */}
      {selectedLoan && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Loan Application - {selectedLoan.lender}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Loan Amount</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min="1000000"
                  max={selectedLoan.maxAmount}
                  step="1000000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="font-mono text-sm">
                  ${(loanAmount / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
            
            {loanAmount > 0 && (
              <div className="bg-muted p-3 rounded">
                <h5 className="font-medium mb-2">Loan Terms Preview:</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Loan Amount: ${(loanAmount / 1000000).toFixed(1)}M</div>
                  <div>Interest Rate: {(selectedLoan.interestRate * 100).toFixed(1)}%</div>
                  <div>Term: {Math.round(selectedLoan.termWeeks / 52)} years</div>
                  <div>Weekly Payment: ${(calculateWeeklyPayment(loanAmount, selectedLoan.interestRate, selectedLoan.termWeeks) / 1000).toFixed(0)}K</div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Total Interest: ${((calculateWeeklyPayment(loanAmount, selectedLoan.interestRate, selectedLoan.termWeeks) * selectedLoan.termWeeks - loanAmount) / 1000000).toFixed(1)}M
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedLoan(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => takeLoan(selectedLoan, loanAmount)}
                disabled={loanAmount <= 0}
              >
                Accept Loan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loan History */}
      {activeLoans.filter(loan => loan.status !== 'active').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Loan History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeLoans.filter(loan => loan.status !== 'active').map(loan => (
                <div key={loan.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <span className="font-medium">{loan.lender}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ${(loan.amount / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <Badge variant={loan.status === 'paid_off' ? 'default' : 'destructive'}>
                    {loan.status === 'paid_off' ? 'Paid Off' : 'Defaulted'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};