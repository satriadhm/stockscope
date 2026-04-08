import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock_key_for_dev", {
  apiVersion: "2022-11-15", // closest version for types
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, tierId } = body;

    if (!userId || !tierId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Determine price dynamically based on tierId
    let priceId = tierId; 
    // In actual implementation, we might have mapping: 
    // tier: 'premium_month' -> price_IDR_15k
    // tier: 'premium_year' -> price_IDR_50k

    // Mock session creation
    if (process.env.NODE_ENV !== "production" && priceId.startsWith("mock")) {
      return NextResponse.json({ sessionId: `sess_mock_${Date.now()}` });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      client_reference_id: userId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error("Stripe Checkout Session Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
