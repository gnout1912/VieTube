import retry from 'async/retry.js';
import { Transaction } from 'sequelize';
import { sequelizeTypescript } from '../initializers/database.js';
import { logger } from './logger.js';
function retryTransactionWrapper(functionToRetry, ...args) {
    return transactionRetryer(callback => {
        functionToRetry.apply(null, args)
            .then((result) => callback(null, result))
            .catch(err => callback(err));
    })
        .catch(err => {
        logger.warn(`Cannot execute ${functionToRetry.name || 'function'} with many retries.`, { err });
        throw err;
    });
}
function transactionRetryer(func) {
    return new Promise((res, rej) => {
        retry({
            times: 5,
            errorFilter: err => {
                const willRetry = err.name === 'SequelizeDatabaseError';
                logger.debug('Maybe retrying the transaction function.', { willRetry, err, tags: ['sql', 'retry'] });
                return willRetry;
            }
        }, func, (err, data) => err ? rej(err) : res(data));
    });
}
function saveInTransactionWithRetries(model) {
    const changedKeys = model.changed() || [];
    return retryTransactionWrapper(() => {
        return sequelizeTypescript.transaction(async (transaction) => {
            try {
                await model.save({ transaction });
            }
            catch (err) {
                for (const key of changedKeys) {
                    model.changed(key, true);
                }
                throw err;
            }
        });
    });
}
function resetSequelizeInstance(instance) {
    return instance.reload();
}
function filterNonExistingModels(fromDatabase, newModels) {
    return fromDatabase.filter(f => !newModels.find(newModel => newModel.hasSameUniqueKeysThan(f)));
}
function deleteAllModels(models, transaction) {
    return Promise.all(models.map(f => f.destroy({ transaction })));
}
function runInReadCommittedTransaction(fn) {
    const options = { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED };
    return sequelizeTypescript.transaction(options, t => fn(t));
}
function afterCommitIfTransaction(t, fn) {
    if (t)
        return t.afterCommit(() => fn());
    return fn();
}
export { resetSequelizeInstance, retryTransactionWrapper, transactionRetryer, saveInTransactionWithRetries, afterCommitIfTransaction, filterNonExistingModels, deleteAllModels, runInReadCommittedTransaction };
//# sourceMappingURL=database-utils.js.map