import { arrayify } from '@peertube/peertube-core-utils';
import { UserExportState, UserRegistrationState } from '@peertube/peertube-models';
import { isTestOrDevInstance, root } from '@peertube/peertube-node-utils';
import { UserModel } from '../models/user/user.js';
import { readFileSync } from 'fs';
import merge from 'lodash-es/merge.js';
import { createTransport } from 'nodemailer';
import { join } from 'path';
import pug from 'pug';
import { bunyanLogger, logger } from '../helpers/logger.js';
import { CONFIG, isEmailEnabled } from '../initializers/config.js';
import { WEBSERVER } from '../initializers/constants.js';
import { JobQueue } from './job-queue/index.js';
import { Hooks } from './plugins/hooks.js';
class Emailer {
    constructor() {
        this.initialized = false;
    }
    init() {
        if (this.initialized === true)
            return;
        this.initialized = true;
        if (!isEmailEnabled()) {
            if (!isTestOrDevInstance()) {
                logger.error('Cannot use SMTP server because of lack of configuration. PeerTube will not be able to send mails!');
            }
            return;
        }
        if (CONFIG.SMTP.TRANSPORT === 'smtp')
            this.initSMTPTransport();
        else if (CONFIG.SMTP.TRANSPORT === 'sendmail')
            this.initSendmailTransport();
    }
    async checkConnection() {
        if (!this.transporter || CONFIG.SMTP.TRANSPORT !== 'smtp')
            return;
        logger.info('Testing SMTP server...');
        try {
            const success = await this.transporter.verify();
            if (success !== true)
                this.warnOnConnectionFailure();
            logger.info('Successfully connected to SMTP server.');
        }
        catch (err) {
            this.warnOnConnectionFailure(err);
        }
    }
    addPasswordResetEmailJob(username, to, resetPasswordUrl) {
        const emailPayload = {
            template: 'password-reset',
            to: [to],
            subject: 'Reset your account password',
            locals: {
                username,
                resetPasswordUrl,
                hideNotificationPreferencesLink: true
            }
        };
        return JobQueue.Instance.createJobAsync({ type: 'email', payload: emailPayload });
    }
    addPasswordCreateEmailJob(username, to, createPasswordUrl) {
        const emailPayload = {
            template: 'password-create',
            to: [to],
            subject: 'Create your account password',
            locals: {
                username,
                createPasswordUrl,
                hideNotificationPreferencesLink: true
            }
        };
        return JobQueue.Instance.createJobAsync({ type: 'email', payload: emailPayload });
    }
    addUserVerifyChangeEmailJob(options) {
        const { username, to, verifyEmailUrl } = options;
        const emailPayload = {
            template: 'verify-user-change-email',
            to: [to],
            subject: `Verify your email on ${CONFIG.INSTANCE.NAME}`,
            locals: {
                username,
                verifyEmailUrl,
                hideNotificationPreferencesLink: true
            }
        };
        return JobQueue.Instance.createJobAsync({ type: 'email', payload: emailPayload });
    }
    addRegistrationVerifyEmailJob(options) {
        const { username, isRegistrationRequest, to, verifyEmailUrl } = options;
        const emailPayload = {
            template: 'verify-registration-email',
            to: [to],
            subject: `Verify your email on ${CONFIG.INSTANCE.NAME}`,
            locals: {
                username,
                verifyEmailUrl,
                isRegistrationRequest,
                hideNotificationPreferencesLink: true
            }
        };
        return JobQueue.Instance.createJobAsync({ type: 'email', payload: emailPayload });
    }
    addUserBlockJob(user, blocked, reason) {
        const reasonString = reason ? ` for the following reason: ${reason}` : '';
        const blockedWord = blocked ? 'blocked' : 'unblocked';
        const to = user.email;
        const emailPayload = {
            to: [to],
            subject: 'Account ' + blockedWord,
            text: `Your account ${user.username} on ${CONFIG.INSTANCE.NAME} has been ${blockedWord}${reasonString}.`
        };
        return JobQueue.Instance.createJobAsync({ type: 'email', payload: emailPayload });
    }
    addContactFormJob(fromEmail, fromName, subject, body) {
        const emailPayload = {
            template: 'contact-form',
            to: [CONFIG.ADMIN.EMAIL],
            replyTo: `"${fromName}" <${fromEmail}>`,
            subject: `(contact form) ${subject}`,
            locals: {
                fromName,
                fromEmail,
                body,
                hideNotificationPreferencesLink: true
            }
        };
        return JobQueue.Instance.createJobAsync({ type: 'email', payload: emailPayload });
    }
    addUserRegistrationRequestProcessedJob(registration) {
        let template;
        let subject;
        if (registration.state === UserRegistrationState.ACCEPTED) {
            template = 'user-registration-request-accepted';
            subject = `Your registration request for ${registration.username} has been accepted`;
        }
        else {
            template = 'user-registration-request-rejected';
            subject = `Your registration request for ${registration.username} has been rejected`;
        }
        const to = registration.email;
        const emailPayload = {
            to: [to],
            template,
            subject,
            locals: {
                username: registration.username,
                moderationResponse: registration.moderationResponse,
                loginLink: WEBSERVER.URL + '/login',
                hideNotificationPreferencesLink: true
            }
        };
        return JobQueue.Instance.createJobAsync({ type: 'email', payload: emailPayload });
    }
    async addUserExportCompletedOrErroredJob(userExport) {
        let template;
        let subject;
        if (userExport.state === UserExportState.COMPLETED) {
            template = 'user-export-completed';
            subject = `Your export archive has been created`;
        }
        else {
            template = 'user-export-errored';
            subject = `Failed to create your export archive`;
        }
        const user = await UserModel.loadById(userExport.userId);
        const emailPayload = {
            to: [user.email],
            template,
            subject,
            locals: {
                exportsUrl: WEBSERVER.URL + '/my-account/import-export',
                errorMessage: userExport.error,
                hideNotificationPreferencesLink: true
            }
        };
        return JobQueue.Instance.createJobAsync({ type: 'email', payload: emailPayload });
    }
    async addUserImportErroredJob(userImport) {
        const user = await UserModel.loadById(userImport.userId);
        const emailPayload = {
            to: [user.email],
            template: 'user-import-errored',
            subject: 'Failed to import your archive',
            locals: {
                errorMessage: userImport.error,
                hideNotificationPreferencesLink: true
            }
        };
        return JobQueue.Instance.createJobAsync({ type: 'email', payload: emailPayload });
    }
    async addUserImportSuccessJob(userImport) {
        const user = await UserModel.loadById(userImport.userId);
        const emailPayload = {
            to: [user.email],
            template: 'user-import-completed',
            subject: 'Your archive import has finished',
            locals: {
                resultStats: userImport.resultSummary.stats,
                hideNotificationPreferencesLink: true
            }
        };
        return JobQueue.Instance.createJobAsync({ type: 'email', payload: emailPayload });
    }
    async sendMail(options) {
        if (!isEmailEnabled()) {
            logger.info('Cannot send mail because SMTP is not configured.');
            return;
        }
        const fromDisplayName = options.from
            ? options.from
            : CONFIG.INSTANCE.NAME;
        const EmailTemplates = (await import('email-templates')).default;
        const email = new EmailTemplates({
            send: true,
            juice: false,
            htmlToText: {
                selectors: [
                    { selector: 'img', format: 'skip' },
                    { selector: 'a', options: { hideLinkHrefIfSameAsText: true } }
                ]
            },
            render: async (view, locals) => {
                if (view.split('/').pop() !== 'html')
                    return undefined;
                const templatePath = await Hooks.wrapObject(join(root(), 'dist', 'core', 'assets', 'email-templates', view + '.pug'), 'filter:email.template-path.result', { view });
                const compiledTemplate = pug.compileFile(templatePath);
                return compiledTemplate(locals);
            },
            message: {
                from: `"${fromDisplayName}" <${CONFIG.SMTP.FROM_ADDRESS}>`
            },
            transport: this.transporter,
            subjectPrefix: CONFIG.EMAIL.SUBJECT.PREFIX
        });
        const subject = await Hooks.wrapObject(options.subject, 'filter:email.subject.result', { template: 'template' in options ? options.template : undefined });
        const toEmails = arrayify(options.to);
        const errors = [];
        for (const to of toEmails) {
            const baseOptions = {
                template: 'common',
                message: {
                    to,
                    from: options.from,
                    subject,
                    replyTo: options.replyTo
                },
                locals: {
                    WEBSERVER,
                    EMAIL: CONFIG.EMAIL,
                    instanceName: CONFIG.INSTANCE.NAME,
                    text: options.text,
                    subject
                }
            };
            const sendOptions = merge(baseOptions, options);
            try {
                const res = await email.send(sendOptions);
                logger.debug('Sent email.', { res });
            }
            catch (err) {
                errors.push(err);
                logger.error('Error in email sender.', { err });
            }
        }
        if (errors.length !== 0) {
            const err = new Error('Some errors when sent emails');
            err.errors = errors;
            throw err;
        }
    }
    warnOnConnectionFailure(err) {
        logger.error('Failed to connect to SMTP %s:%d.', CONFIG.SMTP.HOSTNAME, CONFIG.SMTP.PORT, { err });
    }
    initSMTPTransport() {
        logger.info('Using %s:%s as SMTP server.', CONFIG.SMTP.HOSTNAME, CONFIG.SMTP.PORT);
        let tls;
        if (CONFIG.SMTP.CA_FILE) {
            tls = {
                ca: [readFileSync(CONFIG.SMTP.CA_FILE)]
            };
        }
        let auth;
        if (CONFIG.SMTP.USERNAME && CONFIG.SMTP.PASSWORD) {
            auth = {
                user: CONFIG.SMTP.USERNAME,
                pass: CONFIG.SMTP.PASSWORD
            };
        }
        this.transporter = createTransport({
            host: CONFIG.SMTP.HOSTNAME,
            port: CONFIG.SMTP.PORT,
            secure: CONFIG.SMTP.TLS,
            debug: CONFIG.LOG.LEVEL === 'debug',
            logger: bunyanLogger,
            ignoreTLS: CONFIG.SMTP.DISABLE_STARTTLS,
            tls,
            auth
        });
    }
    initSendmailTransport() {
        logger.info('Using sendmail to send emails');
        this.transporter = createTransport({
            sendmail: true,
            newline: 'unix',
            path: CONFIG.SMTP.SENDMAIL,
            logger: bunyanLogger
        });
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
export { Emailer };
//# sourceMappingURL=emailer.js.map