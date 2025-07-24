export const ServerErrorCode = {
    MAX_FILE_SIZE_REACHED: 'max_file_size_reached',
    QUOTA_REACHED: 'quota_reached',
    DOES_NOT_RESPECT_FOLLOW_CONSTRAINTS: 'does_not_respect_follow_constraints',
    LIVE_NOT_ENABLED: 'live_not_enabled',
    LIVE_NOT_ALLOWING_REPLAY: 'live_not_allowing_replay',
    LIVE_CONFLICTING_PERMANENT_AND_SAVE_REPLAY: 'live_conflicting_permanent_and_save_replay',
    MAX_INSTANCE_LIVES_LIMIT_REACHED: 'max_instance_lives_limit_reached',
    MAX_USER_LIVES_LIMIT_REACHED: 'max_user_lives_limit_reached',
    INCORRECT_FILES_IN_TORRENT: 'incorrect_files_in_torrent',
    COMMENT_NOT_ASSOCIATED_TO_VIDEO: 'comment_not_associated_to_video',
    MISSING_TWO_FACTOR: 'missing_two_factor',
    INVALID_TWO_FACTOR: 'invalid_two_factor',
    ACCOUNT_WAITING_FOR_APPROVAL: 'account_waiting_for_approval',
    ACCOUNT_APPROVAL_REJECTED: 'account_approval_rejected',
    RUNNER_JOB_NOT_IN_PROCESSING_STATE: 'runner_job_not_in_processing_state',
    RUNNER_JOB_NOT_IN_PENDING_STATE: 'runner_job_not_in_pending_state',
    UNKNOWN_RUNNER_TOKEN: 'unknown_runner_token',
    VIDEO_REQUIRES_PASSWORD: 'video_requires_password',
    INCORRECT_VIDEO_PASSWORD: 'incorrect_video_password',
    VIDEO_ALREADY_BEING_TRANSCODED: 'video_already_being_transcoded',
    VIDEO_ALREADY_BEING_TRANSCRIBED: 'video_already_being_transcribed',
    VIDEO_ALREADY_HAS_CAPTIONS: 'video_already_has_captions',
    MAX_USER_VIDEO_QUOTA_EXCEEDED_FOR_USER_EXPORT: 'max_user_video_quota_exceeded_for_user_export',
    CURRENT_PASSWORD_IS_INVALID: 'current_password_is_invalid'
};
export const OAuth2ErrorCode = {
    INVALID_GRANT: 'invalid_grant',
    INVALID_CLIENT: 'invalid_client',
    INVALID_TOKEN: 'invalid_token'
};
//# sourceMappingURL=server-error-code.enum.js.map