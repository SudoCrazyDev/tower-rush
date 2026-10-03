import { Composition } from "remotion";
import { Roadmap, TOTAL } from "./Roadmap";

export const RemotionRoot = () => (
  <Composition id="Roadmap" component={Roadmap} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
);
