import { EventEmitter } from 'events';
class InternalEventEmitter extends EventEmitter {
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
export { InternalEventEmitter };
//# sourceMappingURL=internal-event-emitter.js.map