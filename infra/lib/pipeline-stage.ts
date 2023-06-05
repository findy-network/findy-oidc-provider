import { InfraStack } from './infra-stack'
import { Stage, StageProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'

export class InfraPipelineStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props)

    new InfraStack(this, 'FindyOIDCProviderInfraStack', props)
  }
}
