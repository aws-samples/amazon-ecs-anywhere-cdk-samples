import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from "aws-cdk-lib/aws-iam";
import { CfnOutput } from 'aws-cdk-lib/core';


export class EcsAnywhereStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create VPC
    const vpc = new ec2.Vpc(this, "EcsAnywhereVPC", {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "EcsAnywherePublic",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "EcsAnywherePrivate",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ]
    }
    )

    // Create ECS Cluster
    const EcsAnywhereCluster = new ecs.Cluster(this, "EcsAnywhereCluster", {
      vpc: vpc,
      clusterName: "EcsAnywhereCluster",

    })

     // Create ExternalTaskDefinition
     const taskDefinition = new ecs.ExternalTaskDefinition(this, 'ExternalTaskDefinition');

     taskDefinition.addContainer('NginxContainer', {
       image: ecs.ContainerImage.fromRegistry(
         "public.ecr.aws/nginx/nginx:latest"
       ),
       cpu: 256,
       memoryLimitMiB: 512,
       containerName: "EcsAnywhereContainer"
     })
 
     // Create ExternalService
     const ecsService = new ecs.ExternalService(this, 'ExternalService', {
       serviceName: "EcsAnywhereService",
       cluster: EcsAnywhereCluster,
       taskDefinition,
       desiredCount: 1,
     })
 
     // Create IAM Role
     const instance_iam_role = new iam.Role(this, 'EcsAnywhereInstanceRole', {
       roleName: "EcsAnywhereInstanceRole",
       assumedBy: new iam.ServicePrincipal("ssm.amazonaws.com"),
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
