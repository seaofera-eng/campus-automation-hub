import 'server-only';
import type { Repositories } from '../types';
import { createDemoDemandRepository } from './demand-repository';
import { createDemoEvaluationRepository } from './evaluation-repository';
import { createDemoFileStorage } from './file-storage';
import { createDemoIdentityRepository } from './identity-repository';
import { createDemoImprovementRepository } from './improvement-repository';
import { createDemoObservabilityRepository } from './observability-repository';
import { createDemoReferenceRepository } from './reference-repository';
import { createDemoReviewRepository } from './review-repository';
import { createDemoToolRepository } from './tool-repository';

export function createDemoRepositories(): Repositories {
  return {
    identity: createDemoIdentityRepository(),
    tools: createDemoToolRepository(),
    reference: createDemoReferenceRepository(),
    reviews: createDemoReviewRepository(),
    demands: createDemoDemandRepository(),
    evaluations: createDemoEvaluationRepository(),
    improvements: createDemoImprovementRepository(),
    observability: createDemoObservabilityRepository(),
    files: createDemoFileStorage(),
  };
}
