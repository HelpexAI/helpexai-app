import { revalidatePath } from "next/cache";

export function revalidateWorkspacePaths() {
  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/conversations");
}
