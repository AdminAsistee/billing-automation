import { InvoiceRecord, UrgencyTier, UrgencySummary } from '../types/invoice';

/**
 * Computes urgency tier based on status and deadline_due date relative to reference date (today).
 * Rule: Payments made when at least a week has passed (>= 7 days ago) are classified as Archived (GREY).
 */
export function calculateUrgency(invoice: InvoiceRecord, referenceDateStr?: string): {
  tier: UrgencyTier;
  daysRemaining: number;
  badgeLabel: string;
} {
  const status = invoice.status;
  const today = referenceDateStr ? new Date(referenceDateStr) : new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(invoice.deadline_due);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Archived rule: Paid status where payment/deadline was at least a week ago (>= 7 days ago, daysRemaining <= -7)
  if (status === 'Paid') {
    if (daysRemaining <= -7) {
      return { tier: 'GREY', daysRemaining, badgeLabel: 'Archived' };
    }
    return { tier: 'GREEN', daysRemaining, badgeLabel: 'Paid' };
  }

  if (status === 'Archived') {
    return { tier: 'GREY', daysRemaining, badgeLabel: 'Archived' };
  }

  if (daysRemaining <= 0) {
    const label = daysRemaining === 0 ? 'Due Today' : `${Math.abs(daysRemaining)}d Overdue`;
    return { tier: 'RED', daysRemaining, badgeLabel: label };
  } else if (daysRemaining <= 7) {
    return { tier: 'YELLOW', daysRemaining, badgeLabel: `${daysRemaining}d Due` };
  } else {
    return { tier: 'BLUE', daysRemaining, badgeLabel: `${daysRemaining}d Due` };
  }
}

export function computeSummary(invoices: InvoiceRecord[]): UrgencySummary {
  let overdueCount = 0;
  let upcomingCount = 0;
  let lowPriorityCount = 0;
  let paidCount = 0;
  let archivedCount = 0;

  let totalAmountPending = 0;
  let totalAmountPaid = 0;
  let totalAmountAutoDebited = 0;

  invoices.forEach((inv) => {
    const { tier } = calculateUrgency(inv);
    const isAutoDebit = inv.status === 'Auto-Deducted' || inv.status === 'Auto-Debited' || inv.payment_method === 'Auto-Debit';

    if (isAutoDebit) {
      totalAmountAutoDebited += Number(inv.total) || 0;
    } else if (tier === 'GREEN') {
      paidCount++;
      totalAmountPaid += Number(inv.total) || 0;
    } else if (tier === 'GREY') {
      archivedCount++;
      totalAmountPaid += Number(inv.total) || 0;
    } else {
      // Pending
      totalAmountPending += Number(inv.total) || 0;
      if (tier === 'RED') overdueCount++;
      else if (tier === 'YELLOW') upcomingCount++;
      else if (tier === 'BLUE') lowPriorityCount++;
    }
  });

  return {
    overdueCount,
    upcomingCount,
    lowPriorityCount,
    paidCount,
    archivedCount,
    totalAmountPending,
    totalAmountPaid,
    totalAmountAutoDebited,
  };
}

export function formatYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount);
}
