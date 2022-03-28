import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

import {
  ContainerImage,
  FargateTaskDefinition,
  LogDriver,
} from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";

export class AwsPrometheusEcsExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const APP_PORT = 80;
    const pathToDockerFile = "./";

    const taskRole = new Role(this, "AwsPrometheusEcsExampleTaskRole", {
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    taskRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonPrometheusRemoteWriteAccess"
      )
    );

    const taskDefinition = new FargateTaskDefinition(
      this,
      "AwsPrometheusEcsExampleTaskDefinition",
      {
        memoryLimitMiB: 512,
        cpu: 256,
        taskRole: taskRole,
      }
    );

    const dockerFile = new DockerImageAsset(
      this,
      "AwsPrometheusEcsExampleDockerFileAsset",
      {
        directory: pathToDockerFile,
        file: "Dockerfile",
      }
    );

    const image = ContainerImage.fromDockerImageAsset(dockerFile);

    const container = taskDefinition.addContainer(
      "AwsPrometheusEcsExampleAppContainer",
      {
        image: ContainerImage.fromRegistry("kennethreitz/httpbin"),
        containerName: "http-bin",
        logging: LogDriver.awsLogs({
          streamPrefix: "prometheus-ecs-example-app",
        }),
      }
    );

    container.addPortMappings({
      containerPort: APP_PORT,
    });

    taskDefinition.addContainer("AwsPrometheusEcsExampleAdotContainer", {
      image,
      containerName: "adot-collector",
      logging: LogDriver.awsLogs({
        streamPrefix: "prometheus-ecs-example-adot",
      }),
    });

    new ApplicationLoadBalancedFargateService(
      this,
      "AwsPrometheusEcsExampleService",
      {
        desiredCount: 1,
        publicLoadBalancer: true,
        taskDefinition,
      }
    );
  }
}
