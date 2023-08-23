import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { CodeBuildStep, CodePipeline, CodePipelineSource } from 'aws-cdk-lib/pipelines'
import { aws_codebuild as codebuild, aws_logs as logs } from 'aws-cdk-lib'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'

import { InfraPipelineStage } from './pipeline-stage'
import { NotificationRule } from 'aws-cdk-lib/aws-codestarnotifications'
import { Topic } from 'aws-cdk-lib/aws-sns'

interface InfraPipelineProperties extends cdk.StackProps { }

const environmentVariables: Record<string, codebuild.BuildEnvironmentVariable> = {
  // TODO:
  // DOMAIN_NAME: {
  //   type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
  //   value: '/findy-oidc-provider/domain-name',
  // },
  // SUB_DOMAIN_NAME: {
  //   type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
  //   value: '/findy-oidc-provider/sub-domain-name',
  // },
  FINDY_OIDC_OUR_HOST: {
    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
    value: '/findy-oidc-provider/findy-oidc-our-host',
  },
  // TODO: use secrets
  FINDY_OIDC_AGENCY_AUTH_USER: {
    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
    value: '/findy-oidc-provider/findy-oidc-agency-auth-user',
  },
  // TODO: use secrets
  FINDY_OIDC_AGENCY_AUTH_KEY: {
    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
    value: '/findy-oidc-provider/findy-oidc-agency-auth-key',
  },
  FINDY_OIDC_AGENCY_AUTH_URL: {
    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
    value: '/findy-oidc-provider/findy-oidc-agency-auth-url',
  },
  FINDY_OIDC_AGENCY_AUTH_ORIGIN: {
    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
    value: '/findy-oidc-provider/findy-oidc-agency-auth-origin',
  },
  FINDY_OIDC_AGENCY_URL: {
    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
    value: '/findy-oidc-provider/findy-oidc-agency-url',
  },
  FINDY_OIDC_CRED_DEF_ID: {
    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
    value: '/findy-oidc-provider/findy-oidc-cred-def-id',
  },
  FINDY_OIDC_CLIENTS_JSON: {
    type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
    value: '/findy-oidc-provider/findy-oidc-clients-json',
  },
}

export class InfraPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraPipelineProperties) {
    super(scope, id, props)

    const githubConnectionArn = StringParameter.valueForStringParameter(this, '/findy-oidc-provider/github-connection-arn')
    const source = CodePipelineSource.connection('findy-network/findy-oidc-provider', 'master', {
      connectionArn: githubConnectionArn, // Created using the AWS console
    })

    // Create pipeline
    const pipeline = this.createPipeline(source)

    // Add app to pipeline
    const deploy = new InfraPipelineStage(this, 'Deploy', {
      env: props.env,
    })
    const deployStage = pipeline.addStage(deploy)

    // Add lightsail application update step
    //deployStage.addPost(this.createLightsailUpdateStep(id))

    // need this to add the notification rule
    pipeline.buildPipeline()

    new NotificationRule(this, 'FindyOIDCProviderPipelineNotificationRule', {
      source: pipeline.pipeline,
      events: [
        'codepipeline-pipeline-pipeline-execution-failed',
        'codepipeline-pipeline-pipeline-execution-canceled',
        'codepipeline-pipeline-pipeline-execution-started',
        'codepipeline-pipeline-pipeline-execution-resumed',
        'codepipeline-pipeline-pipeline-execution-succeeded',
      ],
      targets: [new Topic(this, 'FindyOIDCProviderPipelineNotificationTopic')],
    })

    // manually adjust logs retention
    this.node.findAll().forEach((construct, index) => {
      if (construct instanceof codebuild.Project) {
        new logs.LogRetention(this, `LogRetention${index}`, {
          logGroupName: `/aws/codebuild/${construct.projectName}`,
          retention: logs.RetentionDays.ONE_MONTH,
        })
      }
    })
  }

  createPipeline(source: CodePipelineSource) {
    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'FindyOIDCProviderPipeline',
      synth: new CodeBuildStep('SynthStep', {
        input: source,
        installCommands: ['npm install -g aws-cdk'],
        buildEnvironment: {
          environmentVariables: {
            CDK_CONTEXT_JSON: {
              type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
              value: '/findy-oidc-provider/cdk-context',
            },
          },
        },
        commands: [
          'cd infra',
          `echo "$CDK_CONTEXT_JSON" > cdk.context.json`,
          'cat cdk.context.json',
          'npm ci',
          'npm run build',
          'npx cdk synth',
          'npm run pipeline:context',
        ],
        rolePolicyStatements: [
          new PolicyStatement({
            actions: ['ssm:PutParameter'],
            resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/findy-oidc-provider*`],
          }),
        ],
        primaryOutputDirectory: 'infra/cdk.out',
      }),
      codeBuildDefaults: {
        buildEnvironment: {
          environmentVariables: {
            ...environmentVariables,
          },
        },
      },
    })

    return pipeline
  }

  // createLightsailUpdateStep(id: string) {
  //   const deployRole = new Role(this, `${id}-deploy-role`, {
  //     assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
  //   })

  //   const lightsailPolicy = new PolicyStatement()
  //   lightsailPolicy.addActions('lightsail:*', 'ssm:*')
  //   lightsailPolicy.addResources('*')
  //   deployRole.addToPolicy(lightsailPolicy)

  //   return new CodeBuildStep('FindyOIDCProviderDeployBackendStep', {
  //     projectName: 'FindyOIDCProviderDeployBackendStep',
  //     commands: [
  //       `URL=$(aws lightsail get-container-services --service-name findy-oidc-provider --output json | jq -r '.containerServices[0].url')`,
  //       // TODO: we need this value with first deployment as well -> use own domain instead of lightsail-generated
  //       `aws ssm put-parameter --overwrite --name \"/findy-oidc-provider/backend-url\" --value \"$URL\" --type String`,
  //       `CONTAINERS=$(aws lightsail get-container-services --service-name findy-oidc-provider --output json | jq -r '.containerServices[0].currentDeployment.containers')`,
  //       `PUBLIC_ENDPOINT=$(aws lightsail get-container-services --service-name findy-oidc-provider --output json | jq -r '.containerServices[0].currentDeployment.publicEndpoint')`,
  //       `aws lightsail create-container-service-deployment --service-name findy-oidc-provider --containers "$CONTAINERS" --public-endpoint "$PUBLIC_ENDPOINT"`,
  //       // make sure cloudfront domain is configured as public domain to ensure origin is found
  //       `aws lightsail update-container-service --service-name findy-oidc-provider --public-domain-names '{"_": ["${process.env.SUB_DOMAIN_NAME}.${process.env.DOMAIN_NAME}"]}'`,
  //     ],
  //     role: deployRole,
  //   })
  // }


}
