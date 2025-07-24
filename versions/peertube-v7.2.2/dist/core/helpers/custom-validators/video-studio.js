import validator from 'validator';
import { CONSTRAINTS_FIELDS } from '../../initializers/constants.js';
import { buildTaskFileFieldname } from '../../lib/video-studio.js';
import { isArray } from './misc.js';
import { isVideoFileMimeTypeValid, isVideoImageValid } from './videos.js';
import { forceNumber } from '@peertube/peertube-core-utils';
function isValidStudioTasksArray(tasks) {
    if (!isArray(tasks))
        return false;
    return tasks.length >= CONSTRAINTS_FIELDS.VIDEO_STUDIO.TASKS.min &&
        tasks.length <= CONSTRAINTS_FIELDS.VIDEO_STUDIO.TASKS.max;
}
function isStudioCutTaskValid(task) {
    if (task.name !== 'cut')
        return false;
    if (!task.options)
        return false;
    const { start, end } = task.options;
    if (!start && !end)
        return false;
    if (start && !validator.default.isInt(start + '', CONSTRAINTS_FIELDS.VIDEO_STUDIO.CUT_TIME))
        return false;
    if (end && !validator.default.isInt(end + '', CONSTRAINTS_FIELDS.VIDEO_STUDIO.CUT_TIME))
        return false;
    if (!start || !end)
        return true;
    return forceNumber(start) < forceNumber(end);
}
function isStudioTaskAddIntroOutroValid(task, indice, files) {
    const file = files.find(f => f.fieldname === buildTaskFileFieldname(indice, 'file'));
    return (task.name === 'add-intro' || task.name === 'add-outro') &&
        file && isVideoFileMimeTypeValid([file], null);
}
function isStudioTaskAddWatermarkValid(task, indice, files) {
    const file = files.find(f => f.fieldname === buildTaskFileFieldname(indice, 'file'));
    return task.name === 'add-watermark' &&
        file && isVideoImageValid([file], null, true);
}
export { isValidStudioTasksArray, isStudioCutTaskValid, isStudioTaskAddIntroOutroValid, isStudioTaskAddWatermarkValid };
//# sourceMappingURL=video-studio.js.map