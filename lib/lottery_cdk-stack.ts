import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as path from 'path';
import { Construct } from 'constructs';

export class LotteryCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sesIdentity = ses.EmailIdentity.fromEmailIdentityName(
      this, 
      'SESIdentity', 
      'simplepropertysys@gmail.com'
    )

    const lotteryRole = new iam.Role(this, 'LotteryPyRole', {
      roleName: 'LotteryPyRole',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
    });

    const zaLottingIdentityEmail = 'zalotting@outlook.com'
    const zaLottingIdentity = new ses.EmailIdentity(this, 'OutlookIdentity', {
      identity: ses.Identity.email(zaLottingIdentityEmail),
    });

    lotteryRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail'],
        resources: [sesIdentity.emailIdentityArn, zaLottingIdentity.emailIdentityArn],
      })
    );
    lotteryRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ses:ListEmailIdentities', 'ses:GetEmailIdentity'],
        resources: ['*'],
      })
    );
    const lottoFunction = new lambda.Function(this, 'LotteryPy', {
      functionName: 'LotteryPy',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'generate_insight.lambda_handler',
      role: lotteryRole,
      code: lambda.Code.fromAsset(path.join(__dirname, process.env.LAMBDA_PATH!), {
        exclude: ['**', '!generate_insight.py'],
      }),
      environment: {
        GMAIL_FROM: process.env.GMAIL_FROM!,
        SENDER_EMAIL: zaLottingIdentityEmail
      },
      timeout: cdk.Duration.minutes(5),
    });

    const powerballSchedulerRole = new iam.Role(this, 'LotterySchedulerRole', {
      roleName: 'LotterySchedulerRole',
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
    });

    lottoFunction.grantInvoke(powerballSchedulerRole);

    new scheduler.CfnSchedule(this, 'DailyOnlySchedule', {
      name: 'DailyOnlySchedule',
      flexibleTimeWindow: { mode: 'FLEXIBLE', maximumWindowInMinutes: 5 },
      scheduleExpression: 'cron(20 20 ? * MON,THU,SUN *)',
      target: {
        arn: lottoFunction.functionArn,
        roleArn: powerballSchedulerRole.roleArn,
        input: JSON.stringify({"games": [{"lotteryType": "daily", "boardCount": 3}], "sendMail": true}),
      },
    });

    new scheduler.CfnSchedule(this, 'PowerballDailySchedule', {
      name: 'PowerballDailySchedule',
      flexibleTimeWindow: { mode: 'FLEXIBLE', maximumWindowInMinutes: 5 },
      scheduleExpression: 'cron(20 20 ? * TUE,FRI *)',
      target: {
        arn: lottoFunction.functionArn,
        roleArn: powerballSchedulerRole.roleArn,
        input: JSON.stringify({"games": [ {"lotteryType": "powerball", "boardCount": 3} , {"lotteryType": "daily", "boardCount": 3}], "sendMail": true}),
      },
    });

    new scheduler.CfnSchedule(this, 'PowerballOnlySchedule', {
      name: 'PowerballOnlySchedule',
      flexibleTimeWindow: { mode: 'FLEXIBLE', maximumWindowInMinutes: 5 },
      scheduleExpression: 'cron(20 20 ? * TUE,FRI *)',
      target: {
        arn: lottoFunction.functionArn,
        roleArn: powerballSchedulerRole.roleArn,
        input: JSON.stringify({"games": [ {"lotteryType": "powerball", "boardCount": 3}], "sendMail": true, "excludeTypes": ["daily"]}),
      },
    });

    new scheduler.CfnSchedule(this, 'DailyNoPowerballSchedule', {
      name: 'DailyNoPowerballSchedule',
      flexibleTimeWindow: { mode: 'FLEXIBLE', maximumWindowInMinutes: 5 },
      scheduleExpression: 'cron(20 20 ? * TUE,FRI *)',
      target: {
        arn: lottoFunction.functionArn,
        roleArn: powerballSchedulerRole.roleArn,
        input: JSON.stringify({"games": [ {"lotteryType": "daily", "boardCount": 3}], "sendMail": true, "excludeTypes": ["powerball"] }),
      },
    });

    new scheduler.CfnSchedule(this, 'LottoDailySchedule', {
      name: 'LottoDailySchedule',
      flexibleTimeWindow: { mode: 'FLEXIBLE', maximumWindowInMinutes: 5 },
      scheduleExpression: 'cron(20 20 ? * WED,SAT *)',
      target: {
        arn: lottoFunction.functionArn,
        roleArn: powerballSchedulerRole.roleArn,
        input: JSON.stringify({"games": [ {"lotteryType": "lotto", "boardCount": 3} , {"lotteryType": "daily", "boardCount": 3}], "sendMail": true}),
      },
    });

    new scheduler.CfnSchedule(this, 'LottoOnlySchedule', {
      name: 'LottoOnlySchedule',
      flexibleTimeWindow: { mode: 'FLEXIBLE', maximumWindowInMinutes: 5 },
      scheduleExpression: 'cron(20 20 ? * WED,SAT *)',
      target: {
        arn: lottoFunction.functionArn,
        roleArn: powerballSchedulerRole.roleArn,
        input: JSON.stringify({"games": [ {"lotteryType": "lotto", "boardCount": 3}], "sendMail": true, "excludeTypes": ["daily"]}),
      },
    });

    new scheduler.CfnSchedule(this, 'DailyNoLottoSchedule', {
      name: 'DailyNoLottoSchedule',
      flexibleTimeWindow: { mode: 'FLEXIBLE', maximumWindowInMinutes: 5 },
      scheduleExpression: 'cron(20 20 ? * WED,SAT *)',
      target: {
        arn: lottoFunction.functionArn,
        roleArn: powerballSchedulerRole.roleArn,
        input: JSON.stringify({"games": [ {"lotteryType": "daily", "boardCount": 3}], "sendMail": true, "excludeTypes": ["lotto"]}),
      },
    });
  }
}
