import { Resource } from "../definitions";
interface GetSqsResourceParams {
  queueName: string;
  kmsMasterKeyId?: string;
  tags?: { [key: string]: string };
}

export function getSqsResource(params: GetSqsResourceParams): Resource {
  return {
    Type: "AWS::SQS::Queue",
    Properties: {
      QueueName: params.queueName,
      KmsMasterKeyId: params.kmsMasterKeyId,
    },
  };
}
