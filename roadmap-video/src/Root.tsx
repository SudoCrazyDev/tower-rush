import { Composition, Still } from "remotion";
import { Roadmap, TOTAL } from "./Roadmap";
import { Architecture, A_TOTAL } from "./Architecture";
import { CAST } from "./promo/cast";
import { KeyArt, Square, Story, Teaser, TEASER_LEN, TeaserStory, UnitPost } from "./promo/SupportingCast";

export const RemotionRoot = () => (
  <>
    <Composition id="Roadmap" component={Roadmap} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="Architecture" component={Architecture} durationInFrames={A_TOTAL} fps={30} width={1920} height={1080} />
    <Still id="sc-keyart" component={KeyArt} width={1920} height={1080} />
    <Still id="sc-square" component={Square} width={1080} height={1080} />
    <Still id="sc-story" component={Story} width={1080} height={1920} />
    <Still id="sc-teaser-story" component={TeaserStory} width={1080} height={1920} />
    {CAST.map((u) => (
      <Still key={u.id} id={`sc-card-${u.id.replace(/_/g, "-")}`} component={UnitPost} defaultProps={{ id: u.id }} width={1080} height={1350} />
    ))}
    <Composition id="sc-teaser" component={Teaser} durationInFrames={TEASER_LEN} fps={30} width={1080} height={1920} />
  </>
);
