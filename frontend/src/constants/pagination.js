// Pagination and capacity constants used across the frontend.
// Replaces frontend/src/services/constants.js — import from here going forward.

/** Fetch all records (workaround until backend supports dedicated endpoints). */
export const ALL_RECORDS_PAGE_SIZE = 1000

/** Maximum gym capacity used by access control and monitoring displays. */
export const GYM_MAX_CAPACITY = 200

/** Maximum records to fetch when generating reports. */
export const REPORT_FETCH_LIMIT = 100

/** Default number of items per paginated table. */
export const DEFAULT_PAGE_SIZE = 10
