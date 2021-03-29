import { PluginAlarmConfig, Resource } from "../definitions";
import { getSnsResource } from "./sns";

interface GetAlarmResourcesParams {
  snsKey: string;
  topicName: string;
  kmsKeyArn?: string;
  tags?: { [key: string]: string };
  alarmConfig: GetAlarmResourcesConfig & PluginAlarmConfig;
}

interface GetAlarmResourcesConfig {
  alarmName: string;
  alarmDescription: string;
  metricName: string;
  comparisonOperator: string;
  dimensions: { [key: string]: string };
  namespace: string;
}

export interface GetAlarmResourcesResults {
  alarm: Resource;
  sns: Resource;
}

export function getAlarmResources(
  params: GetAlarmResourcesParams
): GetAlarmResourcesResults {
  const { snsKey, topicName, alarmConfig, kmsKeyArn } = params;
  const config = alarmConfig;
  return {
    sns: getSnsResource({
      topicName,
      kmsMasterKeyId: kmsKeyArn,
    }),
    alarm: {
      Type: "AWS::CloudWatch::Alarm",
      Properties: {
        AlarmName: config.alarmName,
        AlarmDescription: config.alarmDescription,
        Namespace: config.namespace,
        Dimensions: config.dimensions
          ? Object.entries(config.dimensions).map(([key, value]) => ({
              Name: key,
              Value: value,
            }))
          : undefined,
        EvaluationPeriods: config.evaluationPeriods,
        DatapointsToAlarm: config.dataPointsToAlarm,
        Period: config.period,
        MetricName: config.metricName,
        Threshold: config.threshold,
        TreatMissingData: config.treatMissingData,
        ComparisonOperator: config.comparisonOperator,
        Statistic: config.statistic,
        AlarmActions: [
          {
            Ref: snsKey,
          },
        ],
        OKActions: [
          {
            Ref: snsKey,
          },
        ],
      },
    },
  };
}
