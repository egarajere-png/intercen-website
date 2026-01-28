import { useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from '@/components/layout/Layout';

export default function PaymentConfirmationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");
  const orderNumber = searchParams.get("order_number");
  const reference = searchParams.get("reference");

  return (
    <Layout>
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
        <div className="bg-white dark:bg-card rounded-lg shadow-lg p-8 max-w-md w-full flex flex-col items-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12l2 2l4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2 text-foreground">Payment Successful!</h1>
          <p className="text-center text-muted-foreground mb-6">Thank you for your purchase. Your payment has been confirmed.</p>
          <div className="w-full mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-foreground">Order Number:</span>
              <span className="text-muted-foreground">{orderNumber || "-"}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-foreground">Order ID:</span>
              <span className="text-muted-foreground">{orderId || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">Reference:</span>
              <span className="text-muted-foreground">{reference || "-"}</span>
            </div>
          </div>
          <button
            className="mt-2 px-6 py-2 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition"
            onClick={() => navigate("/books")}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </Layout>
  );
}