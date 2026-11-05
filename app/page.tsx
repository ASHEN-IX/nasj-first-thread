import { HeroExperience } from "@/components/HeroExperience";
import { SiteHeader } from "@/components/SiteHeader";
import { PlatformSection, ProgramSection, JourneySection, CommunitySection, JoinSection, FaqSection } from "@/components/Sections";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return <><SiteHeader/><main><HeroExperience/><PlatformSection/><ProgramSection/><JourneySection/><CommunitySection/><JoinSection/><FaqSection/></main><Footer/></>;
}
