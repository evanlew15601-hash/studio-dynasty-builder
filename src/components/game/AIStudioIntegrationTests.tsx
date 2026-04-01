// Integration Tests for AI Studio System
import { AIStudioManager } from './AIStudioManager';
import { createRng } from '@/game/core/rng';

export class AIStudioIntegrationTests {
  
  // **CHECKPOINT 1 TEST**: Basic AI film creation
  static testFilmCreation(): boolean {
    console.log('TEST: AI Film Creation');
    
    const testStudio = {
      id: 'test-studio',
      name: 'Test Studio',
      reputation: 75,
      budget: 50000000,
      founded: 2020,
      specialties: ['drama' as const]
    } as any;

    try {
      const film = AIStudioManager.createAIFilm(testStudio, 10, 2024, [], createRng(101));
      
      const validations = [
        film.id.startsWith('ai-film-'),
        film.studioId === 'test-studio',
        film.budget.total > 0,
        film.timeline.expectedReleaseYear >= 2024,
        film.status === 'development'
      ];

      const passed = validations.every(v => v);
      console.log(passed ? 'Film creation test PASSED' : 'Film creation test FAILED');
      console.log('Film created:', film);
      
      return passed;
    } catch (error) {
      console.log('Film creation test FAILED with error:', error);
      return false;
    }
  }

  // **CHECKPOINT 2 TEST**: Talent availability and casting
  static testTalentAvailability(): boolean {
    console.log('TEST: Talent Availability');
    
    const testTalent = {
      id: 'test-actor-1',
      name: 'Test Actor',
      reputation: 65,
      specialties: ['drama', 'action'],
      age: 35,
      career: { experience: 10, filmography: [] }
    };

    try {
      // Should be available initially
      const initiallyAvailable = AIStudioManager.isTalentAvailable('test-actor-1', 10, 15, 2024);
      
      // Create a film and cast the actor
      const testStudio = {
        id: 'test-studio-2',
        name: 'Test Studio 2',
        reputation: 60,
        budget: 30000000,
        founded: 2020,
        specialties: ['action' as const]
      } as any;
      
      const film = AIStudioManager.createAIFilm(testStudio, 8, 2024, [], createRng(202));
      const castingSuccess = AIStudioManager.castTalentInAIFilm(
        film.id,
        testTalent as any,
        'Lead Actor',
        10,
        6, // 6 weeks commitment
        2024
      );
      
      // Should not be available during commitment
      const unavailableDuringCommitment = !AIStudioManager.isTalentAvailable('test-actor-1', 12, 14, 2024);
      
      // Should be available after commitment
      const availableAfterCommitment = AIStudioManager.isTalentAvailable('test-actor-1', 17, 20, 2024);
      
      // Get commitment info
      const commitment = AIStudioManager.getTalentCommitment('test-actor-1', 12, 2024);
      
      const validations = [
        initiallyAvailable,
        castingSuccess,
        unavailableDuringCommitment,
        availableAfterCommitment,
        commitment !== null,
        commitment?.role === 'Lead Actor'
      ];

      const passed = validations.every(v => v);
      console.log(passed ? 'Talent availability test PASSED' : 'Talent availability test FAILED');
      console.log('Commitment created:', commitment);
      
      return passed;
    } catch (error) {
      console.log('Talent availability test FAILED with error:', error);
      return false;
    }
  }

  // **CHECKPOINT 3 TEST**: AI film progression and release
  static testFilmProgression(): boolean {
    console.log('TEST: AI Film Progression');
    
    try {
      const testStudio = {
        id: 'test-studio-3',
        name: 'Test Studio 3',
        reputation: 80,
        budget: 40000000,
        founded: 2020,
        specialties: ['sci-fi' as const]
      } as any;

      const rng = createRng(303);
      const film = AIStudioManager.createAIFilm(testStudio, 1, 2024, [], rng);
      const initialStatus = film.status;
      
      // Simulate progression through weeks
      AIStudioManager.processWeeklyAIFilms(3, 2024, rng); // Week 3 - should move to casting
      const afterWeek3 = AIStudioManager.getAllAIFilms().find(f => f.id === film.id);
      
      AIStudioManager.processWeeklyAIFilms(5, 2024, rng); // Week 5 - should move to production
      const afterWeek5 = AIStudioManager.getAllAIFilms().find(f => f.id === film.id);
      
      const validations = [
        initialStatus === 'development',
        afterWeek3?.status === 'casting',
        afterWeek5?.status === 'production'
      ];

      const passed = validations.every(v => v);
      console.log(passed ? 'Film progression test PASSED' : 'Film progression test FAILED');
      console.log('Status progression:', {
        initial: initialStatus,
        week3: afterWeek3?.status,
        week5: afterWeek5?.status
      });
      
      return passed;
    } catch (error) {
      console.log('Film progression test FAILED with error:', error);
      return false;
    }
  }

  // **RUN ALL TESTS**
  static runAllTests(): { passed: number; total: number; success: boolean } {
    console.log('STARTING AI STUDIO INTEGRATION TESTS');
    
    // Reset system for clean testing
    AIStudioManager.resetAISystem();
    
    const tests = [
      this.testFilmCreation,
      this.testTalentAvailability,
      this.testFilmProgression
    ];

    let passed = 0;
    const results = tests.map(test => {
      const result = test();
      if (result) passed++;
      return result;
    });

    const success = passed === tests.length;
    
    console.log(`TESTS COMPLETE: ${passed}/${tests.length} passed`);
    console.log(success ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
    
    return { passed, total: tests.length, success };
  }
}