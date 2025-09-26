#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LotteryCdkStack } from '../lib/lottery_cdk-stack';

const app = new cdk.App();
new LotteryCdkStack(app, 'LotteryCdkStack', {
  env: { region: 'af-south-1' }
});