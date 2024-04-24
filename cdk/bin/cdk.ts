#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EcsAnywhereStack } from '../lib/EcsAnywhereStack';

const app = new cdk.App();
const devEnv = {  
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  } 
  new EcsAnywhereStack(app, 'EcsAnywhereStack', {env: devEnv});