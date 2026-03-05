// System Integration Validator - Ensures all systems work together
import { Project, GameState, Studio } from '../../types/game';
import { TimeState } from './TimeSystem';
import { CalendarManager } from './CalendarManager';
import { FinancialEngine } from './FinancialEngine';
import { ReleaseSystem } from './ReleaseSystem';
import { ReputationSystem } from './ReputationSystem';

export interface SystemHealthCheck {
  system: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastChecked: number;
}

export interface IntegrationTest {
  name: string;
  description: string;
  test: (gameState: GameState) => { passed: boolean; message: string };
}

export class SystemIntegration {
  private static healthChecks: SystemHealthCheck[] = [];
  
  static validateGameState(gameState: GameState): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    healthChecks: SystemHealthCheck[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Run integration tests
    const tests = this.getIntegrationTests();
    
    tests.forEach(test => {
      try {
        const result = test.test(gameState);
        
        const healthCheck: SystemHealthCheck = {
          system: test.name,
          status: result.passed ? 'healthy' : 'error',
          message: result.message,
          lastChecked: Date.now()
        };
        
        this.healthChecks.push(healthCheck);
        
        if (!result.passed) {
          errors.push(`${test.name}: ${result.message}`);
        }
      } catch (error) {
        errors.push(`${test.name}: Test failed with exception`);
        console.error(`Integration test failed: ${test.name}`, error);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      healthChecks: this.healthChecks.slice(-20) // Keep last 20 checks
    };
  }
  
  static getIntegrationTests(): IntegrationTest[] {
    return [
      {
        name: 'Calendar-Time Sync',
        description: 'Verify calendar and time system are synchronized',
        test: (gameState) => {
          const timeState: TimeState = {
            currentWeek: gameState.currentWeek,
            currentYear: gameState.currentYear,
            currentQuarter: gameState.currentQuarter
          };
          
          // Test calendar validation (use a date that satisfies minimum marketing lead time)
          let targetWeek = timeState.currentWeek + 5;
          let targetYear = timeState.currentYear;
          if (targetWeek > 52) {
            targetWeek -= 52;
            targetYear += 1;
          }

          const testValidation = CalendarManager.validateRelease('test-film', targetWeek, targetYear, timeState, gameState.projects);
          
          return {
            passed: testValidation.canRelease === true,
            message: testValidation.canRelease ? 'Calendar system operational' : (testValidation.reason || 'Calendar validation failed')
          };
        }
      },
      
      {
        name: 'Project-Release Pipeline',
        description: 'Verify projects can be scheduled and released',
        test: (gameState) => {
          const releasedProjects = gameState.projects.filter(p => p.status === 'released');
          const scheduledProjects = gameState.projects.filter(p => p.status === 'scheduled-for-release');
          const releaseReadyProjects = gameState.projects.filter(p =>
            p.status === 'ready-for-release' ||
            p.status === 'scheduled-for-release' ||
            p.currentPhase === 'release'
          );
          
          let pipelineHealthy = true;
          let message = 'Release pipeline healthy';
          
          // Check if release-ready projects pass unified release validation
          releaseReadyProjects.forEach(project => {
            const validation = ReleaseSystem.validateFilmForRelease(project);
            if (!validation.canRelease && validation.errors.length > 0) {
              pipelineHealthy = false;
              message = `Release-ready project "${project.title}" cannot be released: ${validation.errors[0]}`;
            }
          });
          
          // Check if scheduled projects have valid release dates
          scheduledProjects.forEach(project => {
            const hasScheduledDate = !!project.scheduledReleaseWeek && !!project.scheduledReleaseYear;
            if (!hasScheduledDate) {
              pipelineHealthy = false;
              message = `Scheduled project "${project.title}" missing scheduled release date`;
            }
          });
          
          return {
            passed: pipelineHealthy,
            message: `${message} (${releaseReadyProjects.length} release-ready, ${scheduledProjects.length} scheduled, ${releasedProjects.length} released)`
          };
        }
      },
      
      {
        name: 'Financial Tracking',
        description: 'Verify financial transactions are being recorded',
        test: (gameState) => {
          const summary = FinancialEngine.getFinancialSummary(gameState.currentWeek, gameState.currentYear);
          const recentTransactions = FinancialEngine.getRecentTransactions(5);
          
          // Check if financial system is tracking properly
          const hasTransactions = recentTransactions.length > 0;
          const hasReasonableFinancials = summary.totalRevenue >= 0 && summary.totalExpenses >= 0;
          
          let message = 'Financial tracking operational';
          if (!hasReasonableFinancials) {
            message = 'Financial calculations appear incorrect';
          } else if (!hasTransactions && gameState.projects.length > 0) {
            message = 'No recent transactions found despite active projects';
          }
          
          return {
            passed: hasReasonableFinancials,
            message: `${message} (${recentTransactions.length} recent transactions, $${summary.totalRevenue.toFixed(0)}k revenue)`
          };
        }
      },
      
      {
        name: 'Box Office Revenue Flow',
        description: 'Verify released films generate revenue',
        test: (gameState) => {
          const releasedFilms = gameState.projects.filter(p => p.status === 'released');
          
          if (releasedFilms.length === 0) {
            return {
              passed: true,
              message: 'No released films to test revenue flow'
            };
          }
          
          let revenueFlowWorking = true;
          let message = 'Box office revenue flow operational';
          
          releasedFilms.forEach(film => {
            // Check if film has box office metrics
            if (!film.metrics?.boxOfficeTotal || film.metrics.boxOfficeTotal <= 0) {
              revenueFlowWorking = false;
              message = `Film "${film.title}" has no box office revenue despite being released`;
            }
            
            // Check if financial transactions exist for this film
            const filmFinancials = FinancialEngine.getFilmFinancials(film.id);
            if (filmFinancials.revenue <= 0 && film.metrics?.boxOfficeTotal && film.metrics.boxOfficeTotal > 0) {
              revenueFlowWorking = false;
              message = `Film "${film.title}" has box office but no financial transactions`;
            }
          });
          
          return {
            passed: revenueFlowWorking,
            message: `${message} (${releasedFilms.length} released films)`
          };
        }
      },
      
      {
        name: 'Reputation System',
        description: 'Verify reputation is being calculated correctly',
        test: (gameState) => {
          const reputationState = ReputationSystem.convertLegacyReputation(gameState.studio);
          const summary = ReputationSystem.getReputationSummary(reputationState);
          
          const isValid = summary.overall >= 0 && summary.overall <= 100;
          
          return {
            passed: isValid,
            message: `Reputation: ${summary.overall.toFixed(1)} (${summary.description})`
          };
        }
      },
      
      {
        name: 'Project Phase Progression',
        description: 'Verify projects advance through phases correctly',
        test: (gameState) => {
          // Use currentPhase to determine in-progress projects
          const projectsInProgress = gameState.projects.filter(p => 
            ['development', 'pre-production', 'production', 'post-production', 'marketing', 'release'].includes(p.currentPhase as any)
          );
          
          const getAllowedStatusesForPhase = (phase: string): string[] => {
            switch (phase) {
              case 'development':
                return ['development'];
              case 'pre-production':
                return ['pre-production'];
              case 'production':
                return ['production', 'filming'];
              case 'post-production':
                return ['post-production', 'completed', 'ready-for-marketing'];
              case 'marketing':
                return ['marketing', 'ready-for-marketing', 'ready-for-release'];
              case 'release':
                return ['release', 'ready-for-release', 'scheduled-for-release', 'released'];
              case 'distribution':
                return ['distribution', 'released', 'archived'];
              default:
                return [phase];
            }
          };
          
          let progressionHealthy = true;
          let message = 'Project progression healthy';
          
          projectsInProgress.forEach(project => {
            // Check if project has reasonable phase duration (allow -1 for manual control)
            if (project.phaseDuration !== undefined && project.phaseDuration < -1) {
              progressionHealthy = false;
              message = `Project "${project.title}" has negative phase duration`;
            }
            
            // Check if project status is compatible with current phase (allow meta-statuses)
            if (project.currentPhase && project.status) {
              const allowedStatuses = getAllowedStatusesForPhase(project.currentPhase);
              if (!allowedStatuses.includes(project.status)) {
                progressionHealthy = false;
                message = `Project "${project.title}" has mismatched phase/status (${project.currentPhase}/${project.status})`;
              }
            }
          });
          
          return {
            passed: progressionHealthy,
            message: `${message} (${projectsInProgress.length} projects in progress)`
          };
        }
      }
    ];
  }
  
  static runDiagnostics(gameState: GameState): void {
    if (!import.meta.env.DEV) return;

    console.log('=== SYSTEM INTEGRATION DIAGNOSTICS ===');

    const validation = this.validateGameState(gameState);

    console.log(`System Health: ${validation.isValid ? 'HEALTHY' : 'ISSUES DETECTED'}`);

    if (validation.errors.length > 0) {
      console.log('ERRORS:');
      validation.errors.forEach(error => console.log(`  ERR ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.log('WARNINGS:');
      validation.warnings.forEach(warning => console.log(`  WARN ${warning}`));
    }

    console.log('HEALTH CHECKS:');
    validation.healthChecks.forEach(check => {
      const status = check.status === 'healthy' ? 'OK' : check.status === 'warning' ? 'WARN' : 'ERR';
      console.log(`  ${status} ${check.system}: ${check.message}`);
    });

    console.log('=== END DIAGNOSTICS ===');
  }
  
  static fixCommonIssues(gameState: GameState): GameState {
    const fixedState = { ...gameState };
    
    // Fix projects with missing or invalid phase durations
    fixedState.projects = fixedState.projects.map(project => {
      if (project.phaseDuration === undefined || project.phaseDuration < -1) {
        const defaultDurations = {
          'development': 8,
          'pre-production': 6,
          'production': 12,
          'post-production': 16,
          'marketing': 8,
          'release': 2
        };
        
        return {
          ...project,
          phaseDuration: defaultDurations[project.currentPhase as keyof typeof defaultDurations] || 1
        };
      }
      return project;
    });
    
    // Sync project status with current phase, but respect meta-statuses like ready-for-marketing / ready-for-release
    fixedState.projects = fixedState.projects.map(project => {
      if (project.currentPhase && project.status) {
        const allowedStatusesForPhase = ((phase: string): string[] => {
          switch (phase) {
            case 'development':
              return ['development'];
            case 'pre-production':
              return ['pre-production'];
            case 'production':
              return ['production', 'filming'];
            case 'post-production':
              return ['post-production', 'completed', 'ready-for-marketing'];
            case 'marketing':
              return ['marketing', 'ready-for-marketing', 'ready-for-release'];
            case 'release':
              return ['release', 'ready-for-release', 'scheduled-for-release', 'released'];
            case 'distribution':
              return ['distribution', 'released', 'archived'];
            default:
              return [phase];
          }
        })(project.currentPhase);
        
        if (!allowedStatusesForPhase.includes(project.status)) {
          console.log(`FIXING: Syncing ${project.title} status to match phase ${project.currentPhase}`);
          return {
            ...project,
            status: project.currentPhase as any
          };
        }
      }
      return project;
    });
    
    // Ensure studio has basic financial structure
    if (!fixedState.studio.debt) {
      fixedState.studio.debt = 0;
    }
    
    return fixedState;
  }
}