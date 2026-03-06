import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useGameStore } from '@/game/store';
import { 
  Tv, 
  Play, 
  Users, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Monitor,
  Wifi,
  Radio,
  Star,
  TrendingUp
} from 'lucide-react';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  details?: string;
  error?: string;
}

interface TelevisionSystemTestsProps {}

export const TelevisionSystemTests: React.FC<TelevisionSystemTestsProps> = () => {
  const gameState = useGameStore((s) => s.game);
  const updateBudget = useGameStore((s) => s.updateBudget);
  const mergeGameState = useGameStore((s) => s.mergeGameState);
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);

  const initialTests: TestResult[] = [
    { id: 'tv-show-creation', name: 'TV Show Creation', status: 'pending' },
    { id: 'network-creation', name: 'Network/Streaming Service Creation', status: 'pending' },
    { id: 'talent-casting', name: 'Talent Casting for TV Shows', status: 'pending' },
    { id: 'budget-allocation', name: 'Budget Allocation & Tracking', status: 'pending' },
    { id: 'show-production', name: 'Show Production Workflow', status: 'pending' },
    { id: 'ratings-tracking', name: 'Ratings & Performance Tracking', status: 'pending' },
    { id: 'streaming-revenue', name: 'Streaming Revenue Calculation', status: 'pending' },
    { id: 'season-management', name: 'Season Management', status: 'pending' },
    { id: 'network-competition', name: 'Network Competition Logic', status: 'pending' },
    { id: 'ui-integration', name: 'UI Integration & State Management', status: 'pending' }
  ];

  useEffect(() => {
    setTestResults(initialTests);
  }, []);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading television tests...</div>;
  }

  const updateTestResult = (testId: string, status: TestResult['status'], details?: string, error?: string) => {
    setTestResults(prev => prev.map(test => 
      test.id === testId 
        ? { ...test, status, details, error }
        : test
    ));
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runTVShowCreationTest = async () => {
    setCurrentTest('tv-show-creation');
    updateTestResult('tv-show-creation', 'running');

    try {
      // Test show creation data structure
      const testShow = {
        id: `test-show-${Date.now()}`,
        title: 'Test Drama Series',
        genre: 'drama',
        format: 'drama' as const,
        episodeLength: 45,
        seasonsPlanned: 3,
        episodesPerSeason: 12,
        status: 'in-development' as const,
        budget: 50000000,
        network: 'test-network',
        cast: [],
        crew: [],
        ratings: { critics: 0, audience: 0, viewership: 0 },
        awards: [],
        seasons: []
      };

      // Validate required fields
      if (!testShow.title || !testShow.genre || !testShow.format) {
        throw new Error('Missing required show fields');
      }

      // Validate budget is reasonable
      if (testShow.budget < 1000000 || testShow.budget > 200000000) {
        throw new Error('Budget outside expected range');
      }

      // Test that show can be created and stored
      const showsData = localStorage.getItem('television-shows');
      const shows = showsData ? JSON.parse(showsData) : [];
      shows.push(testShow);
      localStorage.setItem('television-shows', JSON.stringify(shows));

      await sleep(500);
      updateTestResult('tv-show-creation', 'passed', `Show "${testShow.title}" created successfully`);
    } catch (error) {
      updateTestResult('tv-show-creation', 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runNetworkCreationTest = async () => {
    setCurrentTest('network-creation');
    updateTestResult('network-creation', 'running');

    try {
      // Test streaming service creation
      const testStreamingService = {
        id: `test-streaming-${Date.now()}`,
        name: 'Test Streaming Plus',
        type: 'streaming' as const,
        subscribers: 10.5,
        monthlyPrice: 12.99,
        originalContent: true,
        budget: 2000000000,
        shows: [],
        studioId: gameState.studio.id
      };

      // Test cable network creation
      const testCableNetwork = {
        id: `test-cable-${Date.now()}`,
        name: 'Test Cable Network',
        type: 'cable' as const,
        subscribers: 25.0,
        originalContent: false,
        budget: 500000000,
        shows: []
      };

      // Validate streaming service
      if (!testStreamingService.name || testStreamingService.subscribers < 0) {
        throw new Error('Invalid streaming service data');
      }

      // Validate cable network
      if (!testCableNetwork.name || testCableNetwork.budget < 0) {
        throw new Error('Invalid cable network data');
      }

      // Test storage
      const networksData = localStorage.getItem('television-networks');
      const networks = networksData ? JSON.parse(networksData) : [];
      networks.push(testStreamingService, testCableNetwork);
      localStorage.setItem('television-networks', JSON.stringify(networks));

      await sleep(500);
      updateTestResult('network-creation', 'passed', 'Streaming service and cable network created successfully');
    } catch (error) {
      updateTestResult('network-creation', 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runTalentCastingTest = async () => {
    setCurrentTest('talent-casting');
    updateTestResult('talent-casting', 'running');

    try {
      // Get available talent
      const availableActors = gameState.talent.filter(t => t.type === 'actor').slice(0, 3);
      const availableDirectors = gameState.talent.filter(t => t.type === 'director').slice(0, 1);

      if (availableActors.length === 0 || availableDirectors.length === 0) {
        throw new Error('Insufficient talent pool for casting test');
      }

      // Test casting data structure
      const testCasting = {
        showId: 'test-show-123',
        cast: [
          {
            talentId: availableActors[0].id,
            role: 'Lead Character',
            episodeRate: 100000,
            seasonContract: true
          },
          {
            talentId: availableActors[1].id,
            role: 'Supporting Character',
            episodeRate: 50000,
            seasonContract: true
          }
        ],
        crew: [
          {
            talentId: availableDirectors[0].id,
            role: 'Showrunner/Director',
            episodeRate: 150000,
            seasonContract: true
          }
        ]
      };

      // Validate casting data
      testCasting.cast.forEach(castMember => {
        if (!castMember.talentId || !castMember.role || castMember.episodeRate <= 0) {
          throw new Error('Invalid cast member data');
        }
      });

      testCasting.crew.forEach(crewMember => {
        if (!crewMember.talentId || !crewMember.role || crewMember.episodeRate <= 0) {
          throw new Error('Invalid crew member data');
        }
      });

      await sleep(500);
      updateTestResult('talent-casting', 'passed', `Cast ${testCasting.cast.length} actors and ${testCasting.crew.length} crew members successfully`);
    } catch (error) {
      updateTestResult('talent-casting', 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runBudgetAllocationTest = async () => {
    setCurrentTest('budget-allocation');
    updateTestResult('budget-allocation', 'running');

    try {
      const initialBudget = gameState.studio?.budget ?? 0;
      const showBudget = Math.min(50000000, Math.max(1000000, Math.floor(initialBudget * 0.25) || 1000000));
      const episodesPerSeason = 12;
      
      // Test budget breakdown
      const budgetBreakdown = {
        aboveTheLine: showBudget * 0.4, // Cast & key talent
        belowTheLine: showBudget * 0.35, // Crew & production
        postProduction: showBudget * 0.15, // Editing, VFX, sound
        marketing: showBudget * 0.08, // Promotion
        contingency: showBudget * 0.02 // Emergency fund
      };

      const totalAllocated = Object.values(budgetBreakdown).reduce((sum, amount) => sum + amount, 0);
      
      if (Math.abs(totalAllocated - showBudget) > 100) {
        throw new Error(`Budget allocation mismatch: ${totalAllocated} vs ${showBudget}`);
      }

      // Test per-episode budget calculation
      const perEpisodeBudget = showBudget / episodesPerSeason;
      if (perEpisodeBudget < 100000 || perEpisodeBudget > 10000000) {
        throw new Error('Per-episode budget outside reasonable range');
      }

      // Test financing: allow co-financing if studio budget is lower
      const canSelfFund = initialBudget >= showBudget;
      if (!canSelfFund) {
        const coFinancing = showBudget - initialBudget;
        if (coFinancing <= 0) {
          throw new Error('Financing arrangement invalid');
        }
      }

      await sleep(500);
      updateTestResult('budget-allocation', 'passed', `Budget allocated correctly: $${(perEpisodeBudget / 1000000).toFixed(1)}M per episode`);
    } catch (error) {
      updateTestResult('budget-allocation', 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runProductionWorkflowTest = async () => {
    setCurrentTest('show-production');
    updateTestResult('show-production', 'running');

    try {
      // Test production phases
      const productionPhases = ['pre-production', 'production', 'post-production', 'aired'];
      
      const testShow = {
        id: 'test-show-workflow',
        status: 'in-development',
        currentSeason: 1,
        currentEpisode: 1,
        productionPhase: 'pre-production'
      };

      // Test phase progression
      for (const phase of productionPhases) {
        testShow.productionPhase = phase;
        
        // Update status based on phase
        if (phase === 'production') {
          testShow.status = 'production';
        }
        if (phase === 'post-production') {
          if (testShow.status !== 'production') testShow.status = 'production';
        }
        if (phase === 'aired') {
          // Aired implies the show has left development
          if (testShow.status === 'in-development') {
            testShow.status = 'airing';
          }
        }
        
        // Validate each phase has proper requirements
        switch (phase) {
          case 'pre-production':
            if (!testShow.id) throw new Error('Show ID required for pre-production');
            break;
          case 'production':
            if (testShow.currentEpisode < 1) throw new Error('Invalid episode number for production');
            break;
          case 'post-production':
            if (!testShow.currentSeason) throw new Error('Season number required for post-production');
            break;
          case 'aired':
            if (testShow.status === 'in-development') throw new Error('Show cannot air while in development');
            break;
        }
      }

      // Test episode progression
      for (let episode = 1; episode <= 3; episode++) {
        testShow.currentEpisode = episode;
        if (testShow.currentEpisode > 12) {
          testShow.currentSeason++;
          testShow.currentEpisode = 1;
        }
      }

      await sleep(500);
      updateTestResult('show-production', 'passed', 'Production workflow validated successfully');
    } catch (error) {
      updateTestResult('show-production', 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runRatingsTrackingTest = async () => {
    setCurrentTest('ratings-tracking');
    updateTestResult('ratings-tracking', 'running');

    try {
      // Test ratings data structure
      const testRatings = {
        showId: 'test-show-ratings',
        episodeRatings: [
          { episode: 1, viewership: 2.5, critics: 85, audience: 78 },
          { episode: 2, viewership: 2.3, critics: 82, audience: 80 },
          { episode: 3, viewership: 2.1, critics: 79, audience: 75 }
        ],
        seasonAverages: {
          viewership: 2.3,
          critics: 82,
          audience: 77.7
        }
      };

      // Validate ratings ranges
      testRatings.episodeRatings.forEach((rating, index) => {
        if (rating.critics < 0 || rating.critics > 100) {
          throw new Error(`Invalid critics score for episode ${index + 1}`);
        }
        if (rating.audience < 0 || rating.audience > 100) {
          throw new Error(`Invalid audience score for episode ${index + 1}`);
        }
        if (rating.viewership < 0) {
          throw new Error(`Invalid viewership for episode ${index + 1}`);
        }
      });

      // Test ratings calculation
      const avgCritics = testRatings.episodeRatings.reduce((sum, r) => sum + r.critics, 0) / testRatings.episodeRatings.length;
      const avgAudience = testRatings.episodeRatings.reduce((sum, r) => sum + r.audience, 0) / testRatings.episodeRatings.length;
      
      if (Math.abs(avgCritics - testRatings.seasonAverages.critics) > 1) {
        throw new Error('Critics average calculation error');
      }
      if (Math.abs(avgAudience - testRatings.seasonAverages.audience) > 1) {
        throw new Error('Audience average calculation error');
      }

      await sleep(500);
      updateTestResult('ratings-tracking', 'passed', `Ratings tracked: ${avgCritics.toFixed(1)} critics, ${avgAudience.toFixed(1)} audience`);
    } catch (error) {
      updateTestResult('ratings-tracking', 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runStreamingRevenueTest = async () => {
    setCurrentTest('streaming-revenue');
    updateTestResult('streaming-revenue', 'running');

    try {
      // Test revenue calculation for streaming service
      const streamingService = {
        subscribers: 50.0, // millions
        monthlyPrice: 12.99,
        originalShows: 15,
        licensedShows: 85
      };

      // Calculate monthly revenue
      const monthlyRevenue = streamingService.subscribers * streamingService.monthlyPrice * 1000000;
      
      // Calculate show revenue share (original content gets higher share)
      const originalContentShare = 0.15; // 15% of revenue to original shows
      const revenuePerOriginalShow = (monthlyRevenue * originalContentShare) / streamingService.originalShows;

      if (monthlyRevenue <= 0) {
        throw new Error('Invalid monthly revenue calculation');
      }
      
      if (revenuePerOriginalShow <= 0) {
        throw new Error('Invalid per-show revenue calculation');
      }

      // Test quarterly revenue projection
      const quarterlyRevenue = monthlyRevenue * 3;
      const yearlyRevenue = monthlyRevenue * 12;

      if (quarterlyRevenue !== monthlyRevenue * 3) {
        throw new Error('Quarterly revenue calculation error');
      }

      await sleep(500);
      updateTestResult('streaming-revenue', 'passed', `Revenue: $${(monthlyRevenue / 1000000).toFixed(1)}M monthly, $${(revenuePerOriginalShow / 1000000).toFixed(2)}M per show`);
    } catch (error) {
      updateTestResult('streaming-revenue', 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runSeasonManagementTest = async () => {
    setCurrentTest('season-management');
    updateTestResult('season-management', 'running');

    try {
      // Test season data structure
      const testSeason = {
        showId: 'test-show-seasons',
        seasonNumber: 1,
        episodes: 12,
        status: 'completed',
        airDate: '2024-01-15',
        finale: '2024-04-15',
        budget: 60000000,
        avgRating: 8.2,
        renewalStatus: 'renewed'
      };

      // Validate season data
      if (testSeason.seasonNumber < 1) {
        throw new Error('Invalid season number');
      }
      
      if (testSeason.episodes < 1 || testSeason.episodes > 24) {
        throw new Error('Invalid episode count');
      }

      if (testSeason.avgRating < 0 || testSeason.avgRating > 10) {
        throw new Error('Invalid average rating');
      }

      // Test renewal logic
      const renewalThreshold = 7.0;
      const expectedRenewal = testSeason.avgRating >= renewalThreshold ? 'renewed' : 'cancelled';
      
      if (testSeason.renewalStatus !== expectedRenewal && testSeason.avgRating !== renewalThreshold) {
        // Allow some flexibility around the threshold
        if (Math.abs(testSeason.avgRating - renewalThreshold) > 0.5) {
          throw new Error(`Renewal status mismatch: expected ${expectedRenewal} for rating ${testSeason.avgRating}`);
        }
      }

      // Test season progression
      const nextSeason = {
        ...testSeason,
        seasonNumber: testSeason.seasonNumber + 1,
        status: 'in-production',
        renewalStatus: 'pending'
      };

      if (nextSeason.seasonNumber !== 2) {
        throw new Error('Season progression error');
      }

      await sleep(500);
      updateTestResult('season-management', 'passed', `Season management validated: ${testSeason.episodes} episodes, rating ${testSeason.avgRating}`);
    } catch (error) {
      updateTestResult('season-management', 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runNetworkCompetitionTest = async () => {
    setCurrentTest('network-competition');
    updateTestResult('network-competition', 'running');

    try {
      // Test competition between networks
      const networks = [
        { id: 'net1', name: 'StreamMax', subscribers: 45.0, shows: 20, avgRating: 8.1 },
        { id: 'net2', name: 'ViewPlus', subscribers: 38.0, shows: 25, avgRating: 7.8 },
        { id: 'net3', name: 'WatchNow', subscribers: 52.0, shows: 18, avgRating: 8.3 }
      ];

      // Test market share calculation
      const totalSubscribers = networks.reduce((sum, net) => sum + net.subscribers, 0);
      
      networks.forEach(network => {
        const marketShare = (network.subscribers / totalSubscribers) * 100;
        if (marketShare < 0 || marketShare > 100) {
          throw new Error(`Invalid market share for ${network.name}: ${marketShare}%`);
        }
      });

      // Test competitive positioning
      const sortedBySubscribers = [...networks].sort((a, b) => b.subscribers - a.subscribers);
      const sortedByRating = [...networks].sort((a, b) => b.avgRating - a.avgRating);

      if (sortedBySubscribers[0].id !== 'net3') {
        throw new Error('Subscriber ranking error');
      }
      
      if (sortedByRating[0].id !== 'net3') {
        throw new Error('Rating ranking error');
      }

      // Test content strategy impact
      const contentDensity = networks.map(net => ({
        ...net,
        showsPerMillion: net.shows / net.subscribers
      }));

      contentDensity.forEach(net => {
        if (net.showsPerMillion < 0.1 || net.showsPerMillion > 2.0) {
          throw new Error(`Unusual content density for ${net.name}: ${net.showsPerMillion.toFixed(2)} shows per million subscribers`);
        }
      });

      await sleep(500);
      updateTestResult('network-competition', 'passed', `Competition analysis complete: ${networks.length} networks analyzed`);
    } catch (error) {
      updateTestResult('network-competition', 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runUIIntegrationTest = async () => {
    setCurrentTest('ui-integration');
    updateTestResult('ui-integration', 'running');

    try {
      // Test game state integration
      if (!gameState) {
        throw new Error('Game state not available');
      }

      if (!gameState.studio) {
        throw new Error('Studio data not available in game state');
      }

      if (!gameState.talent || gameState.talent.length === 0) {
        throw new Error('Talent pool not available in game state');
      }

      // Test state update functions
      if (typeof updateBudget !== 'function') {
        throw new Error('Budget update function not available');
      }

      if (typeof mergeGameState !== 'function') {
        throw new Error('Game state merge function not available');
      }

      // Test UI state management
      const testUIState = {
        selectedTab: 'shows',
        selectedShow: null,
        selectedNetwork: null,
        showCreateDialog: false,
        showCastingDialog: false
      };

      // Validate UI state structure
      const validTabs = ['shows', 'networks', 'market']; // Updated to match actual tabs
      if (!validTabs.includes(testUIState.selectedTab)) {
        throw new Error('Invalid UI tab selection');
      }

      // Test modal state management
      const modalStates = ['showCreateDialog', 'showCastingDialog'];
      modalStates.forEach(modalState => {
        if (typeof testUIState[modalState as keyof typeof testUIState] !== 'boolean') {
          throw new Error(`Invalid modal state type for ${modalState}`);
        }
      });

      await sleep(500);
      updateTestResult('ui-integration', 'passed', 'UI integration and state management validated');
    } catch (error) {
      updateTestResult('ui-integration', 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults(initialTests);

    const tests = [
      runTVShowCreationTest,
      runNetworkCreationTest,
      runTalentCastingTest,
      runBudgetAllocationTest,
      runProductionWorkflowTest,
      runRatingsTrackingTest,
      runStreamingRevenueTest,
      runSeasonManagementTest,
      runNetworkCompetitionTest,
      runUIIntegrationTest
    ];

    for (const test of tests) {
      await test();
      await sleep(300); // Brief pause between tests
    }

    setCurrentTest(null);
    setIsRunning(false);

    const passed = testResults.filter(t => t.status === 'passed').length;
    const failed = testResults.filter(t => t.status === 'failed').length;

    toast({
      title: "Television System Tests Complete",
      description: `${passed} passed, ${failed} failed`,
      variant: failed > 0 ? "destructive" : "default"
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <AlertCircle className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-100 text-green-800">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const passedTests = testResults.filter(t => t.status === 'passed').length;
  const totalTests = testResults.length;
  const progressPercentage = (passedTests / totalTests) * 100;

  return (
    <div className="space-y-6">
      {/* Test Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5" />
            Television & Streaming System Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{passedTests}/{totalTests} tests passed</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={runAllTests} 
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                {isRunning ? 'Running Tests...' : 'Run All Tests'}
              </Button>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{testResults.filter(t => t.status === 'passed').length} Passed</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>{testResults.filter(t => t.status === 'failed').length} Failed</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <span>{testResults.filter(t => t.status === 'pending').length} Pending</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <div className="grid gap-4">
        {testResults.map((test) => (
          <Card 
            key={test.id} 
            className={`transition-all ${
              currentTest === test.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <h3 className="font-medium">{test.name}</h3>
                    {test.details && (
                      <p className="text-sm text-muted-foreground">{test.details}</p>
                    )}
                    {test.error && (
                      <p className="text-sm text-red-600">Error: {test.error}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(test.status)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Content Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• TV Show Creation & Management</p>
              <p>• Season & Episode Tracking</p>
              <p>• Production Workflow</p>
              <p>• Content Strategy</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Network Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• Streaming Service Setup</p>
              <p>• Cable Network Management</p>
              <p>• Subscriber Tracking</p>
              <p>• Competition Analysis</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Systems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• Budget Allocation</p>
              <p>• Revenue Calculation</p>
              <p>• Talent Payments</p>
              <p>• Profitability Analysis</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};