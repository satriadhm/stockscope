import { Metadata } from 'next';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: 'Pricing | Stockscope',
  description: 'Choose the perfect plan for your investment research needs',
};

export default function PricingPage() {
  return <PricingClient />;
}
