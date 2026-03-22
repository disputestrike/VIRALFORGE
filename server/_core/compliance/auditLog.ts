/**
 * AUDIT LOGGING & COMPLIANCE SYSTEM
 * 
 * - Track all customer actions
 * - GDPR compliance (data deletion, export)
 * - SOC 2 requirements (audit trails, access logs)
 * - Data retention policies
 */

import * as db from '../db';
import { Request } from 'express';

/**
 * AUDIT LOG ENTRY
 */
export interface AuditLogEntry {
  customerId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changesBefore?: any;
  changesAfter?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

/**
 * LOG ACTION
 * Track every significant action
 */
export async function logAction(entry: AuditLogEntry) {
  try {
    await db.query(
      `INSERT INTO audit_log 
       (customerId, userId, action, entityType, entityId, changesBefore, changesAfter, ipAddress, userAgent, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        entry.customerId,
        entry.userId || null,
        entry.action,
        entry.entityType,
        entry.entityId || null,
        entry.changesBefore ? JSON.stringify(entry.changesBefore) : null,
        entry.changesAfter ? JSON.stringify(entry.changesAfter) : null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ]
    );

    console.log(`[Audit] ${entry.customerId} - ${entry.action}: ${entry.entityType}/${entry.entityId}`);
  } catch (error) {
    console.error('[Audit] Failed to log action:', error);
  }
}

/**
 * AUDIT MIDDLEWARE
 * Attach to Express middleware to auto-log requests
 */
export function auditMiddleware(req: any, res: any, next: any) {
  const originalSend = res.send;

  res.send = function (data: any) {
    // Log after response
    if (req.method !== 'GET' && req.customerId) {
      const entry: AuditLogEntry = {
        customerId: req.customerId,
        userId: req.userId,
        action: `${req.method.toUpperCase()} ${req.path}`,
        entityType: 'api_request',
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      // Attach to response for async logging
      setImmediate(() => logAction(entry));
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * GET AUDIT LOG FOR CUSTOMER
 */
export async function getAuditLog(
  customerId: string,
  filters?: {
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) {
  let query = 'SELECT * FROM audit_log WHERE customerId = ?';
  const params: any[] = [customerId];

  if (filters?.action) {
    query += ' AND action = ?';
    params.push(filters.action);
  }

  if (filters?.entityType) {
    query += ' AND entityType = ?';
    params.push(filters.entityType);
  }

  if (filters?.startDate) {
    query += ' AND createdAt >= ?';
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    query += ' AND createdAt <= ?';
    params.push(filters.endDate);
  }

  query += ' ORDER BY createdAt DESC';

  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  if (filters?.offset) {
    query += ' OFFSET ?';
    params.push(filters.offset);
  }

  return await db.query(query, params);
}

/**
 * GDPR: RIGHT TO BE FORGOTTEN
 * Delete all customer data
 */
export async function deleteCustomerData(customerId: string, reason: string) {
  console.log(`[GDPR] Deleting all data for customer ${customerId}: ${reason}`);

  try {
    // Start transaction
    await db.query('START TRANSACTION', []);

    // Log the deletion action
    await db.query(
      `INSERT INTO audit_log 
       (customerId, action, entityType, metadata, createdAt)
       VALUES (?, ?, ?, ?, NOW())`,
      [customerId, 'data_deletion_requested', 'compliance', JSON.stringify({ reason })]
    );

    // Delete all customer data (preserve audit logs for 7 years for compliance)
    await db.query('DELETE FROM leads WHERE customerId = ?', [customerId]);
    await db.query('DELETE FROM voice_sessions WHERE customerId = ?', [customerId]);
    await db.query('DELETE FROM appointment_bookings WHERE customerId = ?', [customerId]);
    await db.query('DELETE FROM job_queue WHERE customerId = ?', [customerId]);
    await db.query('DELETE FROM lead_source_connections WHERE customerId = ?', [customerId]);
    await db.query('DELETE FROM webhook_events WHERE customerId = ?', [customerId]);
    await db.query('DELETE FROM invoices WHERE customerId = ?', [customerId]);
    await db.query('DELETE FROM billing_transactions WHERE customerId = ?', [customerId]);

    // Update customer record (anonymize but keep for billing history)
    await db.query(
      `UPDATE customers SET 
       companyName = 'DELETED',
       email = CONCAT('deleted_', id, '@deleted.local'),
       phone = NULL,
       website = NULL,
       apiKey = CONCAT('deleted_', UUID()),
       apiSecret = CONCAT('deleted_', UUID()),
       status = 'deleted',
       updatedAt = NOW()
       WHERE id = ?`,
      [customerId]
    );

    // Commit transaction
    await db.query('COMMIT', []);

    console.log(`[GDPR] Data deletion complete for customer ${customerId}`);
    return { status: 'deleted', customerId };
  } catch (error) {
    await db.query('ROLLBACK', []);
    console.error(`[GDPR] Data deletion failed:`, error);
    throw error;
  }
}

/**
 * GDPR: RIGHT TO DATA PORTABILITY
 * Export all customer data
 */
export async function exportCustomerData(customerId: string) {
  console.log(`[GDPR] Exporting data for customer ${customerId}`);

  const customer = await db.query('SELECT * FROM customers WHERE id = ?', [customerId]);
  const leads = await db.query('SELECT * FROM leads WHERE customerId = ?', [customerId]);
  const sessions = await db.query('SELECT * FROM voice_sessions WHERE customerId = ?', [customerId]);
  const appointments = await db.query('SELECT * FROM appointment_bookings WHERE customerId = ?', [
    customerId,
  ]);
  const sources = await db.query('SELECT * FROM lead_source_connections WHERE customerId = ?', [
    customerId,
  ]);
  const invoices = await db.query('SELECT * FROM invoices WHERE customerId = ?', [customerId]);
  const auditLog = await db.query('SELECT * FROM audit_log WHERE customerId = ?', [customerId]);

  const exportData = {
    exportDate: new Date().toISOString(),
    customer: customer[0],
    leads: leads,
    voiceSessions: sessions,
    appointments: appointments,
    leadSources: sources,
    invoices: invoices,
    auditLog: auditLog,
  };

  console.log(`[GDPR] Export complete for customer ${customerId}: ${JSON.stringify(exportData).length} bytes`);
  return exportData;
}

/**
 * DATA RETENTION POLICY
 * Automatically delete old data according to policy
 */
export async function enforceDataRetention() {
  console.log('[Compliance] Enforcing data retention policies...');

  try {
    // Keep voice sessions for 90 days, then archive
    const archivedSessions = await db.query(
      `UPDATE voice_sessions 
       SET archived = 1, transcriptRetracted = 1
       WHERE createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY) AND archived = 0`,
      []
    );

    // Keep audit logs for 7 years (compliance requirement)
    // Never delete audit logs

    // Keep invoices forever (tax requirement)
    // Never delete invoices

    // Delete webhook events after 30 days
    const deletedWebhooks = await db.query(
      `DELETE FROM webhook_events WHERE createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      []
    );

    console.log('[Compliance] Data retention policies enforced');
  } catch (error) {
    console.error('[Compliance] Data retention enforcement failed:', error);
  }
}

/**
 * SOC 2 COMPLIANCE: ACCESS LOG
 * Track who accessed what
 */
export async function logDataAccess(
  customerId: string,
  userId: string,
  entityType: string,
  entityId: string,
  accessType: 'read' | 'write' | 'delete',
  ipAddress: string
) {
  await logAction({
    customerId,
    userId,
    action: `data_${accessType}`,
    entityType,
    entityId,
    ipAddress,
    metadata: {
      accessType,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * SOC 2 COMPLIANCE: GENERATE AUDIT REPORT
 * For security audits
 */
export async function generateAuditReport(
  startDate: Date,
  endDate: Date,
  format: 'json' | 'csv' = 'json'
) {
  const logs = await db.query(
    `SELECT * FROM audit_log 
     WHERE createdAt >= ? AND createdAt <= ?
     ORDER BY createdAt DESC`,
    [startDate, endDate]
  );

  if (format === 'csv') {
    // Convert to CSV
    const headers = ['Timestamp', 'Customer', 'User', 'Action', 'Entity', 'IP Address'];
    const rows = (logs as any[]).map((log) => [
      log.createdAt,
      log.customerId,
      log.userId,
      log.action,
      `${log.entityType}/${log.entityId}`,
      log.ipAddress,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((val) => `"${val}"`).join(',')).join('\n');

    return csv;
  }

  return logs;
}

/**
 * COMPLIANCE: SENSITIVE DATA MASKING
 */
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const masked = { ...data };

  // Mask phone numbers
  if (masked.phone && typeof masked.phone === 'string') {
    masked.phone = masked.phone.replace(/(\d{3})\d{3}(\d{4})/, '$1-XXX-$2');
  }

  // Mask emails
  if (masked.email && typeof masked.email === 'string') {
    const [name, domain] = masked.email.split('@');
    masked.email = `${name[0]}***@${domain}`;
  }

  // Mask API keys
  if (masked.apiKey && typeof masked.apiKey === 'string') {
    masked.apiKey = `${masked.apiKey.substring(0, 8)}...`;
  }

  return masked;
}

export default {
  logAction,
  auditMiddleware,
  getAuditLog,
  deleteCustomerData,
  exportCustomerData,
  enforceDataRetention,
  logDataAccess,
  generateAuditReport,
  maskSensitiveData,
};
