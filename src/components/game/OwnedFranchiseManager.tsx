import React, { useEffect, useMemo, useState } from 'react';
import { Franchise } from '@/types/game';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Crown, Edit3, TrendingUp, Users, Star, Calendar, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FinancialEngine } from './FinancialEngine';

interface OwnedFranchiseManagerProps {
  onCreateProject: (franchiseId?: string) => void;
  onCreateTVProject?: (franchiseId: string) => void;
}

export const OwnedFranchiseManager: React.FC<OwnedFranchiseManagerProps> = ({
  onCreateProject,
  onCreateTVProject
}) => {
  const gameState = useGameStore((s) => s.game);
  const updateFranchise = useGameStore((s) => s.updateFranchise);
  const { toast } = useToast();
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: 'active' as 'active' | 'dormant' | 'rebooted' | 'retired'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(6);
  const [page, setPage] = useState<number>(1);

  const uniqById = <T extends { id: string }>(items: T[]): T[] => {
    const byId = new Map<string, T>();
    const order: string[] = [];

    for (const item of items) {
      if (!item?.id) continue;
      if (!byId.has(item.id)) order.push(item.id);
      byId.set(item.id, item);
    }

    return order.map((id) => byId.get(id)!).filter(Boolean);
  };

  const franchises = uniqById(gameState?.franchises || []);

  const studioId = gameState?.studio?.id ?? '';
  const projects = gameState?.projects ?? [];

  // Get franchises owned by the player (deduped by id + title)
  const ownedFranchises = (() => {
    const seenTitles = new Set<string>();

    return franchises
      .filter(f => f.creatorStudioId === studioId)
      .filter((f) => {
        const key = (f.title || '').trim().toLowerCase();
        if (!key) return false;
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      });
  })();

  const filteredOwnedFranchises = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return ownedFranchises
      .filter((f) => statusFilter === 'all' || f.status === statusFilter)
      .filter((f) => {
        if (!q) return true;

        return (
          (f.title || '').toLowerCase().includes(q) ||
          (f.description || '').toLowerCase().includes(q) ||
          (f.franchiseTags || []).some((t) => (t || '').toLowerCase().includes(q))
        );
      });
  }, [ownedFranchises, searchTerm, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredOwnedFranchises.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const buildPageItems = (p: number, total: number): Array<number | 'ellipsis'> => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    if (p <= 3) return [1, 2, 3, 4, 5, 'ellipsis', total];
    if (p >= total - 2) return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];

    return [1, 'ellipsis', p - 1, p, p + 1, 'ellipsis', total];
  };

  const startIndex = filteredOwnedFranchises.length === 0 ? 0 : (page - 1) * pageSize;
  const endIndex = Math.min(filteredOwnedFranchises.length, startIndex + pageSize);

  const pagedOwnedFranchises = filteredOwnedFranchises.slice(startIndex, endIndex);

  // Calculate franchise metrics
  const getFranchiseMetrics = (franchise: Franchise) => {
    const franchiseProjects = projects.filter(p => p.script.franchiseId === franchise.id);
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

    updateFranchise(editingFranchise.id, {
      title: editForm.title,
      description: editForm.description,
      status: editForm.status,
    });

    toast({
      title: "Franchise Updated",
      description: `"${editForm.title}" has been updated successfully.`
    });

    setEditingFranchise(null);
  };

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading franchises...</div>;
  }

  if (ownedFranchises.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Crown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Owned Franchises</h3>
          <p className="text-muted-foreground">
            Release films and turn them into franchises, or license major properties from the Marketplace.
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
            Your Franchises ({filteredOwnedFranchises.length}/{ownedFranchises.length})
          </h2>
          <p className="text-muted-foreground">
            Manage and expand your owned intellectual properties
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search your franchises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
                <SelectItem value="rebooted">Rebooted</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Results per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 / page</SelectItem>
                <SelectItem value="12">12 / page</SelectItem>
                <SelectItem value="24">24 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredOwnedFranchises.length === 0 ? (
        <div className="p-6 border rounded-lg bg-card text-sm text-muted-foreground">
          No owned franchises match your filters.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing {filteredOwnedFranchises.length === 0 ? 0 : startIndex + 1}–{endIndex} of {filteredOwnedFranchises.length}
            </div>
            <div>
              Page {page} of {totalPages}
            </div>
          </div>

          <div className="grid gap-4">
            {pagedOwnedFranchises.map(franchise => {
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

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page === 1}
                tabIndex={page === 1 ? -1 : undefined}
                className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
              />
            </PaginationItem>

            {buildPageItems(page, totalPages).map((p, idx) => (
              <PaginationItem key={`${p}-${idx}`}>
                {p === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(p);
                    }}
                  >
                    {p}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page === totalPages}
                tabIndex={page === totalPages ? -1 : undefined}
                className={page === totalPages ? 'pointer-events-none opacity-50' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  )}

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