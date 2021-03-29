import { Resource } from "../definitions";
interface GetSnsResourceParams {
  topicName: string;
  kmsMasterKeyId?: string;
}

export function getSnsResource(params: GetSnsResourceParams): Resource {
  return {
    Type: "AWS::SNS::Topic",
    Properties: {
      TopicName: params.topicName,
      KmsMasterKeyId: params.kmsMasterKeyId,
    },
  };
}
