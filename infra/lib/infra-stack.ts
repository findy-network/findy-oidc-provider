import { Stack, StackProps } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as certManager from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export interface InfraProps extends StackProps {
  readonly subDomain: string;
  readonly rootDomain: string;
}

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props: InfraProps) {
    super(scope, id, props);

    const app = new lambda.Function(this, "FindyOIDCProviderHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("../lambda.zip"),
      handler: "src/lambda.handler",
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
