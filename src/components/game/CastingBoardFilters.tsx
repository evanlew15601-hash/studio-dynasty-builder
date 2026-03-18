import React from 'react';
import { TalentPerson, Genre } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterIcon, X } from 'lucide-react';

export interface CastingFilters {
  talentType: 'all' | 'actor' | 'director';
  genre: 'all' | Genre;
  ageRange: [number, number];
  reputationRange: [number, number];
  experienceRange: [number, number];
  marketValueRange: [number, number];
  hasAwards: boolean | null;
  searchQuery: string;
}

interface CastingBoardFiltersProps {
  filters: CastingFilters;
  onFiltersChange: (filters: CastingFilters) => void;
  talent: TalentPerson[];
}

export const CastingBoardFilters: React.FC<CastingBoardFiltersProps> = ({
  filters,
  onFiltersChange,
  talent
}) => {
  const genres: Genre[] = [
    'action', 'adventure', 'comedy', 'drama', 'horror', 'thriller',
    'romance', 'erotica', 'sci-fi', 'fantasy', 'documentary', 'animation',
    'musical', 'western', 'war', 'biography', 'crime', 'mystery',
    'superhero', 'family', 'sports', 'historical'
  ];

  const updateFilter = (key: keyof CastingFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      talentType: 'all',
      genre: 'all',
      ageRange: [18, 80],
      reputationRange: [0, 100],
      experienceRange: [0, 50],
      marketValueRange: [0, 50000000],
      hasAwards: null,
      searchQuery: ''
    });
  };

  const getFilteredCount = () => {
    return talent.filter(t => {
      if (filters.talentType !== 'all' && t.type !== filters.talentType) return false;
      if (filters.genre !== 'all' && !t.genres.includes(filters.genre)) return false;
      if (t.age < filters.ageRange[0] || t.age > filters.ageRange[1]) return false;
      if (t.reputation < filters.reputationRange[0] || t.reputation > filters.reputationRange[1]) return false;
      if (t.experience < filters.experienceRange[0] || t.experience > filters.experienceRange[1]) return false;
      if (t.marketValue < filters.marketValueRange[0] || t.marketValue > filters.marketValueRange[1]) return false;
      if (filters.hasAwards !== null && (t.awards?.length > 0) !== filters.hasAwards) return false;
      if (filters.searchQuery && !t.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
      return true;
    }).length;
  };

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FilterIcon className="mr-2" size={20} />
            Talent Filters
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {getFilteredCount()} results
            </Badge>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X size={14} className="mr-1" />
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search Talent</Label>
            <Input
              id="search"
              placeholder="Search by name..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Talent Type */}
          <div>
            <Label>Talent Type</Label>
            <Select
              value={filters.talentType}
              onValueChange={(value) => updateFilter('talentType', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="actor">Actors</SelectItem>
                <SelectItem value="director">Directors</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Genre Specialty */}
          <div>
            <Label>Genre Specialty</Label>
            <Select
              value={filters.genre}
              onValueChange={(value) => updateFilter('genre', value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genres.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Awards Filter */}
          <div>
            <Label>Awards Status</Label>
            <Select
              value={filters.hasAwards === null ? 'all' : filters.hasAwards ? 'yes' : 'no'}
              onValueChange={(value) => updateFilter('hasAwards', value === 'all' ? null : value === 'yes')}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Talent</SelectItem>
                <SelectItem value="yes">Award Winners</SelectItem>
                <SelectItem value="no">No Awards</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Age Range */}
          <div>
            <Label>Age Range: {filters.ageRange[0]} - {filters.ageRange[1]}</Label>
            <div className="mt-2">
              <Slider
                value={filters.ageRange}
                onValueChange={(value) => updateFilter('ageRange', value as [number, number])}
                min={18}
                max={80}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Reputation Range */}
          <div>
            <Label>Reputation: {filters.reputationRange[0]} - {filters.reputationRange[1]}</Label>
            <div className="mt-2">
              <Slider
                value={filters.reputationRange}
                onValueChange={(value) => updateFilter('reputationRange', value as [number, number])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          </div>

          {/* Experience Range */}
          <div>
            <Label>Experience: {filters.experienceRange[0]} - {filters.experienceRange[1]} years</Label>
            <div className="mt-2">
              <Slider
                value={filters.experienceRange}
                onValueChange={(value) => updateFilter('experienceRange', value as [number, number])}
                min={0}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Market Value Range */}
          <div>
            <Label>Market Value: ${(filters.marketValueRange[0] / 1000000).toFixed(1)}M - ${(filters.marketValueRange[1] / 1000000).toFixed(1)}M</Label>
            <div className="mt-2">
              <Slider
                value={filters.marketValueRange}
                onValueChange={(value) => updateFilter('marketValueRange', value as [number, number])}
                min={0}
                max={50000000}
                step={1000000}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};