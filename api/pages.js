/**
 * |-| [- |_ | /\ ( ~|~ `/ |_
 *
 * Helium 1.0.0 ― Cascade Ridge
 *
 * This is for the frontend pages and routes.
 * @module pages
*/

const indexjs = require("../app.js");
const ejs = require("ejs");
const express = require("express");
const settings = require("../settings.json");
const fetch = require("node-fetch");
const arciotext = require("../misc/afk");

module.exports.load = async function (app, db) {
  app.all("/", async (req, res) => {
    try {
      // Session validation is now handled globally in app.js, no need to duplicate here
      
      let theme = indexjs.get(req);
      if (
        theme.settings.mustbeloggedin.includes(req._parsedUrl.pathname) &&
        (!req.session.userinfo || !req.session.pterodactyl)
      ) {
        return res.redirect("/login");
      }

      if (theme.settings.mustbeadmin.includes(req._parsedUrl.pathname)) {
        let str = await renderTemplate(
          theme,
          indexjs.renderdataeval,
          req,
          res,
          db
        );
        res.send(str);
        return;
      }

      let str = await renderTemplate(
        theme,
        indexjs.renderdataeval,
        req,
        res,
        db
      );
      res.send(str);
    } catch (err) {
      console.log(err);
      res.render("500.ejs", { err });
    }
  });

  app.use("/assets", express.static("./assets"));

  // API endpoint to check if user needs to refresh their session
  app.get("/api/session-refresh-check", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.json({ needsRefresh: false });
    }

    try {
      const notification = await db.get(`session-refresh-${req.session.userinfo.id}`);
      
      if (notification) {
        return res.json({
          needsRefresh: true,
          notification: notification
        });
      }
      
      return res.json({ needsRefresh: false });
    } catch (error) {
      console.error('Error checking session refresh:', error);
      return res.json({ needsRefresh: false });
    }
  });

  // API endpoint to clear session refresh notification
  app.post("/api/session-refresh-clear", async (req, res) => {
    if (!req.session.userinfo || !req.session.userinfo.id) {
      return res.json({ success: false });
    }

    try {
      await db.delete(`session-refresh-${req.session.userinfo.id}`);
      return res.json({ success: true });
    } catch (error) {
      console.error('Error clearing session refresh:', error);
      return res.json({ success: false });
    }
  });
};

async function renderTemplate(theme, renderdataeval, req, res, db) {
  return new Promise(async (resolve, reject) => {
    ejs.renderFile(
      `./views/${theme.settings.index}`,
      await eval(renderdataeval),
      null,
      async function (err, str) {
        if (err) {
          reject(err);
          return;
        }

        delete req.session.newaccount;
        resolve(str);
      }
    );
  });
}
