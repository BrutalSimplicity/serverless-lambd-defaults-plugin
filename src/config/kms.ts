import { CloudFormationTemplate } from "../definitions";
import { applyRolePolicyStatements } from "./helpers";

export function applyLambdaConfig(
  lambdaKey: string,
  kmsKeyArn: string,
  template: CloudFormationTemplate
): string[] {
  const lambda = template.Resources[lambdaKey];
  lambda.Properties.KmsKeyArn = lambda.Properties.KmsKeyArn || kmsKeyArn;

  const roleName = lambda.Properties.Role["Fn::GetAtt"][0];
  applyRolePolicyStatements(
    roleName,
    [
      {
        Effect: "Allow",
        Action: ["kms:Decrypt"],
        Resource: [kmsKeyArn],
      },
    ],
    template
  );

  return [`CMK has been added to the lambda ${lambdaKey}`];
}
