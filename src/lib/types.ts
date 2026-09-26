// StockSense Core Domain Types

export type OperationType = "RECEIPT" | "DELIVERY" | "INTERNAL" | "ADJUSTMENT";
export type OperationStatus = "DRAFT" | "WAITING" | "READY" | "DONE" | "CANCELED";
export type MoveType = "IN" | "OUT" | "INTERNAL" | "ADJUSTMENT";

export interface StockSummaryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  uom: string;
  perUnitCost: number;
  onHand: number;
  reserved: number;
  freeToUse: number;
  minStock: number;
  isLowStock: boolean;
}

export interface DashboardKPIs {
  totalProducts: number;
  lowStockItems: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  scheduledTransfers: number;
  totalInventoryValue: number;
}
