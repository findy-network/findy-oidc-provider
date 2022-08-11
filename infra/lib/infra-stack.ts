import { Duration, Stack, StackProps } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as certManager from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

export interface InfraProps extends StackProps {
  readonly subDomain: string;
  readonly rootDomain: string;

  readonly agencyAuthUrl: string;
  readonly agencyAuthOrigin: string;
  readonly agencyAuthUser: string;
  readonly agencyAuthKey: string;

  readonly agencyUrl: string;
  readonly credDefId: string;
}

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props: InfraProps) {
    super(scope, id, props);

    const app = new lambda.Function(this, "FindyOIDCProviderHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("../lambda.zip"),
      handler: "src/lambda.handler",
      environment: {
        FINDY_OIDC_AGENCY_AUTH_URL: props.agencyAuthUrl,
        FINDY_OIDC_AGENCY_AUTH_ORIGIN: props.agencyAuthOrigin,
        FINDY_OIDC_AGENCY_AUTH_USER: props.agencyAuthUser,
        FINDY_OIDC_AGENCY_AUTH_KEY: props.agencyAuthKey,
        FINDY_OIDC_AGENCY_URL: props.agencyUrl,
        FINDY_OIDC_CRED_DEF_ID: props.credDefId,
        FINDY_OIDC_OUR_HOST: `https://${props.subDomain}.${props.rootDomain}`,
      },
      timeout: Duration.minutes(3),
      logRetention: RetentionDays.ONE_MONTH,
    });

    const zone = route53.HostedZone.fromLookup(this, "FindyOIDCProviderZone", {
      domainName: props.rootDomain,
    });
    const domainName = `${props.subDomain}.${props.rootDomain}`;
    const certificate = new certManager.DnsValidatedCertificate(
      this,
      `FindyOIDCProviderCertificate`,
      {
        domainName,
        hostedZone: zone,
      }
    );

    const restApi = new apigw.LambdaRestApi(this, "FindyOIDCProviderEndpoint", {
      handler: app,
      domainName: {
        domainName,
        certificate,
      },
    });

    new route53.ARecord(this, "FindyOIDCProviderEndpointApiDNS", {
      zone: zone,
      recordName: props.subDomain,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(restApi)
      ),
    });
  }
}
