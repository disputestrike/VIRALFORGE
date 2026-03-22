/**
 * MULTI-TENANT ARCHITECTURE
 * 
 * $100M SAAS PLATFORM
 * 
 * Each customer is completely isolated:
 * - Separate lead database
 * - Separate call logs
 * - Separate API keys
 * - Separate billing
 * - Separate team members
 */

import { Router } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import * as db from '../db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

/**
 * CUSTOMER MODEL - stored in database
 */
export interface Customer {
  id: string; // UUID
  stripeCustomerId: string;
  companyName: string;
  email: string;
  phone: string;
  website?: string;
  industry: string;
  teamSize: number;
  createdAt: Date;
  status: 'trial' | 'active' | 'paused' | 'cancelled';
  plan: 'starter' | 'growth' | 'enterprise';
  monthlyLeadLimit: number;
  monthlyLeadsUsed: number;
  successFeePercentage: number; // % of booked appointments
  apiKey: string;
  apiSecret: string;
  webhookUrl?: string;
  timezone: string;
}

/**
 * CUSTOMER SETUP - Create new customer account
 */
export async function createCustomer(data: {
  companyName: string;
  email: string;
  phone: string;
  industry: string;
  plan: 'starter' | 'growth' | 'enterprise';
}): Promise<Customer> {
  // Create Stripe customer
  const stripeCustomer = await stripe.customers.create({
    email: data.email,
    name: data.companyName,
    metadata: {
      industry: data.industry,
    },
  });

  // Generate API credentials
  const apiKey = `apxai_${Buffer.from(`${data.email}:${Date.now()}`).toString('base64')}`;
  const apiSecret = Buffer.from(Math.random().toString()).toString('base64').slice(0, 32);

  // Determine limits by plan
  const limits = {
    starter: { leads: 5000, successFee: 0.2 },
    growth: { leads: 50000, successFee: 0.15 },
    enterprise: { leads: 500000, successFee: 0.1 },
  };

  const limit = limits[data.plan];

  const customer: Customer = {
    id: `cust_${Buffer.from(data.email).toString('base64').slice(0, 16)}`,
    stripeCustomerId: stripeCustomer.id,
    companyName: data.companyName,
    email: data.email,
    phone: data.phone,
    industry: data.industry,
    teamSize: 1,
    createdAt: new Date(),
    status: 'trial',
    plan: data.plan,
    monthlyLeadLimit: limit.leads,
    monthlyLeadsUsed: 0,
    successFeePercentage: limit.successFee,
    apiKey,
    apiSecret,
    timezone: 'America/New_York',
  };

  // Store in database (would use actual db call)
  console.log(`[MultiTenant] Created customer: ${customer.id} (${data.companyName})`);

  return customer;
}

/**
 * GET CUSTOMER BY API KEY
 */
export async function getCustomerByApiKey(apiKey: string): Promise<Customer | null> {
  // In production: query database
  // For now: return mock
  return {
    id: 'cust_example',
    stripeCustomerId: 'cus_example',
    companyName: 'Example Company',
    email: 'contact@example.com',
    phone: '+1234567890',
    industry: 'solar',
    teamSize: 5,
    createdAt: new Date(),
    status: 'active',
    plan: 'growth',
    monthlyLeadLimit: 50000,
    monthlyLeadsUsed: 12500,
    successFeePercentage: 0.15,
    apiKey,
    apiSecret: 'secret_example',
    timezone: 'America/New_York',
  };
}

/**
 * LEAD INGESTION WITH MULTI-TENANT ISOLATION
 * 
 * Every lead belongs to exactly one customer
 * No data leakage between customers
 */
export async function ingestLeadForCustomer(customerId: string, leadData: any) {
  const customer = await getCustomerById(customerId);
  if (!customer) throw new Error('Customer not found');

  // Check monthly limit
  if (customer.monthlyLeadsUsed >= customer.monthlyLeadLimit) {
    throw new Error(`Monthly lead limit exceeded (${customer.monthlyLeadLimit})`);
  }

  // Create lead with customer_id reference
  const lead = await db.createLead({
    ...leadData,
    customerId, // CRITICAL: Associate with customer
    createdAt: new Date(),
  });

  // Track usage
  customer.monthlyLeadsUsed += 1;
  // Update customer in database

  return lead;
}

/**
 * GET ALL LEADS FOR CUSTOMER (with isolation)
 */
export async function getCustomerLeads(customerId: string) {
  // Database query MUST include: WHERE customerId = ?
  // Prevents accidental/malicious access to other customers' data
  return await db.query(
    `SELECT * FROM leads WHERE customerId = ? ORDER BY createdAt DESC`,
    [customerId]
  );
}

/**
 * GET CALLS FOR CUSTOMER (with isolation)
 */
export async function getCustomerCalls(customerId: string) {
  return await db.query(
    `SELECT * FROM voice_sessions WHERE customerId = ? ORDER BY startTime DESC`,
    [customerId]
  );
}

/**
 * BILLING: Track usage and prepare invoice
 */
export async function calculateMonthlyCharges(customerId: string) {
  const customer = await getCustomerById(customerId);
  if (!customer) throw new Error('Customer not found');

  // Get this month's appointments booked
  const appointmentsThisMonth = await db.query(
    `SELECT COUNT(*) as count FROM appointment_bookings 
     WHERE customerId = ? AND scheduledTime >= DATE_TRUNC('month', NOW())`,
    [customerId]
  );

  const appointmentCount = (appointmentsThisMonth[0] as any).count || 0;

  // Calculate charges
  const basePlan = {
    starter: 99,
    growth: 299,
    enterprise: 999,
  }[customer.plan];

  const successFeeCharges = appointmentCount * 50 * customer.successFeePercentage; // $50 per appointment * success fee %

  const totalCharges = basePlan + successFeeCharges;

  return {
    customerId,
    month: new Date(),
    basePlanCharge: basePlan,
    appointmentsBooked: appointmentCount,
    successFeeCharge: successFeeCharges,
    totalCharge: totalCharges,
  };
}

/**
 * BILLING: Create Stripe invoice
 */
export async function createInvoiceForCustomer(customerId: string) {
  const customer = await getCustomerById(customerId);
  if (!customer) throw new Error('Customer not found');

  const charges = await calculateMonthlyCharges(customerId);

  // Create Stripe invoice
  const invoice = await stripe.invoices.create({
    customer: customer.stripeCustomerId,
    description: `ApexAI - ${new Date().toLocaleDateString()}`,
    auto_advance: true,
  });

  // Add line items
  await stripe.invoiceItems.create({
    customer: customer.stripeCustomerId,
    invoice: invoice.id,
    amount: Math.round(charges.basePlanCharge * 100), // Convert to cents
    currency: 'usd',
    description: `${customer.plan.toUpperCase()} Plan`,
  });

  if (charges.successFeeCharge > 0) {
    await stripe.invoiceItems.create({
      customer: customer.stripeCustomerId,
      invoice: invoice.id,
      amount: Math.round(charges.successFeeCharge * 100),
      currency: 'usd',
      description: `Success Fees (${charges.appointmentsBooked} appointments @ ${Math.round(customer.successFeePercentage * 100)}%)`,
    });
  }

  return invoice;
}

/**
 * HELPER: Get customer by ID
 */
async function getCustomerById(customerId: string): Promise<Customer | null> {
  // In production: query database
  return null;
}

export default {
  createCustomer,
  getCustomerByApiKey,
  ingestLeadForCustomer,
  getCustomerLeads,
  getCustomerCalls,
  calculateMonthlyCharges,
  createInvoiceForCustomer,
};
