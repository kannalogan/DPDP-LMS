const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/csv",
  "application/zip"
]);
export function validateAssignmentFile(
  file: { name: string; size: number; type: string },
  limits: { maxBytes: number; acceptedExtensions: string[] }
) {
  const extension = file.name.includes(".") ? "." + file.name.split(".").pop()?.toLowerCase() : "";
  if (file.size <= 0 || file.size > limits.maxBytes)
    return { valid: false, reason: "File size is outside the assignment limit." };
  if (!allowedMimeTypes.has(file.type))
    return { valid: false, reason: "File type is not allowed." };
  if (limits.acceptedExtensions.length && !limits.acceptedExtensions.includes(extension))
    return { valid: false, reason: "File extension is not accepted." };
  return { valid: true, reason: null };
}
export function assignmentObjectPath(organizationId: string, profileId: string, fileId: string) {
  return organizationId + "/" + profileId + "/" + fileId;
}
