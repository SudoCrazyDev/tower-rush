import { Composition, Still } from "remotion";
import { Roadmap, TOTAL } from "./Roadmap";
import { Architecture, A_TOTAL } from "./Architecture";
import { Releases, R_TOTAL } from "./Releases";
import { CAST } from "./promo/cast";
import { KeyArt, Square, Story, Teaser, TEASER_LEN, TeaserStory, UnitPost } from "./promo/SupportingCast";
import { StBanner, StInfoBestiary, StInfoDeck, StInfoKnights, StInfoMuse, StInfoPath, StKeyArt, StSquare, StStory, StTeaserStory } from "./promo/Stories";
import { CommandMode, CM_LEN } from "./promo/CommandMode";
import { CrownChess, CC_LEN } from "./promo/CrownChess";
import { Nemesis, NM_LEN } from "./promo/Nemesis";
import { RbBanner, RbIcon, RbKeyArt, RbReveal, RbSquare, RbStory, REVEAL_LEN } from "./promo/Rebrand";

export const RemotionRoot = () => (
  <>
    <Composition id="Roadmap" component={Roadmap} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="Architecture" component={Architecture} durationInFrames={A_TOTAL} fps={30} width={1920} height={1080} />
    {/* Release timeline (docs/features/ROADMAP.md) */}
    <Composition id="Releases" component={Releases} durationInFrames={R_TOTAL} fps={30} width={1920} height={1080} />
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
    {/* v1.3 Branding Revamp promo kit (docs/features/v1.3-branding-revamp/PROMO.md) */}
    <Still id="rb-keyart" component={RbKeyArt} width={1920} height={1080} />
    <Still id="rb-square" component={RbSquare} width={1080} height={1080} />
    <Still id="rb-story" component={RbStory} width={1080} height={1920} />
    <Still id="rb-banner" component={RbBanner} width={1500} height={500} />
    <Still id="rb-icon" component={RbIcon} width={1024} height={1024} />
    <Composition id="rb-reveal" component={RbReveal} durationInFrames={REVEAL_LEN} fps={30} width={1080} height={1920} />
    {/* Fantasy concept: Command Mode (docs/features/concepts/command-mode.md) */}
    <Composition id="cm-pitch" component={CommandMode} durationInFrames={CM_LEN} fps={30} width={1080} height={1920} />
    {/* Fantasy concept: Crown Chess (docs/features/concepts/crown-chess.md) */}
    <Composition id="cc-pitch" component={CrownChess} durationInFrames={CC_LEN} fps={30} width={1080} height={1920} />
    {/* Retention pitch: The Nemesis War (docs/features/concepts/nemesis-war.md) */}
    <Composition id="nm-pitch" component={Nemesis} durationInFrames={NM_LEN} fps={30} width={1080} height={1920} />
  </>
);
