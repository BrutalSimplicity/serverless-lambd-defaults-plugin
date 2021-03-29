import { CloudFormationTemplate } from "../definitions";

interface Tag {
  Name: string;
  Value: string;
}

export function getTags(tags?: { [key: string]: string }): Tag[] {
  return tags
    ? Object.entries(tags)
        .filter(([key, value]) => key && value)
        .map(([key, value]) => ({ Name: key, Value: value }))
    : undefined;
}
export function getLambdaExecutionRoleResource(
  roleName: string,
  template: CloudFormationTemplate
): Record<string, any> {
  return Object.entries(template.Resources)
    .filter(
      ([key, resource]) => resource.Type == "AWS::IAM::Role" && key == roleName
    )
    .map(([, resource]) => resource)[0];
}

export function getLambdaResource(
  name: string,
  template: CloudFormationTemplate
): Record<string, any> {
  return Object.entries(template.Resources)
    .filter(
      ([key, resource]) =>
        resource.Type == "AWS::Lambda::Function" && key == name
    )
    .map(([, resource]) => resource)[0];
}

export function getServerlessLambdaKeys(
  functionNames: string[],
  template: CloudFormationTemplate
): string[] {
  return Object.entries(template.Resources)
    .filter(
      ([key, value]) =>
        (value as any).Type == "AWS::Lambda::Function" &&
        functionNames.some((name) =>
          key.toLowerCase().startsWith(name.toLowerCase())
        )
    )
    .map(([key]) => key);
}
