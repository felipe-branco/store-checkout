/**
 * Vertical Slices Package
 *
 * Each slice should be self-contained and focused on a specific domain.
 * Slice structure:
 * - {slice-name}/
 *   - CommandHandler.ts
 *   - CommandHandler.test.ts
 *   - events.ts (event definitions)
 *   - projections.ts (read models/projections)
 *   - types.ts (domain types)
 *   - ui/ (UI components if needed)
 *   - routes.ts (API routes if needed)
 */

export { default as CartDetails } from "./CartDetails/ui/CartDetails";
export { default as CreateCart } from "./CreateCart/ui/CreateCart";
export { default as OrderFinishedDetails } from "./OrderFinishedDetails/ui/OrderFinishedDetails";
export type { OrderFinishedDetailsViewProps } from "./OrderFinishedDetails/ui/OrderFinishedDetails";
export { default as PaymentFailedOrder } from "./PaymentFailedOrder/ui/PaymentFailedOrder";
export type { PaymentFailedOrderViewProps } from "./PaymentFailedOrder/ui/PaymentFailedOrder";
