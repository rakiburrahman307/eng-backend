import express from 'express';
import { UserRoutes } from '../modules/user/user.routes';
import { AuthRoutes } from '../modules/auth/auth.routes';
import AboutRoutes from '../modules/rule/rule.route';
import PrivacyPolicyRoutes from '../modules/rule/rule.route';
import TermsAndConditionRoutes from '../modules/rule/rule.route';
import NewsRoutes from '../modules/news/news.route';
import EventRoutes from '../modules/event/event.route';
import TeamRoutes from '../modules/team/team.route';
import MatchRoutes from '../modules/match/match.route';
import MatchResultRoute from '../modules/matchResult/matchResult.route';
import PointTableRoute from '../modules/poientTable/poientTable.route';
import PlayerStatsRoutes from '../modules/playerStats/playerStats.route';
import VideoRoutes from '../modules/video/video.route';
import LeagueRoute from '../modules/league/league.route'
import LeagueTeamRoute from '../modules/leagueTeam/leagueTeam.route'
import RewardProductsRoute from '../modules/rewardProduct/rewardProduct.route'
import RewardOrderRoute from '../modules/rewardOrder/rewardOrder.route'

const router = express.Router();

const apiRoutes = [
    { path: "/user", route: UserRoutes },
    { path: "/auth", route: AuthRoutes },
    { path: "/about", route: AboutRoutes },
    { path: "/", route: PrivacyPolicyRoutes },
    { path: "/", route: TermsAndConditionRoutes },
    { path: "/news", route: NewsRoutes },
    { path: "/event", route: EventRoutes },
    { path: "/team", route: TeamRoutes },
    { path: "/match", route: MatchRoutes },
    { path: "/match-result", route: MatchResultRoute },
    { path: "/point-table", route: PointTableRoute },
    { path: "/player-stats", route: PlayerStatsRoutes },
    { path: "/video", route: VideoRoutes },
    { path: "/league", route: LeagueRoute },
    { path: "/league-team", route: LeagueTeamRoute },
    { path: "/reward-products", route: RewardProductsRoute }
]

apiRoutes.forEach(route => router.use(route.path, route.route));
export default router;