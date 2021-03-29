import { CloudFormationTemplate, PluginAlarmConfig } from "../definitions";
import {
  getAlarmResources,
  GetAlarmResourcesResults,
} from "../resources/alarms";
import { applyOutputValues } from "./helpers";

export interface ApplyAlarmToLambdaParams {
  alarmKey: string;
  snsKey: string;
  lambdaKey: string;
  lambdaName: string;
  namespace: string;
  kmsKeyArn?: string;
  config: PluginAlarmConfig;
}

export function applyAlarmToLambda(
  params: ApplyAlarmToLambdaParams,
  alarmFunc: (params: ApplyAlarmToLambdaParams) => GetAlarmResourcesResults,
  template: CloudFormationTemplate
) {
  const { alarmKey, snsKey } = params;
  const resources = alarmFunc(params);

  template.Resources[alarmKey] = resources.alarm;
  template.Resources[snsKey] = resources.sns;

  applyOutputValues(template, {
    [`${snsKey}Arn`]: {
      Ref: snsKey,
    },
    [`${alarmKey}Arn`]: {
      "Fn::GetAtt": [alarmKey, "Arn"],
    },
  });
}

function getExcessiveExecutionTimeAlarm(params: ApplyAlarmToLambdaParams) {
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
      alarmName: `ExcessiveExecutionTime-${lambdaKey}-${namespace}`,
      alarmDescription:
        "This alarm indicates the lambda function's execution time is getting close to it's configured timeout",
      comparisonOperator: "GreaterThanOrEqualToThreshold",
      dimensions: { FunctionName: lambdaName },
      metricName: "Duration",
      namespace: "AWS/Lambda",
      ...config,
    },
    topicName: `${snsKey}-${namespace}`,
    snsKey,
    kmsKeyArn,
  });
}

function getThrottleErrorsAlarm(params: ApplyAlarmToLambdaParams) {
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
      alarmName: `ThrottleErrors-${lambdaKey}-${namespace}`,
      alarmDescription: "This alarm indicates the lambda is being throttled",
      comparisonOperator: "GreaterThanOrEqualToThreshold",
      dimensions: { FunctionName: lambdaName },
      metricName: "Throttles",
      namespace: "AWS/Lambda",
      ...config,
    },
    topicName: `${snsKey}-${namespace}`,
    snsKey,
    kmsKeyArn,
  });
}

export function applyExcessiveExecutionTimeAlarm(
  params: ApplyAlarmToLambdaParams,
  template: any
): string[] {
  applyAlarmToLambda(params, getExcessiveExecutionTimeAlarm, template);
  return [
    `Excessive execution time alarm has been added to the lambda ${params.lambdaKey}`,
  ];
}

export function applyThrottleErrorsAlarm(
  params: ApplyAlarmToLambdaParams,
  template: any
): string[] {
  applyAlarmToLambda(params, getThrottleErrorsAlarm, template);
  return [
    `Throttle errors alarm has been added to the lambda ${params.lambdaKey}`,
  ];
}
