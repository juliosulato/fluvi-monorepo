/**
 * Why a pushed record was rejected. Each refine in the record schemas carries
 * its reason in `params.reason`; any other issue (missing field, wrong type,
 * bad format) is `MALFORMED_RECORD`.
 */
export const SYNC_REJECTION_REASON = {
  /** Missing field, wrong type or bad format (including an uppercase UUID). */
  malformedRecord: 'MALFORMED_RECORD',
  /** A measure or limit rejected by `@fluvi/domain`. */
  valueOutOfRange: 'VALUE_OUT_OF_RANGE',
  /** `localDate` or `effectiveFrom` is not a valid `YYYY-MM-DD`. */
  invalidLocalDate: 'INVALID_LOCAL_DATE',
} as const;

export type SyncRejectionReason =
  (typeof SYNC_REJECTION_REASON)[keyof typeof SYNC_REJECTION_REASON];
