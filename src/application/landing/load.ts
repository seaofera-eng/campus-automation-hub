import 'server-only';
import type { AutomationDemand } from '@/domain/demand/types';
import type { Profile } from '@/domain/identity/types';
import type { Notice } from '@/domain/notice/types';
import { LANDING_NOTICE_LIMIT, sortNotices } from '@/domain/notice/types';
import { sumBalance } from '@/domain/reward/types';
import { MAX_PAGE_SIZE } from '@/domain/shared/pagination';
import type { ToolListItem } from '@/domain/tool/types';
import { requireUser } from '@/lib/auth/current-user';
import { getRepositories } from '@/lib/di/container';
import { toListItems } from '../tools/query';

/**
 * 첫 화면 (리뷰 1절·13절).
 *
 * "첫화면을 [대시보드]가 아니라 랜딩페이지가 따로 존재했으면 좋겠음. …
 *  [추천도구], [인기도구] 등 '도구 파트'와 [최신 수요 요청], [인기 수요] 등
 *  '수요 파트'가 노출되어 있어 접근성을 높이고, 쉽게 도구를 사용해보고
 *  수요를 작성해볼 수 있도록 하는 기능을 갖음."
 *
 * 지표를 늘어놓는 대신 **지금 바로 눌러 볼 것**을 보여준다.
 *
 * "추천"은 AI 가 뽑은 것이 아니다. 내 신분에 맞다고 **등록자가 표시해 둔** 도구다.
 * 유사도 점수 같은 값을 만들지 않는다 — 그건 2단계 몫이다.
 */

const SECTION_SIZE = 4;

export interface LandingData {
  profile: Profile;
  notices: Notice[];
  /** 내 신분에 맞다고 표시된 도구 */
  recommendedTools: ToolListItem[];
  /** 실제로 많이 열어 본 도구 */
  popularTools: ToolListItem[];
  /** 방금 올라온 수요 */
  latestDemands: AutomationDemand[];
  /** 참여자가 많은 수요 */
  activeDemands: { demand: AutomationDemand; participantCount: number }[];
  /** 내 토큰 잔액 */
  tokenBalance: number;
  /** 첫 방문인지 — 가이드를 펼쳐 둘지 정한다 */
  isNewcomer: boolean;
}

export async function loadLanding(): Promise<LandingData> {
  const profile = await requireUser();
  const repositories = getRepositories();

  const [toolPage, demandPage, notices, rewards] = await Promise.all([
    repositories.tools.listTools(
      { campusId: profile.campusId, statuses: ['PILOT', 'APPROVED'] },
      'RECENT',
      { page: 1, pageSize: MAX_PAGE_SIZE },
    ),
    repositories.demands.listDemands(
      { campusId: profile.campusId, statuses: ['OPEN', 'MATCHED', 'IN_DEVELOPMENT'] },
      { page: 1, pageSize: MAX_PAGE_SIZE },
    ),
    repositories.notices.list(profile.campusId, false),
    repositories.rewards.listByUser(profile.id),
  ]);

  const items = await toListItems(toolPage.items);

  // 내 신분에 맞다고 표시된 것 우선. 아무것도 표시하지 않은 도구는 "누구나"라
  // 뒤에 붙인다. 맞는 것이 없으면 최근 것으로 채운다.
  const forMe = items.filter((item) => item.tool.recommendedFor.includes(profile.memberType));
  const forAnyone = items.filter((item) => item.tool.recommendedFor.length === 0);
  const recommendedTools = [...forMe, ...forAnyone].slice(0, SECTION_SIZE);

  const popularTools = [...items]
    .filter((item) => item.launchCount > 0)
    .sort((a, b) => b.launchCount - a.launchCount)
    .slice(0, SECTION_SIZE);

  const latestDemands = [...demandPage.items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, SECTION_SIZE);

  const withCounts = await Promise.all(
    demandPage.items.map(async (demand) => ({
      demand,
      participantCount: (await repositories.demands.listParticipants(demand.id)).length,
    })),
  );
  const activeDemands = withCounts
    .filter((entry) => entry.participantCount > 0)
    .sort((a, b) => b.participantCount - a.participantCount)
    .slice(0, SECTION_SIZE);

  // 도구도 수요도 올린 적이 없으면 처음 온 사람으로 본다.
  const isNewcomer =
    !items.some((item) => item.tool.ownerUserId === profile.id) &&
    !demandPage.items.some((demand) => demand.requesterUserId === profile.id);

  return {
    profile,
    notices: sortNotices(notices).slice(0, LANDING_NOTICE_LIMIT),
    recommendedTools,
    popularTools,
    latestDemands,
    activeDemands,
    tokenBalance: sumBalance(rewards).total,
    isNewcomer,
  };
}
