import { SetRequired } from "type-fest";
import { PluginInsightsConfig, CloudFormationTemplate } from "../definitions";
import { getAlarmResources } from "../resources/alarms";
import { getLambdaExecutionRoleResource } from "../resources/helpers";
import { applyAlarmToLambda, ApplyAlarmToLambdaParams } from "./alarms";

interface ApplyLambdaInsightsParams {
  lambdaKey: string;
  config: SetRequired<PluginInsightsConfig, "enabled" | "version">;
  namespace: string;
  kmsKeyArn?: string;
}

export default function applyLambdaInsights(
  params: ApplyLambdaInsightsParams,
  template: CloudFormationTemplate
): string[] {
  const { config, lambdaKey, namespace, kmsKeyArn } = params;
  const resources = template.Resources;
  const lambda = resources[lambdaKey];
  const results: string[] = [];
  const properties = lambda.Properties;
  properties.Layers = properties.Layers || [];
  const lambdaInsightsLayer = {
    "Fn::Sub": `arn:aws:lambda:\${AWS::Region}:580247275435:layer:LambdaInsightsExtension:${config.version}`,
  };
  properties.Layers.push(lambdaInsightsLayer);

  const executionRoleName = properties.Role["Fn::GetAtt"][0];
  const role = getLambdaExecutionRoleResource(executionRoleName, template);

  const lambdaExtensionsPolicyArn =
    "arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy";
  const rolePolicyArns: string[] = role.Properties.ManagedPolicyArns || [];
  if (!rolePolicyArns.includes(lambdaExtensionsPolicyArn)) {
    rolePolicyArns.push(lambdaExtensionsPolicyArn);
  }
  role.Properties.ManagedPolicyArns = rolePolicyArns;

  if (config.alarms && config.alarms.enabled) {
    if (config.alarms.excessiveMemoryUsage?.enabled) {
      applyAlarmToLambda(
        {
          config: config.alarms.excessiveMemoryUsage,
          lambdaKey,
          lambdaName: lambda.Properties.FunctionName,
          namespace,
          alarmKey: `${lambdaKey}ExcessiveMemoryUsageAlarm`,
          snsKey: `${lambdaKey}ExcessiveMemoryUsageTopic`,
          kmsKeyArn,
        },
        getExcessiveMemoryUsageAlarm,
        template
      );
      results.push(
        `Excessive memory usage alarm has been added to the lambda ${lambdaKey}`
      );
    }
  }

  results.push(
    `Lambda insights extensions have been added to the lambda ${lambdaKey}`
  );

  return results;
}

export function getExcessiveMemoryUsageAlarm(params: ApplyAlarmToLambdaParams) {
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
      alarmName: `ExcessiveMemoryUsage-${lambdaKey}-${namespace}`,
      alarmDescription:
        "This alarm indicates the lambda function is exceeding its memory usage threshold.",
      comparisonOperator: "GreaterThanOrEqualToThreshold",
      dimensions: { function_name: lambdaName },
      metricName: "memory_utilization",
      namespace: "LambdaInsights",
      ...config,
    },
    topicName: snsKey,
    snsKey,
    kmsKeyArn,
  });
}
