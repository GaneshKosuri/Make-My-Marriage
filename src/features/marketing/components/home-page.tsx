import { Ceremonies } from "./ceremonies";
import { Faq } from "./faq";
import { FamilyTeam } from "./family-team";
import { FeaturesGrid } from "./features-grid";
import { FinalCta } from "./final-cta";
import { Gallery } from "./gallery";
import { GuestExperience } from "./guest-experience";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";
import { Privacy } from "./privacy";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { Transformation } from "./transformation";
import { WeddingWebsite } from "./wedding-website";

/**
 * The public home page (Stitch "Home Screen - Desktop" / "Home Screen - Mobile").
 * Static: no request data, so it is prerendered at build time. Copy lives in
 * ../home-content.ts; "Coming soon" badges follow ../feature-availability.ts.
 */
export function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Transformation />
        <FeaturesGrid />
        <FamilyTeam />
        <Ceremonies />
        <GuestExperience />
        <Gallery />
        <WeddingWebsite />
        <Privacy />
        <HowItWorks />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
