const serverlessExpress = require("@vendia/serverless-express");
const app = require("./app");
process.env["PATH"] =
  process.env["PATH"] +
  ":" +
  `${process.env["LAMBDA_TASK_ROOT"]}/node_modules/.bin`;
exports.handler = serverlessExpress({ app });
