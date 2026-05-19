import { digestFetch, ATLAS_API } from "./atlas-api";

export interface BillingInfo {
  pendingAmountCents: number;
  pendingStartDate: string;
  lastInvoiceTotalCents?: number;
  lastInvoiceEndDate?: string;
}

interface AtlasLineItem {
  totalPriceCents?: number;
}

interface AtlasInvoice {
  subtotalCents?: number;
  lineItems?: AtlasLineItem[];
  startDate?: string;
  endDate?: string;
  statusName?: string;
}

interface AtlasInvoicesListResponse {
  results?: AtlasInvoice[];
}

function toCents(invoice: AtlasInvoice): number {
  // Flex tier pending invoices have subtotalCents: 0; actual charges are in lineItems.
  if (invoice.subtotalCents) return invoice.subtotalCents;
  return (invoice.lineItems ?? []).reduce((sum, item) => sum + (item.totalPriceCents ?? 0), 0);
}

export async function fetchAtlasBilling(): Promise<BillingInfo | null> {
  const publicKey = process.env.ATLAS_PUBLIC_KEY;
  const privateKey = process.env.ATLAS_PRIVATE_KEY;
  const orgId = process.env.ATLAS_ORG_ID;
  if (!publicKey || !privateKey || !orgId) return null;

  try {
    const [pendingRes, listRes] = await Promise.all([
      digestFetch(`${ATLAS_API}/orgs/${orgId}/invoices/pending`, publicKey, privateKey),
      digestFetch(`${ATLAS_API}/orgs/${orgId}/invoices?pageNum=1&itemsPerPage=5`, publicKey, privateKey),
    ]);

    if (!pendingRes.ok) {
      console.error("[atlas-billing] pending invoice error", pendingRes.status, await pendingRes.text());
      return null;
    }

    const pending = (await pendingRes.json()) as AtlasInvoice;
    const pendingAmountCents = toCents(pending);
    const pendingStartDate = pending.startDate ?? "";
    console.log(`[atlas-billing] MTD: ${pendingAmountCents} cents (from ${pendingStartDate})`);

    let lastInvoiceTotalCents: number | undefined;
    let lastInvoiceEndDate: string | undefined;

    if (listRes.ok) {
      const listData = (await listRes.json()) as AtlasInvoicesListResponse;
      const lastInvoice = listData.results?.find((inv) => inv.statusName !== "PENDING");
      if (lastInvoice) {
        lastInvoiceTotalCents = toCents(lastInvoice);
        lastInvoiceEndDate = lastInvoice.endDate;
        console.log(`[atlas-billing] last invoice: ${lastInvoiceTotalCents} cents (ended ${lastInvoiceEndDate})`);
      }
    } else {
      console.error("[atlas-billing] invoices list error", listRes.status);
    }

    return { pendingAmountCents, pendingStartDate, lastInvoiceTotalCents, lastInvoiceEndDate };
  } catch (err) {
    console.error("[atlas-billing] fetch failed", err);
    return null;
  }
}
