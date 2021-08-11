import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as iam from "@aws-cdk/aws-iam";
import { CfnOutput } from '@aws-cdk/core';

export class EcsAnywhereStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

  // Create VPC
  const vpc = new ec2.Vpc(this, 'EcsAnywhereVPC', {
    cidr: '192.168.0.0/16',
    subnetConfiguration: [
      {
        subnetType: ec2.SubnetType.PRIVATE,
        name: 'EcsAnywherePrivate',
        cidrMask: 24,
      },
      {
        subnetType: ec2.SubnetType.PUBLIC,
        name: 'EcsAnywherePublic',
        cidrMask: 24,
      },
    ]
  });

  // Create ECS cluster
  const ecsAnywhereCluster = new ecs.Cluster(this, 'EcsAnywhereCluster', {
    vpc,
    clusterName: "EcsAnywhereCluster",
  });

  // Create ExternalTaskDefinition
  const taskDefinition = new ecs.ExternalTaskDefinition(this, 'ExternalTaskDefinition');

  taskDefinition.addContainer('NginxContainer', {
    image : ecs.ContainerImage.fromRegistry(
      "public.ecr.aws/nginx/nginx:latest"
    ),
    cpu: 100,
    memoryLimitMiB: 256,
    containerName : "EcsAnywhereContainer"
  })

  // Create ExternalService
  const ecsService = new ecs.ExternalService(this, 'ExternalService', {
    serviceName: "EcsAnywhereService",
    cluster: ecsAnywhereCluster,
    taskDefinition,
    desiredCount: 1,
  })

  // Create IAM Role
  const instance_iam_role = new iam.Role( this, 'EcsAnywhereInstanceRole', {
    roleName: "EcsAnywhereInstanceRole",
    assumedBy : new iam.ServicePrincipal("ssm.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
      iam.ManagedPolicy.fromManagedPolicyArn(this, "EcsAnywhereEC2Policy", "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"),
    ]
  })

  // Output
  new CfnOutput(this, "RegisterExternalInstance", {
    description: "Create an Systems Manager activation pair",
    value: `aws ssm create-activation --iam-role ${instance_iam_role.roleName}`,
    exportName: "1-RegisterExternalInstance",
  })

  new CfnOutput(this, "DownloadInstallationScript", {
    description: "On your VM, download installation script",
    value: 'curl -o "ecs-anywhere-install.sh" "https://amazon-ecs-agent-packages-preview.s3.us-east-1.amazonaws.com/ecs-anywhere-install.sh" && sudo chmod +x ecs-anywhere-install.sh',
    exportName: "2-DownloadInstallationScript",
  });

  new CfnOutput(this, "ExecuteScript", {
    description: "Run installation script on VM",
    value: "sudo ./ecs-anywhere-install.sh  --region $REGION --cluster $CLUSTER_NAME --activation-id $ACTIVATION_ID --activation-code $ACTIVATION_CODE",
    exportName: "3-ExecuteInstallationScript",
  });

  }
}
