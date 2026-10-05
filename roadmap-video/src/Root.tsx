import { Composition, Still } from "remotion";
import { Roadmap, TOTAL } from "./Roadmap";
import { Architecture, A_TOTAL } from "./Architecture";
import { CAST } from "./promo/cast";
import { KeyArt, Square, Story, Teaser, TEASER_LEN, TeaserStory, UnitPost } from "./promo/SupportingCast";
import { StBanner, StInfoBestiary, StInfoDeck, StInfoKnights, StInfoMuse, StInfoPath, StKeyArt, StSquare, StStory, StTeaserStory } from "./promo/Stories";

export const RemotionRoot = () => (
  <>
    <Composition id="Roadmap" component={Roadmap} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="Architecture" component={Architecture} durationInFrames={A_TOTAL} fps={30} width={1920} height={1080} />
    {/* v1.1 Supporting Cast Arrival promo kit (docs/features/v1.1-supporting-cast-arrival/PROMO.md) */}
    <Still id="sc-keyart" component={KeyArt} width={1920} height={1080} />
    <Still id="sc-square" component={Square} width={1080} height={1080} />
    <Still id="sc-story" component={Story} width={1080} height={1920} />
    <Still id="sc-teaser-story" component={TeaserStory} width={1080} height={1920} />
    {CAST.map((u) => (
      <Still key={u.id} id={`sc-card-${u.id.replace(/_/g, "-")}`} component={UnitPost} defaultProps={{ id: u.id }} width={1080} height={1350} />
    ))}
    <Composition id="sc-teaser" component={Teaser} durationInFrames={TEASER_LEN} fps={30} width={1080} height={1920} />
    {/* v1.2 Stories promo kit (docs/features/v1.2-stories/PROMO.md) */}
    <Still id="st-keyart" component={StKeyArt} width={1920} height={1080} />
    <Still id="st-square" component={StSquare} width={1080} height={1080} />
    <Still id="st-story" component={StStory} width={1080} height={1920} />
    <Still id="st-teaser-story" component={StTeaserStory} width={1080} height={1920} />
    <Still id="st-banner" component={StBanner} width={1500} height={500} />
    <Still id="st-info-path" component={StInfoPath} width={1080} height={1350} />
    <Still id="st-info-muse" component={StInfoMuse} width={1080} height={1350} />
    <Still id="st-info-deck" component={StInfoDeck} width={1080} height={1350} />
    <Still id="st-info-knights" component={StInfoKnights} width={1080} height={1350} />
    <Still id="st-info-bestiary" component={StInfoBestiary} width={1080} height={1350} />
  </>
);
