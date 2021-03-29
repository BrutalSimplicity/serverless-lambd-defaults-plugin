import { readFileSync } from "fs";
import { join } from "path";
import Serverless from "serverless";
import Aws from "serverless/aws";
import { PartialDeep } from "type-fest";
import { PluginConfig } from "../src/definitions";
import { Plugin } from "../src/plugin";

test("should add proper cloudformation resources for all defaults + kms key", () => {
  const mockServerless: PartialDeep<Serverless> = {
    getProvider: (name: string): Aws => ({} as Aws),
    configSchemaHandler: {
      defineCustomProperties: (schema: unknown): void => {},
      defineFunctionProperties: (schema: unknown): void => {},
    },
    cli: {
      log: (message: string): null => null,
    },
    service: {
      provider: {
        compiledCloudFormationTemplate: JSON.parse(
          readFileSync(join(__dirname, "data/cloudformation.json"), {
            encoding: "utf-8",
          })
        ),
      },
      custom: {
        lambdaDefaults: {
          kms: {
            kmsKeyArn: "arn:aws:kms:us-east-1:key/1234",
          },
        } as PluginConfig,
      },
      functions: {
        pong: {},
      },
    },
  };
  const mockOptions = {
    stage: "dev",
    region: "us-east-1",
  };

  const plugin = new Plugin(mockServerless as Serverless, mockOptions);

  plugin.applyLambdaDefaults();

  const template =
    mockServerless.service.provider.compiledCloudFormationTemplate;

  const lambdaPolicyStatements =
    template.Resources.IamRoleLambdaExecution.Properties.Policies[0]
      .PolicyDocument.Statement;

  const findStatementsByAction = (action: string, statements: any[]) =>
    statements.filter((s) => s.Action.includes(action));
  const statements = findStatementsByAction(
    "sqs:SendMessage",
    lambdaPolicyStatements
  );
  expect(statements).toHaveLength(1);
  expect(statements).toEqual([
    {
      Effect: "Allow",
      Action: ["sqs:SendMessage"],
      Resource: [
        {
          "Fn::GetAtt": ["PongLambdaFunctionDLQ", "Arn"],
        },
      ],
    },
  ]);

  const managedPolicyArns =
    template.Resources.IamRoleLambdaExecution.Properties.ManagedPolicyArns;
  expect(managedPolicyArns).toEqual([
    "arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy",
  ]);
  expect(
    "PongLambdaFunctionThrottleErrorsAlarm" in template.Resources
  ).toBeTruthy();
  expect(
    "PongLambdaFunctionThrottleErrorsAlarmTopic" in template.Resources
  ).toBeTruthy();
  expect(
    "PongLambdaFunctionExecutionTimeAlarm" in template.Resources
  ).toBeTruthy();
  expect(
    "PongLambdaFunctionExecutionTimeAlarmTopic" in template.Resources
  ).toBeTruthy();
  expect(
    "PongLambdaFunctionExcessiveMemoryUsageAlarm" in template.Resources
  ).toBeTruthy();
  expect(
    "PongLambdaFunctionExcessiveMemoryUsageAlarmTopic" in template.Resources
  ).toBeTruthy();
  expect(
    "PongLambdaFunctionDeadLetterErrorsAlarm" in template.Resources
  ).toBeTruthy();
  expect(
    "PongLambdaFunctionDeadLetterErrorsAlarmTopic" in template.Resources
  ).toBeTruthy();
  expect(
    "PongLambdaFunctionDeadLetterMessagesAlarm" in template.Resources
  ).toBeTruthy();
  expect(
    "PongLambdaFunctionDeadLetterMessagesAlarmTopic" in template.Resources
  ).toBeTruthy();
});
