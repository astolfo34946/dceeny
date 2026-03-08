export async function trackProjectView(projectId: string) {
  try {
    // No-op placeholder when backend tracking is not available (e.g. no Cloud Functions).
    // You can wire this to Supabase / another analytics backend if desired.
    console.debug('trackProjectView', projectId);
  } catch (error) {
    console.error('Failed to track project view', error);
  }
}
