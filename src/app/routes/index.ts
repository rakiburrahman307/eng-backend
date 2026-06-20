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
import TransferRoute from '../modules/transfer/transfer.route'
import ManagerAssignRoute from "../modules/managerTeam/managerTeam.route"
import TeamDashboard from "../modules/teamDashboard/teamDashboard.route"
import PlayerDashboard from "../modules/playerDashboard/playerDashboard.route"
import playerRoute from "../modules/playermanagement/player.route"
import playerSelectionRoute from "../modules/matchPlayerSelection/matchPlayerSelection.route"
import UserManagementRoute from "../modules/userManagement/userManagement.route"
import NotificationRoute from "../modules/notification/notification.routes"
import PackageRoute from "../modules/package/package.routes"
import OverviewRoute from "../modules/overview/overview.route"
import PushNotificationRoute from "../modules/pushNotification/pushNotification.route"
import StatisticRoute from "../modules/statistic/statistic.route"
import RefereeRatingRoute from "../modules/refereeRating/refereeRating.route"
const router = express.Router();

const apiRoutes = [
    { path: "/user", route: UserRoutes },
    { path: "/user-management", route: UserManagementRoute },
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
    { path: "/reward-products", route: RewardProductsRoute },
    { path: "/reward-order", route: RewardOrderRoute },
    { path: "/transfers", route: TransferRoute },
    { path: "/manager-team", route: ManagerAssignRoute},
    { path: "/team-dashboard", route: TeamDashboard},
    { path: "/player-dashboard", route: PlayerDashboard},
    { path: "/player", route: playerRoute },
    { path: "/player-selection", route: playerSelectionRoute },
    { path: "/notification", route: NotificationRoute},
    { path: "/package", route: PackageRoute},
    { path: "/overview", route: OverviewRoute },
    { path: "/push-notification", route: PushNotificationRoute },
    { path: "/statistic", route: StatisticRoute },
    { path: "/referee", route: RefereeRatingRoute },
]

apiRoutes.forEach(route => router.use(route.path, route.route));
export default router;