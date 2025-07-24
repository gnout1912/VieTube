import express from 'express';
import { runnerJobsRouter } from './jobs.js';
import { runnerJobFilesRouter } from './jobs-files.js';
import { manageRunnersRouter } from './manage-runners.js';
import { runnerRegistrationTokensRouter } from './registration-tokens.js';
const runnersRouter = express.Router();
runnersRouter.use('/', manageRunnersRouter);
runnersRouter.use('/', runnerJobsRouter);
runnersRouter.use('/', runnerJobFilesRouter);
runnersRouter.use('/', runnerRegistrationTokensRouter);
export { runnersRouter };
//# sourceMappingURL=index.js.map