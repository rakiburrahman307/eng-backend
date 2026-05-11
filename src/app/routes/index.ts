import express from 'express';
import { UserRoutes } from '../modules/user/user.routes';
import { AuthRoutes } from '../modules/auth/auth.routes';
import AboutRoutes from '../modules/rule/rule.route';
import PrivacyPolicyRoutes from '../modules/rule/rule.route';
import TermsAndConditionRoutes from '../modules/rule/rule.route';
import NewsRoutes from '../modules/news/news.route';
import EventRoutes from '../modules/event/event.route';
import TeamRoutes from '../modules/team/team.route';


const router = express.Router();

const apiRoutes = [
    { path: "/user", route: UserRoutes },
    { path: "/auth", route: AuthRoutes },
    { path: "/about", route: AboutRoutes },
    { path: "/", route: PrivacyPolicyRoutes },
    { path: "/", route: TermsAndConditionRoutes },
    { path: "/news", route: NewsRoutes },
    { path: "/event", route: EventRoutes },
    { path: "/team", route: TeamRoutes }
]

apiRoutes.forEach(route => router.use(route.path, route.route));
export default router;