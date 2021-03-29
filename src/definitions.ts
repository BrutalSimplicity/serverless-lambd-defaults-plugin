import * as Serverless from "serverless";
import * as z from "zod";

export interface PluginFunctionDefinition
  extends Serverless.FunctionDefinitionHandler {
  lambdaDefaults?: Partial<PluginConfig>;
}

export type ResourceType = `${string}::${string}::${string}`;
export type Resource = {
  Type: ResourceType;
  Properties: Record<string, any>;
};
export interface CloudFormationTemplate {
  Resources: {
    [key: string]: Resource;
  };
  Outputs: {
    [key: string]: {
      Description: string;
      Name: string;
      Value: string;
    };
  };
}

const alarmSchema = z.object({
  enabled: z.boolean(),
  threshold: z.number(),
  period: z.number(),
  evaluationPeriods: z.number(),
  dataPointsToAlarm: z.number(),
  statistic: z.string(),
  treatMissingData: z.string(),
});

const kmsSchema = z.object({
  kmsKeyArn: z.string(),
});

const dlqSchema = z.object({
  enabled: z.boolean(),
  alarms: z.object({
    enabled: z.boolean(),
    deadLetterErrors: alarmSchema,
    deadLetterMessages: alarmSchema,
  }),
});

const insightsSchema = z.object({
  enabled: z.boolean(),
  version: z.number(),
  alarms: z.object({
    enabled: z.boolean(),
    excessiveMemoryUsage: alarmSchema,
  }),
});

const lambdaAlarmsSchema = z.object({
  enabled: z.boolean(),
  excessiveExecutionTime: alarmSchema,
  throttleErrors: alarmSchema,
});

const pluginSchema = z
  .object({
    kms: kmsSchema,
    dlq: dlqSchema,
    insights: insightsSchema,
    alarms: lambdaAlarmsSchema,
  })
  .deepPartial();

export function validateConfigs(serverless: Serverless): void {
  const errorMap: z.ZodErrorMap = (err, ctx) => {
    if (err.message) {
      return { message: err.message };
    }
    switch (err.code) {
      case z.ZodErrorCode.invalid_union: {
        return {
          message: err.unionErrors[0].message,
        };
      }
      default:
        return { message: ctx.defaultError };
    }
  };
  const baseConfig = serverless.service.custom?.[CONFIG_KEY];
  const functionConfigs = Object.entries(serverless.service.functions)
    .filter((e) => (e[1] as PluginFunctionDefinition).lambdaDefaults)
    .map((e) => (e[1] as PluginFunctionDefinition).lambdaDefaults);

  if (baseConfig) {
    pluginSchema.parse(baseConfig, { errorMap });
  }
  functionConfigs.forEach((config) => {
    pluginSchema.parse(config, { errorMap });
  });
}

export type PluginConfig = z.infer<typeof pluginSchema>;
export type PluginAlarmConfig = z.infer<typeof alarmSchema>;
export type PluginDLQConfig = z.infer<typeof dlqSchema>;
export type PluginInsightsConfig = z.infer<typeof insightsSchema>;
export type PluginLambdaAlarmsConfig = z.infer<typeof lambdaAlarmsSchema>;
export type PluginKmsConfig = z.infer<typeof kmsSchema>;
export const CONFIG_KEY = "lambdaDefaults";
