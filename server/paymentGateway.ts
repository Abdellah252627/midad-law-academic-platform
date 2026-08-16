/**
 * Payment gateway boundary for Midad.
 *
 * The current MVP uses manual bank-transfer review because the supplied
 * Simple/CMI account has no public API/Webhook credentials yet. A future CMI
 * adapter should implement this boundary without changing the product UI.
 */
export type PaymentProvider = "manual-transfer" | "cmi";

export type PaymentGatewayStatus = {
  provider: PaymentProvider;
  automated: boolean;
  ready: boolean;
  missing: string[];
};

export function getPaymentGatewayStatus(): PaymentGatewayStatus {
  const provider = (process.env.MIDAD_PAYMENT_PROVIDER ?? "manual-transfer") as PaymentProvider;
  if (provider === "cmi") {
    const missing = ["MIDAD_CMI_MERCHANT_ID", "MIDAD_CMI_API_URL", "MIDAD_CMI_SECRET"].filter(key => !process.env[key]);
    return { provider, automated: missing.length === 0, ready: missing.length === 0, missing };
  }
  return { provider: "manual-transfer", automated: false, ready: true, missing: [] };
}

export function getPaymentInstructions() {
  return {
    amountMad: 19,
    provider: "manual-transfer" as const,
    reviewRequired: true,
    delivery: "signed-link-after-approval" as const,
  };
}
