import React, { useState } from 'react';
import type { ScriptCharacter as GameScriptCharacter } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Users, Lock } from 'lucide-react';

export type ScriptCharacter = GameScriptCharacter;

interface ScriptCharacterManagerProps {
  characters: ScriptCharacter[];
  onCharactersChange: (characters: ScriptCharacter[]) => void;
}

export const ScriptCharacterManager: React.FC<ScriptCharacterManagerProps> = ({
  characters,
  onCharactersChange
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCharacter, setNewCharacter] = useState<Partial<ScriptCharacter>>({
    name: '',
    importance: 'supporting',
    screenTimeMinutes: 15,
    description: '',
    ageRange: [25, 45],
    traits: []
  });

  const importanceTypes: Array<{ value: ScriptCharacter['importance']; label: string; screenTime: number }> = [
    { value: 'lead', label: 'Lead Role', screenTime: 60 },
    { value: 'supporting', label: 'Supporting Role', screenTime: 25 },
    { value: 'minor', label: 'Minor / Cameo', screenTime: 5 },
    { value: 'crew', label: 'Crew (Director)', screenTime: 0 }
  ];

  const commonTraits = [
    'Action Hero', 'Comedic Timing', 'Dramatic Range', 'Romantic Lead',
    'Character Actor', 'Method Actor', 'Stage Presence', 'Physicality',
    'Voice Acting', 'Dancing', 'Singing', 'Stunts', 'Languages',
    'Improvisation', 'Classical Training', 'Award Winner'
  ];

  const handleAddCharacter = () => {
    if (!newCharacter.name) return;

    const importance = newCharacter.importance || 'supporting';
    const character: ScriptCharacter = {
      id: `char-${Date.now()}`,
      name: newCharacter.name,
      importance,
      screenTimeMinutes: newCharacter.screenTimeMinutes ?? (importanceTypes.find(r => r.value === importance)?.screenTime ?? 15),
      description: newCharacter.description || '',
      ageRange: newCharacter.ageRange || [25, 45],
      traits: newCharacter.traits || [],
      requiredType: newCharacter.requiredType || (importance === 'crew' ? 'director' : 'actor'),
    };

    onCharactersChange([...characters, character]);
    setNewCharacter({
      name: '',
      importance: 'supporting',
      screenTimeMinutes: 15,
      description: '',
      ageRange: [25, 45],
      traits: []
    });
    setIsAdding(false);
  };

  const handleRemoveCharacter = (id: string) => {
    onCharactersChange(characters.filter(c => c.id !== id));
  };

  const handleUpdateCharacter = (id: string, updates: Partial<ScriptCharacter>) => {
    onCharactersChange(characters.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const toggleTrait = (trait: string) => {
    const current = newCharacter.traits || [];
    const updated = current.includes(trait)
      ? current.filter(t => t !== trait)
      : [...current, trait];
    setNewCharacter(prev => ({ ...prev, traits: updated }));
  };

  const getTotalScreenTime = () => {
    return characters.reduce((total, char) => total + (char.screenTimeMinutes || 0), 0);
  };

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="mr-2" size={20} />
            Character Roles
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {characters.length} roles • {getTotalScreenTime()} min total
            </Badge>
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus size={14} className="mr-1" />
              Add Role
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Character Form */}
        {isAdding && (
          <Card className="border-dashed">
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="char-name">Character Name</Label>
                  <Input
                    id="char-name"
                    value={newCharacter.name || ''}
                    onChange={(e) => setNewCharacter(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Character name..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Role Importance</Label>
                  <Select
                    value={newCharacter.importance}
                    onValueChange={(value) => {
                      const importance = importanceTypes.find(r => r.value === value);
                      setNewCharacter(prev => ({
                        ...prev,
                        importance: value as any,
                        screenTimeMinutes: importance?.screenTime || 15,
                        requiredType: value === 'crew' ? 'director' : 'actor'
                      }));
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {importanceTypes.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label} {role.screenTime > 0 && `(~${role.screenTime} min)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="char-desc">Character Description</Label>
                  <Input
                    id="char-desc"
                    value={newCharacter.description || ''}
                    onChange={(e) => setNewCharacter(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief character description..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Age Range: {newCharacter.ageRange?.[0]} - {newCharacter.ageRange?.[1]}</Label>
                  <div className="mt-2">
                    <Slider
                      value={newCharacter.ageRange || [25, 45]}
                      onValueChange={(value) => setNewCharacter(prev => ({ ...prev, ageRange: value as [number, number] }))}
                      min={18}
                      max={80}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <Label>Screen Time: {newCharacter.screenTimeMinutes} minutes</Label>
                  <div className="mt-2">
                    <Slider
                      value={[newCharacter.screenTimeMinutes ?? 15]}
                      onValueChange={([value]) => setNewCharacter(prev => ({ ...prev, screenTimeMinutes: value }))}
                      min={0}
                      max={90}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label>Traits</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {commonTraits.map((trait) => (
                      <Badge
                        key={trait}
                        variant={(newCharacter.traits || []).includes(trait) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTrait(trait)}
                      >
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCharacter}>
                  Add Character
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Characters */}
        <div className="space-y-3">
          {characters.map((character) => (
            <Card key={character.id} className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
                      <h4 className="font-semibold">{character.name}</h4>
                      <Badge variant="outline" className="capitalize">
                        {character.importance}
                      </Badge>
                      {typeof character.screenTimeMinutes === 'number' && (
                        <Badge variant="secondary">{character.screenTimeMinutes} min</Badge>
                      )}
                      {character.ageRange && (
                        <Badge variant="outline">
                          Age {character.ageRange[0]}-{character.ageRange[1]}
                        </Badge>
                      )}
                      {character.locked && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Imported
                        </Badge>
                      )}
                    </div>

                    {character.description && (
                      <p className="text-sm text-muted-foreground mb-2">{character.description}</p>
                    )}

                    {(character.traits || []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(character.traits || []).map((trait) => (
                          <Badge key={trait} variant="secondary" className="text-xs">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCharacter(character.id)}
                    className="text-destructive hover:text-destructive"
                    disabled={!!character.locked}
                    title={character.locked ? 'Imported roles are locked' : 'Remove role'}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {characters.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto mb-4" size={48} />
            <p>No character roles defined</p>
            <p className="text-sm">Add roles to help with casting and production planning</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
