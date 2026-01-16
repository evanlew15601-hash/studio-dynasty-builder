import { useState, useEffect, useCallback } from 'react';
import { TalentPerson, TalentAgent, TalentHold, ChemistryEvent, BurnoutCalculation } from '@/types/game';
import { rng } from '@/utils/rng';

interface AdvancedTalentState {
  agents: TalentAgent[];
  holds: TalentHold[];
  chemistryEvents: ChemistryEvent[];
  loyaltyScores: { [talentId: string]: { [studioId: string]: number } };
}

export const useAdvancedTalentManagement = (
  talent: TalentPerson[],
  currentWeek: number,
  currentYear: number,
  studioId: string
) => {
  const [state, setState] = useState<AdvancedTalentState>({
    agents: [],
    holds: [],
    chemistryEvents: [],
    loyaltyScores: {}
  });

  // Initialize agents for talent
  useEffect(() => {
    const existingAgentIds = new Set(state.agents.map(a => a.id));
    const newAgents: TalentAgent[] = [];

    talent.forEach(person => {
      if (person.agent && !existingAgentIds.has(person.agent.id)) {
        newAgents.push(person.agent);
        existingAgentIds.add(person.agent.id);
      }
    });

    if (newAgents.length > 0) {
      setState(prev => ({
        ...prev,
        agents: [...prev.agents, ...newAgents]
      }));
    }
  }, [talent, state.agents]);

  // Calculate burnout for all talent
  const calculateBurnout = useCallback((person: TalentPerson): BurnoutCalculation => {
    const recentProjects = person.recentProjects?.length || 0;
    const lastWorkWeek = person.lastWorkWeek || 0;
    const weeksSinceWork = currentWeek - lastWorkWeek;
    
    // Base burnout from project count
    let burnout = Math.min(recentProjects * 15, 80);
    
    // Recovery over time
    const recoveryRate = Math.min(weeksSinceWork * 2, 40);
    burnout = Math.max(0, burnout - recoveryRate);
    
    // High-pressure projects increase burnout
    const intensityScore = recentProjects > 3 ? 20 : recentProjects > 2 ? 10 : 0;
    burnout = Math.min(100, burnout + intensityScore);
    
    return {
      talentId: person.id,
      recentProjects,
      intensityScore,
      recoveryWeeks: weeksSinceWork,
      currentBurnout: Math.round(burnout)
    };
  }, [currentWeek]);

  // Get loyalty score between talent and studio
  const getLoyaltyScore = useCallback((talentId: string, targetStudioId: string): number => {
    return state.loyaltyScores[talentId]?.[targetStudioId] || 50; // Default neutral loyalty
  }, [state.loyaltyScores]);

  // Update loyalty based on project outcome
  const updateLoyalty = useCallback((talentId: string, targetStudioId: string, change: number) => {
    setState(prev => ({
      ...prev,
      loyaltyScores: {
        ...prev.loyaltyScores,
        [talentId]: {
          ...prev.loyaltyScores[talentId],
          [targetStudioId]: Math.max(0, Math.min(100, (prev.loyaltyScores[talentId]?.[targetStudioId] || 50) + change))
        }
      }
    }));
  }, []);

  // Create a talent hold/pre-contract
  const createHold = useCallback((hold: TalentHold) => {
    setState(prev => ({
      ...prev,
      holds: [...prev.holds, hold]
    }));
  }, []);

  // Cancel or expire holds
  const updateHold = useCallback((holdId: string, status: TalentHold['status']) => {
    setState(prev => ({
      ...prev,
      holds: prev.holds.map(hold => 
        hold.id === holdId ? { ...hold, status } : hold
      )
    }));
  }, []);

  // Add chemistry event (kept purely in hook state to avoid mutating external talent arrays)
  const addChemistryEvent = useCallback((event: ChemistryEvent) => {
    setState(prev => ({
      ...prev,
      chemistryEvents: [...prev.chemistryEvents, event]
    }));
  }, []);

  // Negotiate with agent
  const negotiateWithAgent = useCallback((
    agentId: string, 
    talentId: string, 
    terms: any
  ): { success: boolean; message: string; cost?: number } => {
    const agent = state.agents.find(a => a.id === agentId);
    const person = talent.find(t => t.id === talentId);
    
    if (!agent || !person) {
      return { success: false, message: 'Agent or talent not found' };
    }

    // Calculate success chance
    const baseSuccess = 50;
    const powerBonus = agent.powerLevel * 5;
    const reputationBonus = agent.reputation * 0.2;
    const loyaltyBonus = getLoyaltyScore(talentId, studioId) * 0.3;
    
    const successChance = baseSuccess + powerBonus + reputationBonus + loyaltyBonus;
    const success = rng.next() * 100 &lt; successChance;
    
    if (success) {
      const baseCost = person.marketValue * (agent.commission / 100);
      const termMultiplier = terms.type === 'exclusive' ? 1.5 : terms.type === 'priority' ? 1.2 : 1.0;
      const finalCost = baseCost * termMultiplier;
      
      // Update loyalty based on deal quality
      updateLoyalty(talentId, studioId, terms.type === 'exclusive' ? 10 : 5);
      
      return {
        success: true,
        message: `Successfully negotiated ${terms.type} deal through ${agent.name}`,
        cost: finalCost
      };
    } else {
      // Small loyalty penalty for failed negotiation
      updateLoyalty(talentId, studioId, -2);
      
      return {
        success: false,
        message: `${agent.name} couldn't secure the deal. Agent suggests improving studio reputation or offering better terms.`
      };
    }
  }, [state.agents, talent, getLoyaltyScore, studioId, updateLoyalty]);

  // Weekly system updates
  useEffect(() => {
    // Expire old holds
    setState(prev => ({
      ...prev,
      holds: prev.holds.map(hold => {
        if (hold.endWeek <= currentWeek && hold.year <= currentYear && hold.status === 'pending') {
          return { ...hold, status: 'expired' };
        }
        return hold;
      })
    }));

    // Random chemistry events between talent
    if (rng.next() &lt; 0.1) { // 10% chance per week
      const availableTalent = talent.filter(t => t.contractStatus === 'contracted');
      if (availableTalent.length >= 2) {
        const talent1 = availableTalent[rng.int(availableTalent.length)];
        const talent2 = availableTalent[rng.int(availableTalent.length)];
        
        if (talent1.id !== talent2.id) {
          const eventTypes = ['positive', 'negative', 'neutral'] as const;
          const eventType = eventTypes[rng.int(eventTypes.length)];
          
          const event: ChemistryEvent = {
            id: `chemistry_${Date.now()}`,
            talent1Id: talent1.id,
            talent2Id: talent2.id,
            projectId: 'random_interaction',
            interactionType: eventType,
            magnitude: rng.int(10) + 5,
            description: eventType === 'positive' ? 'Had great working chemistry on set' :
                        eventType === 'negative' ? 'Experienced creative differences' :
                        'Worked together professionally',
            week: currentWeek,
            year: currentYear
          };
          
          addChemistryEvent(event);
        }
      }
    }, [currentWeek, currentYear, talent, addChemistryEvent]);

  return {
    // State
    agents: state.agents,
    holds: state.holds,
    chemistryEvents: state.chemistryEvents,
    loyaltyScores: state.loyaltyScores,
    
    // Functions
    calculateBurnout,
    getLoyaltyScore,
    updateLoyalty,
    createHold,
    updateHold,
    addChemistryEvent,
    negotiateWithAgent,
    
    // Utilities
    getActiveHolds: () => state.holds.filter(h => h.status === 'confirmed'),
    getPendingHolds: () => state.holds.filter(h => h.status === 'pending'),
    getRecentChemistryEvents: () => state.chemistryEvents.slice(-20),
    getTopAgents: () => state.agents.sort((a, b) => b.powerLevel - a.powerLevel).slice(0, 10)
  };
};