import { HttpStatusCode } from '@peertube/peertube-models';
function checkUserCanTerminateOwnershipChange(user, videoChangeOwnership, res) {
    if (videoChangeOwnership.NextOwner.userId === user.id) {
        return true;
    }
    res.fail({
        status: HttpStatusCode.FORBIDDEN_403,
        message: 'Cannot terminate an ownership change of another user'
    });
    return false;
}
export { checkUserCanTerminateOwnershipChange };
//# sourceMappingURL=video-ownership.js.map