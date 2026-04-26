import { File } from "@google-cloud/storage";

// Cover-image style assets: a single owner, plus a public/private flag.
// The owner can always read or overwrite their object; everyone else can
// only read it when the owner has marked it public. We deliberately do
// NOT ship a richer group/role system here — empty placeholder code in a
// security-critical layer is worse than no code, because it implies
// enforcement that doesn't exist. If we ever need group ACLs, add them
// when there's a real consumer.

const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export type ObjectVisibility = "public" | "private";

export interface ObjectAclPolicy {
  owner: string;
  visibility: ObjectVisibility;
}

export async function setObjectAclPolicy(
  objectFile: File,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }

  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy),
    },
  });
}

export async function getObjectAclPolicy(
  objectFile: File,
): Promise<ObjectAclPolicy | null> {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  try {
    return JSON.parse(aclPolicy as string) as ObjectAclPolicy;
  } catch {
    return null;
  }
}

export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: File;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  // No policy = treat as inaccessible. Forces every uploaded object to be
  // explicitly finalised before it can be served.
  if (!aclPolicy) {
    return false;
  }

  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  // Anything beyond a public read requires the caller to be the owner.
  return !!userId && aclPolicy.owner === userId;
}
