import { PluginConfig } from "./definitions";

export default function getDefaultPluginConfig(): PluginConfig {
  return {
    kms: {
      kmsKeyArn: undefined,
    },
    dlq: {
      enabled: true,
      alarms: {
        enabled: true,
        deadLetterErrors: {
          enabled: true,
          treatMissingData: "notBreaching",
          evaluationPeriods: 2,
          dataPointsToAlarm: 2,
          period: 60,
          statistic: "Sum",
          threshold: 1,
        },
        deadLetterMessages: {
          enabled: true,
          treatMissingData: "notBreaching",
          period: 60,
          evaluationPeriods: 1,
          dataPointsToAlarm: 1,
          statistic: "Sum",
          threshold: 1,
        },
      },
    },
    insights: {
      enabled: true,
      version: 14,
      alarms: {
        enabled: true,
        excessiveMemoryUsage: {
          enabled: true,
          threshold: 75, // percent threshold of memory utilized vs max memory
          treatMissingData: "ignore",
          evaluationPeriods: 2,
          dataPointsToAlarm: 2,
          period: 60,
          statistic: "Average",
        },
      },
    },
    alarms: {
      enabled: true,
      excessiveExecutionTime: {
        enabled: true,
        threshold: undefined, // default is calculated based on 75% of the lambda's configured timeout
        statistic: "Average",
        treatMissingData: "ignore",
        dataPointsToAlarm: 1,
        evaluationPeriods: 1,
        period: 60,
      },
      throttleErrors: {
        enabled: true,
        treatMissingData: "notBreaching",
        period: 60,
        evaluationPeriods: 2,
        dataPointsToAlarm: 2,
        statistic: "Sum",
        threshold: 1,
      },
    },
  };
}
