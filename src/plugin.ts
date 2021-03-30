/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Serverless from "serverless";
import * as AWS from "serverless/aws";
import { Hooks } from "serverless/classes/Plugin";
import { applyDLQConfig } from "./config/dlq";
import applyLambdaInsights from "./config/insights";
import { applyLambdaConfig } from "./config/kms";
import getDefaultPluginConfig from "./defaults";
import {
  CloudFormationTemplate,
  CONFIG_KEY,
  PluginConfig,
  validateConfigs,
} from "./definitions";
import { getServerlessLambdaKeys } from "./resources/helpers";
import {
  applyExcessiveExecutionTimeAlarm,
  applyThrottleErrorsAlarm,
} from "./config/alarms";
import { debugLog, getFunctionServerlessConfig } from "./utils";

const PLUGIN_KEY = "serverless-lambda-defaults-plugin";

export interface Resources {
  [key: string]: any;
}

export class Plugin {
  serverless: Serverless;
  options: Serverless.Options;
  provider: AWS;
  config: PluginConfig;
  hooks: Hooks;

  constructor(serverless: Serverless, options: Serverless.Options) {
    this.serverless = serverless;
    this.provider = serverless.getProvider("aws");
    this.options = options;

    validateConfigs(serverless);

    this.config = this.mergeConfigs(
      getDefaultPluginConfig(),
      (serverless.service.custom?.[CONFIG_KEY] as PluginConfig) || {}
    );
    this.hooks = {
      "after:aws:package:finalize:mergeCustomProviderResources": this.applyLambdaDefaults.bind(
        this
      ),
    };

    const serverlessSchema = {
      type: "object",
      properties: {
        lambdaDefaults: { type: "object" },
      },
    };
    this.serverless.configSchemaHandler.defineCustomProperties(
      serverlessSchema
    );
    this.serverless.configSchemaHandler.defineFunctionProperties(
      "aws",
      serverlessSchema
    );
  }

  applyLambdaDefaults(): void {
    const template = this.serverless.service.provider
      .compiledCloudFormationTemplate as CloudFormationTemplate;
    const service = this.serverless.service;

    if (!service.functions) {
      return;
    }

    const functionNames = Object.keys(service.functions);
    const lambdaKeys = getServerlessLambdaKeys(functionNames, template);

    for (const lambdaKey of lambdaKeys) {
      const lambda = template.Resources[lambdaKey];
      const properties = lambda.Properties;
      const config = this.mergeConfigs(
        this.config,
        getFunctionServerlessConfig(this.serverless, lambdaKey)
      );
      debugLog("functionConfig", config);
      if (config.kms && config.kms?.kmsKeyArn) {
        const results = applyLambdaConfig(
          lambdaKey,
          config.kms.kmsKeyArn,
          template
        );
        this.logResults(results);
      }

      if (!properties.DeadLetterConfig && config.dlq?.enabled) {
        const results = applyDLQConfig(
          {
            dlqConfig: config.dlq,
            lambdaKey,
            namespace: this.options.stage,
            kmsKeyArn: config.kms?.kmsKeyArn,
          },
          template
        );
        this.logResults(results);
      }

      if (config.insights?.enabled && config.insights?.version) {
        applyLambdaInsights(
          {
            config: {
              enabled: config.insights.enabled,
              version: config.insights.version,
              alarms: config.insights.alarms,
            },
            kmsKeyArn: config.kms?.kmsKeyArn,
            lambdaKey,
            namespace: this.options.stage,
          },
          template
        );
      }

      if (config.alarms?.enabled) {
        if (config.alarms.excessiveExecutionTime?.enabled) {
          const threshold = config.alarms.excessiveExecutionTime.threshold;
          const alarmConfig = {
            ...config.alarms.excessiveExecutionTime,
            threshold: Math.max(
              1,
              threshold ? threshold : 0.75 * properties.Timeout
            ),
          };
          debugLog(`${lambdaKey}:excessiveExecutionTimeConfig`, alarmConfig);
          const results = applyExcessiveExecutionTimeAlarm(
            {
              alarmKey: `${lambdaKey}ExecutionTimeAlarm`,
              snsKey: `${lambdaKey}ExecutionTimeAlarmTopic`,
              config: {
                ...alarmConfig,
              },
              lambdaKey,
              lambdaName: properties.FunctionName,
              namespace: this.options.stage,
              kmsKeyArn: config.kms?.kmsKeyArn,
            },
            template
          );
          this.logResults(results);
        }
        if (config.alarms.throttleErrors?.enabled) {
          const results = applyThrottleErrorsAlarm(
            {
              alarmKey: `${lambdaKey}ThrottleErrorsAlarm`,
              snsKey: `${lambdaKey}ThrottleErrorsAlarmTopic`,
              config: config.alarms.throttleErrors,
              lambdaKey,
              lambdaName: properties.FunctionName,
              namespace: this.options.stage,
              kmsKeyArn: config.kms?.kmsKeyArn,
            },
            template
          );
          this.logResults(results);
        }
      }
    }
  }

  mergeConfigs(a: PluginConfig, b: PluginConfig): PluginConfig {
    function recurse(a: any, b: any): any {
      const result = { ...a };
      for (const key of Object.keys(a)) {
        if (key in b) {
          if (typeof b[key] === "object" && b[key] !== null) {
            result[key] = recurse(a[key], b[key]);
          } else {
            result[key] = b[key];
          }
        }
      }
      return result;
    }
    return recurse(a, b);
  }

  logResults(messages: string[]): void {
    for (const message of messages) {
      this.log(message);
    }
  }

  log(message: string): void {
    this.serverless.cli.log(`[${PLUGIN_KEY}]: ${message}`);
  }
}
