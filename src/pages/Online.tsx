import { GameLanding } from '@/components/game/GameLanding';
import { GlobalLoadingOverlay } from '@/components/ui/global-loading-overlay';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { Suspense, lazy, useEffect, useState } from 'react';
import { loadGameAsync, SaveGameSnapshot } from '@/utils/saveLoad';
import { ensureGameStateRoleGenders, ensureTalentDemographics } from '@/utils/demographics';
import { ensureGameStateFictionalAwardNames } from '@/utils/awardsNaming';
import { ensureCompetitorStudiosLore } from '@/utils/competitorStudiosPatches';
import { ensureTalentLore } from '@/utils/talentLorePatches';
import { primeCompetitorTelevision } from '@/utils/televisionPatches';
import { Genre } from '@/types/game';
import type { StudioIconConfig } from '@/components/game/StudioIconCustomizer';
import { getModBundle } from '@/utils/moddingStore';
import { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';

const StudioMagnateGame = lazy(() =>
  import('@/components/game/StudioMagnateGame').then((m) => ({ default: m.StudioMagnateGame }))
);

type GameConfig = {
  studioName: string;
  specialties: Genre[];
  difficulty: 'easy' | 'normal' | 'hard' | 'magnate';
  startingBudget: number;
  studioIcon?: StudioIconConfig;
};

function generateLeagueCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 7; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

const Online = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [loadedSnapshot, setLoadedSnapshot] = useState<SaveGameSnapshot | null>(null);
  const [onlineLeagueCode, setOnlineLeagueCode] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const last = window.localStorage.getItem('studio-magnate-online-last-league');
    if (last) setOnlineLeagueCode(last);
  }, []);

  const handleStartGame = (config: GameConfig) => {
    setLoadedSnapshot(null);
    setGameConfig(config);
    setGameStarted(true);
  };

  const handleLeagueCodeChange = (code: string) => {
    setOnlineLeagueCode(code);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studio-magnate-online-last-league', code);
    }
  };

  const handleLoadGame = async () => {
    const snapshot = await loadGameAsync('slot1');

    if (!snapshot) {
      if (typeof window !== 'undefined') {
        window.alert('No saved game found in this browser yet. Start a new game first, then use the in-game Save button.');
      }
      return;
    }

    const mods = getModBundle();

    const patchedTalent = applyPatchesByKey(snapshot.gameState.talent || [], getPatchesForEntity(mods, 'talent'), (t) => t.id);

    const patchedGameState = primeCompetitorTelevision(
      ensureCompetitorStudiosLore(
        ensureTalentLore(
          ensureGameStateFictionalAwardNames(
            ensureGameStateRoleGenders({
              ...snapshot.gameState,
              talent: ensureTalentDemographics(patchedTalent),
              franchises: applyPatchesByKey(snapshot.gameState.franchises || [], getPatchesForEntity(mods, 'franchise'), (f) => f.id),
              publicDomainIPs: applyPatchesByKey(
                snapshot.gameState.publicDomainIPs || [],
                getPatchesForEntity(mods, 'publicDomainIP'),
                (p) => p.id
              ),
            })
          )
        )
      )
    );

    setLoadedSnapshot({ ...snapshot, gameState: patchedGameState });
    setGameConfig(null);
    setGameStarted(true);
  };

  const handleGenerateLeagueCode = () => {
    const next = generateLeagueCode();
    setOnlineLeagueCode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studio-magnate-online-last-league', next);
    }
  };

  return (
    <LoadingProvider>
      <GlobalLoadingOverlay />
      {!gameStarted ? (
        <GameLanding
          mode="online"
          onlineLeagueCode={onlineLeagueCode}
          onOnlineLeagueCodeChange={handleLeagueCodeChange}
          onGenerateOnlineLeagueCode={handleGenerateLeagueCode}
          onStartGame={handleStartGame}
          onLoadGame={handleLoadGame}
        />
      ) : (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading game...</div>}>
          <StudioMagnateGame
            gameConfig={gameConfig ?? undefined}
            initialGameState={loadedSnapshot?.gameState}
            initialPhase={loadedSnapshot?.meta.currentPhase}
            initialUnlockedAchievements={loadedSnapshot?.unlockedAchievements}
            onlineLeagueCode={onlineLeagueCode.trim()}
          />
        </Suspense>
      )}
    </LoadingProvider>
  );
};

export default Online;
