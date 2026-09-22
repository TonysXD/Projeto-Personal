import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import Problems from "@/components/Problems";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import LeadForm from "@/components/LeadForm";
import Footer from "@/components/Footer";
import NextClassCard from '@/components/NextClassCard';

export default function Home() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <Hero />
        <NextClassCard />
        <SocialProof />
        <Problems />
        <HowItWorks />
        <Testimonials />
        <FAQ />
        <LeadForm />
        <Footer />
      </main>
    </>
  );
}