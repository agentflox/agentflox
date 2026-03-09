import { ContentSection } from '../../components/ContentSection';
import { DashboardContentSection } from '../../types';

interface MainContentProps {
  sections: DashboardContentSection[];
}

export default function MainContent({ sections }: MainContentProps) {
  return (
    <div className="space-y-8">
      {sections.map((section, index) => (
        <ContentSection key={section.id || index} {...section} />
      ))}
    </div>
  );
}
