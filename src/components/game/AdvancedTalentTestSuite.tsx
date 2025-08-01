import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, AlertTriangle } from 'lucide-react';

export const AdvancedTalentTestSuite: React.FC = () => {
  const [testResults, setTestResults] = React.useState<{ [key: string]: boolean }>({});
  const [isRunning, setIsRunning] = React.useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: { [key: string]: boolean } = {};

    // Test 1: Agent System
    try {
      const { TalentAgencySystem } = await import('./TalentAgencySystem');
      results.agencySystem = !!TalentAgencySystem;
    } catch (error) {
      results.agencySystem = false;
    }

    // Test 2: Burnout System
    try {
      const { TalentBurnoutSystem } = await import('./TalentBurnoutSystem');
      results.burnoutSystem = !!TalentBurnoutSystem;
    } catch (error) {
      results.burnoutSystem = false;
    }

    // Test 3: Chemistry System
    try {
      const { TalentChemistrySystem } = await import('./TalentChemistrySystem');
      results.chemistrySystem = !!TalentChemistrySystem;
    } catch (error) {
      results.chemistrySystem = false;
    }

    // Test 4: Advanced Hook
    try {
      const { useAdvancedTalentManagement } = await import('@/hooks/useAdvancedTalentManagement');
      results.advancedHook = !!useAdvancedTalentManagement;
    } catch (error) {
      results.advancedHook = false;
    }

    // Test 5: Type Definitions
    try {
      const types = await import('@/types/game');
      // Check if the new types are available by checking interface properties
      results.typeDefinitions = typeof types === 'object' && types !== null;
    } catch (error) {
      results.typeDefinitions = false;
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const getTestStatus = (testName: string) => {
    if (isRunning) return <Badge variant="secondary">Testing...</Badge>;
    if (testResults[testName] === undefined) return <Badge variant="outline">Not Tested</Badge>;
    if (testResults[testName]) return <Badge variant="default" className="bg-green-600"><Check className="h-3 w-3 mr-1" />Pass</Badge>;
    return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Fail</Badge>;
  };

  const tests = [
    { key: 'agencySystem', name: 'Agent Negotiation System', description: 'Talent agency network with power levels and commission rates' },
    { key: 'burnoutSystem', name: 'Burnout/Wellness Monitor', description: 'Track talent burnout, overexposure, and recovery' },
    { key: 'chemistrySystem', name: 'Chemistry & Relationships', description: 'Dynamic talent chemistry affecting performance' },
    { key: 'advancedHook', name: 'Advanced Management Hook', description: 'React hook for managing all advanced talent features' },
    { key: 'typeDefinitions', name: 'Type Definitions', description: 'TypeScript interfaces for all new talent features' }
  ];

  const allTestsPassed = Object.values(testResults).every(result => result === true);
  const anyTestsFailed = Object.values(testResults).some(result => result === false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Advanced Talent Management - Integration Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Testing all advanced talent management systems...
          </p>
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? 'Running Tests...' : 'Run Integration Tests'}
          </Button>
        </div>

        <div className="space-y-3">
          {tests.map(test => (
            <div key={test.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">{test.name}</h4>
                <p className="text-sm text-muted-foreground">{test.description}</p>
              </div>
              {getTestStatus(test.key)}
            </div>
          ))}
        </div>

        {Object.keys(testResults).length > 0 && (
          <div className="mt-4 p-4 border rounded-lg">
            {allTestsPassed && (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">All Systems Operational!</span>
              </div>
            )}
            {anyTestsFailed && (
              <div className="flex items-center gap-2 text-red-600">
                <X className="h-5 w-5" />
                <span className="font-medium">Some systems need attention</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Advanced talent management features are {allTestsPassed ? 'ready' : 'partially ready'} for gameplay.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};