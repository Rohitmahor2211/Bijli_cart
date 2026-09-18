import { AuditLog } from '../models/auditLog.model.js';
import { logger } from '../utils/logger.js';

export const logAudit = async ({
  req,
  retailerId,
  action,
  entityType,
  entityId = null,
  metadata = {},
}) => {
  try {
    const ipAddress = req ? req.ip || req.socket?.remoteAddress || '' : '';
    const userAgent = req ? req.headers['user-agent'] || '' : '';

    const auditEntry = await AuditLog.create({
      retailerId: retailerId || (req ? req.retailerId : null),
      action,
      entityType,
      entityId,
      metadata,
      ipAddress,
      userAgent,
    });

    logger.debug(`Audit log recorded: [${action}] on ${entityType}`);
    return auditEntry;
  } catch (error) {
    logger.error('Error recording audit log:', error);
  }
};
