export function haveActorsSameRemoteHost(base, other) {
    if (!base.serverId || !other.serverId)
        return false;
    if (base.serverId !== other.serverId)
        return false;
    return true;
}
//# sourceMappingURL=check-actor.js.map