import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

export class LotteryCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lottoFunction = new lambda.Function(this, 'NationalLottery', {
      runtime: lambda.Runtime.RUBY_3_2,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset(process.env.LOTTO_ZIP_PATH!),
      environment: {
        GMAIL_USERNAME: process.env.GMAIL_USERNAME!,
        GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD!,
        GMAIL_FROM: process.env.GMAIL_FROM!,
        GMAIL_TO: process.env.GMAIL_TO!
      }
    });

    new events.Rule(this, 'PowerballSchedule', {
      schedule: events.Schedule.cron({ minute: '20', hour: '20', weekDay: 'TUE,FRI' }),
      targets: [new targets.LambdaFunction(lottoFunction, {
        event: events.RuleTargetInput.fromObject({ type: 'powerball', nob: 2 })
      })]
    });

    new events.Rule(this, 'LottoWedSchedule', {
      schedule: events.Schedule.cron({ minute: '20', hour: '20', weekDay: 'WED,SAT' }),
      targets: [new targets.LambdaFunction(lottoFunction, {
        event: events.RuleTargetInput.fromObject({ type: 'lotto', nob: 2 })
      })]
    });
  }
}
