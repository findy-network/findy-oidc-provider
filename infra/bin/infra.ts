#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { InfraStack } from "../lib/infra-stack";

const getEnv = (varName: string) => process.env[varName] || "";

const app = new cdk.App();
new InfraStack(app, "FindyOIDCProviderInfraStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  subDomain: getEnv("FINDY_OIDC_SUB_DOMAIN"),
  rootDomain: getEnv("FINDY_OIDC_ROOT_DOMAIN"),
  agencyAuthUrl: getEnv("FINDY_OIDC_AGENCY_AUTH_URL"),
  agencyAuthOrigin: getEnv("FINDY_OIDC_AGENCY_AUTH_ORIGIN"),
  agencyAuthUser: getEnv("FINDY_OIDC_AGENCY_AUTH_USER"),
  agencyAuthKey: getEnv("FINDY_OIDC_AGENCY_AUTH_KEY"),
  agencyUrl: getEnv("FINDY_OIDC_AGENCY_URL"),
  credDefId: getEnv("FINDY_OIDC_CRED_DEF_ID"),
});
