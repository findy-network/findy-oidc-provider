#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { InfraPipelineStack } from "../lib/pipeline-stack";

const app = new cdk.App();
new InfraPipelineStack(app, "FindyOIDCProviderInfraStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
