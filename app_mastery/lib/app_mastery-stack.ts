import * as cdk from 'aws-cdk-lib';
import ec2 = require('aws-cdk-lib/aws-ec2');
import ecs = require('aws-cdk-lib/aws-ecs');
import elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
import ecs_patterns = require('aws-cdk-lib/aws-ecs-patterns');
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AppMasteryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'AppMasteryQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'appVpc', {
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'appPublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
          mapPublicIpOnLaunch: true,
        },
        {
          cidrMask: 24,
          name: 'appPrivateSubnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      maxAzs: 2,
    });

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'appCluster', {
      vpc: vpc,
    });

    // Create task definition
    const taskDef = new ecs.FargateTaskDefinition(this, 'appTaskDef');

    // Create a container
    const container = taskDef.addContainer('webApp', {
      image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
      cpu: 256,
      memoryLimitMiB: 512,
    });

    // Add host port to the container
    container.addPortMappings({
      containerPort: 80,
      hostPort: 8080,
      protocol: ecs.Protocol.TCP
    });

    // Create a Service
    const service = new ecs.FargateService(this, 'appService', {
      cluster: cluster,
      taskDefinition: taskDef,
      desiredCount: 2,
    });

    // Create ApplicationLoadBalancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'appLB', {
      vpc: vpc,
      internetFacing: true,
    });

    // Add listener
    const listener = alb.addListener('publicListener', {
      port: 80,
      open: true,
    });

    // Attach ALB to ECS Service
    listener.addTargets('ECS', {
      port: 8080,
      targets: [service.loadBalancerTarget({
        containerName: 'webApp',
        containerPort: 80,
      })],
      // include health check
      healthCheck: {
        interval: cdk.Duration.seconds(60),
        path: "/health",
        timeout: cdk.Duration.seconds(5),
      }
    });

    new cdk.CfnOutput(this, 'LoadBalancerDNS', { value: alb.loadBalancerDnsName, });

    // Stack creation - version2
    
    // Create a load-balanced Fargate service and make it public
    // new ecs_patterns.ApplicationLoadBalancedFargateService(this, "appFargateService", {
    //   cluster: cluster, 
    //   cpu: 256, 
    //   desiredCount: 2, 
    //   taskImageOptions: { image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample") },
    //   memoryLimitMiB: 512, 
    //   publicLoadBalancer: true
    // });

  }
}
