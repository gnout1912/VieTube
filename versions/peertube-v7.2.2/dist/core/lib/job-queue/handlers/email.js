import { logger } from '../../../helpers/logger.js';
import { Emailer } from '../../emailer.js';
export function processEmail(job) {
    const payload = job.data;
    logger.info('Processing email in job %s.', job.id);
    return Emailer.Instance.sendMail(payload);
}
//# sourceMappingURL=email.js.map