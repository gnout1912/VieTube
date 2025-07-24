class LiveQuotaStore {
    constructor() {
        this.livesPerUser = new Map();
    }
    addNewLive(userId, sessionId) {
        if (!this.livesPerUser.has(userId)) {
            this.livesPerUser.set(userId, []);
        }
        const currentUserLive = { sessionId, size: 0 };
        const livesOfUser = this.livesPerUser.get(userId);
        livesOfUser.push(currentUserLive);
    }
    removeLive(userId, sessionId) {
        const newLivesPerUser = this.livesPerUser.get(userId)
            .filter(o => o.sessionId !== sessionId);
        this.livesPerUser.set(userId, newLivesPerUser);
    }
    addQuotaTo(userId, sessionId, size) {
        const lives = this.livesPerUser.get(userId);
        const live = lives.find(l => l.sessionId === sessionId);
        live.size += size;
    }
    getLiveQuotaOfUser(userId) {
        const currentLives = this.livesPerUser.get(userId);
        if (!currentLives)
            return 0;
        return currentLives.reduce((sum, obj) => sum + obj.size, 0);
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
export { LiveQuotaStore };
//# sourceMappingURL=live-quota-store.js.map