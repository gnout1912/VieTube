import express from 'express';
import { apiRateLimiter } from '../../../middlewares/index.js';
import { searchChannelsRouter } from './search-video-channels.js';
import { searchPlaylistsRouter } from './search-video-playlists.js';
import { searchVideosRouter } from './search-videos.js';
const searchRouter = express.Router();
searchRouter.use(apiRateLimiter);
searchRouter.use('/', searchVideosRouter);
searchRouter.use('/', searchChannelsRouter);
searchRouter.use('/', searchPlaylistsRouter);
export { searchRouter };
//# sourceMappingURL=index.js.map