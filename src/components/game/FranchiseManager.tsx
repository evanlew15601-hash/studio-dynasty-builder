import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Search, Star, Crown, Clock, TrendingUp, BookOpen, Sparkles, DollarSign, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatMoneyCompact } from '@/utils/money';

interface FranchiseManagerProps {
  onCreateProject: (franchiseId?: string, publicDomainId?: string, cost?: number) => void;
}

export const FranchiseManager: React.FC<FranchiseManagerProps> = ({
  onCreateProject
}) => {
  const gameState = useGameStore((s) => s.game);
  const [activeTab, setActiveTab] = useState<'franchises' | 'public-domain'>('franchises');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(12);
  const [franchisePage, setFranchisePage] = useState<number>(1);
  const [publicDomainPage, setPublicDomainPage] = useState<number>(1);

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
  const publicDomainIPs = uniqById(gameState?.publicDomainIPs || []);

  const studioId = gameState?.studio?.id ?? '';
  const licensedFranchiseIds = new Set(gameState?.studio?.licensedFranchiseIds ?? []);
  const currentWeekIndex = gameState ? (gameState.currentYear * 52) + gameState.currentWeek : 0;
  const activeInvitation = gameState?.studio?.franchiseInvitation;

  // Check which franchises are owned by player
  const ownedFranchiseIds = franchises
    .filter(f => f.creatorStudioId === studioId)
    .map(f => f.id);

  // Filter franchises (exclude owned ones from purchase list)
  const filteredFranchises = (() => {
    const seen = new Set<string>();

    return franchises
      .filter(franchise => {
        if (franchise.creatorStudioId !== 'world') return false; // Marketplace is a fixed world catalog
        if (ownedFranchiseIds.includes(franchise.id)) return false; // Don't show owned franchises in purchase list
        const matchesSearch = franchise.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             franchise.franchiseTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesGenre = selectedGenre === 'all' || franchise.genre.includes(selectedGenre as any);
        const matchesStatus = selectedStatus === 'all' || franchise.status === selectedStatus;
        return matchesSearch && matchesGenre && matchesStatus;
      })
      .filter((franchise) => {
        const key = (franchise.parodySource || franchise.id).trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  })();

  // Filter public domain IPs
  const filteredPublicDomain = (() => {
    const seen = new Set<string>();

    return publicDomainIPs
      .filter(ip => {
        const matchesSearch = ip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             ip.coreElements.some(element => element.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesGenre = selectedGenre === 'all' || ip.genreFlexibility.includes(selectedGenre as any);
        const matchesDomain = selectedDomain === 'all' || ip.domainType === selectedDomain;
        return matchesSearch && matchesGenre && matchesDomain;
      })
      .filter((ip) => {
        const key = ip.name.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  })();

  useEffect(() => {
    setFranchisePage(1);
    setPublicDomainPage(1);
  }, [searchTerm, selectedGenre, selectedStatus, selectedDomain, pageSize]);

  const franchiseTotalPages = Math.max(1, Math.ceil(filteredFranchises.length / pageSize));
  const publicDomainTotalPages = Math.max(1, Math.ceil(filteredPublicDomain.length / pageSize));

  useEffect(() => {
    if (franchisePage > franchiseTotalPages) setFranchisePage(franchiseTotalPages);
  }, [franchisePage, franchiseTotalPages]);

  useEffect(() => {
    if (publicDomainPage > publicDomainTotalPages) setPublicDomainPage(publicDomainTotalPages);
  }, [publicDomainPage, publicDomainTotalPages]);

  const buildPageItems = (page: number, totalPages: number): Array<number | 'ellipsis'> => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    if (page <= 3) return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    if (page >= totalPages - 2) return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];

    return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages];
  };

  const paginate = <T,>(items: T[], page: number): { items: T[]; start: number; end: number } => {
    if (items.length === 0) return { items: [], start: 0, end: 0 };

    const safePage = Math.min(Math.max(1, page), Math.max(1, Math.ceil(items.length / pageSize)));
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(items.length, startIndex + pageSize);

    return {
      items: items.slice(startIndex, endIndex),
      start: startIndex + 1,
      end: endIndex,
    };
  };

  const pagedFranchises = paginate(filteredFranchises, franchisePage);
  const pagedPublicDomain = paginate(filteredPublicDomain, publicDomainPage);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading IP marketplace...</div>;
  }

  const getFranchiseStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'dormant': return 'bg-yellow-500';
      case 'rebooted': return 'bg-blue-500';
      case 'retired': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getDomainTypeIcon = (domainType: string) => {
    switch (domainType) {
      case 'literature': return <BookOpen className="w-4 h-4" />;
      case 'mythology': return <Sparkles className="w-4 h-4" />;
      case 'folklore': return <Crown className="w-4 h-4" />;
      case 'historical': return <Clock className="w-4 h-4" />;
      case 'religious': return <Star className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">IP Marketplace</h1>
          <p className="text-muted-foreground">
            License major franchises (one-time fee) or adapt public-domain properties
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search franchises and IPs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                <SelectItem value="action">Action</SelectItem>
                <SelectItem value="adventure">Adventure</SelectItem>
                <SelectItem value="animation">Animation</SelectItem>
                <SelectItem value="biography">Biography</SelectItem>
                <SelectItem value="comedy">Comedy</SelectItem>
                <SelectItem value="crime">Crime</SelectItem>
                <SelectItem value="documentary">Documentary</SelectItem>
                <SelectItem value="drama">Drama</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="fantasy">Fantasy</SelectItem>
                <SelectItem value="historical">Historical</SelectItem>
                <SelectItem value="horror">Horror</SelectItem>
                <SelectItem value="musical">Musical</SelectItem>
                <SelectItem value="mystery">Mystery</SelectItem>
                <SelectItem value="romance">Romance</SelectItem>
                <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="superhero">Superhero</SelectItem>
                <SelectItem value="thriller">Thriller</SelectItem>
                <SelectItem value="war">War</SelectItem>
                <SelectItem value="western">Western</SelectItem>
              </SelectContent>
            </Select>
            {activeTab === 'franchises' ? (
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
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
            ) : (
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  <SelectItem value="literature">Literature</SelectItem>
                  <SelectItem value="mythology">Mythology</SelectItem>
                  <SelectItem value="folklore">Folklore</SelectItem>
                  <SelectItem value="historical">Historical</SelectItem>
                  <SelectItem value="religious">Religious</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Results per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 / page</SelectItem>
                <SelectItem value="24">24 / page</SelectItem>
                <SelectItem value="48">48 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="franchises">Franchise Licenses ({filteredFranchises.length})</TabsTrigger>
          <TabsTrigger value="public-domain">Public Domain ({filteredPublicDomain.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="franchises" className="space-y-4">
          {filteredFranchises.length === 0 ? (
            <div className="p-6 border rounded-lg bg-card text-sm text-muted-foreground">
              No franchises match your filters.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  Showing {pagedFranchises.start}–{pagedFranchises.end} of {filteredFranchises.length}
                </div>
                <div>
                  Page {franchisePage} of {franchiseTotalPages}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pagedFranchises.items.map((franchise) => {
                  const licenseCost = typeof franchise.cost === 'number' ? franchise.cost : 0;

                  const hasLicense = licensedFranchiseIds.has(franchise.id);

                  const hasInvitation =
                    !!activeInvitation &&
                    activeInvitation.franchiseId === franchise.id &&
                    activeInvitation.usesRemaining > 0 &&
                    activeInvitation.expiresWeekIndex > currentWeekIndex;

                  const isFree = !licenseCost || licenseCost <= 0;

                  const invitationWeeksLeft = hasInvitation
                    ? Math.max(0, activeInvitation!.expiresWeekIndex - currentWeekIndex)
                    : 0;

                  const feeLabel = hasLicense
                    ? 'PAID'
                    : hasInvitation
                    ? 'INVITED'
                    : isFree
                    ? 'FREE'
                    : formatMoneyCompact(licenseCost);
                  const shouldCharge = !hasLicense && !hasInvitation && licenseCost > 0;

                  return (
                    <Card key={franchise.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{franchise.title}</CardTitle>
                            <CardDescription className="mt-1">
                              {franchise.inspirationLabel && <span>{`Inspired by ${franchise.inspirationLabel}`}</span>}
                              {franchise.originMedium && (
                                <span className={`capitalize ${franchise.inspirationLabel ? 'block' : ''}`}>
                                  Origin: {franchise.originMedium}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`${getFranchiseStatusColor(franchise.status)} text-white`}>
                              {franchise.status}
                            </Badge>
                            {hasLicense && (
                              <Badge variant="outline" className="text-xs">
                                Licensed
                              </Badge>
                            )}
                            {!hasLicense && hasInvitation && (
                              <>
                                <Badge variant="secondary" className="text-xs">
                                  Invitation
                                </Badge>
                                <div className="text-[10px] text-muted-foreground">
                                  Expires in {invitationWeeksLeft}w
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Cultural Weight</span>
                            <span className="font-mono">{franchise.culturalWeight}/100</span>
                          </div>
                          <Progress value={franchise.culturalWeight} className="h-2" />
                        </div>

                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4" />
                              <span className="text-sm font-medium">License Fee</span>
                            </div>
                            <span
                              className={`text-lg font-bold ${hasLicense || hasInvitation || isFree ? 'text-green-600' : ''}`}
                            >
                              {feeLabel}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {hasLicense
                              ? 'You have already licensed this franchise.'
                              : hasInvitation
                              ? `You have a one-off invitation to develop a single film under this franchise. Expires in ${invitationWeeksLeft} weeks. Permanent license: ${isFree ? 'FREE' : formatMoneyCompact(licenseCost)}.`
                              : isFree
                              ? 'No license fee for this franchise.'
                              : 'One-time fee (paid the first time you develop this franchise).'}
                          </div>
                          {franchise.description && (
                            <div className="flex items-start space-x-2 mt-2">
                              <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-muted-foreground">{franchise.description}</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium">Genres:</div>
                          <div className="flex flex-wrap gap-1">
                            {franchise.genre.map((genre) => (
                              <Badge key={genre} variant="secondary" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium">Tags:</div>
                          <div className="flex flex-wrap gap-1">
                            {franchise.franchiseTags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {franchise.franchiseTags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{franchise.franchiseTags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>Entries: {franchise.entries.length}</div>
                          <div>Since: {new Date(franchise.originDate).getFullYear()}</div>
                          {franchise.criticalFatigue && (
                            <div className="col-span-2">
                              Fatigue: {franchise.criticalFatigue}%
                            </div>
                          )}
                        </div>

                        <Button 
                          className="w-full"
                          onClick={() =>
                            onCreateProject(franchise.id, undefined, shouldCharge ? licenseCost : undefined)
                          }
                          variant="default"
                        >
                          {hasInvitation ? 'Develop (Invitation)' : hasLicense ? 'Develop New Entry' : isFree ? 'Develop' : 'License & Develop'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {franchiseTotalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        aria-disabled={franchisePage === 1}
                        tabIndex={franchisePage === 1 ? -1 : undefined}
                        className={franchisePage === 1 ? 'pointer-events-none opacity-50' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          if (franchisePage > 1) setFranchisePage(franchisePage - 1);
                        }}
                      />
                    </PaginationItem>

                    {buildPageItems(franchisePage, franchiseTotalPages).map((p, idx) => (
                      <PaginationItem key={`${p}-${idx}`}>
                        {p === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            isActive={p === franchisePage}
                            onClick={(e) => {
                              e.preventDefault();
                              setFranchisePage(p);
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
                        aria-disabled={franchisePage === franchiseTotalPages}
                        tabIndex={franchisePage === franchiseTotalPages ? -1 : undefined}
                        className={franchisePage === franchiseTotalPages ? 'pointer-events-none opacity-50' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          if (franchisePage < franchiseTotalPages) setFranchisePage(franchisePage + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="public-domain" className="space-y-4">
          {filteredPublicDomain.length === 0 ? (
            <div className="p-6 border rounded-lg bg-card text-sm text-muted-foreground">
              No public domain IPs match your filters.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  Showing {pagedPublicDomain.start}–{pagedPublicDomain.end} of {filteredPublicDomain.length}
                </div>
                <div>
                  Page {publicDomainPage} of {publicDomainTotalPages}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pagedPublicDomain.items.map((ip) => (
                  <Card key={ip.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getDomainTypeIcon(ip.domainType)}
                          <div>
                            <CardTitle className="text-lg">{ip.name}</CardTitle>
                            <CardDescription className="mt-1 capitalize">
                              {ip.domainType}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-mono">{ip.reputationScore}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Cultural Relevance</span>
                          <span className="font-mono">{ip.culturalRelevance || ip.reputationScore}/100</span>
                        </div>
                        <Progress value={ip.culturalRelevance || ip.reputationScore} className="h-2" />
                      </div>

                      {ip.adaptationFatigue && ip.adaptationFatigue > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Adaptation Fatigue</span>
                            <span className="font-mono text-orange-500">{ip.adaptationFatigue}/100</span>
                          </div>
                          <Progress value={ip.adaptationFatigue} className="h-2" />
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Available Genres:</div>
                        <div className="flex flex-wrap gap-1">
                          {ip.genreFlexibility.map((genre) => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Core Elements:</div>
                        <div className="text-xs text-muted-foreground">
                          {ip.coreElements.slice(0, 3).join(', ')}
                          {ip.coreElements.length > 3 && '...'}
                        </div>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-sm font-medium">Cost</span>
                          </div>
                          <span className="text-lg font-bold text-green-600">FREE</span>
                        </div>
                        {ip.description && (
                          <div className="flex items-start space-x-2 mt-2">
                            <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">{ip.description}</p>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Previous adaptations: {ip.notableAdaptations.length}
                        {ip.lastAdaptationDate && (
                          <div className="mt-1">
                            Last adapted: {new Date(ip.lastAdaptationDate).getFullYear()}
                          </div>
                        )}
                      </div>

                      <Button 
                        className="w-full"
                        onClick={() => onCreateProject(undefined, ip.id, ip.cost)}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Adapt Property
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {publicDomainTotalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        aria-disabled={publicDomainPage === 1}
                        tabIndex={publicDomainPage === 1 ? -1 : undefined}
                        className={publicDomainPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          if (publicDomainPage > 1) setPublicDomainPage(publicDomainPage - 1);
                        }}
                      />
                    </PaginationItem>

                    {buildPageItems(publicDomainPage, publicDomainTotalPages).map((p, idx) => (
                      <PaginationItem key={`${p}-${idx}`}>
                        {p === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            isActive={p === publicDomainPage}
                            onClick={(e) => {
                              e.preventDefault();
                              setPublicDomainPage(p);
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
                        aria-disabled={publicDomainPage === publicDomainTotalPages}
                        tabIndex={publicDomainPage === publicDomainTotalPages ? -1 : undefined}
                        className={publicDomainPage === publicDomainTotalPages ? 'pointer-events-none opacity-50' : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          if (publicDomainPage < publicDomainTotalPages) setPublicDomainPage(publicDomainPage + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
