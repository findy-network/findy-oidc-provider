/* eslint-disable no-console */

const path = require("path");
const url = require("url");

const express = require("express"); // eslint-disable-line import/no-unresolved
const helmet = require("helmet");

const { Provider } = require("oidc-provider");

const Account = require("./support/account");
const configuration = require("./support/configuration");
const routes = require("./routes/express");

const {
  PORT = 3005,
  ISSUER = process.env.FINDY_OIDC_OUR_HOST || `http://localhost:${PORT}`,
} = process.env;
configuration.findAccount = Account.findAccount;

const app = express();

const directives = helmet.contentSecurityPolicy.getDefaultDirectives();
delete directives["form-action"];
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives,
    },
  })
);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use("/js", express.static(path.join(__dirname, "js")));

let adapter;
// TODO: use a proper adapter
// if (process.env.MONGODB_URI) {
//     adapter = require('./adapters/mongodb'); // eslint-disable-line global-require
//     await adapter.connect();
// }

const prod = process.env.NODE_ENV === "production";

const provider = new Provider(ISSUER, { adapter, ...configuration });

if (prod) {
  app.enable("trust proxy");
  provider.proxy = true;

  app.use((req, res, next) => {
    if (req.secure) {
      next();
    } else if (req.method === "GET" || req.method === "HEAD") {
      res.redirect(
        url.format({
          protocol: "https",
          host: req.get("host"),
          pathname: req.originalUrl,
        })
      );
    } else {
      res.status(400).json({
        error: "invalid_request",
        error_description: "do yourself a favor and only use https",
      });
    }
  });
}

routes(app, provider);
app.use(provider.callback());

module.exports = app;
