
import express from 'express';
import passport from 'passport';

const router = express.Router();

router.get('/steam',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  });

router.get('/steam/return',
  (req, res, next) => {
    req.url = req.originalUrl;
    next();
  },
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  });

export default router;
