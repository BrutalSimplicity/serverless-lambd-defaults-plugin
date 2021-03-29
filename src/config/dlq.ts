import { ApplyAlarmToLambdaParams, applyAlarmToLambda } from "./alarms";
import { CloudFormationTemplate, PluginDLQConfig } from "../definitions";
import { applyOutputValues } from "./helpers";
import { applyRolePolicyStatements } from "./helpers";
import { getAlarmResources } from "../resources/alarms";
import { getSqsResource } from "../resources/sqs";

export interface DLQConfigParams {
  lambdaKey: string;
  namespace: string;
  dlqConfig: PluginDLQConfig;
  kmsKeyArn?: string;
}

export function applyDLQConfig(
  params: DLQConfigParams,
  template: CloudFormationTemplate
): string[] {
  const { lambdaKey, namespace, dlqConfig, kmsKeyArn } = params;
  const lambda = template.Resources[lambdaKey];

  const queueKey = `${lambdaKey}DLQ`;
  const queueName = `${lambdaKey}-DeadLetterQueue-${namespace}`;
  const lambdaName = lambda.Properties.FunctionName;
  const results = [];

  template.Resources[queueKey] = getSqsResource({
    queueName,
    kmsMasterKeyId: kmsKeyArn,
  });

  lambda.Properties.DeadLetterConfig = {
    TargetArn: { "Fn::GetAtt": [queueKey, "Arn"] },
  };

  const roleName = lambda.Properties.Role["Fn::GetAtt"][0];
  if (kmsKeyArn) {
    applyRolePolicyStatements(
      roleName,
      [
        {
          Effect: "Allow",
          Action: ["kms:Decrypt", "kms:GenerateDataKey"],
          Resource: [kmsKeyArn],
        },
      ],
      template
    );
  }

  applyRolePolicyStatements(
    roleName,
    [
      {
        Effect: "Allow",
        Action: ["sqs:SendMessage"],
        Resource: [{ "Fn::GetAtt": [queueKey, "Arn"] }],
      },
    ],
    template
  );

  applyOutputValues(template, {
    [`${queueKey}Arn`]: {
      "Fn::GetAtt": [queueKey, "Arn"],
    },
    [`${queueKey}Name`]: {
      "Fn::GetAtt": [queueKey, "QueueName"],
    },
  });

  results.push(`Dead letter queue has been added to the lambda ${lambdaKey}`);

  const props = {
    lambdaKey,
    lambdaName,
    namespace,
  };

  if (dlqConfig.enabled && dlqConfig.alarms.enabled) {
    if (dlqConfig.alarms.deadLetterErrors?.enabled) {
      applyAlarmToLambda(
        {
          ...props,
          kmsKeyArn,
          config: dlqConfig.alarms.deadLetterErrors,
          alarmKey: `${lambdaKey}DeadLetterErrorsAlarm`,
          snsKey: `${lambdaKey}DeadLetterErrorsAlarmTopic`,
        },
        getDeadLetterErrorsAlarm,
        template
      );
      results.push(
        `Dead letter queue errors alarm has been added to the lambda ${lambdaKey}`
      );
    }
    if (dlqConfig.alarms.deadLetterMessages?.enabled) {
      applyAlarmToLambda(
        {
          ...props,
          config: dlqConfig.alarms.deadLetterMessages,
          alarmKey: `${lambdaKey}DeadLetterMessagesAlarm`,
          snsKey: `${lambdaKey}DeadLetterMessagesAlarmTopic`,
          kmsKeyArn,
        },
        getDeadLetterMessagesAlarm,
        template
      );
      results.push(
        `Dead letter queue messages alarm has been added to the lambda ${lambdaKey}`
      );
    }
  }

  return results;
}

function getDeadLetterErrorsAlarm(params: ApplyAlarmToLambdaParams) {
  const {
    config,
    lambdaKey,
    lambdaName,
    namespace,
    snsKey,
    kmsKeyArn,
  } = params;
  return getAlarmResources({
    alarmConfig: {
      alarmName: `DeadLetterErrors-${lambdaKey}-${namespace}`,
      alarmDescription:
        "This alarm indicates the lambda function is having errors putting messages on the Dead-Letter queue",
      comparisonOperator: "GreaterThanOrEqualToThreshold",
      dimensions: { FunctionName: lambdaName },
      metricName: "DeadLetterErrors",
      namespace: "AWS/Lambda",
      ...config,
    },
    topicName: snsKey,
    snsKey,
    kmsKeyArn,
  });
}

function getDeadLetterMessagesAlarm(params: ApplyAlarmToLambdaParams) {
  const {
    config,
    lambdaKey,
    lambdaName,
    namespace,
    snsKey,
    kmsKeyArn,
  } = params;
  return getAlarmResources({
    alarmConfig: {
      alarmName: `DeadLetterMessages-${lambdaKey}-${namespace}`,
      alarmDescription:
        "This alarm indicates the lambda has messages waiting on the dead letter queue",
      comparisonOperator: "GreaterThanOrEqualToThreshold",
      dimensions: { FunctionName: lambdaName },
      metricName: "ApproximateNumberOfMessagesVisible",
      namespace: "AWS/SQS",
      ...config,
    },
    topicName: snsKey,
    snsKey,
    kmsKeyArn,
  });
}
