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

    const lottoFunction = new lambda.Function(this, 'LotteryPy', {
      functionName: 'LotteryPy',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'generate_insight.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda'), {
        exclude: ['**', '!generate_insight.py'],
      }),
      environment: {
        GMAIL_FROM: process.env.GMAIL_FROM!,
        GMAIL_TO: process.env.GMAIL_TO!,
      },
      timeout: cdk.Duration.minutes(5),
    });

    const sesIdentity = ses.EmailIdentity.fromEmailIdentityName(
      this,
      'SESIdentity',
      'simplepropertysys@gmail.com'
    );

    lottoFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['arn:aws:ses:af-south-1:490253922843:identity/simplepropertysys@gmail.com'],
      })
    );

    const powerballSchedulerRole = new iam.Role(this, 'PowerballSchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
    });

    lottoFunction.grantInvoke(powerballSchedulerRole);

    new scheduler.CfnSchedule(this, 'PowerballSchedule', {
      name: 'PowerballSchedule',
      flexibleTimeWindow: { mode: 'ON', maximumWindowInMinutes: 5 },
      scheduleExpression: 'cron(20 20 ? * 3,6 *)',
      target: {
        arn: lottoFunction.functionArn,
        roleArn: powerballSchedulerRole.roleArn,
        input: JSON.stringify({"games": [ {"lotteryType": "powerball", "boardCount": 2} , {"lotteryType": "daily", "boardCount": 2}], "sendMail": true}),
      },
    });
  }
}
