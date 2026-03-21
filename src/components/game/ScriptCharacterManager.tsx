import React, { useState } from 'react';
import type { ScriptCharacter as GameScriptCharacter, Gender, Race } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, Users, Lock, Pencil } from 'lucide-react';
import { NATIONALITY_OPTIONS, RACE_OPTIONS } from '@/utils/demographics';
import { nextNumericId } from '@/utils/idAllocator';

// UI-layer type: keep the core game character fields, but allow extra UI helpers.
export interface ScriptCharacter extends GameScriptCharacter {
  screenTimeMinutes?: number;
}

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
    traits: [],
    requiredGender: 'Male',
    requiredRace: undefined,
    requiredNationality: undefined,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<ScriptCharacter | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<ScriptCharacter>>({});

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
    const requiredType = newCharacter.requiredType || (importance === 'crew' ? 'director' : 'actor');

    const character: ScriptCharacter = {
      id: nextNumericId('char', characters.map((c) => c.id)),
      name: newCharacter.name,
      importance,
      screenTimeMinutes: newCharacter.screenTimeMinutes ?? (importanceTypes.find(r => r.value === importance)?.screenTime ?? 15),
      description: newCharacter.description || '',
      ageRange: newCharacter.ageRange || [25, 45],
      traits: newCharacter.traits || [],
      requiredType,
      requiredGender: requiredType === 'actor' ? (newCharacter.requiredGender || 'Male') : undefined,
      requiredRace: requiredType === 'actor' ? newCharacter.requiredRace : undefined,
      requiredNationality: requiredType === 'actor' ? newCharacter.requiredNationality : undefined,
    };

    onCharactersChange([...characters, character]);
    setNewCharacter({
      name: '',
      importance: 'supporting',
      screenTimeMinutes: 15,
      description: '',
      ageRange: [25, 45],
      traits: [],
      requiredGender: 'Male',
      requiredRace: undefined,
      requiredNationality: undefined,
    });
    setIsAdding(false);
  };

  const handleRemoveCharacter = (id: string) => {
    onCharactersChange(characters.filter(c => c.id !== id));
  };

  const handleUpdateCharacter = (id: string, updates: Partial<ScriptCharacter>) => {
    onCharactersChange(characters.map(c => {
      if (c.id !== id) return c;

      // For locked/imported roles, persist editable fields into localOverrides so re-import keeps them.
      if (c.locked) {
        const prevOverrides = c.localOverrides || {};
        const overridePatch: Partial<ScriptCharacter['localOverrides']> = {};

        if ('name' in updates) overridePatch.name = updates.name;
        if ('description' in updates) overridePatch.description = updates.description;
        if ('traits' in updates) overridePatch.traits = updates.traits;
        if ('ageRange' in updates) overridePatch.ageRange = updates.ageRange;
        if ('requiredGender' in updates) overridePatch.requiredGender = updates.requiredGender;
        if ('requiredRace' in updates) overridePatch.requiredRace = updates.requiredRace;
        if ('requiredNationality' in updates) overridePatch.requiredNationality = updates.requiredNationality;

        return {
          ...c,
          ...updates,
          localOverrides: { ...prevOverrides, ...overridePatch },
        };
      }

      return { ...c, ...updates };
    }));
  };

  const openEdit = (character: ScriptCharacter) => {
    setEditingCharacter(character);
    const requiredType = character.requiredType || (character.importance === 'crew' ? 'director' : 'actor');

    setEditDraft({
      name: character.name,
      description: character.description || '',
      ageRange: character.ageRange,
      requiredGender: requiredType === 'actor' ? (character.requiredGender || 'Male') : undefined,
      requiredRace: character.requiredRace,
      requiredNationality: character.requiredNationality,
    });
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!editingCharacter) return;

    const requiredType = editingCharacter.requiredType || (editingCharacter.importance === 'crew' ? 'director' : 'actor');

    handleUpdateCharacter(editingCharacter.id, {
      name: editDraft.name?.trim() || editingCharacter.name,
      description: editDraft.description || '',
      ageRange: editDraft.ageRange,
      requiredGender: requiredType === 'actor' ? ((editDraft.requiredGender as Gender) || (editingCharacter.requiredGender as Gender) || 'Male') : undefined,
      requiredRace: requiredType === 'actor' ? (editDraft.requiredRace as Race | undefined) : undefined,
      requiredNationality: requiredType === 'actor' ? (editDraft.requiredNationality || undefined) : undefined,
    });

    setEditOpen(false);
    setEditingCharacter(null);
    setEditDraft({});
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
                      setNewCharacter(prev => {
                        const requiredType = value === 'crew' ? 'director' : 'actor';
                        return {
                          ...prev,
                          importance: value as any,
                          screenTimeMinutes: importance?.screenTime || 15,
                          requiredType,
                          requiredGender: requiredType === 'actor' ? (prev.requiredGender || 'Male') : undefined,
                          requiredRace: requiredType === 'actor' ? prev.requiredRace : undefined,
                          requiredNationality: requiredType === 'actor' ? prev.requiredNationality : undefined,
                        };
                      });
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

                {newCharacter.importance !== 'crew' && (newCharacter.requiredType || 'actor') !== 'director' && (
                  <>
                    <div>
                      <Label>Required Gender</Label>
                      <Select
                        value={newCharacter.requiredGender || 'Male'}
                        onValueChange={(value) => setNewCharacter(prev => ({
                          ...prev,
                          requiredGender: value as Gender
                        }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Required Race</Label>
                      <Select
                        value={newCharacter.requiredRace || 'any'}
                        onValueChange={(value) => setNewCharacter(prev => ({
                          ...prev,
                          requiredRace: value === 'any' ? undefined : (value as Race)
                        }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          {RACE_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Label>Required Nationality</Label>
                      <Select
                        value={newCharacter.requiredNationality || 'any'}
                        onValueChange={(value) => setNewCharacter(prev => ({
                          ...prev,
                          requiredNationality: value === 'any' ? undefined : value
                        }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          {NATIONALITY_OPTIONS.map((n) => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

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
                      {character.requiredGender && (
                        <Badge variant="outline">Gender: {character.requiredGender}</Badge>
                      )}
                      {character.requiredRace && (
                        <Badge variant="outline">Race: {character.requiredRace}</Badge>
                      )}
                      {character.requiredNationality && (
                        <Badge variant="outline">Nationality: {character.requiredNationality}</Badge>
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

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(character)}
                      title="Edit role"
                    >
                      <Pencil size={16} />
                    </Button>

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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) {
              setEditingCharacter(null);
              setEditDraft({});
            }
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
            </DialogHeader>

            {editingCharacter && (() => {
              const requiredType = editingCharacter.requiredType || (editingCharacter.importance === 'crew' ? 'director' : 'actor');
              const ageRange = (editDraft.ageRange || editingCharacter.ageRange || [25, 45]) as [number, number];

              return (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editDraft.name || ''}
                      onChange={(e) => setEditDraft(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-desc">Description</Label>
                    <Input
                      id="edit-desc"
                      value={editDraft.description || ''}
                      onChange={(e) => setEditDraft(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Age Range: {ageRange[0]} - {ageRange[1]}</Label>
                    <div className="mt-2">
                      <Slider
                        value={ageRange}
                        onValueChange={(value) => setEditDraft(prev => ({ ...prev, ageRange: value as [number, number] }))}
                        min={18}
                        max={80}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {requiredType !== 'director' && (
                    <>
                      <div>
                        <Label>Required Gender</Label>
                        <Select
                          value={(editDraft.requiredGender as any) || 'Male'}
                          onValueChange={(value) => setEditDraft(prev => ({
                            ...prev,
                            requiredGender: value as Gender
                          }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Required Race</Label>
                        <Select
                          value={(editDraft.requiredRace as any) || 'any'}
                          onValueChange={(value) => setEditDraft(prev => ({
                            ...prev,
                            requiredRace: value === 'any' ? undefined : (value as Race)
                          }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            {RACE_OPTIONS.map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Required Nationality</Label>
                        <Select
                          value={(editDraft.requiredNationality as any) || 'any'}
                          onValueChange={(value) => setEditDraft(prev => ({
                            ...prev,
                            requiredNationality: value === 'any' ? undefined : value
                          }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            {NATIONALITY_OPTIONS.map((n) => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditOpen(false);
                        setEditingCharacter(null);
                        setEditDraft({});
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveEdit}>Save</Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

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
