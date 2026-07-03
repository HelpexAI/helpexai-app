import { ProductLandingPage } from "@/components/marketing/product-landing-page";
import { createPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";

export const metadata = createPageMetadata(PUBLIC_PAGE_SEO.home);

export default function HomePage() {
  return <ProductLandingPage category="business" />;
}
