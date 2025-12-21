import React, { useState } from 'react';
import { Franchise, GameState, Project } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Edit3, TrendingUp, Users, DollarSign, Star, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FinancialEngine } from './FinancialEngine';

interface OwnedFranchiseManagerProps {
  gameState: GameState;
  onUpdateFranchise: (franchiseId: string, updates: Partial<Franchise>) => void;
  onCreateProject: (franchiseId?: string) => void;
  onCreateTVProject?: (franchiseId: string) => void;
}

export const OwnedFranchiseManager: React.FC<OwnedFranchiseManagerProps> = ({
  gameState,
  onUpdateFranchise,
  onCreateProject,
  onCreateTVProject
}) => {
  const { toast } = useToast();
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: 'active' as 'active' | 'dormant' | 'rebooted' | 'retired'
  });

  // Get franchises owned by the player
  const ownedFranchises = gameState.franchises.filter(f => f.creatorStudioId === gameState.studio.id);

  // Calculate franchise metrics
  const getFranchiseMetrics = (franchise: Franchise) => {
    const franchiseProjects = gameState.projects.filter(p => p.script.franchiseId === franchise.id);
    const financials = FinancialEngine.getFranchiseFinancials(franchiseProjects);
    const totalBoxOffice = financials.boxOfficeRevenue;
    const totalBudget = franchiseProjects.reduce((sum, p) => sum + p.budget.total, 0);
    const avgCriticsScore = franchiseProjects.length > 0 
      ? franchiseProjects.reduce((sum, p) => sum + (p.metrics?.criticsScore || 0), 0) / franchiseProjects.length
      : 0;

    return {
      projectCount: franchiseProjects.length,
      totalBoxOffice,
      totalBudget,
      profitability: totalBudget > 0 ? ((financials.totalRevenue - totalBudget) / totalBudget) * 100 : 0,
      avgCriticsScore,
      franchiseValue: financials.totalRevenue,
      projects: franchiseProjects
    };
  };

  const startEdit = (franchise: Franchise) => {
    setEditingFranchise(franchise);
    setEditForm({
      title: franchise.title,
      description: franchise.description || '',
      status: franchise.status
    });
  };

  const saveEdit = () => {
    if (!editingFranchise) return;

    onUpdateFranchise(editingFranchise.id, {
      title: editForm.title,
      description: editForm.description,
      status: editForm.status
    });

    toast({
      title: "Franchise Updated",
      description: `"${editForm.title}" has been updated successfully.`
    });

    setEditingFranchise(null);
  };

  if (ownedFranchises.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Crown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Owned Franchises</h3>
          <p className="text-muted-foreground">
            Create successful films or purchase franchise rights to build your intellectual property portfolio.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            Your Franchises ({ownedFranchises.length})
          </h2>
          <p className="text-muted-foreground">
            Manage and expand your owned intellectual properties
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {ownedFranchises.map(franchise => {
          const metrics = getFranchiseMetrics(franchise);
          
          return (
            <Card key={franchise.id} className="border-2 border-primary/30">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      {franchise.title}
                      <Badge variant="outline" className="capitalize">
                        {franchise.status}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {franchise.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(franchise)}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onCreateProject(franchise.id)}
                    >
                      Add Film
                    </Button>
                    {onCreateTVProject && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCreateTVProject(franchise.id)}
                      >
                        Add TV Series
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Franchise Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Franchise Projects</div>
                    <div className="text-xl font-bold">{metrics.projectCount}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Total Box Office</div>
                    <div className="text-xl font-bold">${(metrics.totalBoxOffice / 1000000).toFixed(1)}M</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Profitability</div>
                    <div className={`text-xl font-bold ${metrics.profitability > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.profitability > 0 ? '+' : ''}{metrics.profitability.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Franchise Value</div>
                    <div className="text-xl font-bold">${(metrics.franchiseValue / 1000000).toFixed(1)}M</div>
                  </div>
                </div>

                {/* Franchise Details */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Since {new Date(franchise.originDate).getFullYear()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span>Cultural Weight: {franchise.culturalWeight}/100</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>Avg Critics: {metrics.avgCriticsScore.toFixed(0)}/100</span>
                  </div>
                </div>

                {/* Franchise Projects */}
                {metrics.projects.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Franchise Projects ({metrics.projects.length})
                    </h4>
                    <div className="grid gap-2">
                      {metrics.projects
                        .sort((a, b) => (a.franchisePosition || 0) - (b.franchisePosition || 0))
                        .map(project => (
                          <div key={project.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {project.franchisePosition || '?'}
                              </div>
                              <div>
                                <div className="font-medium">{project.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  ${((project.metrics?.boxOfficeTotal || 0) / 1000000).toFixed(1)}M • 
                                  {project.metrics?.criticsScore || 0}/100 critics
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {project.type === 'feature'
                                  ? 'Film'
                                  : project.type === 'documentary'
                                  ? 'Doc'
                                  : 'TV'}
                              </Badge>
                              <Badge
                                variant={project.status === 'released' ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {project.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Franchise Tags */}
                {franchise.franchiseTags && franchise.franchiseTags.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Tags:</div>
                    <div className="flex flex-wrap gap-1">
                      {franchise.franchiseTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingFranchise} onOpenChange={() => setEditingFranchise(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Franchise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Franchise Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editForm.status} onValueChange={(value: any) => setEditForm(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="dormant">Dormant</SelectItem>
                  <SelectItem value="rebooted">Rebooted</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveEdit} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingFranchise(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};