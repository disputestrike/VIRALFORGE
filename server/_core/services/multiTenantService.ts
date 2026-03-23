/**
 * MULTI-TENANT SERVICE - SIMPLIFIED
 */

import * as db from '../../db';

export async function createCustomer(data: {
  companyName: string;
  email: string;
  phone: string;
  industry: string;
  plan: 'starter' | 'growth' | 'enterprise';
}) {
  console.log(`[MultiTenant] Creating customer: ${data.companyName}`);
  
  const apiKey = `apxai_${Buffer.from(data.email).toString('base64').slice(0, 20)}`;
  
  return {
    customerId: `cust_${Date.now()}`,
    apiKey,
    plan: data.plan,
    monthlyLimit: 5000,
  };
}

export async function getCustomerByApiKey(apiKey: string) {
  return null;
}

export async function ingestLeadForCustomer(customerId: string, leadData: any) {
  const lead = await db.createLead({
    ...leadData,
  } as any);
  
  return lead;
}

export async function getCustomerLeads(customerId: string) {
  const result = await db.getLeads({ limit: 10000 }) as any;
  return result.leads || [];
}

export async function calculateMonthlyCharges(customerId: string) {
  return {
    customerId,
    basePlanCharge: 299,
    appointmentsBooked: 0,
    successFeeCharge: 0,
    totalCharge: 299,
  };
}

export async function createInvoiceForCustomer(customerId: string) {
  return {
    id: `inv_${Date.now()}`,
    customerId,
    amount: 299,
    status: 'open',
  };
}

export default {
  createCustomer,
  getCustomerByApiKey,
  ingestLeadForCustomer,
  getCustomerLeads,
  calculateMonthlyCharges,
  createInvoiceForCustomer,
};
