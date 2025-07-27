import React from 'react';
import { Project, DevelopmentProgress, DevelopmentIssue } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ScriptIcon, 
  BudgetIcon, 
  CastingIcon, 
  LocationIcon,
  AlertIcon,
  CheckIcon 
} from '@/components/ui/icons';

interface DevelopmentProgressModalProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onResolveIssue?: (issueId: string, cost?: number) => void;
}

export const DevelopmentProgressModal: React.FC<DevelopmentProgressModalProps> = ({
  project,
  open,
  onClose,
  onResolveIssue
}) => {
  if (!project) return null;

  const progress = project.developmentProgress;
  const averageProgress = (progress.scriptCompletion + progress.budgetApproval + progress.talentAttached + progress.locationSecured) / 4;

  const progressItems = [
    {
      label: 'Script Development',
      value: progress.scriptCompletion,
      icon: ScriptIcon,
      description: 'Script polish and revisions'
    },
    {
      label: 'Budget Approval',
      value: progress.budgetApproval,
      icon: BudgetIcon,
      description: 'Studio financial commitment'
    },
    {
      label: 'Talent Attachment',
      value: progress.talentAttached,
      icon: CastingIcon,
      description: 'Key cast and crew signed'
    },
    {
      label: 'Location Secured',
      value: progress.locationSecured,
      icon: LocationIcon,
      description: 'Shooting locations confirmed'
    }
  ];

  const getSeverityColor = (severity: DevelopmentIssue['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <ScriptIcon className="w-6 h-6" />
            {project.title} - Development Progress
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Overall Progress
                <Badge variant={averageProgress >= progress.completionThreshold ? "default" : "secondary"}>
                  {averageProgress.toFixed(0)}% Complete
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={averageProgress} className="h-3" />
              <div className="mt-2 text-sm text-muted-foreground">
                Need {progress.completionThreshold}% to advance to Pre-Production
              </div>
            </CardContent>
          </Card>

          {/* Individual Progress Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {progressItems.map((item) => (
              <Card key={item.label} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={item.value} className="h-2 mb-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                    <span className="text-sm font-medium">
                      {item.value.toFixed(0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Development Issues */}
          {progress.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertIcon className="w-5 h-5 text-destructive" />
                  Active Issues ({progress.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {progress.issues.map((issue, index) => (
                  <div key={issue.id}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(issue.severity)} className="text-xs">
                            {issue.severity.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium capitalize">
                            {issue.type} Issue
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {issue.description}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          Resolves in {issue.weeksToResolve} week{issue.weeksToResolve !== 1 ? 's' : ''}
                          {issue.cost && ` • Cost: $${(issue.cost / 1000000).toFixed(1)}M`}
                        </div>
                      </div>
                      
                      {onResolveIssue && issue.cost && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onResolveIssue(issue.id, issue.cost)}
                          className="ml-4"
                        >
                          <CheckIcon className="w-4 h-4 mr-1" />
                          Resolve Now
                        </Button>
                      )}
                    </div>
                    {index < progress.issues.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* No Issues State */}
          {progress.issues.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <CheckIcon className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>No active development issues</p>
                  <p className="text-sm">Development proceeding smoothly</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};