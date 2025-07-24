import { AbuseAuditView, auditLoggerFactory } from '../helpers/audit-logger.js';
import { afterCommitIfTransaction } from '../helpers/database-utils.js';
import { logger } from '../helpers/logger.js';
import { AbuseModel } from '../models/abuse/abuse.js';
import { VideoAbuseModel } from '../models/abuse/video-abuse.js';
import { VideoCommentAbuseModel } from '../models/abuse/video-comment-abuse.js';
import { sendAbuse } from './activitypub/send/send-flag.js';
import { Notifier } from './notifier/index.js';
function isLocalVideoFileAccepted(object) {
    return { accepted: true };
}
function isLocalLiveVideoAccepted(object) {
    return { accepted: true };
}
function isLocalVideoThreadAccepted(_object) {
    return { accepted: true };
}
function isLocalVideoCommentReplyAccepted(_object) {
    return { accepted: true };
}
function isRemoteVideoCommentAccepted(_object) {
    return { accepted: true };
}
function isPreImportVideoAccepted(object) {
    return { accepted: true };
}
function isPostImportVideoAccepted(object) {
    return { accepted: true };
}
async function createVideoAbuse(options) {
    const { baseAbuse, videoInstance, startAt, endAt, transaction, reporterAccount, skipNotification } = options;
    const associateFun = async (abuseInstance) => {
        const videoAbuseInstance = await VideoAbuseModel.create({
            abuseId: abuseInstance.id,
            videoId: videoInstance.id,
            startAt,
            endAt
        }, { transaction });
        videoAbuseInstance.Video = videoInstance;
        abuseInstance.VideoAbuse = videoAbuseInstance;
        return { isOwned: videoInstance.isOwned() };
    };
    return createAbuse({
        base: baseAbuse,
        reporterAccount,
        flaggedAccount: videoInstance.VideoChannel.Account,
        transaction,
        skipNotification,
        associateFun
    });
}
function createVideoCommentAbuse(options) {
    const { baseAbuse, commentInstance, transaction, reporterAccount, skipNotification } = options;
    const associateFun = async (abuseInstance) => {
        const commentAbuseInstance = await VideoCommentAbuseModel.create({
            abuseId: abuseInstance.id,
            videoCommentId: commentInstance.id
        }, { transaction });
        commentAbuseInstance.VideoComment = commentInstance;
        abuseInstance.VideoCommentAbuse = commentAbuseInstance;
        return { isOwned: commentInstance.isOwned() };
    };
    return createAbuse({
        base: baseAbuse,
        reporterAccount,
        flaggedAccount: commentInstance.Account,
        transaction,
        skipNotification,
        associateFun
    });
}
function createAccountAbuse(options) {
    const { baseAbuse, accountInstance, transaction, reporterAccount, skipNotification } = options;
    const associateFun = () => {
        return Promise.resolve({ isOwned: accountInstance.isOwned() });
    };
    return createAbuse({
        base: baseAbuse,
        reporterAccount,
        flaggedAccount: accountInstance,
        transaction,
        skipNotification,
        associateFun
    });
}
export { isLocalLiveVideoAccepted, isLocalVideoFileAccepted, isLocalVideoThreadAccepted, isRemoteVideoCommentAccepted, isLocalVideoCommentReplyAccepted, isPreImportVideoAccepted, isPostImportVideoAccepted, createVideoAbuse, createVideoCommentAbuse, createAccountAbuse };
async function createAbuse(options) {
    const { base, reporterAccount, flaggedAccount, associateFun, transaction, skipNotification } = options;
    const auditLogger = auditLoggerFactory('abuse');
    const abuseAttributes = Object.assign({}, base, { flaggedAccountId: flaggedAccount.id });
    const abuseInstance = await AbuseModel.create(abuseAttributes, { transaction });
    abuseInstance.ReporterAccount = reporterAccount;
    abuseInstance.FlaggedAccount = flaggedAccount;
    const { isOwned } = await associateFun(abuseInstance);
    if (isOwned === false) {
        sendAbuse(reporterAccount.Actor, abuseInstance, abuseInstance.FlaggedAccount, transaction);
    }
    const abuseJSON = abuseInstance.toFormattedAdminJSON();
    auditLogger.create(reporterAccount.Actor.getIdentifier(), new AbuseAuditView(abuseJSON));
    if (!skipNotification) {
        afterCommitIfTransaction(transaction, () => {
            Notifier.Instance.notifyOnNewAbuse({
                abuse: abuseJSON,
                abuseInstance,
                reporter: reporterAccount.Actor.getIdentifier()
            });
        });
    }
    logger.info('Abuse report %d created.', abuseInstance.id);
    return abuseJSON;
}
//# sourceMappingURL=moderation.js.map