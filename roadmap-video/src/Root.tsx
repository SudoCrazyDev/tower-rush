import { Composition } from "remotion";
import { Roadmap, TOTAL } from "./Roadmap";
import { Architecture, A_TOTAL } from "./Architecture";

export const RemotionRoot = () => (
  <>
    <Composition id="Roadmap" component={Roadmap} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="Architecture" component={Architecture} durationInFrames={A_TOTAL} fps={30} width={1920} height={1080} />
  </>
);
