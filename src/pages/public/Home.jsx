import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import PageTransition from '../../components/common/PageTransition.jsx';
import FadeIn from '../../components/common/FadeIn.jsx';
import HeroSection from '../../components/home/HeroSection.jsx';
import SearchSection from '../../components/home/SearchSection.jsx';
import FeaturedDoctorsSection from '../../components/home/FeaturedDoctorsSection.jsx';
import SpecialtiesSection from '../../components/home/SpecialtiesSection.jsx';
import PopularTestsSection from '../../components/home/PopularTestsSection.jsx';
import PackagesSection from '../../components/home/PackagesSection.jsx';
import HomeCollectionSection from '../../components/home/HomeCollectionSection.jsx';
import HowItWorksSection from '../../components/home/HowItWorksSection.jsx';
import TestimonialsSection from '../../components/home/TestimonialsSection.jsx';
import FaqSection from '../../components/home/FaqSection.jsx';
import ContactCtaSection from '../../components/home/ContactCtaSection.jsx';

/** LabEasy landing page — hero, search and all marketing sections. */
export default function Home() {
  useDocumentTitle('Home');

  return (
    <PageTransition>
      {/* hero with the search card overlapping its bottom edge */}
      <HeroSection />
      <FadeIn>
        <SearchSection />
      </FadeIn>

      <section className="section-padding bg-white">
        <FadeIn>
          <FeaturedDoctorsSection />
        </FadeIn>
      </section>

      <section className="section-padding bg-gray-50">
        <FadeIn>
          <SpecialtiesSection />
        </FadeIn>
      </section>

      <section className="section-padding bg-white">
        <FadeIn>
          <PopularTestsSection />
        </FadeIn>
      </section>

      <section className="section-padding bg-gray-50">
        <FadeIn>
          <PackagesSection />
        </FadeIn>
      </section>

      <section className="section-padding bg-white">
        <FadeIn>
          <HomeCollectionSection />
        </FadeIn>
      </section>

      <section className="section-padding bg-gray-50">
        <FadeIn>
          <HowItWorksSection />
        </FadeIn>
      </section>

      {/* Testimonials render only when there are testimonials in the database */}
      <TestimonialsSection />

      <section className="section-padding bg-gray-50">
        <FadeIn>
          <FaqSection />
        </FadeIn>
      </section>

      <FadeIn>
        <ContactCtaSection />
      </FadeIn>
    </PageTransition>
  );
}
