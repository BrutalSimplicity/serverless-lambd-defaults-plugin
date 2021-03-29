import { getLambdaExecutionRoleResource } from "../resources/helpers";
import * as deepEqual from "fast-deep-equal";
import { debugLog } from "../utils";

export function applyRolePolicyStatements(
  roleName: string,
  statements: Record<string, any>[],
  template: any
): void {
  const role = getLambdaExecutionRoleResource(roleName, template);
  const policies = role.Properties.Policies;
  const existingStatements: any[] = policies[0].PolicyDocument.Statement;
  const statementExists = (statement: any): boolean =>
    existingStatements.some((existing) => deepEqual(existing, statement));
  debugLog("existingStatements", existingStatements);

  for (const statement of statements) {
    if (!statementExists(statement)) {
      debugLog("statement", statement);
      policies[0].PolicyDocument.Statement.push(statement);
    }
  }
  debugLog("updatedStatements", existingStatements);
}

export function applyOutputValues(
  template: any,
  outputs: { [key: string]: any }
): void {
  const cfnOutputs = template.Outputs || {};

  for (const key of Object.keys(outputs)) {
    cfnOutputs[key] = {
      Value: outputs[key],
    };
  }

  template.Outputs = cfnOutputs;
}
