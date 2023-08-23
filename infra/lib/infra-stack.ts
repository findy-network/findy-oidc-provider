import * as lightsail from 'aws-cdk-lib/aws-lightsail'
import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // const cert = new lightsail.CfnCertificate(this, 'FindyOIDCProviderCertificate', {
    //   certificateName: 'findy-oidc-provider-cert',
    //   domainName: `${process.env.SUB_DOMAIN_NAME}.${process.env.DOMAIN_NAME}`,
    // })

    new lightsail.CfnContainer(this, 'FindyOIDCProviderBackend', {
      scale: 1,
      power: 'nano',
      serviceName: 'findy-oidc-provider-svc',
      // publicDomainNames: [
      //   {
      //     domainNames: [`${process.env.SUB_DOMAIN_NAME}.${process.env.DOMAIN_NAME}`],
      //     certificateName: cert.certificateName
      //   }
      // ],
      containerServiceDeployment: {
        containers: [
          {
            containerName: 'findy-oidc-provider-container',
            image: `ghcr.io/findy-network/findy-oidc-provider:latest`,
            ports: [{ port: '3005', protocol: 'HTTP' }],
            environment: [
              {
                variable: 'FINDY_OIDC_AGENCY_AUTH_URL',
                value: process.env.FINDY_OIDC_AGENCY_AUTH_URL,
              },
              {
                variable: 'FINDY_OIDC_AGENCY_AUTH_ORIGIN',
                value: process.env.FINDY_OIDC_AGENCY_AUTH_ORIGIN,
              },
              {
                variable: 'FINDY_OIDC_AGENCY_AUTH_USER',
                value: process.env.FINDY_OIDC_AGENCY_AUTH_USER,
              },
              {
                variable: 'FINDY_OIDC_AGENCY_AUTH_KEY',
                value: process.env.FINDY_OIDC_AGENCY_AUTH_KEY,
              },
              {
                variable: 'FINDY_OIDC_AGENCY_URL',
                value: process.env.FINDY_OIDC_AGENCY_URL,
              },
              {
                variable: 'FINDY_OIDC_CRED_DEF_ID',
                value: process.env.FINDY_OIDC_CRED_DEF_ID,
              },
              {
                variable: 'FINDY_OIDC_CLIENTS_JSON',
                value: process.env.FINDY_OIDC_CLIENTS_JSON,
              },
              {
                variable: 'FINDY_OIDC_OUR_HOST',
                value: `https://${process.env.FINDY_OIDC_OUR_HOST}`,
              },
            ],
          },
        ],
        publicEndpoint: {
          containerName: 'findy-oidc-provider-container',
          containerPort: 3005,
        },
      },
    })
  }
}
