const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      passReqToCallback: true,
    },

    async (request, accessToken, refreshToken, profile, done) => {
      try {
        let exist = await User.findOne({ email: profile["emails"][0].value });

        if (!exist) {
          const newUser = await User.create({
            email: profile.emails[0].value,
            firstName: profile.name?.givenName || profile.displayName,
            lastName: profile.name?.familyName || "",
            image: profile.photos?.[0]?.value || "",
            googleId: profile.id,
          });
          return done(null, newUser);
        } else {
          return done(null, exist);
        }
      } catch (error) {
        console.error("Error in Google Strategy:", error);
        return done(error, null);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
