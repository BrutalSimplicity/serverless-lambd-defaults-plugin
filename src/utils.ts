import * as Serverless from "serverless";
import {
  CONFIG_KEY,
  PluginConfig,
  PluginFunctionDefinition,
} from "./definitions";
import * as util from "util";

export function getFunctionServerlessConfig(
  serverless: Serverless,
  lambdaName: string
): PluginConfig {
  const functionName = lambdaName.replace("LambdaFunction", "").toLowerCase();
  const functionKey = Object.keys(serverless.service.functions).find(
    (key) => key.toLowerCase() === functionName
  ) as string;
  return (
    (serverless.service.functions[functionKey] as PluginFunctionDefinition)?.[
      CONFIG_KEY
    ] || {}
  );
}

export function debugLog(...data: any[]): void {
  if (process.env.SLS_DEBUG) {
    const deepOutput = data.map((msg) =>
      typeof msg === "object" ? util.inspect(msg, false, null, true) : msg
    );
    console.log(...deepOutput);
  }
}
