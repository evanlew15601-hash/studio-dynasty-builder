// Update this page (the content is just a fallback if you fail to update the page)

import { StudioMagnateGame } from '@/components/game/StudioMagnateGame';
import { LoadingProvider } from '@/contexts/LoadingContext';

const Index = () => {
  return (
    <LoadingProvider>
      <StudioMagnateGame />
    </LoadingProvider>
  );
};

export default Index;
