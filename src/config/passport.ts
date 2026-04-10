// import passport from "passport";
// import { Strategy as GoogleStrategy } from "passport-google-oauth20";
// import { Strategy as FacebookStrategy } from "passport-facebook";
// import config from ".";
// import { User } from "../app/modules/user/user.model";

// // Google OAuth Strategy
// passport.use(new GoogleStrategy({
//     clientID: config.social.google_client_id as string,
//     clientSecret: config.social.google_client_secret as string,
//     callbackURL: "https://nadir.binarybards.online/api/v1/auth/google/callback"
// }, async (accessToken, refreshToken, profile, done) => {
//     try {
        
//         console.log(profile)
//         done(null, profile);
//     } catch (error) {
//         done(error, undefined);
//     }
// }));

// // Facebook OAuth Strategy
// passport.use(new FacebookStrategy({
//     clientID: config.social.facebook_client_id as string,
//     clientSecret: config.social.facebook_client_secret as string,
//     callbackURL: "/auth/facebook/callback",
//     profileFields: ['id', 'displayName', 'emails']
// }, async (accessToken, refreshToken, profile, done) => {
//     try {
//         let user = await User.findOne({ appId: profile.id });

//         if (!user) {
//             user = await User.create({
//                 appId: profile.id,
//                 name: profile.displayName,
//                 email: profile.emails?.[0]?.value
//             });
//         }

//         done(null, user);
//     } catch (error) {
//         done(error, null);
//     }
// }));

// // Serialize & Deserialize User
// passport.serializeUser((user: any, done) => {
//     done(null, user.id);
// });

// passport.deserializeUser(async (id, done) => {
//     try {
//         // const user = await User.findById(id);
//         done(null, id as any);
//     } catch (error) {
//         done(error, null);
//     }
// });

// export default passport;