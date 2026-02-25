import { tags } from 'typia';

/**
 * Audit columns that exist in the DB but aren't used in business logic
 */
export interface AuditableTable {
  createdAt?: string & tags.Format<'date-time'>;
  updatedAt?: string & tags.Format<'date-time'>;
}
