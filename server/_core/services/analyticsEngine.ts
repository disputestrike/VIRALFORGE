/**
 * ANALYTICS & DASHBOARD ENGINE
 * 
 * Real-time metrics for $100M SaaS dashboard
 * - Lead source performance
 * - Call success rates
 * - Appointment booking rates
 * - ROI per source
 * - Revenue tracking
 */

import * as db from '../db';

/**
 * DASHBOARD STATS - Main view
 */
export async function getDashboardStats(customerId: string, dateRange: 'today' | 'week' | 'month' | 'year' = 'month') {
  const dateFilter = getDateFilter(dateRange);

  // Total leads this period
  const leadsCount = await db.query(
    `SELECT COUNT(*) as count FROM leads WHERE customerId = ? ${dateFilter}`,
    [customerId]
  );

  // Calls made
  const callsCount = await db.query(
    `SELECT COUNT(*) as count FROM voice_sessions WHERE customerId = ? AND status = 'completed' ${dateFilter}`,
    [customerId]
  );

  // Appointments booked
  const appointmentsCount = await db.query(
    `SELECT COUNT(*) as count FROM appointment_bookings WHERE customerId = ? AND confirmationStatus = 'confirmed' ${dateFilter}`,
    [customerId]
  );

  // Appointments showed
  const showedCount = await db.query(
    `SELECT COUNT(*) as count FROM appointment_bookings WHERE customerId = ? AND showStatus = 'showed' ${dateFilter}`,
    [customerId]
  );

  // Revenue generated
  const revenueQuery = await db.query(
    `SELECT SUM(amount) as total FROM billing_transactions WHERE customerId = ? AND status = 'completed' ${dateFilter}`,
    [customerId]
  );

  const stats = {
    leads: (leadsCount[0] as any)?.count || 0,
    callsMade: (callsCount[0] as any)?.count || 0,
    appointmentsBooked: (appointmentsCount[0] as any)?.count || 0,
    appointmentsShowed: (showedCount[0] as any)?.count || 0,
    revenueGenerated: (revenueQuery[0] as any)?.total || 0,
    showRate: appointmentsCount.length > 0 ? Math.round(((showedCount[0] as any)?.count || 0) / ((appointmentsCount[0] as any)?.count || 1) * 100) : 0,
    bookingRate: leadsCount.length > 0 ? Math.round(((appointmentsCount[0] as any)?.count || 0) / ((leadsCount[0] as any)?.count || 1) * 100) : 0,
    callSuccessRate: callsCount.length > 0 ? Math.round(((appointmentsCount[0] as any)?.count || 0) / ((callsCount[0] as any)?.count || 1) * 100) : 0,
  };

  return stats;
}

/**
 * LEAD SOURCE PERFORMANCE
 */
export async function getLeadSourceMetrics(customerId: string, dateRange: 'today' | 'week' | 'month' = 'month') {
  const dateFilter = getDateFilter(dateRange);

  const metrics = await db.query(
    `
    SELECT 
      source,
      COUNT(*) as leads_count,
      SUM(CASE WHEN l.status = 'contacted' THEN 1 ELSE 0 END) as contacted,
      SUM(CASE WHEN ab.confirmationStatus = 'confirmed' THEN 1 ELSE 0 END) as appointments_booked,
      SUM(CASE WHEN ab.showStatus = 'showed' THEN 1 ELSE 0 END) as appointments_showed,
      AVG(l.score) as avg_lead_score
    FROM leads l
    LEFT JOIN appointment_bookings ab ON l.id = ab.leadId
    WHERE l.customerId = ? ${dateFilter}
    GROUP BY source
    `,
    [customerId]
  );

  return metrics.map((m: any) => ({
    source: m.source,
    leadsCount: m.leads_count,
    contacted: m.contacted || 0,
    appointmentsBooked: m.appointments_booked || 0,
    appointmentsShowed: m.appointments_showed || 0,
    avgLeadScore: m.avg_lead_score || 0,
    contactRate: Math.round((m.contacted || 0) / m.leads_count * 100),
    bookingRate: Math.round((m.appointments_booked || 0) / m.leads_count * 100),
    showRate: m.appointments_showed > 0 ? Math.round(m.appointments_showed / (m.appointments_booked || 1) * 100) : 0,
    costPerLead: 0, // Would calculate based on advertising spend
    costPerAppointment: 0, // Would calculate
    roi: 0, // Would calculate based on closed deals
  }));
}

/**
 * CALL PERFORMANCE METRICS
 */
export async function getCallMetrics(customerId: string, dateRange: 'today' | 'week' | 'month' = 'month') {
  const dateFilter = getDateFilter(dateRange);

  const metrics = await db.query(
    `
    SELECT 
      COUNT(*) as total_calls,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_calls,
      AVG(duration) as avg_duration,
      SUM(CASE WHEN appointmentProposed IS NOT NULL THEN 1 ELSE 0 END) as appointments_proposed
    FROM voice_sessions
    WHERE customerId = ? AND status != 'initiated' ${dateFilter}
    `,
    [customerId]
  );

  const m = metrics[0] as any;
  return {
    totalCalls: m.total_calls || 0,
    completedCalls: m.completed_calls || 0,
    failedCalls: m.failed_calls || 0,
    avgDuration: Math.round(m.avg_duration || 0),
    appointmentsProposed: m.appointments_proposed || 0,
    successRate: m.total_calls > 0 ? Math.round((m.completed_calls || 0) / m.total_calls * 100) : 0,
    proposalRate: m.completed_calls > 0 ? Math.round((m.appointments_proposed || 0) / (m.completed_calls || 1) * 100) : 0,
  };
}

/**
 * APPOINTMENT FUNNEL
 */
export async function getAppointmentFunnel(customerId: string, dateRange: 'today' | 'week' | 'month' = 'month') {
  const dateFilter = getDateFilter(dateRange);

  // Each stage of the appointment funnel
  const proposed = await db.query(
    `SELECT COUNT(*) as count FROM voice_sessions WHERE customerId = ? AND appointmentProposed IS NOT NULL ${dateFilter}`,
    [customerId]
  );

  const confirmed = await db.query(
    `SELECT COUNT(*) as count FROM appointment_bookings WHERE customerId = ? AND confirmationStatus = 'confirmed' ${dateFilter}`,
    [customerId]
  );

  const showed = await db.query(
    `SELECT COUNT(*) as count FROM appointment_bookings WHERE customerId = ? AND showStatus = 'showed' ${dateFilter}`,
    [customerId]
  );

  const closed = await db.query(
    `SELECT COUNT(*) as count FROM deals WHERE customerId = ? AND status = 'won' ${dateFilter}`,
    [customerId]
  );

  const proposedCount = (proposed[0] as any)?.count || 0;
  const confirmedCount = (confirmed[0] as any)?.count || 0;
  const showedCount = (showed[0] as any)?.count || 0;
  const closedCount = (closed[0] as any)?.count || 0;

  return {
    proposed: {
      count: proposedCount,
      percentage: 100,
    },
    confirmed: {
      count: confirmedCount,
      percentage: proposedCount > 0 ? Math.round(confirmedCount / proposedCount * 100) : 0,
    },
    showed: {
      count: showedCount,
      percentage: confirmedCount > 0 ? Math.round(showedCount / confirmedCount * 100) : 0,
    },
    closed: {
      count: closedCount,
      percentage: showedCount > 0 ? Math.round(closedCount / showedCount * 100) : 0,
    },
  };
}

/**
 * ROI CALCULATION
 */
export async function calculateROI(customerId: string, dateRange: 'today' | 'week' | 'month' = 'month') {
  const dateFilter = getDateFilter(dateRange);

  // Total spent on leads (advertising)
  const adSpendQuery = await db.query(
    `SELECT SUM(cost) as total FROM ad_spend WHERE customerId = ? ${dateFilter}`,
    [customerId]
  );

  // Revenue from closed deals
  const revenueQuery = await db.query(
    `SELECT SUM(amount) as total FROM deals WHERE customerId = ? AND status = 'won' ${dateFilter}`,
    [customerId]
  );

  const adSpend = (adSpendQuery[0] as any)?.total || 0;
  const revenue = (revenueQuery[0] as any)?.total || 0;

  const roi = adSpend > 0 ? Math.round(((revenue - adSpend) / adSpend) * 100) : 0;

  return {
    totalAdSpend: adSpend,
    totalRevenue: revenue,
    profit: revenue - adSpend,
    roiPercentage: roi,
    revenuePer Dollar: adSpend > 0 ? (revenue / adSpend).toFixed(2) : '0.00',
  };
}

/**
 * REVENUE TRACKING
 */
export async function getRevenueMetrics(customerId: string, dateRange: 'today' | 'week' | 'month' = 'month') {
  const dateFilter = getDateFilter(dateRange);

  // MRR (Monthly Recurring Revenue)
  const mrrQuery = await db.query(
    `SELECT SUM(amount) as total FROM billing_transactions 
     WHERE customerId = ? AND type = 'monthly_plan' ${dateFilter}`,
    [customerId]
  );

  // Success fees (per appointment)
  const successFeesQuery = await db.query(
    `SELECT SUM(amount) as total FROM billing_transactions 
     WHERE customerId = ? AND type = 'success_fee' ${dateFilter}`,
    [customerId]
  );

  // Churn analysis
  const churnedLeads = await db.query(
    `SELECT COUNT(*) as count FROM leads WHERE customerId = ? AND status = 'lost' ${dateFilter}`,
    [customerId]
  );

  const totalLeads = await db.query(
    `SELECT COUNT(*) as count FROM leads WHERE customerId = ? ${dateFilter}`,
    [customerId]
  );

  const mrr = (mrrQuery[0] as any)?.total || 0;
  const successFees = (successFeesQuery[0] as any)?.total || 0;

  return {
    mrr,
    successFees,
    totalRevenue: mrr + successFees,
    churnRate: (totalLeads[0] as any)?.count > 0 ? Math.round(((churnedLeads[0] as any)?.count || 0) / ((totalLeads[0] as any)?.count || 1) * 100) : 0,
  };
}

/**
 * CAMPAIGN PERFORMANCE
 * Track each 12-month sequence
 */
export async function getCampaignMetrics(customerId: string, campaignId: number) {
  const metrics = await db.query(
    `
    SELECT 
      c.id,
      c.name,
      COUNT(DISTINCT l.id) as total_leads,
      SUM(CASE WHEN vs.status = 'completed' THEN 1 ELSE 0 END) as calls_made,
      SUM(CASE WHEN ab.confirmationStatus = 'confirmed' THEN 1 ELSE 0 END) as appointments_booked,
      AVG(l.score) as avg_lead_quality
    FROM campaigns c
    LEFT JOIN leads l ON c.id = l.campaignId
    LEFT JOIN voice_sessions vs ON l.id = vs.leadId
    LEFT JOIN appointment_bookings ab ON l.id = ab.leadId
    WHERE c.customerId = ? AND c.id = ?
    GROUP BY c.id
    `,
    [customerId, campaignId]
  );

  return metrics[0] || null;
}

/**
 * HELPER: Convert date range to SQL filter
 */
function getDateFilter(dateRange: string): string {
  const now = new Date();

  switch (dateRange) {
    case 'today':
      return `AND DATE(createdAt) = CURDATE()`;
    case 'week':
      return `AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
    case 'month':
      return `AND createdAt >= DATE_TRUNC('month', NOW())`;
    case 'year':
      return `AND createdAt >= DATE_TRUNC('year', NOW())`;
    default:
      return `AND createdAt >= DATE_TRUNC('month', NOW())`;
  }
}

export default {
  getDashboardStats,
  getLeadSourceMetrics,
  getCallMetrics,
  getAppointmentFunnel,
  calculateROI,
  getRevenueMetrics,
  getCampaignMetrics,
};
