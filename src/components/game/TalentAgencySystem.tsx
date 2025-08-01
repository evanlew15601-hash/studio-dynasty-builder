import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TalentAgent, TalentPerson, TalentHold } from '@/types/game';
import { Star, Users, DollarSign, Handshake } from 'lucide-react';

interface TalentAgencySystemProps {
  agents: TalentAgent[];
  talent: TalentPerson[];
  studioId: string;
  currentWeek: number;
  currentYear: number;
  onNegotiateDeal: (agentId: string, talentId: string, terms: any) => void;
  onCreateHold: (hold: TalentHold) => void;
}

export const TalentAgencySystem: React.FC<TalentAgencySystemProps> = ({
  agents,
  talent,
  studioId,
  currentWeek,
  currentYear,
  onNegotiateDeal,
  onCreateHold
}) => {
  const [selectedAgent, setSelectedAgent] = useState<TalentAgent | null>(null);
  const [selectedTalent, setSelectedTalent] = useState<TalentPerson | null>(null);
  const [dealType, setDealType] = useState<'standard' | 'priority' | 'exclusive'>('standard');

  const getAgentClients = (agentId: string) => {
    return talent.filter(t => t.agent?.id === agentId);
  };

  const calculateDealSuccess = (agent: TalentAgent, talentPerson: TalentPerson) => {
    const baseSuccess = 50;
    const powerBonus = agent.powerLevel * 5;
    const reputationBonus = agent.reputation * 0.2;
    const connectionBonus = agent.connectionStrength * 0.3;
    const talentDifficulty = talentPerson.reputation * 0.1;
    
    return Math.min(95, baseSuccess + powerBonus + reputationBonus + connectionBonus - talentDifficulty);
  };

  const handleNegotiation = () => {
    if (!selectedAgent || !selectedTalent) return;

    const successChance = calculateDealSuccess(selectedAgent, selectedTalent);
    const terms = {
      type: dealType,
      commission: selectedAgent.commission,
      priority: dealType === 'priority',
      exclusive: dealType === 'exclusive',
      successChance
    };

    onNegotiateDeal(selectedAgent.id, selectedTalent.id, terms);
  };

  const createPriorityHold = () => {
    if (!selectedTalent) return;

    const hold: TalentHold = {
      id: `hold_${Date.now()}`,
      talentId: selectedTalent.id,
      studioId,
      startWeek: currentWeek + 4,
      endWeek: currentWeek + 12,
      year: currentYear,
      type: 'hold',
      status: 'pending',
      terms: {
        salary: selectedTalent.marketValue * 1.1,
        bonuses: selectedTalent.marketValue * 0.1
      }
    };

    onCreateHold(hold);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Talent Agency Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Select Agent</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {agents.map(agent => (
                  <Card 
                    key={agent.id}
                    className={`cursor-pointer transition-colors ${
                      selectedAgent?.id === agent.id ? 'ring-2 ring-primary' : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{agent.name}</h4>
                          <p className="text-sm text-muted-foreground">{agent.agency}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Power: {agent.powerLevel}/10
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {getAgentClients(agent.id).length} clients
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium">{agent.commission}%</p>
                          <p className="text-muted-foreground">commission</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Talent Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Available Talent
                {selectedAgent && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({selectedAgent.name}'s clients)
                  </span>
                )}
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(selectedAgent ? getAgentClients(selectedAgent.id) : talent.slice(0, 10)).map(person => (
                  <Card 
                    key={person.id}
                    className={`cursor-pointer transition-colors ${
                      selectedTalent?.id === person.id ? 'ring-2 ring-primary' : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedTalent(person)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{person.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{person.type}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            Rep: {person.reputation}/100
                          </Badge>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium">
                            ${(person.marketValue / 1000000).toFixed(1)}M
                          </p>
                          <p className="text-muted-foreground">market value</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Deal Controls */}
          {selectedAgent && selectedTalent && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/50">
              <h3 className="text-lg font-semibold mb-3">Negotiate Deal</h3>
              <div className="flex gap-4 mb-4">
                <Button
                  variant={dealType === 'standard' ? 'default' : 'outline'}
                  onClick={() => setDealType('standard')}
                >
                  Standard Deal
                </Button>
                <Button
                  variant={dealType === 'priority' ? 'default' : 'outline'}
                  onClick={() => setDealType('priority')}
                >
                  Priority Access
                </Button>
                <Button
                  variant={dealType === 'exclusive' ? 'default' : 'outline'}
                  onClick={() => setDealType('exclusive')}
                >
                  Exclusive Contract
                </Button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm">
                    Success Chance: <span className="font-medium">
                      {calculateDealSuccess(selectedAgent, selectedTalent)}%
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Commission: {selectedAgent.commission}% + deal premiums
                  </p>
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={createPriorityHold}>
                    Create Hold
                  </Button>
                  <Button onClick={handleNegotiation}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Negotiate
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};