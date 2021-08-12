#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EcsAnywhereStack } from '../lib/EcsAnywhereStack';

const app = new cdk.App();
const devEnv = {  
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
} 
new EcsAnywhereStack(app, 'EcsAnywhereStack', {env: devEnv});