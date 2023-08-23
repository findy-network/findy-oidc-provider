#!/bin/bash

# Stores parameters needed for pipeline to run successfully

if [ -z "$GITHUB_CONNECTION_ARN" ]; then
  echo "ERROR: Define env variable GITHUB_CONNECTION_ARN"
  exit 1
fi

# TODO: (now hardcoded as FINDY_OIDC_OUR_HOST)
# if [ -z "$DOMAIN_NAME" ]; then
#   echo "ERROR: Define env variable DOMAIN_NAME"
#   exit 1
# fi

# if [ -z "$SUB_DOMAIN_NAME" ]; then
#   echo "ERROR: Define env variable SUB_DOMAIN_NAME"
#   exit 1
# fi

if [ -z "$FINDY_OIDC_AGENCY_AUTH_USER" ]; then
  echo "ERROR: Define env variable FINDY_OIDC_AGENCY_AUTH_USER"
  exit 1
fi

if [ -z "$FINDY_OIDC_AGENCY_AUTH_KEY" ]; then
  echo "ERROR: Define env variable FINDY_OIDC_AGENCY_AUTH_KEY"
  exit 1
fi

if [ -z "$FINDY_OIDC_AGENCY_AUTH_URL" ]; then
  echo "ERROR: Define env variable FINDY_OIDC_AGENCY_AUTH_URL"
  exit 1
fi

if [ -z "$FINDY_OIDC_AGENCY_AUTH_ORIGIN" ]; then
  echo "ERROR: Define env variable FINDY_OIDC_AGENCY_AUTH_ORIGIN"
  exit 1
fi

if [ -z "$FINDY_OIDC_AGENCY_URL" ]; then
  echo "ERROR: Define env variable FINDY_OIDC_AGENCY_URL"
  exit 1
fi

if [ -z "$FINDY_OIDC_CRED_DEF_ID" ]; then
  echo "ERROR: Define env variable FINDY_OIDC_CRED_DEF_ID"
  exit 1
fi

if [ -z "$FINDY_OIDC_CLIENTS_JSON" ]; then
  echo "ERROR: Define env variable FINDY_OIDC_CLIENTS_JSON"
  exit 1
fi

aws ssm put-parameter --name "/findy-oidc-provider/github-connection-arn" --value "$GITHUB_CONNECTION_ARN" --type String
aws ssm put-parameter --name "/findy-oidc-provider/domain-name" --value "$DOMAIN_NAME" --type String
aws ssm put-parameter --name "/findy-oidc-provider/sub-domain-name" --value "$SUB_DOMAIN_NAME" --type String
aws ssm put-parameter --name "/findy-oidc-provider/findy-oidc-agency-auth-user" --value "$FINDY_OIDC_AGENCY_AUTH_USER" --type String
aws ssm put-parameter --name "/findy-oidc-provider/findy-oidc-agency-auth-key" --value "$FINDY_OIDC_AGENCY_AUTH_KEY" --type String
aws ssm put-parameter --name "/findy-oidc-provider/findy-oidc-agency-auth-url" --value "$FINDY_OIDC_AGENCY_AUTH_URL" --type String
aws ssm put-parameter --name "/findy-oidc-provider/findy-oidc-agency-auth-origin" --value "$FINDY_OIDC_AGENCY_AUTH_ORIGIN" --type String
aws ssm put-parameter --name "/findy-oidc-provider/findy-oidc-agency-url" --value "$FINDY_OIDC_AGENCY_URL" --type String
aws ssm put-parameter --name "/findy-oidc-provider/findy-oidc-cred-def-id" --value "$FINDY_OIDC_CRED_DEF_ID" --type String
aws ssm put-parameter --name "/findy-oidc-provider/findy-oidc-clients-json" --value "$FINDY_OIDC_CLIENTS_JSON" --type String